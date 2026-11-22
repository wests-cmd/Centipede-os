"""Authenticated background harness service.

The service owns a SQLite queue and a single isolated headless browser worker.
It continues while the Centipede GUI is closed and resumes scheduled work
after host/worker restart. It does NOT run while the host is powered off.
"""
from __future__ import annotations

import hmac
import json
import os
import re
import signal
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from .core import HarnessStore, PolicyError
from .browser import browser_job

MAX_REQUEST_BYTES = 4096
SAFE_RUN = re.compile(r"^run_[0-9a-f]{24}$")


class Harness:
    def __init__(self, state_dir: str, *, runner=browser_job):
        self.state_dir = state_dir
        self.store = HarnessStore(str(Path(state_dir) / "queue.sqlite3"))
        self.runner = runner
        self.stopping = threading.Event()
        self.worker = threading.Thread(target=self.loop, name="centipede-isolated-browser", daemon=True)

    def start(self):
        self.worker.start()

    def stop(self):
        self.stopping.set()
        self.worker.join(timeout=35)
        self.store.close()

    def loop(self):
        while not self.stopping.is_set():
            job = None
            try:
                job = self.store.claim_due()
                if job:
                    summary, digest, screenshot = self.runner(
                        job, self.state_dir,
                        lambda: self.stopping.is_set() or not self.store.status()["enabled"] or
                        self.store.status()["paused"]
                    )
                    self.store.complete_run(
                        job["runId"], outcome="completed", summary=summary,
                        sha256=digest, screenshot=screenshot
                    )
            except Exception as error:
                # Untrusted site content and exception bodies are never used as
                # instructions. Avoid logging visited URL, selectors or secrets.
                if job:
                    try:
                        self.store.complete_run(
                            job["runId"], outcome="failed",
                            summary="Browser run failed or was interrupted; no remote outcome is assumed.",
                        )
                    except Exception:
                        pass
                print(f"[harness] bounded browser worker error: {type(error).__name__}", flush=True)
            self.stopping.wait(5)


def handle_api(method: str, path: str, body: object, store: HarnessStore) -> tuple[int, dict]:
    if method == "GET" and path == "/v1/status":
        return 200, store.status()
    if method == "POST" and path == "/v1/control":
        if not isinstance(body, dict) or set(body) != {"action"}:
            return 422, {"error": "Control requires one explicit action."}
        return 200, store.control(body["action"])
    if method == "POST" and path == "/v1/routines":
        return 201, store.add_routine(body)
    if method == "POST" and path == "/v1/routines/delete":
        if not isinstance(body, dict) or set(body) != {"id"}:
            return 422, {"error": "Only a routine ID may be supplied."}
        store.delete_routine(body["id"])
        return 200, {"deleted": True}
    return 404, {"error": "Unknown harness endpoint."}


class Handler(BaseHTTPRequestHandler):
    server: "HarnessHTTPServer"
    def log_message(self, _format, *args):
        # Avoid printing bearer headers, task details and query strings.
        return

    def respond(self, code: int, payload: dict):
        data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def authorized(self) -> bool:
        auth = self.headers.get("Authorization", "")
        token = self.server.token
        return auth.startswith("Bearer ") and hmac.compare_digest(auth[7:], token)

    def serve_request(self, method: str):
        if not self.authorized():
            self.respond(401, {"error": "Worker authorization required."})
            return
        url = urlsplit(self.path)
        if url.query or url.fragment or url.path != self.path:
            self.respond(404, {"error": "Unknown harness endpoint."})
            return
        if method == "POST":
            if self.headers.get("Transfer-Encoding"):
                self.respond(400, {"error": "Chunked body is not supported."})
                return
            try:
                size = int(self.headers.get("Content-Length", "-1"))
            except ValueError:
                size = -1
            if not (0 <= size <= MAX_REQUEST_BYTES):
                self.respond(413, {"error": "Request body must be at most 4 KiB."})
                return
            try:
                body = json.loads(self.rfile.read(size).decode("utf-8"))
            except (ValueError, UnicodeError):
                self.respond(400, {"error": "Invalid JSON."})
                return
        else:
            body = None
        try:
            code, output = handle_api(method, url.path, body, self.server.harness.store)
        except PolicyError as error:
            code, output = 422, {"error": str(error)}
        except Exception:
            code, output = 503, {"error": "Harness unavailable. Inspect local service logs."}
        self.respond(code, output)

    def do_GET(self):
        self.serve_request("GET")

    def do_POST(self):
        self.serve_request("POST")

    def do_DELETE(self):
        self.respond(405, {"error": "Use the fixed owner-controlled endpoints."})


class HarnessHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    def __init__(self, address, handler, harness: Harness, token: str):
        self.harness = harness
        self.token = token
        super().__init__(address, handler)


def main():
    token = os.environ.get("CENTIPEDE_HARNESS_TOKEN", "")
    if not re.fullmatch(r"[a-fA-F0-9]{64}", token):
        raise SystemExit("CENTIPEDE_HARNESS_TOKEN must be a private, random 64-hex-character secret.")
    port = int(os.environ.get("CENTIPEDE_HARNESS_PORT", "3011"))
    if not 1024 <= port <= 65535:
        raise SystemExit("Invalid worker port.")
    state_dir = os.environ.get("CENTIPEDE_HARNESS_DATA", "/data")
    Path(state_dir).mkdir(parents=True, exist_ok=True, mode=0o700)
    os.umask(0o077)
    harness = Harness(state_dir)
    server = HarnessHTTPServer(("0.0.0.0", port), Handler, harness, token)
    def shutdown(*_):
        harness.stopping.set()
        threading.Thread(target=server.shutdown, daemon=True).start()
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    harness.start()
    print("[harness] isolated browser worker available; autonomy OFF until explicit owner opt-in.", flush=True)
    try:
        server.serve_forever(poll_interval=.5)
    finally:
        harness.stop()
        server.server_close()


if __name__ == "__main__":
    main()
