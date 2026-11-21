"""Execute the real compiled web/API server with disposable private state."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--binary', type=Path, required=True)
parser.add_argument('--web-root', type=Path, required=True)
args = parser.parse_args()
binary = args.binary.resolve()
if os.name == 'nt' and not binary.exists():
    binary = binary.with_suffix('.exe')
assert binary.is_file() and (args.web_root/'index.html').is_file()
with socket.socket() as reservation:
    reservation.bind(('127.0.0.1', 0))
    port = reservation.getsockname()[1]
with tempfile.TemporaryDirectory(prefix='centipede-packaged-') as directory:
    env = dict(os.environ, HOST='127.0.0.1', PORT=str(port),
               CENTIPEDE_WEB_ROOT=str(args.web_root.resolve()),
               CENTIPEDE_FILES_ROOT=str(Path(directory)/'files'),
               CENTIPEDE_KNOWLEDGE_HOME=str(Path(directory)/'knowledge'))
    env.pop('KINGDOM_API_TOKEN', None)
    with (Path(directory)/'server.log').open('w+b') as log:
        child = subprocess.Popen([str(binary)], cwd=directory, env=env, stdout=log, stderr=log,
                                 creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        try:
            origin = f'http://127.0.0.1:{port}'
            deadline = time.monotonic()+20
            while True:
                if child.poll() is not None:
                    raise RuntimeError('Compiled server exited before readiness')
                try:
                    with urllib.request.urlopen(origin+'/api/v1/health', timeout=1) as response:
                        health = json.load(response)
                        assert response.status == 200 and health['status'] in ('HEALTHY', 'DEGRADED')
                        break
                except OSError:
                    if time.monotonic() >= deadline:
                        raise TimeoutError('Compiled API never became ready')
                    time.sleep(.1)
            with urllib.request.urlopen(origin+'/', timeout=3) as response:
                assert response.status == 200 and b'id="root"' in response.read()
            request = urllib.request.Request(origin+'/api/v1/host-files/list', b'{"directory":""}',
                                             {'Content-Type':'application/json','Origin':origin})
            try:
                urllib.request.urlopen(request, timeout=3).close()
                raise AssertionError('Files unexpectedly unlocked')
            except urllib.error.HTTPError as error:
                assert error.code == 401, f'Expected locked API, got {error.code}'
                error.close()
            with binary.open('rb') as stream:
                digest = hashlib.file_digest(stream, 'sha256').hexdigest()
            print(json.dumps({'passed':True,'binary_sha256':digest,'web_status':200,
                              'api_status':200,'files_locked_status':401,'scope':'real compiled process, disposable state'}))
        finally:
            child.terminate()
            try: child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                child.kill(); child.wait(timeout=5)
