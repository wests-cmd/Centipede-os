"""No-network acceptance tests for immutable, fail-closed RC11 publication policy."""
import unittest
import json
from pathlib import Path
from unittest.mock import patch

import prepare_preview_release as release

SHA = "a" * 40
OLD = "b" * 40


def green_runs(sha=SHA):
    return [
        {
            "name": name, "head_sha": sha, "head_branch": "main",
            "event": "push", "status": "completed", "conclusion": "success",
            "run_attempt": 1, "created_at": "2026-11-22T04:00:00Z",
        }
        for name in release.REQUIRED
    ]


class PreviewGateTests(unittest.TestCase):
    def test_blocked_mobile_jobs_cannot_run_from_repository_variable_alone(self):
        root = Path(__file__).resolve().parents[1]
        manifest = json.loads((root / "release/targets.json").read_text("utf-8"))
        workflow = (root / ".github/workflows/platform-builds.yml").read_text("utf-8")
        self.assertEqual(manifest["targets"]["android"]["status"], "BLOCKED")
        self.assertEqual(manifest["targets"]["ios"]["status"], "BLOCKED")
        self.assertIn("needs.target-policy.outputs.android == 'BUILDABLE'", workflow)
        self.assertIn("needs.target-policy.outputs.ios == 'BUILDABLE'", workflow)
        self.assertIn("Enforce manifest target status before optional signed mobile jobs", workflow)
        self.assertIn("CENTIPEDE_ENABLE_SIGNED_ANDROID_RELEASE", workflow)
        self.assertIn("CENTIPEDE_ENABLE_SIGNED_IOS_RELEASE", workflow)

    def test_accepted_tag_is_one_numbered_candidate_only(self):
        release.validate_candidate(SHA, "1.0.1")
        for version, tag, sha in [
            ("1.0.0", release.TAG, SHA),
            ("1.0.1", "v1.0.1", SHA),
            ("1.0.1", "v1.0.1-rc.12", SHA),
            ("1.0.1", release.TAG, "short"),
        ]:
            with self.assertRaises(release.ReleaseError):
                release.validate_candidate(sha, version, tag)

    def test_all_three_real_main_push_runs_are_required(self):
        status, _ = release.check_green_runs(green_runs(), SHA)
        self.assertEqual(status, "ready")
        for name in release.REQUIRED:
            status, _ = release.check_green_runs(
                [r for r in green_runs() if r["name"] != name], SHA
            )
            self.assertEqual(status, "pending")

    def test_pr_only_results_and_different_source_never_authorize_release(self):
        for mutator in [
            lambda r: r.update(event="pull_request"),
            lambda r: r.update(head_branch="feature/attacker"),
            lambda r: r.update(head_sha=OLD),
        ]:
            runs = green_runs()
            mutator(runs[0])
            self.assertEqual(release.check_green_runs(runs, SHA)[0], "pending")

    def test_a_single_failed_required_check_blocks_tag(self):
        for name in release.REQUIRED:
            runs = green_runs()
            next(r for r in runs if r["name"] == name)["conclusion"] = "failure"
            self.assertEqual(release.check_green_runs(runs, SHA)[0], "failed")

    def test_partial_results_never_authorize_release(self):
        runs = green_runs()
        runs[0]["status"] = "in_progress"
        runs[0]["conclusion"] = None
        self.assertEqual(release.check_green_runs(runs, SHA)[0], "pending")

    def test_coordinator_creates_single_tag_then_explicitly_dispatches_workflow(self):
        calls = []

        def fake_api(method, endpoint, token, payload=None, allow_missing=False):
            calls.append((method, endpoint, payload))
            if endpoint == "branches/main":
                return {"commit": {"sha": SHA}}
            if endpoint.startswith("actions/runs?"):
                return {"workflow_runs": green_runs()}
            if method == "GET" and endpoint.startswith("git/ref/tags/"):
                return None
            if method == "GET" and endpoint.startswith("releases/tags/"):
                return None
            if method == "POST" and endpoint in ("git/refs", "actions/workflows/release.yml/dispatches"):
                return {}
            raise AssertionError((method, endpoint))

        with patch.object(release, "api", side_effect=fake_api):
            release.execute(SHA, "unittest-token", "1.0.1")
        tags = [call for call in calls if call[:2] == ("POST", "git/refs")]
        dispatches = [call for call in calls if call[:2] == ("POST", "actions/workflows/release.yml/dispatches")]
        self.assertEqual(tags, [("POST", "git/refs", {"ref": "refs/tags/v1.0.1-rc.11", "sha": SHA})])
        self.assertEqual(dispatches, [
            ("POST", "actions/workflows/release.yml/dispatches", {"ref": "v1.0.1-rc.11"})
        ])

    def test_existing_tag_can_never_be_moved_or_replaced(self):
        def fake_api(method, endpoint, token, payload=None, allow_missing=False):
            if endpoint == "branches/main":
                return {"commit": {"sha": SHA}}
            if endpoint.startswith("actions/runs?"):
                return {"workflow_runs": green_runs()}
            if endpoint.startswith("git/ref/tags/"):
                return {"object": {"type": "commit", "sha": OLD}}
            if endpoint.startswith("releases/tags/"):
                return None
            raise AssertionError("must stop before creating a new ref or dispatch")

        with patch.object(release, "api", side_effect=fake_api):
            with self.assertRaises(release.ReleaseError):
                release.execute(SHA, "unittest-token", "1.0.1")

    def test_existing_completed_preview_is_not_dispatched_twice(self):
        calls = []

        def fake_api(method, endpoint, token, payload=None, allow_missing=False):
            calls.append((method, endpoint))
            if endpoint == "branches/main":
                return {"commit": {"sha": SHA}}
            if endpoint.startswith("actions/runs?"):
                return {"workflow_runs": green_runs()}
            if endpoint.startswith("git/ref/tags/"):
                return {"object": {"type": "commit", "sha": SHA}}
            if endpoint.startswith("releases/tags/"):
                names = [
                    "centipede-os-1.0.1-desktop-web-bundle.tar.gz",
                    "centipede-os-1.0.1-x86_64.iso",
                    "centipede-os-1.0.1-live-usb-x86_64.iso",
                    "centipede-os-1.0.1-x86_64.qcow2",
                    "centipede-docker-image-1.0.1.tar",
                    "release-manifest.json",
                    "SHA256SUMS",
                ]
                return {"tag_name": release.TAG, "prerelease": True, "draft": False,
                        "assets": [{"name": x, "size": 100} for x in names]}
            raise AssertionError("must not write when already published")

        with patch.object(release, "api", side_effect=fake_api):
            release.execute(SHA, "unittest-token", "1.0.1")
        self.assertFalse(any(method == "POST" for method, _ in calls))

    def test_completed_one_shot_from_older_main_commit_is_a_noop_on_future_pushes(self):
        calls = []

        def api_stub(method, endpoint, token, payload=None, allow_missing=False):
            calls.append((method, endpoint))
            if endpoint.startswith("git/ref/tags/"):
                return {"object": {"type": "commit", "sha": OLD}}
            if endpoint.startswith("releases/tags/"):
                names = [
                    "centipede-os-1.0.1-desktop-web-bundle.tar.gz",
                    "centipede-os-1.0.1-x86_64.iso",
                    "centipede-os-1.0.1-live-usb-x86_64.iso",
                    "centipede-os-1.0.1-x86_64.qcow2",
                    "centipede-docker-image-1.0.1.tar",
                    "release-manifest.json", "SHA256SUMS",
                ]
                return {
                    "tag_name": release.TAG, "prerelease": True, "draft": False,
                    "assets": [{"name": x, "size": 1500} for x in names],
                }
            raise AssertionError("completed one-shot release must never requalify or write")

        with patch.object(release, "api", side_effect=api_stub):
            release.execute(SHA, "unittest-token", "1.0.1")
        self.assertEqual([method for method, _ in calls], ["GET", "GET"])

    def test_existing_partial_preview_is_not_marked_a_success(self):
        def fake_api(method, endpoint, token, payload=None, allow_missing=False):
            if endpoint == "branches/main":
                return {"commit": {"sha": SHA}}
            if endpoint.startswith("actions/runs?"):
                return {"workflow_runs": green_runs()}
            if endpoint.startswith("git/ref/tags/"):
                return {"object": {"type": "commit", "sha": SHA}}
            if endpoint.startswith("releases/tags/"):
                return {"tag_name": release.TAG, "prerelease": True, "draft": False,
                        "assets": [{"name": "SHA256SUMS", "size": 100}]}
            raise AssertionError("must not modify a partial release")
        with patch.object(release, "api", side_effect=fake_api):
            with self.assertRaises(release.ReleaseError):
                release.execute(SHA, "unittest-token", "1.0.1")


if __name__ == "__main__":
    unittest.main()
