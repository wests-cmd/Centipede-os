#!/usr/bin/python3
import os
import pwd
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from urllib.parse import urljoin
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

def application_assets_available():
    """Verify the built JavaScript and stylesheet are actually served by the image."""
    try:
        with urllib.request.urlopen("http://127.0.0.1:3000/", timeout=5) as response:
            html = response.read().decode("utf-8", "replace")
        assets = re.findall(r'(?:src|href)="(/assets/[^\"]+)"', html)
        if not assets:
            return False, "built index.html contains no hashed /assets references"
        for asset in assets:
            try:
                with urllib.request.urlopen(urljoin("http://127.0.0.1:3000/", asset), timeout=5) as response:
                    if response.status != 200 or not response.read(1):
                        return False, f"asset returned an empty response: {asset}"
            except Exception as error:
                return False, f"asset request failed for {asset}: {type(error).__name__}: {error}"
        return True, f"served {len(assets)} built assets"
    except Exception as error:
        return False, f"index request failed: {type(error).__name__}: {error}"

def application_rendered():
    """Use a separate browser profile to verify the client JavaScript rendered."""
    assets_ready, assets_detail = application_assets_available()
    if not assets_ready:
        global last_render_detail
        last_render_detail = assets_detail
        print(f"CENTIPEDE_ASSET_CHECK_FAILED: {assets_detail}", file=sys.stderr, flush=True)
        return False
    profile = tempfile.mkdtemp(prefix="centipede-readiness-")
    shutil.chown(profile, user="centipede")
    try:
        result = subprocess.run(
            [
                "runuser", "-u", "centipede", "--", "chromium",
                "--headless", "--no-first-run", "--disable-gpu",
                "--disable-dev-shm-usage", f"--user-data-dir={profile}",
                "--virtual-time-budget=15000", "--dump-dom",
                "http://127.0.0.1:3000/",
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )
        rendered = result.returncode == 0 and "Welcome to Centipede" in result.stdout
        diagnostic = (result.stderr or result.stdout).replace("\n", " ")[-1000:]
        last_render_detail = (
            f"exit={result.returncode} "
            f"welcome_text={'present' if 'Welcome to Centipede' in result.stdout else 'missing'} "
            f"detail={diagnostic}"
        )
        if rendered:
            print("CENTIPEDE_RENDER_CHECK: React desktop content rendered in Chromium", flush=True)
        else:
            print(
                f"CENTIPEDE_RENDER_CHECK_FAILED: {last_render_detail}",
                file=sys.stderr,
                flush=True,
            )
        return rendered
    except (OSError, subprocess.TimeoutExpired) as error:
        last_render_detail = f"{type(error).__name__}: {error}"
        return False
    finally:
        shutil.rmtree(profile, ignore_errors=True)

uid = pwd.getpwnam("centipede").pw_uid
deadline = time.monotonic() + 120
last_app_ready = False
last_browser_ready = False
last_lightdm_ready = False
last_apps_ready = False
last_render_ready = False
last_render_detail = "not attempted"
browser_started_at = None
while time.monotonic() < deadline:
    try:
        with urllib.request.urlopen("http://127.0.0.1:3000/", timeout=2) as response:
            last_app_ready = response.status == 200 and b'id="root"' in response.read()
    except Exception:
        last_app_ready = False
    last_browser_ready = desktop_browser_running(uid)
    if last_browser_ready and browser_started_at is None:
        browser_started_at = time.monotonic()
    elif not last_browser_ready:
        browser_started_at = None
    last_apps_ready = daily_apps_installed()
    last_lightdm_ready = subprocess.run(
        ["systemctl", "is-active", "--quiet", "lightdm"], check=False
    ).returncode == 0
    browser_settled = browser_started_at is not None and time.monotonic() - browser_started_at >= 10
    if last_app_ready and browser_settled and last_lightdm_ready and last_apps_ready:
        last_render_ready = application_rendered()
        if not last_render_ready:
            break
    if last_app_ready and browser_settled and last_lightdm_ready and last_apps_ready and last_render_ready:
        message = "CENTIPEDE_DESKTOP_READY: LightDM, rendered Centipede app, Chromium, and everyday apps are ready"
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
    f"lightdm={last_lightdm_ready} web={last_app_ready} chromium={last_browser_ready} "
    f"rendered={last_render_ready} apps={last_apps_ready}"
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
    f"launcher={launcher_detail.replace(chr(10), ' ')[:800]}; "
    f"render_check={last_render_detail}"
)
report_serial(diagnostic)
sys.exit(1)

