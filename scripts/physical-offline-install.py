"""Reviewed physical migration gate; separate authority from read-only plans.

Never invoke until the exact shared installer has passed disposable acceptance.
Metadata backups are not backups of existing user files.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess

spec=importlib.util.spec_from_file_location('offline',Path(__file__).with_name('qemu-offline-install.py'))
offline=importlib.util.module_from_spec(spec);spec.loader.exec_module(offline)
planner=offline.planner


def gates(plan,inventory,confirmation,execution,source,vendor,product,uid,proof,approval,bindings,owner_key_sha):
    if uid!=0:raise PermissionError('Reviewed migration requires root')
    planner.confirm_migration(plan,inventory,confirmation)
    policy=plan['payload']['review_policy']
    if {'vendor':vendor.strip(),'product':product.strip()}!=policy['machine']:
        raise PermissionError('Reviewed hardware identity changed')
    if source!=policy['source_squashfs_sha256'] or owner_key_sha!=policy['owner_public_key_sha256']:
        raise PermissionError('Reviewed source or owner key changed')
    if proof.get('status')!='passed':raise PermissionError('Actual disposable acceptance has not passed')
    for flag in ('installed_boot_without_iso','positive_seed_key_login','wrong_key_denied',
                 'unique_installed_host_key','unselected_sentinel_unchanged','source_isos_unchanged'):
        if proof.get(flag) is not True:raise PermissionError('Missing acceptance proof: '+flag)
    for name in ('shared_executor_sha256','planner_sha256','bootstrap_sha256'):
        if proof.get(name)!=bindings[name]:raise PermissionError('Acceptance tested different source: '+name)
    if proof.get('source_squashfs_sha256')!=source:raise PermissionError('Acceptance tested different image')
    expected=dict(bindings,approved=True,scope='erase-reviewed-centipede-target',
                  plan_sha256=plan['plan_sha256'],policy_sha256=planner.fingerprint(policy),
                  allow_no_full_user_data_backup=True)
    if approval!=expected:raise PermissionError('Separate reviewer approval does not match exact evidence')
    if execution!='INSTALL REVIEWED CENTIPEDE '+plan['plan_sha256']+' '+planner.fingerprint(approval):
        raise PermissionError('Separate execution confirmation did not match')
    return plan['payload']['target']


def metadata_check(target,metadata,folder):
    if metadata.get('target')!=target or metadata.get('full_user_data_backup') is not False:
        raise PermissionError('Metadata receipt does not identify this target and backup limitation')
    assets=metadata.get('assets',{})
    if set(assets)!={'prefix','tail','partitions'}:raise ValueError('Exact metadata assets required')
    contents={}
    for name,entry in assets.items():
        path=folder/entry['filename']
        if Path(entry['filename']).name!=entry['filename'] or path.is_symlink() or not path.is_file():
            raise ValueError('Unsafe metadata asset path')
        data=path.read_bytes()
        if len(data)!=entry['size'] or hashlib.sha256(data).hexdigest()!=entry['sha256']:
            raise ValueError('Metadata backup changed')
        contents[name]=data
    if len(contents['prefix'])!=1048576 or len(contents['tail'])!=1048576:
        raise ValueError('Expected first and last MiB backups')
    with open(target['path'],'rb',buffering=0) as disk:
        prefix=disk.read(1048576);disk.seek(target['size']-1048576);tail=disk.read(1048576)
    if prefix!=contents['prefix'] or tail!=contents['tail']:raise ValueError('Disk metadata changed since backup')
    current=subprocess.run(['sfdisk','--dump',target['path']],check=True,capture_output=True,timeout=30).stdout
    if current.replace(b'\r\n',b'\n')!=contents['partitions'].replace(b'\r\n',b'\n'):
        raise ValueError('Partition table changed since backup')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ('plan','receipt','proof','approval','metadata'):
        parser.add_argument('--'+name,type=Path,required=True)
    for name in ('review-confirmation','execution-confirmation','source-sha256'):
        parser.add_argument('--'+name,required=True)
    args=parser.parse_args()
    proof=json.loads(args.proof.read_text());approval=json.loads(args.approval.read_text())
    metadata=json.loads(args.metadata.read_text())
    bootstrap=offline.ROOT/'packaging/live-build/config/includes.chroot/usr/local/libexec/centipede-server-bootstrap.py'
    bindings={'shared_executor_sha256':offline.digest(Path(offline.__file__)),
              'physical_executor_sha256':offline.digest(Path(__file__)),
              'planner_sha256':offline.digest(Path(planner.__file__)),
              'bootstrap_sha256':offline.digest(bootstrap),'vm_proof_sha256':offline.digest(args.proof),
              'metadata_receipt_sha256':offline.digest(args.metadata)}
    def authorize(*values):
        if 'centipede.server=1' not in Path('/proc/cmdline').read_text().split():
            raise PermissionError('Requires headless live recovery environment')
        seed_path=Path('/run/live/medium/centipede-server.json')
        if seed_path.is_symlink():raise PermissionError('Owner seed must be a regular file')
        seed=json.loads(seed_path.read_text())
        if seed.get('admin') is not True:raise PermissionError('Explicit owner administrator seed required')
        key=' '.join(seed['public_key'].strip().split()[:2])
        target=gates(*values,proof,approval,bindings,hashlib.sha256(key.encode()).hexdigest())
        metadata_check(target,metadata,args.metadata.parent)
        return target
    def consume():
        with args.approval.with_suffix('.consumed').open('x') as marker:
            marker.write(planner.fingerprint(approval)+'\n');marker.flush();os.fsync(marker.fileno())
    offline.install(args,authorize=authorize,before_write=consume,scope='reviewed-physical-migration',
                    receipt_metadata={'reviewed_evidence':bindings,'full_user_data_backup':False})


if __name__=='__main__':main()
