"""Experimental offline BIOS installer restricted to a disposable QEMU guest.

This is not a production disk installer. It has no hardware execution mode.
"""
import argparse
from contextlib import contextmanager
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('plan',Path(__file__).with_name('headless-install-plan.py'))
planner=importlib.util.module_from_spec(spec);spec.loader.exec_module(planner)
SERIAL='CENTIPEDE-VM-TARGET'
SIZE=16*1024**3
SOURCE=Path('/run/live/medium/live/filesystem.squashfs')


def digest(path):
    with Path(path).open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def guard(plan,inventory,review_confirmation,execution_confirmation,source_sha256,vendor,product,uid):
    if uid!=0:raise PermissionError('Disposable VM installer requires root inside that VM')
    if vendor.strip()!='QEMU' or not product.strip().startswith('Standard PC'):
        raise PermissionError('Only a disposable QEMU guest is supported; no physical hardware mode')
    target=plan['payload']['target']
    if target['serial']!=SERIAL or target['size']!=SIZE:
        raise PermissionError('Only the dedicated 16 GiB disposable test disk is supported')
    planner.confirm(plan,inventory,review_confirmation)
    if len(source_sha256)!=64 or any(c not in '0123456789abcdef' for c in source_sha256):
        raise ValueError('Expected lowercase source squashfs SHA256')
    expected='INSTALL DISPOSABLE QEMU '+plan['plan_sha256']+' '+source_sha256
    if execution_confirmation!=expected:raise PermissionError('Separate disposable installation confirmation did not match')
    return target


def partition_path(target):
    return target+('p1' if target[-1].isdigit() else '1')


def installed_files(target,uuid):
    if not uuid or any(c not in '0123456789abcdefABCDEF-' for c in uuid):raise ValueError('Invalid installed filesystem UUID')
    grub=('set timeout=3\nset default=0\nmenuentry "Centipede headless server" {\n'
          '  search --no-floppy --fs-uuid --set=root '+uuid+'\n'
          '  linux /boot/vmlinuz-centipede root=UUID='+uuid+' ro boot=local nomodeset noswap systemd.unit=multi-user.target centipede.installed-server=1 console=tty0 console=ttyS0,115200n8\n'
          '  initrd /boot/initrd-centipede.img\n}\n')
    return {'etc/fstab':'UUID='+uuid+' / ext4 defaults 0 1\n','boot/grub/grub.cfg':grub,
            'etc/default/grub':'GRUB_DEFAULT=0\nGRUB_TIMEOUT=3\nGRUB_DISABLE_OS_PROBER=true\nGRUB_CMDLINE_LINUX_DEFAULT="boot=local nomodeset noswap systemd.unit=multi-user.target centipede.installed-server=1 console=tty0 console=ttyS0,115200n8"\n',
            'etc/machine-id':''}


@contextmanager
def mount_workspace():
    directory=Path(tempfile.mkdtemp(prefix='centipede-vm-root-'))
    try:yield str(directory)
    finally:
        # Never recursively clean a directory which might still be mounted.
        try:directory.rmdir()
        except OSError:pass


def install(args):
    plan=json.loads(args.plan.read_text())
    vendor=Path('/sys/class/dmi/id/sys_vendor').read_text()
    product=Path('/sys/class/dmi/id/product_name').read_text()
    inventory=planner.collect()
    target=guard(plan,inventory,args.review_confirmation,args.execution_confirmation,args.source_sha256,vendor,product,os.geteuid())
    if SOURCE.is_symlink() or not SOURCE.is_file() or digest(SOURCE)!=args.source_sha256:
        raise ValueError('Live squashfs does not match independently supplied source hash')
    for tool in ('sfdisk','udevadm','mkfs.ext4','mount','umount','unsquashfs','blkid','grub-install'):
        if not shutil.which(tool):raise ValueError('Required offline VM tool missing: '+tool)
    template=ROOT/'packaging/live-build/config/includes.chroot'
    sources={name:template/name for name in (
        'usr/local/libexec/centipede-server-bootstrap.py',
        'etc/systemd/system/centipede-server-bootstrap.service',
        'etc/systemd/system/centipede-server-ssh.service')}
    if any(not path.is_file() for path in sources.values()):raise ValueError('Trusted installed bootstrap templates missing')
    seed=Path('/run/live/medium/centipede-server.json')
    if not seed.is_file() or seed.is_symlink():raise ValueError('Owner public seed missing')
    subprocess.run(['python3',str(sources['usr/local/libexec/centipede-server-bootstrap.py']),'--validate-seed',str(seed)],check=True,capture_output=True,text=True,timeout=30)
    receipt={'phase':'starting-disposable-vm-install','installation_complete':False,'target':target,'source_sha256':args.source_sha256,'commands':[]}
    def run(*command,input=None):
        try:result=subprocess.run(command,input=input,text=True,capture_output=True,check=True,timeout=600)
        except subprocess.CalledProcessError as error:
            receipt['commands'].append({'argv':list(command),'exit_code':error.returncode,'stderr':(error.stderr or '')[-8000:]})
            raise
        receipt['commands'].append({'argv':list(command),'exit_code':result.returncode})
        return result.stdout.strip()
    # Re-observe immediately before the first destructive tool. Guards cannot be
    # disabled from the CLI, and the source disk remains excluded by the plan.
    guard(plan,planner.collect(),args.review_confirmation,args.execution_confirmation,args.source_sha256,vendor,product,os.geteuid())
    device=target['path'];partition=partition_path(device)
    try:
        run('sfdisk',device,input='label: dos\nunit: sectors\n\nstart=2048,type=83,bootable\n')
        run('udevadm','settle','--timeout=30')
        run('mkfs.ext4','-F','-L','CENTIPEDE_ROOT',partition)
        uuid=run('blkid','-s','UUID','-o','value',partition)
        with mount_workspace() as directory:
            mount=Path(directory);mounted=False
            receipt['mountpoint']=str(mount)
            try:
                run('mount','--',partition,str(mount));mounted=True
                run('unsquashfs','-f','-d',str(mount),str(SOURCE))
                for relative,source in sources.items():
                    destination=mount/relative;destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,destination)
                bootstrap=mount/'etc/systemd/system/centipede-server-bootstrap.service'
                bootstrap.write_text(bootstrap.read_text().replace('ConditionKernelCommandLine=centipede.server=1','ConditionKernelCommandLine=centipede.installed-server=1'))
                ssh=mount/'etc/systemd/system/centipede-server-ssh.service'
                ssh.write_text(ssh.read_text().replace('ConditionKernelCommandLine=centipede.server=1','ConditionKernelCommandLine=centipede.installed-server=1'))
                shutil.copyfile(seed,mount/'etc/centipede/server-seed.json')
                for source_name,destination in [('vmlinuz','boot/vmlinuz-centipede'),('initrd.img','boot/initrd-centipede.img')]:
                    source=Path('/run/live/medium/live')/source_name
                    if not source.resolve().is_relative_to(Path('/run/live/medium/live')):raise ValueError('Kernel source escapes live medium')
                    shutil.copyfile(source,mount/destination)
                for relative,content in installed_files(target,uuid).items():
                    destination=mount/relative;destination.parent.mkdir(parents=True,exist_ok=True);destination.write_text(content)
                for path in (mount/'etc/ssh').glob('ssh_host_*_key*'):path.unlink()
                for unit in ('centipede-desktop-readiness.service','lightdm.service'):
                    path=mount/'etc/systemd/system'/unit
                    if path.is_symlink() or path.exists():path.unlink()
                    path.symlink_to('/dev/null')
                run('grub-install','--target=i386-pc','--boot-directory='+str(mount/'boot'),'--recheck',device)
                run('sync')
            finally:
                if mounted:
                    run('umount','--',str(mount))
                    receipt['target_unmounted']=True
        if digest(SOURCE)!=args.source_sha256:raise ValueError('Live source changed during installation')
        receipt['phase']='installed-awaiting-independent-boot-proof'
        # This only records copying/bootloader execution. Installation completion
        # requires separate reboot without ISO and positive owner-key SSH proof.
    except Exception as error:
        receipt['phase']='failed-disposable-vm-install'
        receipt['error_type']=type(error).__name__
        receipt['error']=str(error)
        raise
    finally:
        args.receipt.write_text(json.dumps(receipt,indent=2)+'\n')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan',type=Path,required=True)
    parser.add_argument('--review-confirmation',required=True)
    parser.add_argument('--execution-confirmation',required=True)
    parser.add_argument('--source-sha256',required=True)
    parser.add_argument('--receipt',type=Path,required=True)
    install(parser.parse_args())
