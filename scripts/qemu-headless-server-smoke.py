"""Bounded BIOS live-boot check; never opens a physical target disk."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time


def digest(path):
    value = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()


def configured(text):
    for line in text.splitlines():
        marker = 'CENTIPEDE_SERVER_CONFIGURED '
        if marker in line:
            try:
                return json.JSONDecoder().raw_decode(line.split(marker, 1)[1])[0]
            except (ValueError, TypeError):
                pass
    return None


def guest_address(receipt):
    for interface in receipt['addresses']:
        if interface.get('ifname') == 'lo':
            continue
        for address in interface.get('addr_info', []):
            ip = address.get('local', '')
            if address.get('family') == 'inet' and ip.startswith('169.254.'):
                return ip
    raise ValueError('No direct Ethernet link-local address in boot receipt')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--timeout', type=int, default=720)
    args = parser.parse_args()
    if not args.image.is_file() or args.image.is_symlink():
        parser.error('Image must be a regular file')
    if not 30 <= args.timeout <= 1200:
        parser.error('Timeout must be between 30 and 1200 seconds')
    for command in ('qemu-system-x86_64', 'ssh-keygen', 'ssh-keyscan', 'ssh'):
        if not shutil.which(command):
            parser.error('Missing executable: ' + command)
    args.output.mkdir(parents=True, exist_ok=True)
    serial = args.output / 'serial.log'
    evidence = {'status': 'failed', 'image_sha256': digest(args.image),
                'installation_performed': False, 'owner_login_positive_verified': False}
    try:
        with tempfile.TemporaryDirectory(prefix='centipede-boot-') as temporary:
            root = Path(temporary)
            disk = root / 'sentinel.raw'
            with disk.open('wb') as stream:
                stream.write(b'CENTIPEDE DO NOT INSTALL\n')
                stream.truncate(64 * 1024 * 1024)
            before = digest(disk)
            monitor = root / 'monitor.sock'
            with socket.socket() as reservation:
                reservation.bind(('127.0.0.1', 0))
                port = reservation.getsockname()[1]
            command = ['qemu-system-x86_64', '-machine', 'pc,accel=tcg', '-m', '1536',
                       '-display', 'none', '-no-reboot', '-boot', 'order=d',
                       '-cdrom', str(args.image.resolve()), '-drive',
                       'file=' + str(disk) + ',format=raw,if=ide',
                       '-serial', 'file:' + str(serial.resolve()), '-monitor',
                       'unix:' + str(monitor) + ',server=on,wait=off',
                       '-netdev', 'user,id=n0,net=169.254.0.0/16,host=169.254.1.1,dhcpstart=169.254.1.15',
                       '-device', 'e1000,netdev=n0']
            with (args.output / 'qemu.log').open('w') as log:
                process = subprocess.Popen(command, stdout=log, stderr=log)
                try:
                    deadline = time.monotonic() + args.timeout
                    receipt = None
                    while time.monotonic() < deadline:
                        if process.poll() is not None:
                            raise RuntimeError('QEMU exited before server bootstrap')
                        receipt = configured(serial.read_text(errors='replace') if serial.exists() else '')
                        if receipt:
                            break
                        time.sleep(2)
                    if not receipt:
                        raise TimeoutError('No configured server boot receipt')
                    ip = guest_address(receipt)
                    with socket.socket(socket.AF_UNIX) as control:
                        control.settimeout(10)
                        control.connect(str(monitor))
                        control.recv(8192)
                        control.sendall(('hostfwd_add n0 tcp:127.0.0.1:' + str(port) + '-' + ip + ':22\n').encode())
                        response = control.recv(8192).decode(errors='replace')
                        if 'Error' in response or 'Could not' in response:
                            raise RuntimeError('QEMU host forwarding rejected: ' + response)
                    scanned = ''
                    while time.monotonic() < deadline:
                        scan = subprocess.run(['ssh-keyscan', '-T', '3', '-p', str(port), '-t', 'ed25519', '127.0.0.1'], capture_output=True, text=True, timeout=10)
                        scanned = scan.stdout.strip()
                        if scanned:
                            break
                        time.sleep(2)
                    if not scanned:
                        raise TimeoutError('SSH listener did not answer')
                    fingerprint = base64.b64encode(hashlib.sha256(base64.b64decode(scanned.split()[2])).digest()).decode().rstrip('=')
                    if fingerprint != receipt['host_key_sha256']:
                        raise RuntimeError('SSH host key differs from VM serial receipt')
                    known = root / 'known_hosts'
                    known.write_text(scanned + '\n')
                    wrong = root / 'wrong_key'
                    subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(wrong)], check=True, timeout=20)
                    login = subprocess.run(['ssh', '-F', '/dev/null', '-i', str(wrong), '-p', str(port),
                                            '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'ConnectTimeout=10',
                                            '-o', 'StrictHostKeyChecking=yes', '-o', 'UserKnownHostsFile=' + str(known),
                                            'centipede-admin@127.0.0.1', 'true'], capture_output=True, text=True, timeout=20)
                    if login.returncode != 255 or 'Permission denied (publickey)' not in login.stderr:
                        raise RuntimeError('Wrong-key denial was not verified: ' + login.stderr)
                    evidence.update(boot_receipt=receipt, bios_live_boot_verified=True,
                                    ssh_listener_verified=True, host_key_pinned=True, wrong_key_denied=True)
                finally:
                    if process.poll() is None:
                        process.terminate()
                        try:
                            process.wait(timeout=15)
                        except subprocess.TimeoutExpired:
                            process.kill()
                            process.wait(timeout=10)
            evidence['sentinel_disk_unchanged'] = digest(disk) == before
            if not evidence['sentinel_disk_unchanged']:
                raise RuntimeError('Live boot modified the disposable sentinel disk')
            evidence['status'] = 'passed'
    except Exception as error:
        evidence['error'] = str(error)
        raise
    finally:
        (args.output / 'receipt.json').write_text(json.dumps(evidence, indent=2) + '\n')


if __name__ == '__main__':
    main()
