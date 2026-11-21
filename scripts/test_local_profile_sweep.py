import importlib.util
from pathlib import Path
import unittest

module = Path(__file__).with_name('benchmark-local-profiles.py')
spec = importlib.util.spec_from_file_location('centipede_context_profiles', module)
profiles = importlib.util.module_from_spec(spec)
spec.loader.exec_module(profiles)


class ProfileSweepTests(unittest.TestCase):
    def test_cpu_only_command_has_explicit_context_thread_and_generation_limits(self):
        for context in (512, 1024):
            for threads in (1, 2):
                args = profiles.profile_command('llama-cli', Path('/opt/test.gguf'), threads, context, Path('/tmp/rss'))
                self.assertEqual(args[args.index('-c') + 1], str(context))
                self.assertEqual(args[args.index('-t') + 1], str(threads))
                self.assertEqual(args[args.index('-tb') + 1], str(threads))
                self.assertEqual(args[args.index('-ngl') + 1], '0')
                self.assertEqual(args[args.index('-n') + 1], '128')
                self.assertIn('--single-turn', args)
                self.assertIn('--simple-io', args)
                self.assertNotIn('-hf', args)
        for context, threads in ((2048, 1), (512, 3)):
            with self.assertRaises(ValueError):
                profiles.profile_command('llama-cli', Path('x'), threads, context, Path('rss'))

    def test_unverified_timing_is_not_fabricated(self):
        log = 'llama_perf_context_print: eval time = 1900.00 ms / 128 tokens (67.37 tokens per second)\n'
        self.assertEqual(profiles.read_tps(log), 67.37)
        self.assertIsNone(profiles.read_tps('llama-cli started, no tokens counted'))
        self.assertIsNone(profiles.read_tps(log + log))

    def test_12_complete_safe_samples_required_for_comparisons(self):
        rows = []
        for ctx in profiles.CONTEXTS:
            for threads in profiles.THREADS:
                for repeat in range(1, profiles.REPEATS + 1):
                    rows.append({'context': ctx, 'threads': threads, 'repeat': repeat,
                                 'wall_seconds': 15.0 + repeat, 'rss_kib': 800000,
                                 'swap_delta': {'pswpin': 0, 'pswpout': 0},
                                 'generation_tokens_per_second': 3.0})
        self.assertEqual(profiles.summarize(rows[:-1], True)['status'], 'INCOMPLETE')
        self.assertEqual(profiles.summarize(rows, False)['status'], 'NEEDS_HUMAN_CHECK')
        measured = profiles.summarize(rows, True)
        self.assertEqual(measured['status'], 'MEASURED')
        self.assertEqual(len(measured['profiles']), 4)
        self.assertIn('No settings were changed', measured['reason'])
        rows[0]['swap_delta']['pswpin'] = 1
        self.assertEqual(profiles.summarize(rows, True)['status'], 'UNSAFE')
        rows[0]['swap_delta']['pswpin'] = 0
        rows[0]['rss_kib'] = 1400000
        self.assertEqual(profiles.summarize(rows, True)['status'], 'UNSAFE')

    def test_no_speed_when_output_format_changed(self):
        rows = [{'context': ctx, 'threads': t, 'repeat': r, 'wall_seconds': 10.0,
                 'rss_kib': 500000, 'swap_delta': {'pswpin': 0, 'pswpout': 0},
                 'generation_tokens_per_second': None}
                for ctx in profiles.CONTEXTS for t in profiles.THREADS
                for r in range(1, profiles.REPEATS + 1)]
        result = profiles.summarize(rows, True)
        self.assertEqual(result['status'], 'MEASURED')
        self.assertTrue(all(row['median_generation_tps'] is None for row in result['profiles']))


if __name__ == '__main__':
    unittest.main()
