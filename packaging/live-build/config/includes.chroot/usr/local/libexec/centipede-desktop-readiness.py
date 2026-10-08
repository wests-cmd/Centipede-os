#!/usr/bin/python3
"""Report whether the live desktop stack is available to the QEMU release gate."""

import os
import pwd
import re
import select
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from urllib.parse import urljoin


def report_serial(message):
    """Write a bounded, non-blocking status line to the QEMU serial console."""
    descriptor = None
    try:
        descriptor = os.open("/dev/ttyS0", os.O_WRONLY | os.O_NOCTTY | os.O_NONBLOCK)
        if select.select([], [descriptor], [], 0.5)[1]:
            os.write(descriptor, (message + "\r\n").encode("ascii", "replace"))
    except OSError as error:
        print(f"Could not write readiness report to serial: {error}", file=sys.stderr, flush=True)
    finally:
        if descriptor is not None:
            os.close(descriptor)


def desktop_browser_running(uid):
    for entry in os.scandir("/proc"):
        if not entry.name.isdigit():
            continue
        try:
            with open(f"/proc/{entry.name}/status", encoding="ascii") as status_file:
                status = status_file.read()
            process_uid = int(next(line.split()[1] for line in status.splitlines() if line.startswith("Uid:")))
            if process_uid != uid:
                continue
            with open(f"/proc/{entry.name}/cmdline", "rb") as cmd_file:
                command = cmd_file.read().replace(b"\0", b" ").decode("utf-8", "replace")
            if (
                "chromium" in command
                and "--type=" not in command
                and "--start-maximized" in command
                and "127.0.0.1:3000" in command
            ):
                return True
        except (FileNotFoundError, PermissionError, StopIteration, ValueError):
            continue
    return False


def desktop_browser_window_visible(uid):
    """Require the live user's Centipede Chromium window to be mapped on screen."""
    for entry in os.scandir("/proc"):
        if not entry.name.isdigit():
            continue
        try:
            with open(f"/proc/{entry.name}/status", encoding="ascii") as status_file:
                status = status_file.read()
            process_uid = int(next(line.split()[1] for line in status.splitlines() if line.startswith("Uid:")))
            if process_uid != uid:
                continue
            with open(f"/proc/{entry.name}/cmdline", "rb") as cmd_file:
                command = cmd_file.read().replace(b"\0", b" ").decode("utf-8", "replace")
            if (
                "chromium" not in command
                or "--type=" in command
                or "--start-maximized" not in command
                or "127.0.0.1:3000" not in command
            ):
                continue
            with open(f"/proc/{entry.name}/environ", "rb") as env_file:
                environment = env_file.read().decode("utf-8", "replace").split("\0")
            variables = dict(value.split("=", 1) for value in environment if "=" in value)
            display = variables.get("DISPLAY", ":0")
            xauthority = variables.get("XAUTHORITY", "/home/centipede/.Xauthority")
            result = subprocess.run(
                ["runuser", "--user", "centipede", "--", "env", f"DISPLAY={display}",
                 f"XAUTHORITY={xauthority}", "xwininfo", "-root", "-tree"],
                check=False, capture_output=True, text=True, timeout=2,
            )
            if result.returncode != 0:
                return False
            for line in result.stdout.splitlines():
                if '"Centipede OS"' not in line and '"Centipede OS - ' not in line:
                    continue
                geometry = re.search(r"(\d+)x(\d+)[+-]\d+[+-]\d+", line)
                if geometry and int(geometry.group(1)) >= 640 and int(geometry.group(2)) >= 480:
                    return True
            return False
        except (FileNotFoundError, PermissionError, StopIteration, ValueError, subprocess.TimeoutExpired):
            return False
    return False


def daily_apps_installed():
    return all(shutil.which(app) for app in ("libreoffice", "thunderbird", "vlc"))


def application_assets_available():
    """Verify built JavaScript and stylesheet bundles are served completely."""
    try:
        with urllib.request.urlopen("http://127.0.0.1:3000/", timeout=5) as response:
            html = response.read().decode("utf-8", "replace")
        assets = re.findall(r'(?:src|href)="(/assets/[^\"]+)"', html)
        if not assets:
            return False, "built index.html contains no hashed /assets references"
        for asset in assets:
            with urllib.request.urlopen(urljoin("http://127.0.0.1:3000/", asset), timeout=5) as response:
                content = response.read()
                declared_length = response.headers.get("Content-Length")
                if response.status != 200 or not content:
                    return False, f"asset returned an empty response: {asset}"
                if declared_length and len(content) != int(declared_length):
                    return False, f"asset transfer was incomplete: {asset} ({len(content)}/{declared_length} bytes)"
        return True, f"served {len(assets)} built assets"
    except Exception as error:
        return False, f"asset check failed: {type(error).__name__}: {error}"


uid = pwd.getpwnam("centipede").pw_uid
deadline = time.monotonic() + 180
last_status_at = 0
last = {"lightdm": False, "web": False, "chromium": False, "window": False, "apps": False}
report_serial("CENTIPEDE_DESKTOP_CHECK_STARTED: checking live desktop services")

while time.monotonic() < deadline:
    try:
        with urllib.request.urlopen("http://127.0.0.1:3000/", timeout=3) as response:
            last["web"] = response.status == 200 and b'id="root"' in response.read()
    except Exception:
        last["web"] = False
    last["chromium"] = desktop_browser_running(uid)
    last["window"] = desktop_browser_window_visible(uid)
    last["apps"] = daily_apps_installed()
    last["lightdm"] = (
        shutil.which("systemctl") is not None
        and subprocess.run(["systemctl", "is-active", "--quiet", "lightdm"], check=False).returncode == 0
    )

    if all(last.values()):
        assets_ready, detail = application_assets_available()
        if assets_ready:
            command_line = Path("/proc/cmdline").read_text(encoding="ascii").split()
            graphics_marker = (
                "CENTIPEDE_SAFE_GRAPHICS_ENABLED: nomodeset is active"
                if "nomodeset" in command_line
                else "CENTIPEDE_STANDARD_GRAPHICS_BOOT: nomodeset is absent"
            )
            message = f"CENTIPEDE_DESKTOP_READY: desktop services and {detail} are ready"
            print(graphics_marker, flush=True)
            print(message, flush=True)
            report_serial(graphics_marker)
            report_serial(message)
            sys.exit(0)
        print(f"CENTIPEDE_ASSET_CHECK_FAILED: {detail}", file=sys.stderr, flush=True)
        report_serial(f"CENTIPEDE_ASSET_CHECK_FAILED: {detail}")
        sys.exit(1)

    if time.monotonic() - last_status_at >= 15:
        status = " ".join(f"{key}={str(value).lower()}" for key, value in last.items())
        report_serial(f"CENTIPEDE_DESKTOP_CHECK_WAITING: {status}")
        last_status_at = time.monotonic()
    time.sleep(3)

message = "CENTIPEDE_DESKTOP_NOT_READY: " + " ".join(
    f"{key}={str(value).lower()}" for key, value in last.items()
)
print(message, file=sys.stderr, flush=True)
account = pwd.getpwnam("centipede")
identity = f"uid={account.pw_uid} name={account.pw_name}"
launcher_log = Path("/home/centipede/.cache/centipede-desktop.log")
launcher_detail = (
    launcher_log.read_text(encoding="utf-8", errors="replace")[-800:]
    if launcher_log.is_file()
    else "launcher log missing"
)
diagnostic = f"{message}; account={identity}; launcher={launcher_detail.replace(chr(10), ' ')[:800]}"
report_serial(diagnostic)
sys.exit(1)
