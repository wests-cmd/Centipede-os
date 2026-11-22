#!/usr/bin/env python3
"""Check pinned beginner downloads against the actual published GitHub Release.

This is a read-only release inventory verification, not proof of signing, a safe
installer, physical compatibility, or current-main binary contents.
"""
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
REPO_API = "https://api.github.com/repos/wests-cmd/Centipede-os"


def validate(local: dict, remote: dict) -> None:
    if local.get("releaseChannel") != "PREVIEW" or not remote.get("prerelease"):
        raise AssertionError("Expected the pinned GitHub Release to be marked as a preview.")
    if remote.get("draft") or remote.get("tag_name") != local.get("releaseTag"):
        raise AssertionError("Pinned tag differs from the published non-draft preview.")
    if remote.get("published_at") != local.get("releasePublishedAt"):
        raise AssertionError("Pinned release publication date does not match the published record.")
    actual = {
        item.get("name"): item.get("size")
        for item in remote.get("assets", [])
        if isinstance(item, dict)
    }
    for role, details in local["assets"].items():
        name = details["fileName"]
        if actual.get(name) != details["sizeBytes"]:
            raise AssertionError(
                f"{role}: {name} is absent or changed size in the published GitHub release"
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
    try:
        with urlopen(request, timeout=20) as reply:
            remote = json.load(reply)
    except (HTTPError, URLError, TimeoutError) as exc:
        raise SystemExit(f"Cannot verify published release inventory: {exc}") from exc
    validate(local, remote)


if __name__ == "__main__":
    main()
