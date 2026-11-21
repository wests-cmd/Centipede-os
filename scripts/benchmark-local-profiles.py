#!/usr/bin/env python3
"""Offline, CPU-only, bounded 512/1024-context experiment using an installed llama-cli.

Makes NO model downloads, production configuration changes or tool calls.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import statistics
import subprocess
import os

_HELPER = Path(__file__).with_name('benchmark-local-inference.py')
_spec = importlib.util.spec_from_file_location('centipede_existing_benchmark', _HELPER)
_base = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_base)

CONTEXTS = (512, 1024)
THREADS = (1, 2)
REPEATS = 3
PROMPT = 'In one sentence, explain how a desktop assistant can help someone find a file.'
RSS_LIMIT_KIB = 1_258_291  # ~1.2 GiB process RSS; not a total RAM guarantee
INITIAL_AVAILABLE_BYTES = 1536 * 1024**2
_TIMING = re.compile(
    r'eval time\s*=\s*[\d.]+\s*ms\s*/\s*\d+\s*tokens\s*'
    r'\(\s*([\d.]+)\s*tokens per second\s*\)', re.I)


def profile_command(cli, model, threads, context, metrics, timer='/usr/bin/time'):
    if threads not in THREADS or context not in CONTEXTS:
        raise ValueError('Only 1/2 CPU threads and 512/1024 contexts are admitted')
    return [timer, '-f', '%M', '-o', str(metrics), cli, '-m', str(model),
            '-t', str(threads), '-tb', str(threads), '-c', str(context),
            '-ngl', '0', '-n', '128', '-p', PROMPT,
            '--single-turn', '--simple-io', '--no-display-prompt',
            '--show-timings', '--fit', 'off']


def read_tps(stderr):
    matches = _TIMING.findall(stderr)
    values = [float(x) for x in matches if float(x) > 0]
    # Missing or ambiguous timings are not invented.
    return values[0] if len(values) == 1 else None


def summarize(rows, responsive_confirmed):
    if len(rows) != len(CONTEXTS) * len(THREADS) * REPEATS:
        return {'status': 'INCOMPLETE', 'reason': 'Not all 12 experiments completed; no recommendation.'}
    if any(row['rss_kib'] > RSS_LIMIT_KIB or
           any(n != 0 for n in row['swap_delta'].values()) for row in rows):
        return {'status': 'UNSAFE', 'reason': 'RSS limit exceeded or system-wide swap activity detected.'}
    if not responsive_confirmed:
        return {'status': 'NEEDS_HUMAN_CHECK', 'reason': 'Desktop responsiveness was not independently confirmed.'}
    profiles = []
    for ctx in CONTEXTS:
        for threads in THREADS:
            group = [row for row in rows if row['context'] == ctx and row['threads'] == threads]
            rates = [row['generation_tokens_per_second'] for row in group]
            profiles.append({'context': ctx, 'threads': threads,
                             'median_wall_seconds': round(statistics.median(row['wall_seconds'] for row in group), 3),
                             'max_rss_kib': max(row['rss_kib'] for row in group),
                             'median_generation_tps': (round(statistics.median(rates), 3)
                                                       if all(isinstance(rate, (int, float)) and rate > 0 for rate in rates)
                                                       else None)})
    # These are observations for manual review, not a proven quality or task-success comparison.
    return {'status': 'MEASURED', 'profiles': profiles,
            'reason': 'Compare accuracy and desktop responsiveness manually before selecting a configuration. No settings were changed.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', type=Path, required=True, help='Existing, local compact GGUF file (no URL)')
    parser.add_argument('--cli', default='llama-cli', help='Existing llama-cli executable on PATH')
    parser.add_argument('--output', type=Path, required=True, help='Fresh output directory')
    parser.add_argument('--timeout', type=int, default=180, choices=range(30, 301), metavar='30..300')
    parser.add_argument('--idle-confirmed', action='store_true', help='Confirm Kingdom tasks and other inference are idle')
    parser.add_argument('--responsive-confirmed', action='store_true', help='Owner verified that desktop remained usable across the experiment')
    args = parser.parse_args()
    if os.name != 'posix' or not Path('/proc/meminfo').exists():
        parser.error('This experiment requires Linux /proc memory and swap counters')
    if not args.idle_confirmed:
        parser.error('Pause heavy Kingdom/other model work; then pass --idle-confirmed')
    cli = shutil.which(args.cli)
    if not cli or not Path('/usr/bin/time').is_file():
        parser.error('Installed llama-cli and GNU /usr/bin/time are required')
    model = args.model.resolve(strict=True)
    if not model.is_file() or not 0 < model.stat().st_size < 1024**3:
        parser.error('Supply an already installed GGUF model smaller than 1 GiB')
    with model.open('rb') as model_file:
        if model_file.read(4) != b'GGUF':
            parser.error('File is not a GGUF model')
        model_file.seek(0)
        digest = hashlib.file_digest(model_file, 'sha256').hexdigest()
    if _base.memory_available() < INITIAL_AVAILABLE_BYTES:
        parser.error('At least 1.5 GiB available memory required before starting')
    if os.getloadavg()[0] > max(1, (os.cpu_count() or 1) / 2):
        parser.error('Computer is already busy; do not run the experiment now')
    version = subprocess.run([cli, '--version'], capture_output=True, text=True, timeout=10, check=True)
    timer = subprocess.run(['/usr/bin/time', '--version'], capture_output=True, text=True, timeout=10, check=True)
    if 'GNU' not in timer.stdout:
        parser.error('GNU time is required')
    args.output.mkdir(parents=True, exist_ok=False)
    report = {'schema': 1, 'state': 'running', 'runtime': 'llama-cli',
              'runtime_version': (version.stdout + version.stderr).strip()[:300],
              'model_sha256': digest, 'model_bytes': model.stat().st_size,
              'contexts': list(CONTEXTS), 'threads': list(THREADS), 'repeats': REPEATS,
              'limits': {'max_run_seconds': args.timeout, 'rss_limit_kib': RSS_LIMIT_KIB,
                         'cpu_only': True, 'min_live_free_bytes': 512 * 1024**2},
              'notes': 'Max RSS is process-specific; swap counters are system-wide. Missing generation timings are null. No profile auto-install.',
              'results': []}
    receipt = args.output / 'receipt.json'
    try:
        for ctx in CONTEXTS:
            for threads in THREADS:
                for repeat in range(1, REPEATS + 1):
                    if _base.memory_available() < INITIAL_AVAILABLE_BYTES:
                        raise RuntimeError('Available RAM no longer meets the experiment admission floor')
                    stem = args.output / f'ctx-{ctx}-threads-{threads}-repeat-{repeat}'
                    before = _base.swap_counters()
                    metrics = stem.with_suffix('.rss-kib')
                    errors = stem.with_suffix('.stderr')
                    elapsed = _base.run_bounded(
                        profile_command(cli, model, threads, ctx, metrics),
                        stem.with_suffix('.stdout'), errors, args.timeout)
                    after = _base.swap_counters()
                    row = {'context': ctx, 'threads': threads, 'repeat': repeat,
                           'wall_seconds': elapsed, 'rss_kib': int(metrics.read_text().strip()),
                           'swap_delta': {k: after[k] - before[k] for k in before},
                           'generation_tokens_per_second': read_tps(errors.read_text(errors='replace'))}
                    report['results'].append(row)
                    receipt.write_text(json.dumps(report, indent=2))
                    if row['rss_kib'] > RSS_LIMIT_KIB or any(v != 0 for v in row['swap_delta'].values()):
                        raise RuntimeError('Memory or swapping safety budget exceeded; stopping immediately')
        report.update(state='completed', assessment=summarize(report['results'], args.responsive_confirmed))
    except Exception as exc:
        report.update(state='failed', assessment={'status': 'INCOMPLETE', 'reason': str(exc)})
        raise
    finally:
        receipt.write_text(json.dumps(report, indent=2))
    print(receipt)


if __name__ == '__main__':
    main()
