"""Offline security and persistence tests; require no Playwright or internet access."""
import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from unittest.mock import patch

from harness.browser import allowed_request, approved_link
from harness.core import HarnessStore, PolicyError, validate_public_url, validate_routine
from harness.service import Handler, Harness, HarnessHTTPServer, handle_api

SHA = "a" * 64
SAMPLE = {
    "name": "Public information monitor",
    "url": "https://example.com/news",
    "intervalSeconds": 900,
    "steps": [{"action": "screenshot"}],
}


class PolicyTests(unittest.TestCase):
    def test_strict_public_https_only(self):
        for url in [
            "http://example.com", "https://localhost", "https://127.0.0.1",
            "https://192.168.1.1", "https://[::1]", "https://169.254.169.254",
            "https://metadata.google.internal", "https://server.local",
            "https://example.com:8443", "https://user:pass@example.com",
            "file:///etc/passwd", "javascript:alert(1)", "https://example.com/#frag",
        ]:
            with self.subTest(url=url), self.assertRaises(PolicyError):
                validate_public_url(url, resolve_dns=False)
        self.assertEqual(validate_public_url("https://example.com/a", resolve_dns=False), "https://example.com/a")

    def test_dns_rebinding_checks_reject_mixed_private_public_results(self):
        with patch("harness.core.socket.getaddrinfo", return_value=[
            (2, 1, 6, "", ("93.184.215.14", 443)),
            (2, 1, 6, "", ("127.0.0.1", 443)),
        ]):
            with self.assertRaises(PolicyError):
                validate_public_url("https://example.com")
        with patch("harness.core.socket.getaddrinfo", side_effect=OSError("offline")):
            with self.assertRaises(PolicyError):
                validate_public_url("https://example.com")

    def test_rejects_unapproved_arguments_and_sensitive_form_controls(self):
        self.assertEqual(validate_routine(SAMPLE, resolve_dns=False)["steps"][0]["action"], "screenshot")
        bad = [
            {**SAMPLE, "intervalSeconds": 1},
            {**SAMPLE, "intervalSeconds": True},
            {**SAMPLE, "url": "http://example.com"},
            {**SAMPLE, "steps": [{"action": "shell", "cmd": "rm -rf /"}]},
            {**SAMPLE, "steps": [{"action": "click_link", "selector": "a", "script": "x"}]},
            {**SAMPLE, "steps": [{"action": "fill", "selector": "input[type=password]", "value": "x"}]},
            {**SAMPLE, "steps": [{"action": "fill", "selector": "input", "value": "x" * 201}]},
            {**SAMPLE, "steps": [{"action": "click_link", "selector": "a; body"}]},
            {**SAMPLE, "steps": [{"action": "screenshot"}] * 6},
            {**SAMPLE, "unexpected": True},
        ]
        for routine in bad:
            with self.subTest(routine=routine), self.assertRaises(PolicyError):
                validate_routine(routine, resolve_dns=False)

    def test_browser_does_not_send_post_or_visit_off_origin(self):
        root = "https://example.com/task"
        self.assertTrue(allowed_request("https://example.com/news", root))
        for url, method in [
            ("https://example.com/news", "POST"),
            ("https://example.com/news", "DELETE"),
            ("https://internal.example.com/", "GET"),
            ("https://127.0.0.1/", "GET"),
            ("http://example.com/", "GET"),
            ("https://example.com:8443/", "GET"),
            ("https://other.example.net/", "GET"),
        ]:
            with self.subTest(url=url, method=method):
                self.assertFalse(allowed_request(url, root, method))
        self.assertEqual(
            approved_link("/news", "https://example.com/tasks", root, resolve_dns=False),
            "https://example.com/news",
        )
        for href in ["javascript:alert(1)", "https://other.example.com", "http://example.com", "#anchor"]:
            with self.assertRaises(PolicyError):
                approved_link(href, root, root, resolve_dns=False)


class DatabaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.database = str(Path(self.tmp.name) / "private" / "queue.sqlite3")
        self.store = HarnessStore(self.database)

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def add(self):
        return self.store.add_routine(SAMPLE, resolve_dns=False)

    def test_autonomy_off_by_default_even_with_owner_approved_routine(self):
        self.add()
        self.assertFalse(self.store.status()["enabled"])
        self.assertIsNone(self.store.claim_due(now=9999999999))
        self.assertEqual(self.store.status()["runs"], [])

    def test_single_bounded_run_and_no_duplicate_claim(self):
        added = self.add()
        self.store.control("enable")
        claimed = self.store.claim_due(now=9999999999)
        self.assertIsNotNone(claimed)
        self.assertEqual(claimed["routineId"], added["id"])
        self.assertIsNone(self.store.claim_due(now=9999999999))
        self.store.complete_run(claimed["runId"], outcome="completed",
                                summary="Public page changed", sha256=SHA, screenshot="safe.png")
        self.assertEqual(self.store.status()["runs"][0]["state"], "completed")
        with self.assertRaises(PolicyError):
            self.store.complete_run(claimed["runId"], outcome="completed")
        self.assertIsNone(self.store.claim_due(now=9999999999))

    def test_pause_disable_and_recovery_are_persisted(self):
        self.add()
        self.store.control("enable")
        self.store.control("pause")
        self.assertIsNone(self.store.claim_due(now=9999999999))
        self.store.control("resume")
        run = self.store.claim_due(now=9999999999)
        self.assertTrue(run)
        self.store.close()
        self.store = HarnessStore(self.database)
        status = self.store.status()
        self.assertTrue(status["enabled"])
        self.assertFalse(status["paused"])
        self.assertEqual(status["runs"][0]["state"], "interrupted")
        self.assertIn("no automatic replay", status["runs"][0]["summary"])
        self.assertIsNone(self.store.claim_due(now=9999999999))
        self.store.control("disable")
        self.assertFalse(self.store.status()["enabled"])

    def test_delete_stops_future_work_but_preserves_audit_receipts(self):
        added = self.add()
        self.store.control("enable")
        job = self.store.claim_due(now=9999999999)
        self.store.complete_run(job["runId"], outcome="failed", summary="An error occurred")
        self.store.delete_routine(added["id"])
        self.assertEqual(self.store.status()["routines"], [])
        self.assertEqual(len(self.store.status()["runs"]), 1)

    def test_fixed_api_does_not_expose_arbitrary_worker_operations(self):
        self.assertEqual(handle_api("GET", "/v1/status", None, self.store)[0], 200)
        self.assertEqual(handle_api("POST", "/v1/control", {"action": "enable"}, self.store)[0], 200)
        with patch("harness.core.socket.getaddrinfo", return_value=[
            (2, 1, 6, "", ("93.184.216.34", 443))
        ]):
            self.assertEqual(handle_api("POST", "/v1/routines", SAMPLE, self.store)[0], 201)
        self.assertEqual(handle_api("POST", "/v1/routines/delete", {"id": "bad"}, self.store)[0], 200)
        self.assertEqual(handle_api("POST", "/v1/run-shell", {}, self.store)[0], 404)
        with self.assertRaises(PolicyError):
            handle_api("POST", "/v1/control", {"action": "run_untrusted_command"}, self.store)


class ServiceAuthTests(unittest.TestCase):
    def test_service_does_not_allow_anonymous_control(self):
        with tempfile.TemporaryDirectory() as folder:
            harness = Harness(folder)
            server = HarnessHTTPServer(("127.0.0.1", 0), Handler, harness, "b" * 64)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                url = f"http://127.0.0.1:{server.server_port}/v1/status"
                with self.assertRaises(HTTPError) as blocked:
                    urlopen(Request(url), timeout=2)
                self.assertEqual(blocked.exception.code, 401)
                with urlopen(Request(url, headers={"Authorization": "Bearer " + "b" * 64}), timeout=2) as response:
                    self.assertFalse(json.load(response)["enabled"])
                control = Request(
                    f"http://127.0.0.1:{server.server_port}/v1/control",
                    data=json.dumps({"action": "enable"}).encode("utf-8"),
                    method="POST", headers={"Authorization": "Bearer " + "b" * 64},
                )
                with urlopen(control, timeout=2) as response:
                    self.assertTrue(json.load(response)["enabled"])
                with self.assertRaises(HTTPError) as blocked:
                    urlopen(Request(url, data=b'{"action":"disable"}', method="POST"), timeout=2)
                self.assertEqual(blocked.exception.code, 401)
                self.assertTrue(harness.store.status()["enabled"])
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=2)
                harness.store.close()


class PackagingTests(unittest.TestCase):
    def test_compose_never_mounts_host_desktop_or_docker_socket(self):
        root = Path(__file__).resolve().parents[2]
        compose = (root / "docker-compose.harness.yml").read_text("utf-8")
        dockerfile = (root / "Dockerfile.harness").read_text("utf-8")
        self.assertIn('127.0.0.1:3011:3011', compose)
        self.assertIn("read_only: true", compose)
        self.assertIn("no-new-privileges:true", compose)
        self.assertIn("cap_drop:", compose)
        self.assertIn("mem_limit: 1024m", compose)
        self.assertIn("USER pwuser", dockerfile)
        worker_parts = compose.split("  centipede-harness:\n", 1)
        self.assertEqual(len(worker_parts), 2, "Missing independently confined worker")
        worker = worker_parts[1].split("\nvolumes:", 1)[0]
        self.assertIn("- ALL", worker)
        self.assertIn("- SYS_CHROOT", worker)
        self.assertIn("cpu_shares: 128", worker)
        self.assertIn("oom_score_adj: 500", worker)
        self.assertNotIn("- SYS_ADMIN", worker)
        self.assertNotIn("privileged: true", worker)
        self.assertNotIn("seccomp:unconfined", worker)
        workflow = (root / ".github/workflows/background-harness.yml").read_text("utf-8")
        self.assertIn("--cap-drop ALL --cap-add SYS_CHROOT", workflow)
        self.assertIn("--cpu-shares 128 --oom-score-adj 500", workflow)
        self.assertIn("--security-opt seccomp=harness/seccomp_profile.json", workflow)
        self.assertIn("chromium_sandbox=True", (root / "harness/browser.py").read_text("utf-8"))
        for bad in ["/var/run/docker.sock", "/tmp/.X11-unix", "DISPLAY=", "/home/your-user"]:
            self.assertNotIn(bad, compose)
            self.assertNotIn(bad, dockerfile)


if __name__ == "__main__":
    unittest.main()
