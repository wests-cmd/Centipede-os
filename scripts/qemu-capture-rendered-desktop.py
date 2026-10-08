#!/usr/bin/env python3
"""Wait for QEMU's desktop framebuffer to paint before saving a screenshot."""

import argparse
import socket
import subprocess
import sys
import time
from pathlib import Path


def monitor_command(path: str, command: str) -> None:
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as monitor:
        monitor.settimeout(5)
        monitor.connect(path)
        time.sleep(0.2)
        try:
            monitor.recv(4096)
        except TimeoutError:
            pass
        monitor.sendall((command + "\r\n").encode())
        time.sleep(0.8)
        try:
            monitor.recv(4096)
        except TimeoutError:
            pass


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("monitor", help="QEMU Unix monitor socket")
    parser.add_argument("screenshot", help="output PPM path inside the QEMU host")
    parser.add_argument("--timeout", type=int, default=120)
    args = parser.parse_args()
    screenshot = Path(args.screenshot)
    validator = Path(__file__).with_name("validate-qemu-desktop-screenshot.py")
    deadline = time.monotonic() + args.timeout
    last_error = "no screenshot captured"

    while time.monotonic() < deadline:
        try:
            monitor_command(args.monitor, f"screendump {screenshot}")
            result = subprocess.run(
                [sys.executable, str(validator), str(screenshot)],
                check=False,
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                print(result.stdout.strip())
                return 0
            last_error = result.stderr.strip() or result.stdout.strip()
        except (OSError, subprocess.TimeoutExpired) as error:
            last_error = f"{type(error).__name__}: {error}"
        print(f"Waiting for QEMU desktop paint: {last_error}", flush=True)
        time.sleep(4)

    print(f"QEMU desktop did not paint within {args.timeout}s: {last_error}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
