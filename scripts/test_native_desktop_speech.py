"""Real Bookworm package decoder test; no microphone or network required."""
import pathlib
import subprocess
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
HELPER = ROOT / "packaging/live-build/config/includes.chroot/usr/local/bin/centipede-native-speech"


class OfflineSpeechTests(unittest.TestCase):
    def run_decoder(self, pcm):
        return subprocess.run([sys.executable, str(HELPER)], input=pcm, capture_output=True, timeout=25)

    def test_real_packaged_speech(self):
        pcm = pathlib.Path("/usr/share/pocketsphinx/test/data/goforward.raw").read_bytes()
        result = self.run_decoder(pcm)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.decode().strip(), "go forward ten meters")

    def test_invalid_audio_rejected(self):
        for pcm in (b"", b"1", b"0" * 160002):
            result = self.run_decoder(pcm)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(result.stdout, b"")


if __name__ == "__main__":
    unittest.main()
