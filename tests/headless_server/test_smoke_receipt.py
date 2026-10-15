import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('smoke', Path(__file__).resolve().parents[2] / 'scripts/qemu-headless-server-smoke.py')
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


class ReceiptTests(unittest.TestCase):
    def test_kernel_prefix_and_truncated_output(self):
        self.assertIsNone(smoke.configured('CENTIPEDE_SERVER_CONFIGURED {'))
        self.assertEqual(smoke.configured('[12] CENTIPEDE_SERVER_CONFIGURED {"phase":"configured"}\r\n')['phase'], 'configured')

    def test_only_non_loopback_direct_ipv4_is_forwarded(self):
        receipt = {'addresses': [
            {'ifname': 'lo', 'addr_info': [{'family': 'inet', 'local': '169.254.1.1'}]},
            {'ifname': 'eth0', 'addr_info': [{'family': 'inet6', 'local': 'fe80::1'}, {'family': 'inet', 'local': '169.254.4.5'}]}]}
        self.assertEqual(smoke.guest_address(receipt), '169.254.4.5')
        with self.assertRaises(ValueError):
            smoke.guest_address({'addresses': [{'ifname': 'eth0', 'addr_info': [{'family': 'inet', 'local': '10.0.2.15'}]}]})
