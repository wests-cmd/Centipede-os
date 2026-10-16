import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('acceptance',Path(__file__).resolve().parents[2]/'scripts/qemu-permanent-server-acceptance.py')
acceptance=importlib.util.module_from_spec(spec);spec.loader.exec_module(acceptance)


class AcceptanceTests(unittest.TestCase):
    def test_second_boot_has_no_live_media_and_uses_disposable_image_paths(self):
        with patch.object(acceptance.subprocess,'Popen') as launch:
            acceptance.boot(None,Path('/tmp/test-target.raw'),Path('/tmp/test-sentinel.raw'),Path('/tmp/serial.log'),Path('/tmp/monitor.sock'),None)
        command=launch.call_args.args[0]
        self.assertNotIn('-cdrom',command)
        self.assertIn('order=c',command)
        self.assertIn('file=/tmp/test-target.raw,format=raw,if=virtio,serial=CENTIPEDE-VM-TARGET',command)
        self.assertFalse(any(value.startswith('/dev/') for value in command))

    def test_live_boot_is_explicit_and_does_not_use_host_disks(self):
        with patch.object(acceptance.subprocess,'Popen') as launch:
            acceptance.boot(Path('/tmp/test-only.iso'),Path('/tmp/target.raw'),Path('/tmp/sentinel.raw'),Path('/tmp/serial.log'),Path('/tmp/monitor.sock'),None)
        command=launch.call_args.args[0]
        self.assertIn('-cdrom',command);self.assertIn('/tmp/test-only.iso',command)
        self.assertIn('order=d',command)
