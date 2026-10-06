#!/usr/bin/python3
import os
import pwd
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

def report_serial(message):
    try:
        with open("/dev/ttyS0", "w", encoding="ascii", buffering=1) as serial:
            serial.write(message.encode("ascii", "replace").decode("ascii") + "\r\n")
    except OSError as error:
        print(f"Could not write readiness report to serial: {error}", file=sys.stderr, flush=True)

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
                and "--start-maximized" in command
                and "--kiosk" not in command
                and "127.0.0.1:3000" in command
            ):
                return True
        except (FileNotFoundError, PermissionError, StopIteration, ValueError):
            continue
    return False

def daily_apps_installed():
    return all(shutil.which(app) for app in ("libreoffice", "thunderbird", "vlc"))

uid = pwd.getpwnam("centipede").pw_uid
deadline = time.monotonic() + 120
last_app_ready = False
last_browser_ready = False
last_lightdm_ready = False
last_apps_ready = False
while time.monotonic() < deadline:
    try:
        with urllib.request.urlopen("http://127.0.0.1:3000/", timeout=2) as response:
            last_app_ready = response.status == 200 and b'id="root"' in response.read()
    except Exception:
        last_app_ready = False
    last_browser_ready = desktop_browser_running(uid)
    last_apps_ready = daily_apps_installed()
    last_lightdm_ready = subprocess.run(
        ["systemctl", "is-active", "--quiet", "lightdm"], check=False
    ).returncode == 0
    if last_app_ready and last_browser_ready and last_lightdm_ready and last_apps_ready:
        message = "CENTIPEDE_DESKTOP_READY: LightDM, Chromium, local web app, and everyday apps are ready"
        command_line = open("/proc/cmdline", encoding="ascii").read().split()
        graphics_marker = (
            "CENTIPEDE_SAFE_GRAPHICS_ENABLED: nomodeset is active"
            if "nomodeset" in command_line
            else "CENTIPEDE_STANDARD_GRAPHICS_BOOT: nomodeset is absent"
        )
        print(graphics_marker, flush=True)
        print(message, flush=True)
        report_serial(graphics_marker)
        report_serial(message)
        sys.exit(0)
    time.sleep(2)
message = (
    "CENTIPEDE_DESKTOP_NOT_READY: "
    f"lightdm={last_lightdm_ready} web={last_app_ready} chromium={last_browser_ready} apps={last_apps_ready}"
)
print(message, file=sys.stderr, flush=True)
try:
    account = pwd.getpwnam("centipede")
    identity = f"uid={account.pw_uid} name={account.pw_name} gecos={account.pw_gecos}"
except KeyError:
    identity = "centipede account missing"
processes = []
for entry in os.scandir("/proc"):
    if not entry.name.isdigit():
        continue
    try:
        process = Path(entry.path, "comm").read_text(encoding="ascii").strip()
        if process in {"lightdm", "Xorg", "xfce4-session", "xfdesktop", "xfce4-panel", "chromium"}:
            processes.append(process)
    except (FileNotFoundError, PermissionError):
        continue
launcher_log = Path("/home/centipede/.cache/centipede-desktop.log")
launcher_detail = launcher_log.read_text(encoding="utf-8", errors="replace")[-800:] if launcher_log.is_file() else "launcher log missing"
diagnostic = (
    f"{message}; account={identity}; processes={','.join(processes) or 'none'}; "
    f"launcher={launcher_detail.replace(chr(10), ' ')[:800]}"
)
report_serial(diagnostic)
sys.exit(1)
