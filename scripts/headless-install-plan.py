"""Read-only live-system disk inventory and immutable review plans. No installer."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

VERSION = 1


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True)


def fingerprint(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def command(*arguments):
    result = subprocess.run(arguments, check=True, capture_output=True, text=True, timeout=15)
    return json.loads(result.stdout)


def collect():
    if sys.platform != 'linux':
        raise ValueError('Inventory requires the actual Linux live environment')
    data = command('lsblk', '--json', '--bytes', '--output',
                   'PATH,TYPE,SIZE,SERIAL,WWN,RO,MOUNTPOINTS,FSTYPE,UUID,TRAN')
    medium = command('findmnt', '--json', '--evaluate', '--target', '/run/live/medium', '--output', 'SOURCE,TARGET')
    swaps = command('swapon', '--show', '--json', '--output', 'NAME')
    # Canonicalize all actual device paths consistently, including mapper aliases.
    def normalize(nodes):
        for node in nodes:
            node['path'] = os.path.realpath(node['path'])
            normalize(node.get('children', []))
    normalize(data['blockdevices'])
    filesystems = medium.get('filesystems', [])
    if len(filesystems) != 1 or filesystems[0].get('target') != '/run/live/medium':
        raise ValueError('Live boot medium mount is not uniquely identified')
    source = filesystems[0].get('source', '')
    if not source.startswith('/dev/'):
        raise ValueError('Live boot source must resolve to a local block device')
    return {'version': VERSION, 'blockdevices': data['blockdevices'],
            'live_source': os.path.realpath(source),
            'swaps': sorted(os.path.realpath(item['name']) for item in swaps.get('swapdevices', []))}


def descendants(node):
    yield node
    for child in node.get('children', []):
        yield from descendants(child)


def disks(inventory):
    if inventory.get('version') != VERSION or not isinstance(inventory.get('blockdevices'), list):
        raise ValueError('Unsupported inventory')
    return [node for node in inventory['blockdevices'] if node.get('type') == 'disk']


def validate_target(inventory, path, serial, size):
    if not re.fullmatch(r'/dev/[A-Za-z0-9._/-]+', path) or '/..' in path:
        raise ValueError('Use the exact inventory device path')
    if not isinstance(serial, str) or not serial.strip() or serial != serial.strip() or len(serial) > 128 or any(ord(c) < 32 for c in serial):
        raise ValueError('A nonempty exact disk serial is required')
    if type(size) is not int or size < 8 * 1024**3:
        raise ValueError('A target of at least 8 GiB is required')
    candidates = disks(inventory)
    matches = [disk for disk in candidates if disk.get('path') == path]
    if len(matches) != 1:
        raise ValueError('Target path is absent or ambiguous')
    target = matches[0]
    if target.get('serial') != serial or int(target.get('size', 0)) != size:
        raise ValueError('Target serial or size differs from explicit selection')
    if len([disk for disk in candidates if disk.get('serial') == serial]) != 1:
        raise ValueError('Disk serial is ambiguous')
    if target.get('wwn') and len([disk for disk in candidates if disk.get('wwn') == target['wwn']]) != 1:
        raise ValueError('Disk WWN is ambiguous')
    source = inventory.get('live_source')
    # QEMU's live ISO is optical media; physical USB boot is a whole disk.
    # Unsupported loop/file-backed ancestry remains ineligible rather than guessed.
    source_disks = [disk for disk in inventory['blockdevices'] if disk.get('type') in {'disk','rom'}
                    and any(child.get('path') == source for child in descendants(disk))]
    if len(source_disks) != 1:
        raise ValueError('Live boot source disk cannot be uniquely protected')
    if source_disks[0]['path'] == path:
        raise ValueError('The live boot source disk cannot be selected')
    swaps = inventory.get('swaps')
    if not isinstance(swaps, list) or any(not isinstance(item, str) for item in swaps):
        raise ValueError('Swap inventory is missing or invalid')
    for node in descendants(target):
        if node.get('type') not in {'disk','part'}:
            raise ValueError('Target has an active mapped or unsupported storage descendant')
        if node.get('ro') not in (False, 0):
            raise ValueError('Target or descendant is read-only or has unknown read-only state')
        mounts = node.get('mountpoints')
        if not isinstance(mounts, list):
            raise ValueError('Mounted state is unknown')
        if any(mount for mount in mounts):
            raise ValueError('Target or descendant is mounted, including root')
        if node.get('path') in swaps or node.get('fstype') == 'swap':
            raise ValueError('Target has active or existing swap; review it separately')
    return {'path': path, 'serial': serial, 'size': size, 'wwn': target.get('wwn')}


def make_plan(first, second, path, serial, size):
    identity = validate_target(first, path, serial, size)
    validate_target(second, path, serial, size)
    if fingerprint(first) != fingerprint(second):
        raise ValueError('Storage inventory changed between observations; no plan issued')
    payload = {'version': VERSION, 'mode': 'review-only-no-installation', 'target': identity,
               'inventory': first, 'inventory_sha256': fingerprint(first),
               'proposed_boot': 'legacy-bios', 'implementation_status': 'disk-executor-not-implemented'}
    value = fingerprint(payload)
    return {'payload': payload, 'plan_sha256': value,
            'confirmation': 'CONFIRM CENTIPEDE DISK ' + serial + ' ' + str(size) + ' ' + value}


def write_plan(path, plan):
    path = Path(path)
    # Exclusive creation prevents replacing an already reviewed plan or symlink.
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o400)
    with os.fdopen(descriptor, 'w', encoding='utf-8') as stream:
        stream.write(json.dumps(plan, indent=2) + '\n')
        stream.flush()
        os.fsync(stream.fileno())


def confirm(plan, inventory, text):
    if set(plan) != {'payload', 'plan_sha256', 'confirmation'}:
        raise ValueError('Unexpected plan structure')
    payload = plan['payload']
    if payload.get('version') != VERSION or payload.get('mode') != 'review-only-no-installation' or payload.get('implementation_status') != 'disk-executor-not-implemented':
        raise ValueError('Unsupported plan authority')
    if fingerprint(payload) != plan['plan_sha256'] or fingerprint(payload['inventory']) != payload['inventory_sha256']:
        raise ValueError('Plan or inventory digest changed')
    target = payload['target']
    expected = 'CONFIRM CENTIPEDE DISK ' + target['serial'] + ' ' + str(target['size']) + ' ' + plan['plan_sha256']
    if text != expected or plan['confirmation'] != expected:
        raise ValueError('Confirmation must exactly bind disk serial, size and plan digest')
    current = validate_target(inventory, target['path'], target['serial'], target['size'])
    if current != target or fingerprint(inventory) != payload['inventory_sha256']:
        raise ValueError('Disk identity or storage state changed after review')
    return {'phase': 'confirmed-for-review-only', 'plan_sha256': plan['plan_sha256'],
            'installation_performed': False, 'disk_executor_available': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='action', required=True)
    commands.add_parser('inventory')
    plan = commands.add_parser('plan')
    plan.add_argument('--target', required=True)
    plan.add_argument('--serial', required=True)
    plan.add_argument('--size', required=True, type=int)
    plan.add_argument('--output', required=True, type=Path)
    review = commands.add_parser('confirm-review')
    review.add_argument('--plan', required=True, type=Path)
    review.add_argument('--confirmation', required=True)
    args = parser.parse_args()
    if args.action == 'inventory':
        print(json.dumps(collect(), indent=2))
    elif args.action == 'plan':
        result = make_plan(collect(), collect(), args.target, args.serial, args.size)
        write_plan(args.output, result)
        print(json.dumps({'phase': 'review-only-plan-created', 'plan': str(args.output),
                          'plan_sha256': result['plan_sha256'], 'installation_performed': False}))
    else:
        if args.plan.is_symlink() or not args.plan.is_file() or args.plan.stat().st_size > 1024 * 1024:
            raise ValueError('Expected a bounded regular plan file')
        result = confirm(json.loads(args.plan.read_text()), collect(), args.confirmation)
        print(json.dumps(result))


if __name__ == '__main__':
    main()
