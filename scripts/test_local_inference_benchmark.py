import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('local_benchmark', Path(__file__).with_name('benchmark-local-inference.py'))
bench = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bench)


class BaselineTests(unittest.TestCase):
    def test_command_is_local_cpu_bounded_and_no_download(self):
        command = bench.benchmark_command('/tools/llama-bench', Path('/models/local.gguf'), 2, Path('/tmp/rss'))
        self.assertIn('-m', command)
        self.assertNotIn('-hf', command)
        self.assertEqual(command[command.index('-ngl') + 1], '0')
        self.assertEqual(command[command.index('-r') + 1], '3')
        self.assertEqual(command[command.index('-t') + 1], '2')
        with self.assertRaises(ValueError):
            bench.benchmark_command('bench', Path('model'), 99, Path('rss'))

    def test_extracts_generation_only_not_prompt_throughput(self):
        data = 'n_prompt,n_gen,avg_ts\n512,0,99\n0,128,4.5\n'
        self.assertEqual(bench.generation_speed(data), 4.5)
        for bad in ['n_prompt,n_gen,avg_ts\n512,0,99\n', 'n_prompt,n_gen,avg_ts\n0,128,0\n', data + '0,128,6\n']:
            with self.assertRaises(ValueError):
                bench.generation_speed(bad)

    def test_recommendations_require_memory_swap_and_responsiveness(self):
        rows = [{'threads': t, 'rss_kib': 1000000, 'swap_delta': {'pswpin': 0, 'pswpout': 0}, 'generation_tokens_per_second': speed} for t, speed in [(1, 10), (2, 11.1)]]
        self.assertEqual(bench.recommendation(rows, True), '2 threads')
        self.assertIn('responsiveness', bench.recommendation(rows, False))
        rows[1]['generation_tokens_per_second'] = 10.9
        self.assertEqual(bench.recommendation(rows, True), '1 thread')
        rows[1]['swap_delta']['pswpout'] = 1
        self.assertIn('No winner', bench.recommendation(rows, True))
        rows[1]['swap_delta']['pswpout'] = 0
        rows[1]['rss_kib'] = 2000000
        self.assertIn('No winner', bench.recommendation(rows, True))

    def test_reads_real_proc_formats_and_fails_missing_memory(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'proc'
            path.write_text('MemTotal: 4000 kB\nMemAvailable: 2000 kB\n')
            self.assertEqual(bench.memory_available(path), 2048000)
            path.write_text('pswpin 2\npswpout 3\nother 5\n')
            self.assertEqual(bench.swap_counters(path), {'pswpin': 2, 'pswpout': 3})
            with self.assertRaises(RuntimeError):
                bench.memory_available(path)


if __name__ == '__main__':
    unittest.main()

# Production subprocess execution is also exercised on Linux without any model.
class LinuxLifecycleTests(unittest.TestCase):
    @unittest.skipUnless(__import__('os').name == 'posix', 'Linux process group lifecycle')
    def test_timeout_terminates_only_own_process_group(self):
        import sys
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            with self.assertRaises(TimeoutError):
                bench.run_bounded([sys.executable, '-c', 'import time; time.sleep(30)'], base/'out', base/'err', 0.1, floor=0)
