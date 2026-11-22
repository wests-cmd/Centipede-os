#!/usr/bin/env python3
"""One-shot, fail-closed v1.0.1-rc.10 release coordinator.

Called only by trusted GitHub Actions on main, following a real green CI run,
or by an authorized operator via workflow_dispatch for recovery. This script
NEVER marks an installed OS stable, moves an existing tag, or publishes files.
The verified tag triggers the existing release.yml via workflow_dispatch
because GITHUB_TOKEN-created tags do not themselves trigger push workflows.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

TAG = "v1.0.1-rc.10"  # Explicitly ONE candidate; future releases require a reviewed change.
REPO = "wests-cmd/Centipede-os"
REQUIRED = (
    "Centipede OS Continuous Integration",
    "CodeQL Advanced",
    "Documentation navigation",
)
MAX_CHECK_SECONDS = 900
CHECK_INTERVAL_SECONDS = 20


class ReleaseError(RuntimeError):
    pass


def validate_candidate(source: str, version: str, tag: str = TAG) -> None:
    if not re.fullmatch(r"[0-9a-f]{40}", source):
        raise ReleaseError("An exact full 40-character source SHA is mandatory.")
    if version != "1.0.1" or tag != TAG or not tag.startswith("v" + version + "-rc."):
        raise ReleaseError("This coordinator may create ONLY the pinned v1.0.1-rc.10 preview.")


def check_green_runs(runs: list[dict], sha: str) -> tuple[str, str]:
    """Return ('ready'|'pending'|'failed', explanation). Never accept PR-only runs."""
    matches: dict[str, dict] = {}
    for r in runs:
        if (r.get("head_sha") != sha or r.get("event") != "push" or
                r.get("head_branch") != "main" or r.get("name") not in REQUIRED):
            continue
        name = r["name"]
        if name not in matches or (r.get("run_attempt", 0), r.get("created_at", "")) > (
                matches[name].get("run_attempt", 0), matches[name].get("created_at", "")):
            matches[name] = r
    for name in REQUIRED:
        run = matches.get(name)
        if not run:
            return "pending", name + ": no exact-commit main-push run yet"
        if run.get("status") != "completed":
            return "pending", name + ": " + str(run.get("status"))
        if run.get("conclusion") != "success":
            return "failed", name + ": " + str(run.get("conclusion"))
    return "ready", "all three trusted exact-SHA main-push workflows passed"


def api(method: str, endpoint: str, token: str, payload: dict | None = None,
        allow_missing: bool = False):
    request = Request(
        f"https://api.github.com/repos/{REPO}/{endpoint}",
        data=None if payload is None else json.dumps(payload).encode("utf-8"),
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "centipede-exact-sha-rc10-release",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urlopen(request, timeout=30) as response:
            data = response.read()
            return json.loads(data) if data else None
    except HTTPError as error:
        if allow_missing and error.code == 404:
            return None
        # Do not log request headers, tokens or error response payloads.
        raise ReleaseError(f"GitHub API {method} {endpoint.split('?')[0]}: HTTP {error.code}") from error


def current_main_sha(token: str) -> str:
    branch = api("GET", "branches/main", token)
    return str(branch["commit"]["sha"])


def check_runs_until_ready(source: str, token: str) -> None:
    for attempt in range(MAX_CHECK_SECONDS // CHECK_INTERVAL_SECONDS + 1):
        if current_main_sha(token) != source:
            raise ReleaseError("main changed while verifying the release candidate; abandoning the stale SHA.")
        query = urlencode({"head_sha": source, "per_page": 100})
        data = api("GET", f"actions/runs?{query}", token)
        status, reason = check_green_runs(data.get("workflow_runs", []), source)
        if status == "ready":
            print(f"Release candidate checks: {reason}.", flush=True)
            return
        if status == "failed":
            raise ReleaseError("Release candidate blocked: " + reason)
        if attempt == MAX_CHECK_SECONDS // CHECK_INTERVAL_SECONDS:
            break
        print("Awaiting release gate: " + reason, flush=True)
        time.sleep(CHECK_INTERVAL_SECONDS)
    raise ReleaseError("Timed out: required exact-SHA CI/CodeQL/docs results never all passed.")


def complete_candidate(release: dict | None, version: str) -> bool:
    if release is None:
        return False
    if release.get("tag_name") != TAG or not release.get("prerelease") or release.get("draft"):
        raise ReleaseError("Existing release has the wrong tag, channel or draft state.")
    expected_targets = {
        f"centipede-os-{version}-desktop-web-bundle.tar.gz",
        f"centipede-os-{version}-x86_64.iso",
        f"centipede-os-{version}-live-usb-x86_64.iso",
        f"centipede-os-{version}-x86_64.qcow2",
        f"centipede-docker-image-{version}.tar",
        "release-manifest.json",
        "SHA256SUMS",
    }
    published = {
        asset.get("name"): asset.get("size", 0)
        for asset in release.get("assets", [])
    }
    if any(name not in published or not isinstance(published[name], int) or
           published[name] <= 0 for name in expected_targets):
        raise ReleaseError("Published candidate has missing/empty assets; do not overwrite released bytes.")
    return True


def execute(source: str, token: str, version: str) -> None:
    validate_candidate(source, version)
    # A one-shot coordinator must remain harmless after future main commits.
    # If the older pinned candidate already shipped, do not try to move it.
    tag = api("GET", "git/ref/tags/" + quote(TAG, safe=""), token, allow_missing=True)
    if tag is not None:
        obj = tag.get("object") or {}
        if obj.get("type") != "commit":
            raise ReleaseError("Existing candidate tag is not a lightweight commit reference.")
        existing_release = api("GET", "releases/tags/" + quote(TAG, safe=""), token, allow_missing=True)
        if complete_candidate(existing_release, version):
            print(f"One-shot candidate {TAG} was already published; leaving immutable tag unchanged.")
            return
        if obj.get("sha") != source:
            raise ReleaseError("Tag points to a different commit; never move or overwrite a preview tag.")
    if current_main_sha(token) != source:
        raise ReleaseError("Refusing to publish: trigger SHA is not current main.")
    check_runs_until_ready(source, token)
    if current_main_sha(token) != source:
        raise ReleaseError("main moved after verification; refusing to tag an older commit.")

    if tag is None:
        print(f"Creating immutable candidate reference {TAG} at {source}.", flush=True)
        api("POST", "git/refs", token, {"ref": "refs/tags/" + TAG, "sha": source})
    # A GITHUB_TOKEN-authored tag does NOT trigger the tag-push release workflow.
    # workflow_dispatch is explicitly permitted and runs release.yml at TAG.
    print(f"Dispatching trusted release.yml at refs/tags/{TAG}.", flush=True)
    api("POST", "actions/workflows/release.yml/dispatches", token, {"ref": TAG})
    print("Release workflow dispatched; build, boot, checksum and publisher gates decide publication.")


def main() -> None:
    token = os.getenv("GITHUB_TOKEN", "")
    sha = os.getenv("SOURCE_SHA", "")
    repository = os.getenv("GITHUB_REPOSITORY", "")
    if repository != REPO or not token:
        raise ReleaseError("Only an authenticated workflow in the owner repository can publish this candidate.")
    version = json.loads(Path("package.json").read_text("utf-8"))["version"]
    execute(sha, token, version)


if __name__ == "__main__":
    try:
        main()
    except ReleaseError as exc:
        print("BLOCKED:", exc, file=sys.stderr)
        sys.exit(1)
