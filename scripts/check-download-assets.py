#!/usr/bin/env python3
"""Check pinned beginner downloads against the actual published GitHub Release.

This is a read-only release inventory verification, not proof of signing, a safe
installer, physical compatibility, or current-main binary contents.
"""
import json
import os
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
REPO_API = "https://api.github.com/repos/wests-cmd/Centipede-os"


def validate_tag(local: dict, tag_ref: dict) -> None:
    """Pin the release's actual Git tag to the source SHA advertised to users."""
    expected_tag = local.get("releaseTag")
    expected_sha = local.get("sourceCommit")
    if not isinstance(expected_sha, str) or not re.fullmatch(r"[0-9a-f]{40}", expected_sha):
        raise AssertionError("Published preview sourceCommit must be a full lowercase commit SHA.")
    if not isinstance(tag_ref, dict) or tag_ref.get("ref") != f"refs/tags/{expected_tag}":
        raise AssertionError("Git tag reference does not match the pinned preview tag.")
    obj = tag_ref.get("object")
    if not isinstance(obj, dict) or obj.get("type") != "commit" or obj.get("sha") != expected_sha:
        raise AssertionError("Published preview tag does not point to the pinned source commit.")


def validate_download_links(local: dict, guides: dict[str, str]) -> None:
    """Check actual clickable asset links, not merely prose mentioning a file."""
    base = f"https://github.com/wests-cmd/Centipede-os/releases/download/{local['releaseTag']}/"
    assets = local["assets"]
    expected = {base + item["fileName"] for item in assets.values()}
    readme_roles = ("live-usb", "iso", "docker", "checksums")
    expected_readme = {base + assets[role]["fileName"] for role in readme_roles}
    pattern = r"\]\((https?://[^)\s]+/releases/download/[^)\s]+)\)"
    for name, allowed in (("DOWNLOADS.md", expected), ("README.md", expected_readme)):
        found = set(re.findall(pattern, guides[name]))
        if found != allowed:
            raise AssertionError(f"{name}: clickable release asset URLs differ from the pinned catalog.")


def validate(local: dict, remote: dict) -> None:
    if local.get("releaseChannel") != "PREVIEW" or not remote.get("prerelease"):
        raise AssertionError("Expected the pinned GitHub Release to be marked as a preview.")
    if remote.get("draft") or remote.get("tag_name") != local.get("releaseTag"):
        raise AssertionError("Pinned tag differs from the published non-draft preview.")
    if remote.get("published_at") != local.get("releasePublishedAt"):
        raise AssertionError("Pinned release publication date does not match the published record.")
    actual = {}
    for item in remote.get("assets", []):
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        if name in actual:
            raise AssertionError("Published GitHub Release lists duplicate asset filenames.")
        actual[name] = item
    for role, details in local["assets"].items():
        name = details["fileName"]
        expected_url = (
            f"https://github.com/wests-cmd/Centipede-os/releases/download/"
            f"{local['releaseTag']}/{name}"
        )
        item = actual.get(name)
        if (not item or item.get("size") != details["sizeBytes"] or
                item.get("state") != "uploaded" or
                item.get("browser_download_url") != expected_url):
            raise AssertionError(
                f"{role}: {name} is missing, incomplete, changed size or points to a different URL"
            )
    # Only BUILDABLE targets may appear in the current download catalog. A
    # historical APK is not a current RC11 download while Android is BLOCKED.
    targets = json.loads((ROOT / "release/targets.json").read_text("utf-8"))["targets"]
    required = {name for name, info in targets.items() if info["status"] == "BUILDABLE"}
    required.add("checksums")
    required.add("manifest")
    if set(local["assets"]) != required:
        raise AssertionError(
            "Download catalog does not exactly match BUILDABLE targets and checksums."
        )
    print(f"PASS: {len(required)} checked, size-matched assets on {local['releaseTag']}.")
    print("NOTE: These published previews predate current main and are not permanent installers.")


def main() -> None:
    local = json.loads((ROOT / "release/published-preview.json").read_text("utf-8"))
    tag = local["releaseTag"]
    if not tag.startswith("v1.") or "/" in tag:
        raise AssertionError("Unexpected release tag.")
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "centipede-download-integrity-check",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.environ.get("GITHUB_TOKEN", "")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(f"{REPO_API}/releases/tags/{tag}", headers=headers)
    tag_request = Request(f"{REPO_API}/git/ref/tags/{tag}", headers=headers)
    try:
        with urlopen(request, timeout=20) as reply:
            remote = json.load(reply)
        with urlopen(tag_request, timeout=20) as reply:
            tag_ref = json.load(reply)
    except (HTTPError, URLError, TimeoutError) as exc:
        raise SystemExit(f"Cannot verify published release inventory: {exc}") from exc
    validate_tag(local, tag_ref)
    validate(local, remote)
    validate_download_links(local, {
        name: (ROOT / name).read_text("utf-8")
        for name in ("README.md", "DOWNLOADS.md")
    })


if __name__ == "__main__":
    main()
