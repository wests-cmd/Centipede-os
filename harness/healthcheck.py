"""Container health check authenticated with the worker's secret."""
import json
import os
from urllib.request import Request, urlopen

port = int(os.environ.get("CENTIPEDE_HARNESS_PORT", "3011"))
token = os.environ["CENTIPEDE_HARNESS_TOKEN"]
request = Request(f"http://127.0.0.1:{port}/v1/status", headers={"Authorization": f"Bearer {token}"})
with urlopen(request, timeout=3) as response:
    status = json.load(response)
    if status.get("scope") != "isolated-headless-browser-only":
        raise SystemExit("Invalid worker status.")
