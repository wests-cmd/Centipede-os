import copy
import importlib.util
from pathlib import Path
import unittest
import tempfile
from unittest.mock import patch
from test_install_plan import fixture

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('vm_install',ROOT/'scripts/qemu-offline-install.py')
vm=importlib.util.module_from_spec(spec);spec.loader.exec_module(vm)
spec=importlib.util.spec_from_file_location('server_bootstrap',ROOT/'packaging/live-build/config/includes.chroot/usr/local/libexec/centipede-server-bootstrap.py')
bootstrap=importlib.util.module_from_spec(spec);spec.loader.exec_module(bootstrap)


def vm_plan():
    inventory=fixture();target=inventory['blockdevices'][0]
    target['serial']=vm.SERIAL;target['size']=vm.SIZE
    plan=vm.planner.make_plan(inventory,copy.deepcopy(inventory),target['path'],vm.SERIAL,vm.SIZE)
    return inventory,plan


class DisposableInstallTests(unittest.TestCase):
    def test_mount_cleanup_never_recursively_deletes_nonempty_or_mounted_root(self):
        with vm.mount_workspace() as directory:
            root=Path(directory);sentinel=root/'must-survive';sentinel.write_text('mounted-root-placeholder')
        self.assertEqual(sentinel.read_text(),'mounted-root-placeholder')
        sentinel.unlink();root.rmdir()

    def test_guard_is_read_only_and_accepts_only_exact_disposable_vm(self):
        inventory,plan=vm_plan();source='a'*64
        confirmation='INSTALL DISPOSABLE QEMU '+plan['plan_sha256']+' '+source
        with patch.object(vm.subprocess,'run',side_effect=AssertionError('No disk or tool execution during guard')):
            target=vm.guard(plan,inventory,plan['confirmation'],confirmation,source,'QEMU','Standard PC (i440FX + PIIX, 1996)',0)
        self.assertEqual(target['serial'],vm.SERIAL)
        for vendor,product,uid in [('Dell Inc.','OptiPlex 755',0),('QEMU','OptiPlex 755',0),('QEMU','Standard PC',1000)]:
            with self.assertRaises(PermissionError):vm.guard(plan,inventory,plan['confirmation'],confirmation,source,vendor,product,uid)
        with self.assertRaises(PermissionError):vm.guard(plan,inventory,plan['confirmation'],'yes',source,'QEMU','Standard PC',0)

    def test_physical_disk_serial_cannot_use_disposable_executor(self):
        inventory=fixture();plan=vm.planner.make_plan(inventory,copy.deepcopy(inventory),'/dev/sda','OPTIPLEX-TARGET',80*1024**3)
        with self.assertRaises(PermissionError):vm.guard(plan,inventory,plan['confirmation'],'anything','a'*64,'QEMU','Standard PC',0)

    def test_generated_boot_uses_installed_root_without_live_medium(self):
        files=vm.installed_files({},'11111111-2222-3333-4444-555555555555')
        self.assertIn('root=UUID=',files['boot/grub/grub.cfg'])
        self.assertIn('centipede.installed-server=1',files['boot/grub/grub.cfg'])
        self.assertIn('noswap',files['boot/grub/grub.cfg'])
        self.assertNotIn('boot=live',files['boot/grub/grub.cfg'])
        self.assertEqual(files['etc/machine-id'],'')
        self.assertEqual(vm.partition_path('/dev/vda'),'/dev/vda1')
        self.assertEqual(vm.partition_path('/dev/nvme0n1'),'/dev/nvme0n1p1')
        with self.assertRaises(ValueError):vm.installed_files({},'uuid;command')

    def test_installed_boot_cannot_rely_on_live_usb(self):
        bootstrap.validate_boot_mode('root=UUID=x centipede.installed-server=1',False,True)
        with self.assertRaises(ValueError):bootstrap.validate_boot_mode('centipede.installed-server=1',True,True)
        with self.assertRaises(PermissionError):bootstrap.validate_boot_mode('centipede.server=1',False,True)
        with self.assertRaises(ValueError):bootstrap.validate_boot_mode('centipede.server=1',False,False)


if __name__=='__main__':unittest.main()
