#!/usr/bin/env python3
"""Capture non-destructive evidence from an installed Centipede Debian machine.

No credentials, remote commands, model generation, software installation,
disk writing, updates or simulated Kingdom tasks are ever performed.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys
import urllib.request

MAX_REPLY = 65536
API_BASE = "http://127.0.0.1:3000"


def parse_available_memory(text: str) -> dict[str, int]:
    names = ("MemTotal", "MemAvailable", "SwapTotal", "SwapFree")
    found = {}
    for key in names:
        match = re.search(rf"^{key}:\s*(\d+)\s+kB$", text, re.M)
        if match:
            found[key] = int(match.group(1))
    return found


def check_memory(mem: dict[str, int]) -> tuple[bool, str]:
    available = mem.get("MemAvailable")
    total = mem.get("MemTotal")
    if available is None or total is None or total < available:
        return False, "Missing or inconsistent kernel RAM measurement."
    if available < 512 * 1024:
        return False, "Less than 512 MiB available RAM on this installed machine."
    return True, "Linux reports at least 512 MiB available RAM (one-time snapshot only)."


def hardened_service(props: dict[str, str]) -> tuple[bool, str]:
    requirements = {
        "ActiveState": "active",
        "User": "centipede-web",
        "Group": "centipede-web",
        "NoNewPrivileges": "yes",
        "PrivateDevices": "yes",
        "ProtectSystem": "strict",
        "ProtectHome": "yes",
    }
    bad = [k for k, expected in requirements.items() if props.get(k, "").lower() != expected]
    if bad:
        return False, "Required runtime service properties absent or different: " + ", ".join(bad)
    return True, "Non-root web/API service is running with required systemd isolation."


def parse_systemctl(text: str) -> dict[str, str]:
    properties = {}
    for line in text.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            properties[key] = value.strip()
    return properties


def inspect_http(path: str) -> tuple[bool, str, dict]:
    request = urllib.request.Request(API_BASE + path, method="GET",
                                     headers={"Accept": "application/json" if path.startswith("/api/") else "text/html"})
    # Prevent corporate HTTP_PROXY from redirecting localhost evidence to the network.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(request, timeout=4) as response:
        data = response.read(MAX_REPLY + 1)
        if len(data) > MAX_REPLY or response.status != 200:
            return False, "Local Centipede response was empty, oversized or not HTTP 200.", {}
        if path == "/":
            return (b'id="root"' in data, "HTML contains the Centipede mount point." if b'id="root"' in data
                    else "HTML did not contain the app mount point.", {})
        payload = json.loads(data)
        if not isinstance(payload, dict):
            return False, "Health endpoint did not return an object.", {}
        status = payload.get("status")
        version = payload.get("version")
        # Do not call DEGRADED healthy just because HTTP returned 200.
        good = status == "HEALTHY" and isinstance(version, str) and re.fullmatch(r"\d+\.\d+\.\d+", version)
        return (
            bool(good),
            "Local Centipede API reports HEALTHY." if good else
                "Centipede API is degraded or version is unverified.",
            {"apiStatus": status if status in {"HEALTHY", "DEGRADED"} else "UNKNOWN",
             "coreVersion": version if isinstance(version, str) and len(version) < 40 else None},
        )


def chromium_app_window() -> bool:
    try:
        for entry in os.scandir("/proc"):
            if not entry.name.isdecimal():
                continue
            try:
                cmd = (Path(entry.path) / "cmdline").read_bytes().split(b"\0")
                cmd = [part.decode("utf-8", "replace") for part in cmd if part]
                if (cmd and os.path.basename(cmd[0]).startswith("chromium")
                        and any(arg == "--app=http://127.0.0.1:3000" for arg in cmd)):
                    return True
            except (PermissionError, FileNotFoundError, ProcessLookupError):
                continue
    except OSError:
        return False
    return False


def read_systemctl() -> dict[str, str]:
    keys = "ActiveState,User,Group,NoNewPrivileges,PrivateDevices,ProtectSystem,ProtectHome"
    process = subprocess.run(["systemctl", "show", "centipede-web.service",
                              "--property=" + keys, "--no-pager"], check=False,
                             timeout=6, capture_output=True, text=True)
    return parse_systemctl(process.stdout) if process.returncode == 0 else {}


def is_lightdm_active() -> bool:
    result = subprocess.run(["systemctl", "is-active", "--quiet", "lightdm"],
                            check=False, timeout=6, capture_output=True)
    return result.returncode == 0


def private_receipt(destination: Path, value: dict) -> Path:
    destination.mkdir(mode=0o700, parents=True, exist_ok=True)
    if not destination.is_dir() or destination.is_symlink():
        raise ValueError("Receipt directory must be an ordinary directory.")
    if destination.stat().st_mode & 0o077:
        raise PermissionError("Receipt directory may not be readable by other local users.")
    timestamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    path = destination / ("centipede-physical-" + timestamp + ".json")
    data = (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8")
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
    except BaseException:
        path.unlink(missing_ok=True)
        raise
    return path


def record(result: dict, name: str, success: bool, evidence: str):
    result["checks"][name] = {"result": "YES" if success else "NO", "evidence": evidence}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--role", required=True, choices=["laptop2", "dt1", "other"])
    parser.add_argument("--mode", choices=["desktop", "headless"], default="desktop")
    parser.add_argument("--output", default="./centipede-physical-receipts")
    parser.add_argument("--previous", help="Previous local receipt to verify a separate reboot")
    args = parser.parse_args()
    result: dict = {
        "schema": 1,
        "scope": "local physical snapshot, no privileged actions performed",
        "role": args.role, "mode": args.mode,
        "observedAtUTC": dt.datetime.now(dt.timezone.utc).isoformat(),
        "checks": {},
        "manualAcceptance": {
            "realKingdomTaskApprovalAndResult": "UNVERIFIED",
            "crossMachineWorkerFailoverAndRevocation": "UNVERIFIED",
            "diskInstallAndSourceMediaSafety": "UNVERIFIED",
            "backupRestoreAndPowerLossRollback": "UNVERIFIED",
            "mobilePublisherSignatureAndPairing": "UNVERIFIED",
            "24HourResourceAndDesktopResponsiveness": "UNVERIFIED",
        },
        "gaCertified": False,
    }
    record(result, "linux", platform.system() == "Linux", "Linux required; browser-only host is not a Centipede installed OS.")
    try:
        raw = Path("/proc/meminfo").read_text(encoding="ascii")
        mem = parse_available_memory(raw)
        passed, note = check_memory(mem)
        record(result, "memoryReserve", passed, note)
        result["resourcesMiB"] = {
            k: round(v / 1024) for k, v in mem.items()
        }
        result["cpuCoresVisible"] = os.cpu_count() or None
    except (OSError, ValueError):
        record(result, "memoryReserve", False, "Could not read Linux kernel memory counters.")
    try:
        service = read_systemctl()
        passed, note = hardened_service(service)
        record(result, "isolatedService", passed, note)
    except (OSError, subprocess.SubprocessError):
        record(result, "isolatedService", False, "Could not read systemd unit properties.")
    for name, path in [("desktopHtml", "/"), ("localApiHealth", "/api/v1/health")]:
        try:
            passed, note, detail = inspect_http(path)
            record(result, name, passed, note)
            result.update(detail)
        except (OSError, TimeoutError, ValueError, json.JSONDecodeError):
            record(result, name, False, "Local HTTP endpoint did not return a valid 200 response.")
    if args.mode == "desktop":
        try:
            record(result, "desktopSession", is_lightdm_active(), "Live LightDM service state (not just installed package).")
        except (OSError, subprocess.SubprocessError):
            record(result, "desktopSession", False, "LightDM state is unavailable.")
        record(result, "chromiumAppWindow", chromium_app_window(),
               "An actual Chromium --app window targeting local Centipede was/was not observed.")
    if args.previous:
        try:
            previous = json.loads(Path(args.previous).read_text("utf-8"))
            current_id = Path("/proc/sys/kernel/random/boot_id").read_text("ascii").strip()
            current_hash = hashlib.sha256(current_id.encode()).hexdigest()[:24]
            old_hash = previous.get("bootFingerprintSha256Prefix")
            new_boot = isinstance(old_hash, str) and old_hash != current_hash
            record(result, "rebootObserved", new_boot,
                   "Fresh kernel boot identity differs from earlier local receipt." if new_boot else
                   "No proof of a distinct boot since the earlier receipt.")
        except (OSError, ValueError, json.JSONDecodeError):
            record(result, "rebootObserved", False, "Previous receipt or boot identity could not be read.")
    try:
        boot_id = Path("/proc/sys/kernel/random/boot_id").read_text("ascii").strip()
        result["bootFingerprintSha256Prefix"] = hashlib.sha256(boot_id.encode()).hexdigest()[:24]
    except OSError:
        pass
    result["automatedChecksPassed"] = all(x["result"] == "YES" for x in result["checks"].values())
    path = private_receipt(Path(args.output).resolve(), result)
    print("Receipt:", path)
    print("Automated snapshot:", "YES" if result["automatedChecksPassed"] else "NO")
    print("GA certified: NO — human hardware/Kingdom/installer/recovery evidence is still required.")
    return 0 if result["automatedChecksPassed"] else 1


if __name__ == "__main__":
    sys.exit(main())
