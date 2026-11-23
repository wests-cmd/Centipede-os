#!/usr/bin/env python3
"""Generate a private worker secret once. Never print or overwrite it."""
from pathlib import Path
import os
import secrets
import stat
import sys

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / ".centipede-harness.env"
if TARGET.exists():
    print("Worker secret already exists; no changes made.")
    sys.exit(0)
value = secrets.token_hex(32)
fd = os.open(TARGET, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
try:
    with os.fdopen(fd, "w", encoding="utf8") as file:
        file.write("CENTIPEDE_HARNESS_TOKEN=" + value + "\n")
        file.write("CENTIPEDE_HARNESS_URL=http://127.0.0.1:3011\n")
    os.chmod(TARGET, stat.S_IRUSR | stat.S_IWUSR)
except Exception:
    TARGET.unlink(missing_ok=True)
    raise
print("Private worker configuration created at .centipede-harness.env (mode 0600).")
print("Autonomy remains OFF until an owner explicitly enables it.")
