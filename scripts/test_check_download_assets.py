"""Offline regression tests for pinned Centipede preview download provenance."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("check_download_assets", ROOT / "scripts/check-download-assets.py")
checker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checker)


class PublishedPreviewIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.local = json.loads((ROOT / "release/published-preview.json").read_text("utf-8"))
        self.ref = {
            "ref": "refs/tags/" + self.local["releaseTag"],
            "object": {"type": "commit", "sha": self.local["sourceCommit"]},
        }
        self.guides = {
            name: (ROOT / name).read_text("utf-8")
            for name in ("README.md", "DOWNLOADS.md")
        }
        tag = self.local["releaseTag"]
        self.remote = {
            "tag_name": tag,
            "prerelease": True,
            "draft": False,
            "published_at": self.local["releasePublishedAt"],
            "assets": [
                {
                    "name": details["fileName"],
                    "size": details["sizeBytes"],
                    "state": "uploaded",
                    "browser_download_url": (
                        f"https://github.com/wests-cmd/Centipede-os/releases/download/"
                        f"{tag}/{details['fileName']}"
                    ),
                }
                for details in self.local["assets"].values()
            ],
        }

    def test_exact_published_catalog_passes_offline(self):
        checker.validate_tag(self.local, self.ref)
        checker.validate(self.local, self.remote)
        checker.validate_download_links(self.local, self.guides)

    def test_tag_move_fails_even_when_asset_names_and_sizes_match(self):
        wrong = copy.deepcopy(self.ref)
        wrong["object"]["sha"] = "a" * 40
        with self.assertRaises(AssertionError):
            checker.validate_tag(self.local, wrong)

    def test_annotated_or_malformed_tag_fails_closed(self):
        for changed in (
            {"ref": self.ref["ref"], "object": {"type": "tag", "sha": self.ref["object"]["sha"]}},
            {"ref": "refs/tags/other", "object": self.ref["object"]},
            {"ref": self.ref["ref"], "object": None},
        ):
            with self.subTest(changed=changed), self.assertRaises(AssertionError):
                checker.validate_tag(self.local, changed)

    def test_missing_or_invalid_source_sha_fails(self):
        for sha in (None, "", "short", "Z" * 40):
            changed = dict(self.local, sourceCommit=sha)
            with self.subTest(sha=sha), self.assertRaises(AssertionError):
                checker.validate_tag(changed, self.ref)

    def test_asset_wrong_download_url_is_rejected(self):
        changed = copy.deepcopy(self.remote)
        changed["assets"][0]["browser_download_url"] = "https://example.org/incorrect-asset.tar"
        with self.assertRaises(AssertionError):
            checker.validate(self.local, changed)

    def test_asset_not_uploaded_is_rejected(self):
        changed = copy.deepcopy(self.remote)
        changed["assets"][0]["state"] = "new"
        with self.assertRaises(AssertionError):
            checker.validate(self.local, changed)

    def test_duplicate_asset_names_are_rejected(self):
        changed = copy.deepcopy(self.remote)
        changed["assets"].append(copy.deepcopy(changed["assets"][0]))
        with self.assertRaises(AssertionError):
            checker.validate(self.local, changed)

    def test_replaced_guide_link_is_rejected(self):
        changed = dict(self.guides)
        original = (
            f"https://github.com/wests-cmd/Centipede-os/releases/download/"
            f"{self.local['releaseTag']}/{self.local['assets']['live-usb']['fileName']}"
        )
        changed["DOWNLOADS.md"] = changed["DOWNLOADS.md"].replace(
            original, "https://example.org/releases/download/unsafe.iso"
        )
        with self.assertRaises(AssertionError):
            checker.validate_download_links(self.local, changed)

    def test_stale_or_unapproved_readme_asset_link_is_rejected(self):
        changed = dict(self.guides)
        original = (
            f"https://github.com/wests-cmd/Centipede-os/releases/download/"
            f"{self.local['releaseTag']}/{self.local['assets']['docker']['fileName']}"
        )
        changed["README.md"] = changed["README.md"].replace(
            original, original.replace(self.local["releaseTag"], "v1.0.0")
        )
        with self.assertRaises(AssertionError):
            checker.validate_download_links(self.local, changed)


if __name__ == "__main__":
    unittest.main()
