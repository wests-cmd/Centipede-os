"""Persistent, owner-scoped browser-work policy and crash-safe queue.

This is deliberately NOT a desktop input driver, arbitrary shell, or Kingdom
approval authority. Only previously authorized, bounded public-web routines
are eligible for unattended execution. A powered-off host cannot run jobs.
"""
from __future__ import annotations

import hashlib
import ipaddress
import json
import re
import secrets
import socket
import sqlite3
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

MIN_INTERVAL = 900
MAX_INTERVAL = 604800
MAX_STEPS = 5
MAX_RUNS = 200
MAX_ALERTS = 100  # bounded change notifications; never store page content
MAX_SCREENSHOTS = 20  # 20 * 2 MiB max browser screenshot = at most 40 MiB
MAX_ROUTINES = 20
MAX_SELECTOR = 180
MAX_FILL = 200
MAX_DURATION = 30
SAFE_ID = re.compile(r"^[a-z0-9_-]{1,48}$")
ALLOWED_ACTIONS = {"click_link", "fill", "screenshot"}


class PolicyError(ValueError):
    pass


def validate_public_url(url: object, *, resolve_dns: bool = True) -> str:
    if not isinstance(url, str) or len(url) > 500:
        raise PolicyError("Provide an HTTPS public page URL (max 500 characters).")
    try:
        parsed = urlparse(url)
        host = parsed.hostname
        if (parsed.scheme != "https" or not host or parsed.username or parsed.password or
                parsed.port not in (None, 443) or parsed.fragment or
                not re.fullmatch(r"[A-Za-z0-9.-]{1,253}", host) or
                host.startswith(".") or host.endswith(".") or ".." in host):
            raise PolicyError("Only public HTTPS sites without credentials or custom ports are allowed.")
        if host.lower() in {"localhost", "metadata.google.internal"} or host.lower().endswith(
                (".local", ".localhost", ".internal", ".home.arpa", ".onion")):
            raise PolicyError("Private, local and metadata hostnames are not allowed.")
        try:
            address = ipaddress.ip_address(host)
        except ValueError:
            address = None
        if address is not None and not address.is_global:
            raise PolicyError("Private and special-use IP addresses cannot be visited.")
        if resolve_dns:
            try:
                results = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
            except OSError as error:
                raise PolicyError("Hostname could not be verified as public.") from error
            if not results:
                raise PolicyError("Hostname did not resolve.")
            for entry in results:
                address = ipaddress.ip_address(entry[4][0])
                if not address.is_global:
                    raise PolicyError("Hostname resolves to a private or special-use address.")
    except ValueError as error:
        if isinstance(error, PolicyError):
            raise
        raise PolicyError("Invalid HTTPS URL.") from error
    return parsed.geturl()


def validate_routine(payload: object, *, resolve_dns: bool = True) -> dict:
    if not isinstance(payload, dict) or set(payload) != {"name", "url", "intervalSeconds", "steps"}:
        raise PolicyError("Routine must contain exactly name, url, intervalSeconds and steps.")
    name = payload["name"]
    if not isinstance(name, str) or not (1 <= len(name.strip()) <= 80):
        raise PolicyError("Routine name must be 1–80 characters.")
    url = validate_public_url(payload["url"], resolve_dns=resolve_dns)
    interval = payload["intervalSeconds"]
    if type(interval) is not int or not (MIN_INTERVAL <= interval <= MAX_INTERVAL):
        raise PolicyError("Routine interval must be 900–604800 seconds.")
    steps = payload["steps"]
    if not isinstance(steps, list) or len(steps) > MAX_STEPS:
        raise PolicyError("Use at most five authorized browser steps.")
    filtered: list[dict[str, str]] = []
    for step in steps:
        if not isinstance(step, dict) or step.get("action") not in ALLOWED_ACTIONS:
            raise PolicyError("Only click_link, fill and screenshot browser steps are allowed.")
        action = step["action"]
        expected = {"action"} if action == "screenshot" else (
            {"action", "selector", "value"} if action == "fill" else {"action", "selector"}
        )
        if set(step) != expected:
            raise PolicyError("Unexpected browser step argument.")
        if action != "screenshot":
            selector = step["selector"]
            if (not isinstance(selector, str) or len(selector) > MAX_SELECTOR or
                    not re.fullmatch(r"[a-zA-Z0-9 _#.\[\]='\"\-:()]+", selector) or
                    ":has" in selector or ":contains" in selector):
                raise PolicyError("Step selector is not in the safe CSS subset.")
        if action == "fill":
            value = step["value"]
            if not isinstance(value, str) or len(value) > MAX_FILL or re.search(
                    r"(password|token|secret|apikey|api_key)", step["selector"], flags=re.I):
                raise PolicyError("Secret fields and long fill values are disallowed.")
        filtered.append(step.copy())
    return {"name": name.strip(), "url": url, "intervalSeconds": interval, "steps": filtered}


class HarnessStore:
    def __init__(self, db_path: str):
        self.lock = threading.RLock()
        path = Path(db_path).resolve()
        self.state_dir = path.parent
        path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.connection = sqlite3.connect(path, timeout=15, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA journal_mode=WAL")
        self.connection.execute("PRAGMA synchronous=FULL")
        self.connection.executescript("""
          CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS routines (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL,
            interval_seconds INTEGER NOT NULL, steps_json TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            next_due INTEGER NOT NULL, last_digest TEXT
          );
          CREATE TABLE IF NOT EXISTS runs (
            id TEXT PRIMARY KEY, routine_id TEXT NOT NULL, started INTEGER NOT NULL,
            completed INTEGER, state TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '',
            sha256 TEXT, screenshot TEXT,
            cancel_requested INTEGER NOT NULL DEFAULT 0
          );
          CREATE TABLE IF NOT EXISTS alerts (
            run_id TEXT PRIMARY KEY, routine_id TEXT NOT NULL, created INTEGER NOT NULL,
            previous_digest TEXT NOT NULL, current_digest TEXT NOT NULL,
            acknowledged INTEGER NOT NULL DEFAULT 0
          );
        """)
        with self.connection:
            # Existing worker databases retain receipts across the upgrade.
            columns = {row["name"] for row in self.connection.execute("PRAGMA table_info(runs)")}
            if "cancel_requested" not in columns:
                self.connection.execute("ALTER TABLE runs ADD COLUMN cancel_requested INTEGER NOT NULL DEFAULT 0")
            self.connection.execute("INSERT OR IGNORE INTO settings VALUES ('enabled','0')")
            self.connection.execute("INSERT OR IGNORE INTO settings VALUES ('paused','0')")
            self.connection.execute("UPDATE runs SET state='interrupted', completed=?, summary=? WHERE state='running'",
                                    (int(time.time()), "Interrupted by restart; outcome unknown, no automatic replay."))
        self._closed = False
        self._prune_screenshots()

    def _prune_screenshots(self) -> None:
        """Delete stale worker-created screenshots; never traverse external paths."""
        folder = self.state_dir / "screenshots"
        if not folder.exists() and not folder.is_symlink():
            return
        if folder.is_symlink() or not folder.is_dir():
            raise PolicyError("Private screenshot directory has unsafe filesystem type.")
        rows = self.connection.execute(
            "SELECT screenshot FROM runs WHERE state='completed' AND screenshot IS NOT NULL "
            "ORDER BY started DESC, id DESC LIMIT ?", (MAX_SCREENSHOTS,)
        ).fetchall()
        allowed = {row["screenshot"] for row in rows}
        for entry in folder.iterdir():
            # Files the owner put here with unknown names are not ours to remove.
            if not re.fullmatch(r"run_[0-9a-f]{24}\.png", entry.name):
                continue
            # Deleting the symlink itself is safe; never follow it.
            if entry.is_symlink() or entry.name not in allowed:
                entry.unlink()

    def close(self):
        with self.lock:
            if not self._closed:
                self.connection.close()
                self._closed = True

    def _setting(self, key: str) -> bool:
        row = self.connection.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
        return row is not None and row["value"] == "1"

    def status(self) -> dict:
        with self.lock:
            rows = self.connection.execute(
                "SELECT id,name,url,interval_seconds,enabled,next_due FROM routines ORDER BY id"
            ).fetchall()
            runs = self.connection.execute(
                "SELECT id,routine_id,started,completed,state,summary,sha256 "
                "FROM runs ORDER BY started DESC, id DESC LIMIT 20"
            ).fetchall()
            alerts = self.connection.execute(
                "SELECT run_id,routine_id,created,previous_digest,current_digest "
                "FROM alerts WHERE acknowledged=0 ORDER BY created DESC,run_id DESC LIMIT 20"
            ).fetchall()
            pending_count = self.connection.execute(
                "SELECT count(*) FROM alerts WHERE acknowledged=0"
            ).fetchone()[0]
            return {
                "scope": "isolated-headless-browser-only",
                "enabled": self._setting("enabled"),
                "paused": self._setting("paused"),
                "capabilities": ["public_https_read", "click_same_site_link", "fill_without_submit", "screenshot"],
                "limits": {"maxConcurrent": 1, "maxSteps": MAX_STEPS,
                           "maxJobSeconds": MAX_DURATION, "minIntervalSeconds": MIN_INTERVAL,
                           "maxStoredScreenshots": MAX_SCREENSHOTS},
                "routines": [dict(r) for r in rows],
                "runs": [dict(r) for r in runs],
                "needsAttention": [dict(r) for r in alerts],
                "attentionCount": pending_count,
                "browserIsolation": "New browser context per run; no host desktop or login profile.",
                "machineOffPolicy": "Stops when this worker host is powered off; resumes when it starts.",
            }

    def control(self, action: str) -> dict:
        if action not in {"enable", "disable", "pause", "resume"}:
            raise PolicyError("Unsupported owner control.")
        with self.lock, self.connection:
            key = "paused" if action in ("pause", "resume") else "enabled"
            value = "1" if action in ("enable", "pause") else "0"
            self.connection.execute("UPDATE settings SET value=? WHERE key=?", (value, key))
            if action in {"pause", "disable"}:
                self.connection.execute("UPDATE runs SET cancel_requested=1 WHERE state='running'")
        return self.status()

    def add_routine(self, payload: dict, *, resolve_dns: bool = True) -> dict:
        validated = validate_routine(payload, resolve_dns=resolve_dns)
        routine_id = "web_" + secrets.token_hex(8)
        now = int(time.time())
        with self.lock, self.connection:
            count = self.connection.execute("SELECT count(*) FROM routines").fetchone()[0]
            if count >= MAX_ROUTINES:
                raise PolicyError("Maximum 20 owner-approved routines reached.")
            self.connection.execute(
                "INSERT INTO routines (id,name,url,interval_seconds,steps_json,next_due) VALUES (?,?,?,?,?,?)",
                (routine_id, validated["name"], validated["url"], validated["intervalSeconds"],
                 json.dumps(validated["steps"]), now)
            )
        return {"id": routine_id, "name": validated["name"], "nextDue": now}

    def delete_routine(self, routine_id: str) -> None:
        if not isinstance(routine_id, str) or not SAFE_ID.fullmatch(routine_id):
            raise PolicyError("Invalid routine ID.")
        with self.lock, self.connection:
            self.connection.execute(
                "UPDATE runs SET cancel_requested=1 WHERE routine_id=? AND state='running'", (routine_id,)
            )
            self.connection.execute("DELETE FROM routines WHERE id=?", (routine_id,))

    def acknowledge_alert(self, run_id: str) -> dict:
        if not isinstance(run_id, str) or not re.fullmatch(r"run_[0-9a-f]{24}", run_id):
            raise PolicyError("Invalid background alert receipt ID.")
        with self.lock, self.connection:
            updated = self.connection.execute(
                "UPDATE alerts SET acknowledged=1 WHERE run_id=? AND acknowledged=0",
                (run_id,)
            )
            if updated.rowcount != 1:
                raise PolicyError("This change alert was already acknowledged or does not exist.")
        return {"acknowledged": True, "runId": run_id}

    def run_should_stop(self, run_id: str) -> bool:
        """A revocation is sticky for a claimed run, even after a quick resume."""
        with self.lock:
            row = self.connection.execute(
                "SELECT runs.cancel_requested, routines.enabled AS routine_enabled "
                "FROM runs LEFT JOIN routines ON routines.id=runs.routine_id "
                "WHERE runs.id=? AND runs.state='running'", (run_id,)
            ).fetchone()
            return (row is None or bool(row["cancel_requested"]) or row["routine_enabled"] != 1
                    or not self._setting("enabled") or self._setting("paused"))

    def claim_due(self, *, now: int | None = None) -> dict | None:
        now = now if now is not None else int(time.time())
        with self.lock, self.connection:
            if not self._setting("enabled") or self._setting("paused"):
                return None
            if self.connection.execute("SELECT 1 FROM runs WHERE state='running' LIMIT 1").fetchone():
                return None
            record = self.connection.execute(
                "SELECT * FROM routines WHERE enabled=1 AND next_due<=? ORDER BY next_due,id LIMIT 1", (now,)
            ).fetchone()
            if not record:
                return None
            run_id = "run_" + secrets.token_hex(12)
            self.connection.execute(
                "UPDATE routines SET next_due=? WHERE id=?",
                (now + record["interval_seconds"], record["id"])
            )
            self.connection.execute(
                "INSERT INTO runs (id,routine_id,started,state) VALUES (?,?,?,'running')",
                (run_id, record["id"], now)
            )
            return {
                "runId": run_id, "routineId": record["id"], "url": record["url"],
                "steps": json.loads(record["steps_json"]), "previousDigest": record["last_digest"],
            }

    def complete_run(self, run_id: str, *, outcome: str, summary: str = "",
                     sha256: str | None = None, screenshot: str | None = None) -> None:
        if outcome not in {"completed", "failed", "interrupted"}:
            raise PolicyError("Invalid run outcome.")
        if len(summary) > 400:
            summary = summary[:400]
        if screenshot is not None and screenshot != run_id + ".png":
            raise PolicyError("Screenshot receipt filename must match its run ID.")
        if sha256 is not None and not re.fullmatch(r"[0-9a-f]{64}", sha256):
            raise PolicyError("Invalid verified page digest.")
        with self.lock, self.connection:
            current = self.connection.execute(
                "SELECT routine_id FROM runs WHERE id=? AND state='running'", (run_id,)
            ).fetchone()
            if not current:
                raise PolicyError("Run is not active; duplicate completion rejected.")
            # The lock spans this check and receipt commit. A late reply cannot
            # restore authority after the owner revoked the run.
            if self.run_should_stop(run_id):
                outcome, summary = "interrupted", "Owner revoked this run; outcome unknown, no automatic replay."
                sha256, screenshot = None, None
            self.connection.execute(
                "UPDATE runs SET completed=?, state=?, summary=?, sha256=?, screenshot=? WHERE id=?",
                (int(time.time()), outcome, summary, sha256, screenshot, run_id),
            )
            if outcome == "completed" and sha256:
                prior = self.connection.execute(
                    "SELECT last_digest FROM routines WHERE id=?", (current["routine_id"],)
                ).fetchone()
                # First observation establishes a baseline, not an alarm.
                # Unchanged pages create no notifications. Hash-only data is
                # deliberately independent of webpage instructions.
                if prior and prior["last_digest"] and prior["last_digest"] != sha256:
                    self.connection.execute(
                        "INSERT OR IGNORE INTO alerts "
                        "(run_id,routine_id,created,previous_digest,current_digest) VALUES (?,?,?,?,?)",
                        (run_id, current["routine_id"], int(time.time()), prior["last_digest"], sha256)
                    )
                self.connection.execute(
                    "UPDATE routines SET last_digest=? WHERE id=?", (sha256, current["routine_id"])
                )
                self.connection.execute(
                    "DELETE FROM alerts WHERE run_id NOT IN "
                    "(SELECT run_id FROM alerts ORDER BY created DESC,run_id DESC LIMIT ?)",
                    (MAX_ALERTS,)
                )
            # Keep a bounded audit history and explicitly prune old images.
            self.connection.execute(
                "DELETE FROM runs WHERE id NOT IN (SELECT id FROM runs ORDER BY started DESC,id DESC LIMIT ?)",
                (MAX_RUNS,),
            )
            self._prune_screenshots()
