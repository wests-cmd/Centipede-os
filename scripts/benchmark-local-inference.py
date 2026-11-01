#!/usr/bin/env python3
"""Bounded Linux llama-bench experiment. Never downloads or edits production settings."""
import argparse
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time


def memory_available(path=Path('/proc/meminfo')):
    for line in path.read_text().splitlines():
        if line.startswith('MemAvailable:'):
            return int(line.split()[1]) * 1024
    raise RuntimeError('MemAvailable measurement unavailable')


def swap_counters(path=Path('/proc/vmstat')):
    values = dict(line.split() for line in path.read_text().splitlines())
    return {key: int(values[key]) for key in ('pswpin', 'pswpout')}


def benchmark_command(bench, model, threads, metrics, timer='/usr/bin/time'):
    if threads not in (1, 2):
        raise ValueError('Only one or two CPU threads are supported')
    return [timer, '-f', '%M', '-o', str(metrics), bench, '-m', str(model),
            '-p', '512', '-n', '128', '-t', str(threads), '-ngl', '0', '-r', '3', '-o', 'csv']


def generation_speed(raw):
    rows = list(csv.DictReader(io.StringIO(raw)))
    speeds = [float(row['avg_ts']) for row in rows
              if int(row.get('n_gen', '0')) == 128 and int(row.get('n_prompt', '0')) == 0]
    if len(speeds) != 1 or speeds[0] <= 0:
        raise ValueError('Expected exactly one positive 128-token generation benchmark row')
    return speeds[0]


def recommendation(results, responsive):
    valid = all(r['rss_kib'] <= 1258291 and all(v == 0 for v in r['swap_delta'].values()) for r in results)
    if not valid:
        return 'No winner: RSS budget exceeded or system-wide swapping occurred.'
    if not responsive:
        return 'No winner: responsiveness needs independent confirmation.'
    speeds = {r['threads']: r['generation_tokens_per_second'] for r in results}
    return '2 threads' if speeds[2] >= speeds[1] * 1.10 else '1 thread'


def run_bounded(command, output, errors, timeout, floor=512 * 1024**2):
    start = time.monotonic()
    with output.open('w') as stdout, errors.open('w') as stderr:
        proc = subprocess.Popen(command, stdout=stdout, stderr=stderr,
                                start_new_session=True, preexec_fn=lambda: os.nice(10))
        try:
            while proc.poll() is None:
                if time.monotonic() - start > timeout:
                    raise TimeoutError('Benchmark exceeded its time budget')
                if memory_available() < floor:
                    raise RuntimeError('Stopped: available RAM below safety floor')
                time.sleep(0.25)
            if proc.returncode:
                raise RuntimeError(f'Benchmark failed with exit code {proc.returncode}; inspect stderr')
        finally:
            if proc.poll() is None:
                os.killpg(proc.pid, signal.SIGTERM)
                try:
                    proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    os.killpg(proc.pid, signal.SIGKILL)
                    proc.wait()
    return time.monotonic() - start


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', type=Path, required=True, help='Already installed local GGUF; no URLs')
    parser.add_argument('--bench', default='llama-bench')
    parser.add_argument('--output', type=Path, required=True, help='New output directory')
    parser.add_argument('--timeout', type=int, default=240, choices=range(30, 301), metavar='30..300')
    parser.add_argument('--idle-confirmed', action='store_true', help='Confirm Kingdom queues and other inference are idle')
    args = parser.parse_args()
    if os.name != 'posix' or not Path('/proc/meminfo').exists():
        parser.error('Linux /proc measurements are required')
    if not args.idle_confirmed:
        parser.error('Check Kingdom work/model queues are idle, then use --idle-confirmed')
    bench = shutil.which(args.bench)
    if not bench or not os.access('/usr/bin/time', os.X_OK):
        parser.error('Preinstalled llama-bench and GNU /usr/bin/time are required; nothing was downloaded')
    model = args.model.resolve(strict=True)
    if not model.is_file() or model.stat().st_size > 1024**3:
        parser.error('Use an existing compact GGUF file below 1 GiB')
    with model.open('rb') as source:
        if source.read(4) != b'GGUF':
            parser.error('Model must be a GGUF file')
    if memory_available() < 1536 * 1024**2:
        parser.error('At least 1.5 GiB available RAM is required')
    if os.getloadavg()[0] > max(1, (os.cpu_count() or 1) / 2):
        parser.error('Machine is busy; defer the experiment')
    version = subprocess.run([bench, '--version'], capture_output=True, text=True, timeout=10, check=True)
    timer_version = subprocess.run(['/usr/bin/time', '--version'], capture_output=True, text=True, timeout=10, check=True)
    if 'GNU' not in timer_version.stdout:
        parser.error('GNU time is required for comparable maximum RSS')
    args.output.mkdir(parents=True, exist_ok=False)
    with model.open('rb') as source:
        digest = hashlib.file_digest(source, 'sha256').hexdigest()
    receipt = {'schema': 1, 'state': 'running', 'engine': 'llama-bench', 'model_sha256': digest,
               'model_bytes': model.stat().st_size, 'runtime_version': version.stdout + version.stderr,
               'timer_version': timer_version.stdout.splitlines()[0], 'results': [],
               'limits': 'CPU-only, sequential, 3 repeats each; RSS is process maximum, swap is system-wide; throughput excludes full app latency.'}
    target = args.output / 'receipt.json'
    try:
        for threads in (1, 2):
            stem = args.output / f'threads-{threads}'
            before = swap_counters()
            metrics = stem.with_suffix('.rss-kib')
            raw = stem.with_suffix('.csv')
            wall = run_bounded(benchmark_command(bench, model, threads, metrics), raw,
                               stem.with_suffix('.stderr'), args.timeout)
            after = swap_counters()
            receipt['results'].append({'threads': threads, 'wall_seconds': wall,
                'rss_kib': int(metrics.read_text().strip()),
                'swap_delta': {key: after[key] - before[key] for key in before},
                'generation_tokens_per_second': generation_speed(raw.read_text())})
            target.write_text(json.dumps(receipt, indent=2))
        receipt.update(state='completed', recommendation=recommendation(receipt['results'], False))
    except Exception as exc:
        receipt.update(state='failed', error=str(exc), recommendation='No profile change authorized by an incomplete experiment.')
        raise
    finally:
        target.write_text(json.dumps(receipt, indent=2))
    print(target)


if __name__ == '__main__':
    main()
