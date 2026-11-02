from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]
class StarterTests(unittest.TestCase):
    def test_files_exist(self):
        for name in ('web/index.html','web/style.css','web/app.js','docs/IMPLEMENTATION.md'):
            self.assertTrue((ROOT/name).is_file(), name)
    def test_accessibility_basics(self):
        html=(ROOT/'web/index.html').read_text()
        for marker in ('lang="en"','viewport','aria-live','<fieldset','<legend','type="submit"'):
            self.assertIn(marker,html)
    def test_safe_defaults(self):
        js=(ROOT/'web/app.js').read_text()
        self.assertIn('Observation only',js)
        self.assertIn('Ask before changes',js)
        self.assertIn("fetch('/api/kingdom/status'",js)
        self.assertNotIn('localStorage',js)
if __name__=='__main__': unittest.main()
