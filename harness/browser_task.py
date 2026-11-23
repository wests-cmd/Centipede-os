"""Single bounded browser-child entrypoint; no HTTP control or secrets.

Only a strict, previously owner-approved job arrives over stdin from the
harness scheduler. Parent kills this entire process group after 30 seconds.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from .browser import browser_job
from .core import PolicyError, validate_routine


def main():
    raw = sys.stdin.read(4097)
    if len(raw) > 4096:
        raise PolicyError("Browser job exceeded permitted size.")
    job = json.loads(raw)
    if not isinstance(job, dict) or set(job) != {
        "runId", "routineId", "url", "steps", "previousDigest"
    }:
        raise PolicyError("Unexpected child browser job schema.")
    checked = validate_routine({
        "name": "approved-work",
        "url": job["url"],
        "intervalSeconds": 900,
        "steps": job["steps"],
    })
    if checked["url"] != job["url"]:
        raise PolicyError("Unexpected URL normalization.")
    state_dir = os.environ.get("CENTIPEDE_HARNESS_DATA", "")
    if not state_dir or not Path(state_dir).is_dir():
        raise PolicyError("Dedicated worker data root not available.")
    summary, sha256, screenshot = browser_job(job, state_dir, lambda: False)
    sys.stdout.write(json.dumps({
        "summary": summary,
        "sha256": sha256,
        "screenshot": screenshot,
    }, separators=(",", ":")))
    sys.stdout.flush()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Do not print untrusted URLs, page contents or secrets in log files.
        sys.exit(1)
