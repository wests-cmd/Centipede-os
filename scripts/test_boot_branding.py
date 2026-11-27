"""Run the real binary boot-menu hook against generated-menu fixtures."""
import importlib.util
import io
import pathlib
import shutil
import subprocess
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

HOOK = pathlib.Path(__file__).resolve().parents[1] / 'packaging/live-build/config/hooks/normal/0300-centipede-boot-menu.hook.binary'


@unittest.skipUnless(shutil.which('sh'), 'POSIX shell required; Linux CI runs these checks')
class BootBrandingTests(unittest.TestCase):
    def run_hook(self, image=True, theme=True, failsafe=True):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = pathlib.Path(temp.name)
        grub = root / 'boot/grub'
        grub.mkdir(parents=True)
        bios = root / 'isolinux'
        bios.mkdir()
        commands = 'menuentry "Live system" { linux /live/vmlinuz boot=live }\n'
        if failsafe:
            commands += 'menuentry "Live system (fail-safe mode)" { linux /live/vmlinuz boot=live nomodeset }\n'
        (grub / 'grub.cfg').write_text(commands)
        (bios / 'live.cfg').write_text('menu label Live system\nmenu label Live system (fail-safe mode)\nlinux /live/vmlinuz\nappend boot=live nomodeset\n')
        if theme:
            (grub / 'theme.cfg').write_text('# Existing graphical menu setup stays unchanged\n')
        if image:
            (grub / 'centipede-boot-emblem.png').write_bytes(b'fixture-image')
        result = subprocess.run(['sh', str(HOOK)], cwd=root, capture_output=True, text=True, timeout=5)
        return root, result

    def test_adds_conditional_image_without_replacing_boot_commands(self):
        root, result = self.run_hook()
        self.assertEqual(result.returncode, 0, result.stderr)
        grub = root / 'boot/grub'
        self.assertIn('linux /live/vmlinuz boot=live nomodeset', (grub / 'grub.cfg').read_text())
        self.assertIn('Safe Graphics', (grub / 'grub.cfg').read_text())
        self.assertIn('Safe Graphics', (root / 'isolinux/live.cfg').read_text())
        self.assertIn('source /boot/grub/centipede-branding.cfg', (grub / 'theme.cfg').read_text())
        snippet = (grub / 'centipede-branding.cfg').read_text()
        self.assertIn('if insmod png; then', snippet)
        self.assertIn('if background_image ', snippet)
        self.assertNotIn('terminal_output', snippet)

    def test_missing_image_retains_generated_text_menu(self):
        root, result = self.run_hook(image=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((root / 'boot/grub/centipede-branding.cfg').exists())
        self.assertNotIn('centipede-branding', (root / 'boot/grub/grub.cfg').read_text())

    def test_falls_back_to_grub_config_without_theme_file(self):
        root, result = self.run_hook(theme=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('source /boot/grub/centipede-branding.cfg', (root / 'boot/grub/grub.cfg').read_text())

    def test_missing_safe_graphics_still_fails(self):
        root, result = self.run_hook(failsafe=False)
        self.assertNotEqual(result.returncode, 0)


class DesktopReadinessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = pathlib.Path(__file__).resolve().parents[1] / "packaging/live-build/config/includes.chroot/usr/local/libexec/centipede-desktop-readiness.py"
        spec = importlib.util.spec_from_file_location("desktop_readiness", path)
        cls.readiness = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.readiness)

    def test_disappearing_process_during_status_read_does_not_abort_scan(self):
        entries = [SimpleNamespace(name="100"), SimpleNamespace(name="101")]

        class ExitingProcess(io.StringIO):
            def read(self, *args):
                raise ProcessLookupError(3, "No such process")

        def open_entry(path, *args, **kwargs):
            if path == "/proc/100/status":
                return ExitingProcess()
            if path == "/proc/101/status":
                return io.StringIO("Uid:\t1000\t1000\t1000\t1000\n")
            if path == "/proc/101/cmdline":
                return io.BytesIO(b"/usr/bin/chromium\0--start-maximized\0http://127.0.0.1:3000/\0")
            raise AssertionError(path)

        with patch.object(self.readiness.os, "scandir", return_value=entries), patch("builtins.open", side_effect=open_entry):
            self.assertTrue(self.readiness.desktop_browser_running(1000))

    def test_disappearing_process_does_not_produce_ready(self):
        with patch.object(self.readiness.os, "scandir", return_value=[SimpleNamespace(name="100")]), patch("builtins.open", side_effect=ProcessLookupError(3, "No such process")):
            self.assertFalse(self.readiness.desktop_browser_running(1000))


if __name__ == '__main__':
    unittest.main()
