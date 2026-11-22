"""Unattended computer use limited to an isolated, no-login headless browser.

Not a host desktop controller. A job cannot read the user's files/cookies, send
keyboard input to their active session, run arbitrary JS/shell, or submit forms.
Navigation and DOM interaction are performed inside a fresh browser context.
"""
from __future__ import annotations

import hashlib
import ipaddress
import re
import socket
from pathlib import Path
from urllib.parse import urljoin, urlparse

from .core import MAX_DURATION, PolicyError, validate_public_url

MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024


def allowed_request(request_url: str, root_url: str, method: str = "GET") -> bool:
    if method != "GET":
        return False
    try:
        url, root = urlparse(request_url), urlparse(root_url)
        return (
            url.scheme == "https" and
            url.hostname is not None and url.hostname.lower() == root.hostname.lower() and
            url.port in (None, 443) and root.port in (None, 443) and
            not url.username and not url.password
        )
    except ValueError:
        return False


def approved_link(href: str | None, current: str, root: str,
                  *, resolve_dns: bool = True) -> str:
    if not href or href.strip().startswith(("javascript:", "data:", "blob:", "#")):
        raise PolicyError("Only ordinary same-site HTTPS links may be clicked.")
    target = urljoin(current, href)
    target = validate_public_url(target, resolve_dns=resolve_dns)
    if not allowed_request(target, root):
        raise PolicyError("Cross-site or non-GET navigation is not authorized.")
    return target


def browser_job(job: dict, state_dir: str, should_stop) -> tuple[str, str | None, str | None]:
    """Return (human-readable summary, body SHA-256, screenshot filename).

    All runtime imports are local so unit tests can run without Chromium. The
    official Playwright Python container supplies its browser dependency.
    """
    from playwright.sync_api import sync_playwright

    root = validate_public_url(job["url"])
    name = job["runId"]
    if not re.fullmatch(r"run_[0-9a-f]{24}", name):
        raise PolicyError("Unsafe run receipt ID.")
    state = Path(state_dir).resolve()
    shots = state / "screenshots"
    shots.mkdir(parents=True, mode=0o700, exist_ok=True)
    screenshot_name: str | None = None

    def check() -> None:
        if should_stop():
            raise PolicyError("Paused/disabled during a run; no further browser actions allowed.")

    with sync_playwright() as playwright:
        # No display server / X11 / Wayland / active user profile is attached.
        browser = playwright.chromium.launch(
            headless=True, args=["--disable-background-networking", "--no-first-run"],
        )
        try:
            context = browser.new_context(
                accept_downloads=False, service_workers="block",
                java_script_enabled=False, permissions=[],
                viewport={"width": 1024, "height": 768},
            )
            context.set_default_timeout(4000)
            context.set_default_navigation_timeout(12000)

            def route_filter(route):
                try:
                    if allowed_request(route.request.url, root, route.request.method):
                        route.continue_()
                    else:
                        route.abort("blockedbyclient")
                except Exception:
                    try:
                        route.abort("blockedbyclient")
                    except Exception:
                        pass

            context.route("**/*", route_filter)
            page = context.new_page()
            check()
            page.goto(root, wait_until="domcontentloaded", timeout=12000)
            check()
            if not allowed_request(page.url, root):
                raise PolicyError("Browser navigated outside the authorized public site.")
            for step in job["steps"]:
                check()
                action = step["action"]
                if action == "click_link":
                    # Click only ordinary anchor links. Arbitrary buttons and
                    # form submit actions are excluded even when CSS matches.
                    selector = step["selector"]
                    locator = page.locator(selector).first
                    tag = locator.evaluate("(el) => el.tagName.toLowerCase()")
                    if tag != "a":
                        raise PolicyError("Click refused: only anchor links are permitted.")
                    approved = approved_link(locator.get_attribute("href"), page.url, root)
                    locator.click(timeout=4000)
                    if not allowed_request(page.url, root):
                        raise PolicyError("Browser left the authorized site.")
                    # Navigation may be delayed; enforce target address after click.
                    check()
                elif action == "fill":
                    selector = step["selector"]
                    locator = page.locator(selector).first
                    field_type = (locator.get_attribute("type") or "text").lower()
                    if field_type in {"password", "file", "hidden", "submit", "button"}:
                        raise PolicyError("Sensitive, upload or submit controls are not allowed.")
                    locator.fill(step["value"], timeout=4000)
                elif action == "screenshot":
                    screenshot_name = name + ".png"
                    target = shots / screenshot_name
                    page.screenshot(path=str(target), full_page=False, timeout=5000)
                    if target.stat().st_size > MAX_SCREENSHOT_BYTES:
                        target.unlink(missing_ok=True)
                        raise PolicyError("Screenshot too large; receipt discarded.")
                else:
                    raise PolicyError("Unrecognized browser action.")
                check()

            text = page.locator("body").inner_text(timeout=4000)[:16000]
            digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
            changed = "changed" if digest != job.get("previousDigest") else "unchanged"
            summary = f"Public page {changed}; browser used isolated, script-disabled context."
            return summary, digest, screenshot_name
        finally:
            browser.close()
