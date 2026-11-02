import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from kingdom_bridge import check
class TestKingdomBridge(unittest.TestCase):
 def test_unconfigured(self): self.assertFalse(check('')['connected'])
 def test_insecure_remote(self): self.assertFalse(check('http://remote.example')['connected'])
 def test_credentials_in_url(self): self.assertFalse(check('https://user:pass@remote.example')['connected'])
 def test_bad_path(self): self.assertFalse(check('https://remote.example','//bad')['connected'])
 def test_reachable(self):
  class Response:
   status=200
   def __enter__(self):return self
   def __exit__(self,*a):pass
   def read(self,n):return b'{}'
  self.assertTrue(check('https://remote.example',opener=lambda req,timeout:Response())['connected'])
