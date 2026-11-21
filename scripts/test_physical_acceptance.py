#!/usr/bin/env python3
"""Pure safety tests: no actual Centipede installation or hardware is claimed."""
import importlib.util
import pathlib
import tempfile
import unittest

SOURCE = pathlib.Path(__file__).with_name("physical-acceptance.py")
SPEC = importlib.util.spec_from_file_location("centipede_physical_acceptance", SOURCE)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


class PhysicalAcceptanceTests(unittest.TestCase):
    def test_missing_kernel_meminfo_never_passes(self):
        self.assertEqual(mod.parse_available_memory("MemFree: 1000000 kB\n"), {})
        self.assertFalse(mod.check_memory({})[0])
        self.assertFalse(mod.check_memory({"MemTotal": 512000, "MemAvailable": 512001})[0])
        self.assertTrue(mod.check_memory({"MemTotal": 4096000, "MemAvailable": 800000})[0])
        self.assertFalse(mod.check_memory({"MemTotal": 4096000, "MemAvailable": 800})[0])

    def test_service_hardening_requires_all_properties(self):
        props = {
            "ActiveState": "active", "User": "centipede-web", "Group": "centipede-web",
            "NoNewPrivileges": "yes", "PrivateDevices": "yes",
            "ProtectSystem": "strict", "ProtectHome": "yes",
        }
        self.assertTrue(mod.hardened_service(props)[0])
        for key in props:
            bad = dict(props)
            bad.pop(key)
            self.assertFalse(mod.hardened_service(bad)[0])
        self.assertFalse(mod.hardened_service({**props, "User": "root"})[0])

    def test_receipts_are_private_and_never_claim_ga(self):
        with tempfile.TemporaryDirectory() as d:
            base = pathlib.Path(d) / "private"
            receipt = mod.private_receipt(base, {"gaCertified": False, "manualAcceptance": {
                "realKingdomTaskApprovalAndResult": "UNVERIFIED",
            }})
            self.assertEqual(receipt.stat().st_mode & 0o777, 0o600)
            value = receipt.read_text()
            self.assertIn('"gaCertified": false', value)
            self.assertIn('"UNVERIFIED"', value)

    def test_no_work_or_credentials_go_into_result_by_default(self):
        result = {"checks": {}}
        mod.record(result, "localApiHealth", False, "Not available.")
        self.assertEqual(result["checks"]["localApiHealth"]["result"], "NO")


if __name__ == "__main__":
    unittest.main()
