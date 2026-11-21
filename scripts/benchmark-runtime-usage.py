#!/usr/bin/env python3
"""Non-destructive, real-process Centipede API throughput, startup and RSS benchmark.

Measures only this CI runner and its disposable loopback process; never extrapolate
to physical Centipede installation, Kingdom, phone, camera or local model.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import platform
import signal
import socket
import statistics
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.request


def read_rss_kib(pid: int) -> int | None:
    try:
        for line in Path(f"/proc/{pid}/status").read_text().splitlines():
            if line.startswith("VmRSS:"):
                return int(line.split()[1])
    except (OSError, ValueError, IndexError):
        return None
    return None


def read_cpu_seconds(pid: int) -> float | None:
    try:
        # Strip the comm field between parentheses before positional indexing.
        fields = Path(f"/proc/{pid}/stat").read_text().rsplit(") ", 1)[1].split()
        ticks = int(fields[11]) + int(fields[12])
        return ticks / os.sysconf("SC_CLK_TCK")
    except (OSError, ValueError, IndexError):
        return None


def pct(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    return round(ordered[max(0, int((len(ordered) * fraction + 0.999999) - 1))], 2)


def request(url: str) -> tuple[float, int, bytes]:
    start = time.perf_counter()
    with urllib.request.urlopen(url, timeout=4) as response:
        body = response.read(131072)
        return (time.perf_counter() - start) * 1000, response.status, body


def port_available() -> int:
    with closing(socket.socket()) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def run_once(command: list[str], env: dict[str, str], port: int,
             workload: bool) -> dict:
    start = time.perf_counter()
    with tempfile.TemporaryFile() as log:
        child = subprocess.Popen(
            command, env=env, stdout=log, stderr=log,
            cwd=Path(__file__).resolve().parents[1], start_new_session=True,
        )
        peak_rss_kib = 0
        stop = threading.Event()

        def sample() -> None:
            nonlocal peak_rss_kib
            while not stop.is_set():
                rss = read_rss_kib(child.pid)
                if rss is not None:
                    peak_rss_kib = max(peak_rss_kib, rss)
                stop.wait(0.01)

        watcher = threading.Thread(target=sample, daemon=True)
        watcher.start()
        url = f"http://127.0.0.1:{port}"
        try:
            deadline = time.monotonic() + 35
            while True:
                if child.poll() is not None:
                    raise RuntimeError(f"Server exited during startup (exit {child.returncode})")
                try:
                    health_time, status, body = request(url + "/api/v1/health")
                    data = json.loads(body)
                    if status == 200 and data.get("status") in ("HEALTHY", "DEGRADED"):
                        break
                except (OSError, json.JSONDecodeError, ValueError):
                    pass
                if time.monotonic() > deadline:
                    raise TimeoutError("Centipede server did not become ready")
                time.sleep(0.04)
            startup_ms = round((time.perf_counter() - start) * 1000, 2)
            idle_rss_kib = read_rss_kib(child.pid)
            result: dict = {
                "command": " ".join(command),
                "startupReadyMs": startup_ms,
                "health": data.get("status"),
                "reportedVersion": data.get("version"),
                "idleBunProcessRssMiB": round(idle_rss_kib / 1024, 2) if idle_rss_kib is not None else None,
            }
            if workload:
                _, page_status, page = request(url + "/")
                if page_status != 200 or b'id="root"' not in page:
                    raise RuntimeError("Web application root missing")
                # Require the local Files capability to remain owner-locked.
                unauthorized = urllib.request.Request(
                    url + "/api/v1/host-files/list", data=b'{"directory":""}',
                    headers={"Content-Type": "application/json", "Origin": url}, method="POST")
                try:
                    urllib.request.urlopen(unauthorized, timeout=4).close()
                    raise RuntimeError("Host Files unexpectedly accepted an unauthenticated request")
                except urllib.error.HTTPError as error:
                    if error.code != 401:
                        raise RuntimeError(f"Unexpected host Files permission response: {error.code}")
                    result["unauthorizedFilesHttpStatus"] = error.code
                cpu_before = read_cpu_seconds(child.pid)
                load_start = time.perf_counter()
                timings: list[float] = []
                for _ in range(100):
                    took, code, response = request(url + "/api/v1/health")
                    if code != 200 or json.loads(response).get("status") not in ("HEALTHY", "DEGRADED"):
                        raise RuntimeError("Health endpoint failed during sequential load")
                    timings.append(took)
                with ThreadPoolExecutor(max_workers=8) as pool:
                    for took, code, response in pool.map(request, [url + "/api/v1/health"] * 200):
                        if code != 200 or json.loads(response).get("status") not in ("HEALTHY", "DEGRADED"):
                            raise RuntimeError("Health endpoint failed during concurrent load")
                        timings.append(took)
                load_duration = time.perf_counter() - load_start
                cpu_after = read_cpu_seconds(child.pid)
                result.update({
                    "requests": len(timings),
                    "concurrency": 8,
                    "wallSeconds": round(load_duration, 3),
                    "healthRequestsPerSecond": round(len(timings) / load_duration, 1),
                    "latencyMs": {
                        "minimum": round(min(timings), 2),
                        "median": round(statistics.median(timings), 2),
                        "p95": pct(timings, 0.95),
                        "maximum": round(max(timings), 2),
                    },
                    "processCpuPercentDuringLoad": (
                        round(100 * (cpu_after - cpu_before) / load_duration, 1)
                        if cpu_before is not None and cpu_after is not None else None
                    ),
                })
            return result
        finally:
            stop.set()
            watcher.join(timeout=1)
            result_peak = peak_rss_kib
            if "result" in locals():
                result["peakBunProcessRssMiB"] = round(result_peak / 1024, 2) if result_peak else None
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGTERM)
                try:
                    child.wait(timeout=6)
                except subprocess.TimeoutExpired:
                    os.killpg(child.pid, signal.SIGKILL)
                    child.wait(timeout=6)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="benchmark-results/runtime.json")
    args = parser.parse_args()
    if platform.system() != "Linux":
        raise SystemExit("This workload's process RSS/CPU benchmark requires Linux /proc")
    base = Path(__file__).resolve().parents[1]
    if not (base / "dist/index.html").is_file():
        raise SystemExit("Build the app first: bun run build")
    with tempfile.TemporaryDirectory(prefix="centipede-usage-") as temp:
        port = port_available()
        env = dict(os.environ, HOST="127.0.0.1", PORT=str(port),
                   CENTIPEDE_FILES_ROOT=str(Path(temp) / "files"),
                   CENTIPEDE_KNOWLEDGE_HOME=str(Path(temp) / "knowledge"))
        # Never use a real connected Kingdom service or owner credentials in the benchmark.
        for name in ("KINGDOM_API_TOKEN", "KINGDOM_API_URL", "CENTIPEDE_OWNER_ACCESS_CODE"):
            env.pop(name, None)
        measured = run_once(["bun", "run", "src/server/production.ts"], env, port, True)
        warm_port = port_available()
        env["PORT"] = str(warm_port)
        cached_start = run_once(["bun", "start"], env, warm_port, False)
    asset_size = sum(p.stat().st_size for p in (base / "dist").rglob("*") if p.is_file())
    report = {
        "schema": 1,
        "capturedAtUTC": datetime.now(timezone.utc).isoformat(),
        "gitSha": os.getenv("GITHUB_SHA", "local-unverified"),
        "hardware": {
            "platform": platform.platform(),
            "logicalCpuCount": os.cpu_count(),
            "totalRamMiB": int(next(x.split()[1] for x in Path("/proc/meminfo").read_text().splitlines()
                                   if x.startswith("MemTotal:"))) / 1024,
        },
        "bundledWebAssetsMiB": round(asset_size / (1024 ** 2), 2),
        "productionBunWebAndApi": measured,
        "cachedBunStartCommand": cached_start,
        "passed": True,
        "limits": [
            "Virtual GitHub CI runner, not Laptop 2 or DT1; CPU and RAM are runner-dependent.",
            "Bun process RSS excludes Chromium, Kingdom, OS services and optional inference.",
            "Benchmark requests are local unauthenticated health checks, not Kingdom task throughput.",
            "This does not certify a persistent installer, physical boot, signed update or rollback.",
        ],
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n")
    print("BENCHMARK_RUNTIME " + json.dumps(report))


if __name__ == "__main__":
    main()
