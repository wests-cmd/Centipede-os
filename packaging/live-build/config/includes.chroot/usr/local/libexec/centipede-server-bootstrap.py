"""Opt-in live server access. Never installs an OS or writes physical disks."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import struct
import subprocess
import sys
import time
import uuid

USER = 'centipede-admin'
SEED = Path('/run/live/medium/centipede-server.json')


def validate_seed(data):
    if not isinstance(data, dict) or set(data)-{'version','public_key','network','hostname','admin'}:
        raise ValueError('Use only version, public_key, network and hostname in the seed')
    if type(data.get('version')) is not int or data['version'] != 1:
        raise ValueError('Seed version must be 1')
    if not isinstance(data.get('network'),str) or data['network'] not in {'dhcp','direct'}:
        raise ValueError('Network must be dhcp or direct Ethernet')
    hostname=data.get('hostname','centipede-server')
    if not isinstance(hostname,str) or not re.fullmatch(r'[a-z][a-z0-9-]{0,61}[a-z0-9]|[a-z]',hostname):
        raise ValueError('Use a simple lowercase hostname')
    key=data.get('public_key')
    if not isinstance(key,str) or len(key)>1024 or '\n' in key or '\r' in key:
        raise ValueError('One Ed25519 public key is required; never supply a private key')
    fields=key.strip().split()
    if len(fields)<2 or fields[0]!='ssh-ed25519':raise ValueError('Use an Ed25519 public key')
    try:blob=base64.b64decode(fields[1],validate=True)
    except ValueError as error:raise ValueError('Invalid public key encoding') from error
    if blob[:15]!=struct.pack('>I',11)+b'ssh-ed25519' or blob[15:19]!=struct.pack('>I',32) or len(blob)!=51:
        raise ValueError('Invalid Ed25519 key structure')
    if type(data.get('admin',False)) is not bool:raise ValueError('Admin must be an explicit boolean')
    return {'version':1,'public_key':' '.join(fields[:2]),'network':data['network'],'hostname':hostname,'admin':data.get('admin',False)}


def read_seed(path):
    path=Path(path)
    if path.is_symlink() or not path.is_file() or path.stat().st_size>4096:raise ValueError('Invalid or oversized seed')
    return validate_seed(json.loads(path.read_text(encoding='utf-8')))


def network_profile(seed):
    method='link-local' if seed['network']=='direct' else 'auto'
    return ('[connection]\nid=Centipede server Ethernet\nuuid='+str(uuid.uuid5(uuid.NAMESPACE_DNS,'centipede-server-ethernet'))+
        '\ntype=ethernet\nautoconnect=true\nautoconnect-priority=100\n[ethernet]\n'
        '[ipv4]\nmethod='+method+'\nmay-fail=false\n'+('never-default=true\n' if method=='link-local' else '')+
        '[ipv6]\nmethod=link-local\nnever-default=true\n')


def network_ready(seed,addresses):
    for interface in addresses:
        if interface.get('ifname')=='lo':continue
        for address in interface.get('addr_info',[]):
            if address.get('family')!='inet':continue
            value=address.get('local','')
            if seed['network']=='direct' and value.startswith('169.254.'):return True
            if seed['network']=='dhcp' and value and not value.startswith(('127.','169.254.')):return True
    return False


def configure_boot_menu(root):
    root=Path(root)
    chosen=None
    for path in sorted((root/'isolinux').glob('*.cfg')):
        label=None
        for line in path.read_text().splitlines():
            match=re.match(r'\s*label\s+(\S+)',line,re.I)
            if match:label=match[1]
            if re.match(r'\s*append\s+',line,re.I) and 'centipede.server=1' in line and label and chosen is None:
                chosen=label
    if not chosen:raise ValueError('No headless BIOS boot entry was generated')
    bios=root/'isolinux/isolinux.cfg'
    text=bios.read_text()
    text=re.sub(r'^\s*(?:timeout|ontimeout|prompt|default)\s+.*$', '',text,flags=re.M|re.I)
    bios.write_text(text+'\nDEFAULT '+chosen+'\nONTIMEOUT '+chosen+'\nPROMPT 0\nTIMEOUT 50\n')
    grub=root/'boot/grub/grub.cfg';text=grub.read_text()
    if 'centipede.server=1' not in text:raise ValueError('No headless UEFI boot entry was generated')
    text=re.sub(r'^\s*set (?:timeout|default|timeout_style)=.*$', '',text,flags=re.M)
    grub.write_text(text+'\nset default=0\nset timeout=5\nset timeout_style=hidden\n')


def run(*args,**kwargs):
    return subprocess.run(args,check=True,text=True,timeout=45,**kwargs)


def write(path,content,mode):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(content);path.chmod(mode)


def provision(seed):
    if os.geteuid()!=0:raise PermissionError('Server bootstrap requires root in the live image')
    if 'centipede.server=1' not in Path('/proc/cmdline').read_text().split():
        raise PermissionError('Headless server boot was not selected')
    if not Path('/run/live/medium').is_mount():raise ValueError('Expected live boot medium is not mounted')
    # Never enable the distro SSH service with its default authentication policy.
    if subprocess.run(['id','-u',USER],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode:
        run('useradd','--create-home','--shell','/bin/bash',USER)
        # Avoid a locked-account rejection without introducing a usable shared
        # password. SSH password and keyboard-interactive login are disabled.
        run('chpasswd',input=USER+':'+secrets.token_urlsafe(48)+'\n')
    write('/etc/centipede/server-keys/'+USER,seed['public_key']+'\n',0o644)
    if seed['admin']:
        write('/etc/sudoers.d/centipede-server-admin',USER+' ALL=(ALL:ALL) NOPASSWD: ALL\n',0o440)
        run('visudo','-c','-f','/etc/sudoers.d/centipede-server-admin')
    run('hostnamectl','set-hostname',seed['hostname'])
    profile='/run/NetworkManager/system-connections/centipede-server.nmconnection'
    write(profile,network_profile(seed),0o600)
    run('nmcli','connection','load',profile)
    run('nmcli','--wait','30','connection','up','uuid',str(uuid.uuid5(uuid.NAMESPACE_DNS,'centipede-server-ethernet')))
    run('ssh-keygen','-A')
    Path('/run/sshd').mkdir(mode=0o755,exist_ok=True)
    run('sshd','-t','-f','/etc/centipede/server-sshd.conf')
    run('loginctl','enable-linger',USER)
    deadline=time.monotonic()+45
    while True:
        addresses=json.loads(run('ip','-j','address','show',capture_output=True).stdout)
        if network_ready(seed,addresses):break
        if time.monotonic()>=deadline:raise TimeoutError('Requested IPv4 network is not ready; server receipt withheld')
        time.sleep(1)
    host_key=Path('/etc/ssh/ssh_host_ed25519_key.pub').read_text().split()[1]
    receipt={'phase':'configured','user':USER,'hostname':seed['hostname'],'network':seed['network'],'admin':seed['admin'],
        'host_key_sha256':base64.b64encode(hashlib.sha256(base64.b64decode(host_key)).digest()).decode().rstrip('='),
        'addresses':addresses,'installation_performed':False,'kingdom_installed':False}
    write('/run/centipede/server-ready',json.dumps(receipt,indent=2),0o644)
    run('systemctl','--no-block','start','centipede-server-ssh.service')
    print('CENTIPEDE_SERVER_CONFIGURED '+json.dumps(receipt),flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--validate-seed');parser.add_argument('--configure-boot-menu')
    args=parser.parse_args()
    if args.validate_seed:read_seed(args.validate_seed);print('Seed valid (public key only)')
    elif args.configure_boot_menu:configure_boot_menu(args.configure_boot_menu)
    else:provision(read_seed(SEED))
