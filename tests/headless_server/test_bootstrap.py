import base64
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]
MODULE=ROOT/'packaging/live-build/config/includes.chroot/usr/local/libexec/centipede-server-bootstrap.py'
spec=importlib.util.spec_from_file_location('bootstrap',MODULE)
bootstrap=importlib.util.module_from_spec(spec);spec.loader.exec_module(bootstrap)


def seed(**changes):
    key=base64.b64encode(struct.pack('>I',11)+b'ssh-ed25519'+struct.pack('>I',32)+b'k'*32).decode()
    return {'version':1,'public_key':'ssh-ed25519 '+key,'network':'direct',**changes}


class SeedTests(unittest.TestCase):
    def test_public_key_only_and_admin_requires_explicit_opt_in(self):
        self.assertFalse(bootstrap.validate_seed(seed())['admin'])
        self.assertTrue(bootstrap.validate_seed(seed(admin=True))['admin'])
        for change in [{'admin':'yes'},{'version':True},{'public_key':'PRIVATE KEY'},
                       {'public_key':seed()['public_key']+'\nssh-ed25519 bad'},
                       {'network':'shared'},{'network':[]},{'hostname':'host;command'},{'format_disk':'/dev/sda'}]:
            with self.assertRaises(ValueError):bootstrap.validate_seed(seed(**change))

    def test_public_key_wire_format_is_verified(self):
        for blob in [b'',b'ssh-ed25519',struct.pack('>I',11)+b'ssh-ed25519'+struct.pack('>I',32)+b'x'*31]:
            with self.assertRaises(ValueError):bootstrap.validate_seed(seed(public_key='ssh-ed25519 '+base64.b64encode(blob).decode()))

    def test_direct_ethernet_needs_no_router_or_default_gateway(self):
        direct=bootstrap.network_profile(bootstrap.validate_seed(seed()))
        self.assertIn('method=link-local',direct)
        self.assertIn('never-default=true',direct)
        self.assertNotIn('method=shared',direct)
        self.assertIn('[ipv4]\nmethod=auto',bootstrap.network_profile(bootstrap.validate_seed(seed(network='dhcp'))))

    def test_seed_is_bounded_and_does_not_accept_unknown_authority(self):
        with tempfile.TemporaryDirectory() as temporary:
            path=Path(temporary)/'seed.json';path.write_text(json.dumps(seed()))
            self.assertEqual(bootstrap.read_seed(path)['version'],1)
            path.write_text(' '*4097)
            with self.assertRaises(ValueError):bootstrap.read_seed(path)


class BootTests(unittest.TestCase):
    def test_server_profile_does_not_activate_existing_internal_swap(self):
        script=(ROOT/'scripts/build-live-image.sh').read_text()
        self.assertIn("SERVER_FLAGS='centipede.server=1 systemd.unit=multi-user.target nomodeset noswap'",script)
        self.assertIn('console=ttyS0,115200n8',script)

    def test_personalized_server_autoboots_bios_and_uefi_without_menu_input(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);(root/'isolinux').mkdir();(root/'boot/grub').mkdir(parents=True)
            (root/'isolinux/isolinux.cfg').write_text('UI vesamenu.c32\nTIMEOUT 0\nDEFAULT old\n')
            (root/'isolinux/live.cfg').write_text('label live\n append boot=live centipede.server=1 systemd.unit=multi-user.target\nlabel safe\n append boot=live centipede.server=1 nomodeset\n')
            (root/'boot/grub/grub.cfg').write_text('set timeout=0\nmenuentry "Server" { linux /live/vmlinuz centipede.server=1 }\n')
            bootstrap.configure_boot_menu(root)
            self.assertIn('ONTIMEOUT live', (root/'isolinux/isolinux.cfg').read_text())
            self.assertIn('TIMEOUT 50',(root/'isolinux/isolinux.cfg').read_text())
            self.assertIn('set timeout=5',(root/'boot/grub/grub.cfg').read_text())

    def test_missing_server_boot_entry_is_not_silently_accepted(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);(root/'isolinux').mkdir()
            (root/'isolinux/live.cfg').write_text('label live\n append boot=live\n')
            with self.assertRaises(ValueError):bootstrap.configure_boot_menu(root)


if __name__=='__main__':unittest.main()
