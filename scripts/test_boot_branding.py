"""Run the real binary boot-menu hook against generated-menu fixtures."""
import pathlib
import shutil
import subprocess
import tempfile
import unittest

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


if __name__ == '__main__':
    unittest.main()
