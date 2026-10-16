"""Install/reboot only disposable QEMU image files using a temporary CI seed key."""
import argparse
import base64
from contextlib import contextmanager
import hashlib
import importlib.util
import json
import os
import re
from pathlib import Path
import shlex
import socket
import subprocess
import tarfile
import tempfile
import time

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('smoke',ROOT/'scripts/qemu-headless-server-smoke.py')
smoke=importlib.util.module_from_spec(spec);spec.loader.exec_module(smoke)
EXPECTED='f99dbee4489cdfc8af0e714f499705abbdc3e0b795ca74bcf8c3261c981eb18b'
SOURCE_COMMIT='801315d801c3d4e77297510d4d27a014e39ac031'


def run(*args,timeout=600):
    return subprocess.run(args,check=True,capture_output=True,text=True,timeout=timeout).stdout.strip()


def headless_shutdown_config(text):
    updated=[];count=0
    for line in text.splitlines():
        if re.match(r'\s*append\s+',line,re.I) and 'centipede.server=1' in line:
            for flag in ('noprompt','noeject'):
                if flag not in line.split():line+=' '+flag
            count+=1
        updated.append(line)
    return '\n'.join(updated)+'\n',count


def write_test_boot_config(path,content):
    if path.is_symlink() or not path.is_file():raise ValueError('Expected regular extracted BIOS configuration')
    path.chmod(path.stat().st_mode|0o200)
    path.write_text(content)


def wait_receipt(process,serial,timeout=600):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        if process.poll() is not None:raise RuntimeError('VM exited before configured receipt')
        value=smoke.configured(serial.read_text(errors='replace') if serial.exists() else '')
        if value:return value
        time.sleep(2)
    raise TimeoutError('VM did not configure server')


def connect(process,serial,monitor,key,known,proof):
    receipt=wait_receipt(process,serial)
    # A listening process may still be killed if systemd ExecStartPost has not
    # completed. Require the independent guest key exchange before using it.
    deadline=time.monotonic()+180
    while 'CENTIPEDE_SERVER_SSH_LISTENING ' not in serial.read_text(errors='replace'):
        if process.poll() is not None:raise RuntimeError('VM exited before stable SSH readiness')
        if time.monotonic()>=deadline:raise TimeoutError('Guest key exchange readiness marker missing')
        time.sleep(2)
    ip=smoke.guest_address(receipt)
    with socket.socket() as reservation:
        reservation.bind(('127.0.0.1',0));port=reservation.getsockname()[1]
    with socket.socket(socket.AF_UNIX) as control:
        control.settimeout(15);control.connect(str(monitor));smoke.monitor_reply(control)
        control.sendall(('hostfwd_add n0 tcp:127.0.0.1:'+str(port)+'-'+ip+':22\n').encode())
        response=smoke.monitor_reply(control)
        (proof/'monitor.log').write_text(response)
        if 'Error' in response or 'Could not' in response:raise RuntimeError('VM forwarding rejected')
    deadline=time.monotonic()+90;scanned=''
    while time.monotonic()<deadline:
        scan=subprocess.run(['ssh-keyscan','-T','3','-p',str(port),'-t','ed25519','127.0.0.1'],capture_output=True,text=True,timeout=10)
        if scan.stdout.strip():scanned=scan.stdout.strip();break
        time.sleep(2)
    if not scanned:raise TimeoutError('VM SSH did not answer')
    fingerprint=base64.b64encode(hashlib.sha256(base64.b64decode(scanned.split()[2])).digest()).decode().rstrip('=')
    if fingerprint!=receipt['host_key_sha256']:raise ValueError('VM host key differs from trusted serial receipt')
    known.write_text(scanned+'\n')
    options=['-F','/dev/null','-i',str(key),'-p',str(port),'-o','IdentitiesOnly=yes','-o','BatchMode=yes',
             '-o','ConnectTimeout=10','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+str(known)]
    def ssh(command,timeout=600):return run('ssh',*options,'centipede-admin@127.0.0.1',command,timeout=timeout)
    if ssh('id -un')!='centipede-admin':raise ValueError('Positive seed-key login did not reach expected account')
    return receipt,ssh,options,port


def boot(image,target,sentinel,serial,monitor,log):
    command=['qemu-system-x86_64','-machine','pc','-accel','tcg,thread=multi','-smp','4','-m','4096','-display','none',
             '-serial','file:'+str(serial),'-monitor','unix:'+str(monitor)+',server=on,wait=off',
             '-drive','file='+str(target)+',format=raw,if=none,id=target',
             '-device','virtio-blk-pci,drive=target,serial=CENTIPEDE-VM-TARGET',
             '-drive','file='+str(sentinel)+',format=raw,if=none,id=sentinel',
             '-device','virtio-blk-pci,drive=sentinel,serial=CENTIPEDE-VM-SAFE',
             '-netdev','user,id=n0,net=169.254.0.0/16,host=169.254.1.1,dhcpstart=169.254.1.15',
             '-device','e1000,netdev=n0','-no-reboot']
    if image:command+=['-cdrom',str(image),'-boot','order=d']
    else:command+=['-boot','order=c']
    return subprocess.Popen(command,stdout=log,stderr=log)


def stop(process):
    if process and process.poll() is None:
        process.terminate()
        try:process.wait(timeout=20)
        except subprocess.TimeoutExpired:process.kill();process.wait(timeout=10)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image',type=Path);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    proof=args.output.resolve();report={'status':'failed','physical_disk_writes':False,
        'owner_physical_key_login_verified':False,'base_source_commit':SOURCE_COMMIT,
        'tested_source_commit':os.environ.get('GITHUB_SHA'),
        'shared_executor_sha256':smoke.digest(ROOT/'scripts/qemu-offline-install.py'),
        'planner_sha256':smoke.digest(ROOT/'scripts/headless-install-plan.py'),
        'bootstrap_sha256':smoke.digest(ROOT/'packaging/live-build/config/includes.chroot/usr/local/libexec/centipede-server-bootstrap.py')}
    process=None
    @contextmanager
    def workspace():
        nonlocal process
        with tempfile.TemporaryDirectory(prefix='centipede-install-vm-') as temporary:
            try:yield temporary
            finally:stop(process);process=None
    try:
        if not args.image.is_file() or args.image.is_symlink() or smoke.digest(args.image)!=EXPECTED:
            raise ValueError('Expected unchanged verified owner ISO')
        with workspace() as temporary:
            temp=Path(temporary);key=temp/'test-key';wrong=temp/'wrong-key'
            for path in (key,wrong):run('ssh-keygen','-q','-t','ed25519','-N','','-f',str(path))
            seed=temp/'test-seed.json'
            seed.write_text(json.dumps({'version':1,'public_key':key.with_suffix('.pub').read_text().strip(),
                'network':'direct','hostname':'centipede-vm-test','admin':True}))
            test_iso=temp/'ephemeral-test.iso'
            menu=temp/'isolinux'
            run('xorriso','-osirrox','on','-indev',str(args.image.resolve()),'-extract','/isolinux',str(menu),timeout=120)
            menu.chmod(menu.stat().st_mode|0o700)
            image_command=['xorriso','-indev',str(args.image.resolve()),'-outdev',str(test_iso),'-boot_image','any','replay',
                           '-map',str(seed),'/centipede-server.json']
            entries=0
            for config in menu.glob('*.cfg'):
                content,count=headless_shutdown_config(config.read_text())
                if count:
                    write_test_boot_config(config,content);entries+=count
                    image_command+=['-map',str(config),'/isolinux/'+config.name]
            if not entries:raise ValueError('No server BIOS boot entry available for noninteractive shutdown')
            run(*image_command,'-commit',timeout=600)
            report['test_iso_customizations']=['ephemeral public seed','noprompt/noeject server shutdown arguments']
            test_hash=smoke.digest(test_iso)
            squash=temp/'filesystem.squashfs'
            run('xorriso','-osirrox','on','-indev',str(test_iso),'-extract','/live/filesystem.squashfs',str(squash),timeout=600)
            squash_hash=smoke.digest(squash);squash.unlink()
            report['source_squashfs_sha256']=squash_hash
            target=temp/'target.raw';sentinel=temp/'sentinel.raw'
            with target.open('wb') as file:file.truncate(16*1024**3)
            with sentinel.open('wb') as file:file.write(b'UNSELECTED CENTIPEDE SENTINEL\n');file.truncate(64*1024**2)
            sentinel_before=smoke.digest(sentinel)
            archive=temp/'install-source.tar'
            names=['scripts/headless-install-plan.py','scripts/qemu-offline-install.py',
                   'packaging/live-build/config/includes.chroot/usr/local/libexec/centipede-server-bootstrap.py',
                   'packaging/live-build/config/includes.chroot/etc/systemd/system/centipede-server-bootstrap.service',
                   'packaging/live-build/config/includes.chroot/etc/systemd/system/centipede-server-ssh.service']
            with tarfile.open(archive,'w') as tar:
                for name in names:tar.add(ROOT/name,arcname=name,recursive=False)
            live=proof/'live';live.mkdir(exist_ok=True)
            with (live/'qemu.log').open('w') as log:
                monitor=temp/'live-monitor.sock';serial=live/'serial.log'
                process=boot(test_iso,target,sentinel,serial,monitor,log)
                receipt,ssh,options,port=connect(process,serial,monitor,key,temp/'known-live',live)
                (live/'boot-receipt.json').write_text(json.dumps(receipt,indent=2))
                scp_options=[]
                for index,value in enumerate(options):
                    scp_options.append('-P' if value=='-p' and index%2==0 else value)
                run('scp',*scp_options,str(archive),'centipede-admin@127.0.0.1:install-source.tar',timeout=90)
                ssh('mkdir -p install-source && tar -xf install-source.tar -C install-source')
                script='/home/centipede-admin/install-source/scripts/headless-install-plan.py'
                inventory=json.loads(ssh(shlex.join(['sudo','-n','python3',script,'inventory'])))
                candidates=[disk for disk in inventory['blockdevices'] if disk.get('serial')=='CENTIPEDE-VM-TARGET']
                if len(candidates)!=1:raise ValueError('Expected one dedicated disposable target')
                disk=candidates[0];planpath='/run/centipede/install-plan.json'
                ssh(shlex.join(['sudo','-n','python3',script,'plan','--target',disk['path'],'--serial',disk['serial'],
                    '--size',str(disk['size']),'--output',planpath]))
                plan=json.loads(ssh('sudo -n cat '+planpath));(proof/'plan.json').write_text(json.dumps(plan,indent=2))
                command=['sudo','-n','python3','/home/centipede-admin/install-source/scripts/qemu-offline-install.py',
                         '--plan',planpath,'--review-confirmation',plan['confirmation'],
                         '--execution-confirmation','INSTALL DISPOSABLE QEMU '+plan['plan_sha256']+' '+squash_hash,
                         '--source-sha256',squash_hash,'--receipt','/run/centipede/install-receipt.json']
                try:ssh(shlex.join(command),timeout=1200)
                finally:
                    try:(proof/'executor-receipt.json').write_text(ssh('sudo -n cat /run/centipede/install-receipt.json'))
                    except subprocess.CalledProcessError:pass
                execution=json.loads((proof/'executor-receipt.json').read_text())
                if execution['phase']!='installed-awaiting-independent-boot-proof':raise ValueError('Executor did not complete offline stage')
                try:ssh('sudo -n poweroff',timeout=30)
                except subprocess.CalledProcessError:pass
                process.wait(timeout=90);process=None
            installed=proof/'installed';installed.mkdir(exist_ok=True)
            with (installed/'qemu.log').open('w') as log:
                # No optical device or live ISO exists in this second VM command.
                process=boot(None,target,sentinel,installed/'serial.log',temp/'installed-monitor.sock',log)
                receipt,ssh,options,port=connect(process,installed/'serial.log',temp/'installed-monitor.sock',key,temp/'known-installed',installed)
                if receipt.get('boot_mode')!='installed':raise ValueError('Target boot still reports live mode')
                if receipt['host_key_sha256']!=execution['installed_host_key_sha256']:
                    raise ValueError('Installed host key differs from pre-reboot installer receipt')
                if receipt['host_key_sha256']==json.loads((live/'boot-receipt.json').read_text())['host_key_sha256']:
                    raise ValueError('Installed host reused ephemeral live host key')
                actual_root=ssh('findmnt -n -o SOURCE /')
                if actual_root!=disk['path']+'1':raise ValueError('Installed root is not the selected disk partition')
                ssh('test ! -e /run/live/medium/centipede-server.json && sudo -n true')
                wrong_options=list(options);wrong_options[3]=str(wrong)
                denial=subprocess.run(['ssh',*wrong_options,'centipede-admin@127.0.0.1','true'],capture_output=True,text=True,timeout=20)
                if denial.returncode!=255 or 'Permission denied (publickey)' not in denial.stderr:raise ValueError('Wrong key was not denied')
                (installed/'boot-receipt.json').write_text(json.dumps(receipt,indent=2))
                stop(process);process=None
            if smoke.digest(sentinel)!=sentinel_before:raise ValueError('Unselected sentinel disk changed')
            if smoke.digest(args.image)!=EXPECTED or smoke.digest(test_iso)!=test_hash:raise ValueError('Live source ISO changed')
            report.update(status='passed',installed_boot_without_iso=True,positive_seed_key_login=True,wrong_key_denied=True,
                          unique_installed_host_key=True,unselected_sentinel_unchanged=True,source_isos_unchanged=True,
                          installed_root=actual_root,base_image_sha256=EXPECTED,test_iso_sha256=test_hash)
    except Exception as error:
        report['error_type']=type(error).__name__;report['error']=str(error)
        if isinstance(error,subprocess.CalledProcessError):
            report['tool_exit_code']=error.returncode
            report['tool_stdout']=(error.stdout or '')[-8000:]
            report['tool_stderr']=(error.stderr or '')[-8000:]
        raise
    finally:
        stop(process)
        (proof/'receipt.json').write_text(json.dumps(report,indent=2)+'\n')


if __name__=='__main__':main()
