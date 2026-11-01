"""Optional first deployment of an owner-pinned offline Kingdom bundle.

No partitioning, downloads, model installation or existing-service replacement.
Run only after independent installed-boot and owner SSH verification.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path,PurePosixPath
import re
import subprocess
import tarfile


def run(*argv):
    return subprocess.run(argv,check=True,capture_output=True,text=True,timeout=600).stdout.strip()


def guard(uid,cmdline,live_mounted,actual_serial,expected_serial):
    if uid!=0:raise PermissionError('Requires the existing owner administrator boundary')
    if 'centipede.installed-server=1' not in cmdline.split() or live_mounted:
        raise PermissionError('Verified persistent installed boot required')
    if not expected_serial.strip() or actual_serial.strip()!=expected_serial.strip():
        raise PermissionError('Installed root disk serial differs from owner expectation')


def relative(name):
    path=PurePosixPath(name)
    if not name or '\\' in name or path.is_absolute() or '..' in path.parts:
        raise ValueError('Unsafe bundle/archive member path')
    return path


def manifest_check(bundle,expected):
    manifest_path=bundle/'manifest.json'
    if manifest_path.is_symlink() or hashlib.sha256(manifest_path.read_bytes()).hexdigest()!=expected:
        raise ValueError('Owner-pinned manifest hash mismatch')
    manifest=json.loads(manifest_path.read_text())
    if not re.fullmatch(r'[0-9a-f]{40}',manifest.get('revision','')):raise ValueError('Expected immutable source revision')
    files=manifest.get('files',{})
    if not {'source.tar.gz','frontend.tar.gz'}<=files.keys():raise ValueError('Source and frontend hashes required')
    if not any(name.startswith('wheels/') for name in files):raise ValueError('Offline wheel hashes required')
    for name,expected_hash in files.items():
        parts=relative(name).parts;path=bundle.joinpath(*parts)
        if any(bundle.joinpath(*parts[:i]).is_symlink() for i in range(1,len(parts)+1)):
            raise ValueError('Symlink in offline bundle')
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=expected_hash:
            raise ValueError('Offline bundle hash mismatch: '+name)
    # Reject unlisted wheels so pip cannot resolve against an unreviewed artifact.
    if {p.relative_to(bundle).as_posix() for p in (bundle/'wheels').iterdir()}!={n for n in files if n.startswith('wheels/')}:
        raise ValueError('Wheel inventory differs from pinned manifest')
    requirements=manifest.get('requirements',[])
    if not requirements or any(not re.fullmatch(r'[A-Za-z0-9_.-]+==[A-Za-z0-9_.+!-]+',r) for r in requirements):
        raise ValueError('Only exact pinned package requirements supported')
    return manifest


def archive_members(path):
    with tarfile.open(path) as archive:
        members=archive.getmembers();seen=set()
        if len(members)>50000 or sum(m.size for m in members)>500_000_000:raise ValueError('Archive exceeds bounds')
        for member in members:
            name=str(relative(member.name))
            if name in seen or not(member.isfile() or member.isdir()):raise ValueError('Duplicate or unsafe archive member')
            seen.add(name)
        return members


def unpack(path,release):
    members=archive_members(path)
    with tarfile.open(path) as archive:
        for member in members:
            target=release.joinpath(*relative(member.name).parts)
            if member.isdir():target.mkdir(parents=True,exist_ok=True)
            else:
                target.parent.mkdir(parents=True,exist_ok=True)
                with target.open('xb') as destination,archive.extractfile(member) as source:
                    while chunk:=source.read(1024*1024):destination.write(chunk)
                target.chmod(0o755 if member.mode & 0o111 else 0o644)


def unit(release,user):
    if not re.fullmatch(r'[a-z_][a-z0-9_-]*',user):raise ValueError('Invalid service account')
    return f'''[Unit]
Description=Kingdom private harness on Centipede
After=network-online.target centipede-server-bootstrap.service
Requires=centipede-server-bootstrap.service
[Service]
User={user}
Group={user}
WorkingDirectory=/var/lib/kingdom
Environment=PYTHONPATH={release}
Environment=KINGDOM_DATA_DIR=/var/lib/kingdom
Environment=KINGDOM_MODEL_PROVIDER=disabled
ExecStart={release}/.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8012
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
MemoryHigh=800M
MemoryMax=1200M
TasksMax=128
UMask=0077
[Install]
WantedBy=multi-user.target
'''


def main():
    import pwd
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle',type=Path,required=True)
    parser.add_argument('--manifest-sha256',required=True)
    parser.add_argument('--expected-root-serial',required=True)
    parser.add_argument('--service-user',default='centipede-admin')
    args=parser.parse_args()
    # Identify ancestry of the actual mounted root, never a caller-selected disk.
    root=run('findmnt','-n','-o','SOURCE','/')
    devices=json.loads(run('lsblk','--json','--inverse','--paths','--output','PATH,TYPE,SERIAL',root))['blockdevices']
    def disks(nodes):
        return [n for node in nodes for n in ([node] if node['type']=='disk' else [])+disks(node.get('children',[]))]
    roots=disks(devices)
    if len(roots)!=1:raise PermissionError('Ambiguous installed root disk ancestry')
    guard(os.geteuid(),Path('/proc/cmdline').read_text(),Path('/run/live/medium').is_mount(),roots[0].get('serial') or '',args.expected_root_serial)
    service=Path('/etc/systemd/system/kingdom-harness.service')
    if service.exists() or service.is_symlink():raise FileExistsError('Preserve existing service; review updates separately')
    bundle=args.bundle.resolve();manifest=manifest_check(bundle,args.manifest_sha256)
    for name in ('source.tar.gz','frontend.tar.gz'):archive_members(bundle/name)
    release=Path('/opt/kingdom/releases')/manifest['revision']
    content=unit(release,args.service_user);account=pwd.getpwnam(args.service_user)
    release.mkdir(parents=True,exist_ok=False)
    for name in ('source.tar.gz','frontend.tar.gz'):unpack(bundle/name,release)
    run('/usr/bin/python3','-m','venv',str(release/'.venv'))
    python=str(release/'.venv/bin/python')
    run(python,'-m','pip','install','--no-index','--only-binary=:all:','--find-links='+str(bundle/'wheels'),*manifest['requirements'])
    run(python,'-m','pip','check')
    data=Path('/var/lib/kingdom')
    if data.is_symlink():raise ValueError('Owner data path must not be a symlink')
    if not data.exists():
        data.mkdir();os.chown(data,account.pw_uid,account.pw_gid);data.chmod(0o700)
    with service.open('x') as target:target.write(content)
    run('systemctl','daemon-reload');run('systemctl','enable','--now','kingdom-harness.service')
    print(json.dumps({'service':service.name,'revision':manifest['revision'],'loopback_only':True,'models_configured':False}))


if __name__=='__main__':main()
