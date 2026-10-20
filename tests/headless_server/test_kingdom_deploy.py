import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('deploy',Path(__file__).resolve().parents[2]/'scripts/deploy-kingdom-offline.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


class OfflineDeployTests(unittest.TestCase):
    def test_requires_root_installed_boot_and_expected_identity(self):
        module.guard(0,'centipede.installed-server=1',False,'EXAMPLE-SERIAL','EXAMPLE-SERIAL')
        for args in [(1000,'centipede.installed-server=1',False,'A','A'),(0,'centipede.server=1',True,'A','A'),(0,'centipede.installed-server=1',True,'A','A'),(0,'centipede.installed-server=1',False,'B','A')]:
            with self.assertRaises(PermissionError):module.guard(*args)

    def test_traversal_symlink_and_duplicate_archive_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'unsafe.tar'
            for name,kind,duplicate in [('../outside',tarfile.REGTYPE,False),('/outside',tarfile.REGTYPE,False),('link',tarfile.SYMTYPE,False),('duplicate',tarfile.REGTYPE,True)]:
                with tarfile.open(path,'w') as archive:
                    member=tarfile.TarInfo(name);member.type=kind;member.size=0;member.linkname='/outside'
                    archive.addfile(member,io.BytesIO())
                    if duplicate:archive.addfile(member,io.BytesIO())
                with self.assertRaises(ValueError):module.archive_members(path)

    def test_unpack_preserves_existing_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);release=root/'release';release.mkdir();(release/'owner').write_text('keep')
            with tarfile.open(root/'source.tar','w') as archive:
                member=tarfile.TarInfo('owner');member.size=4;archive.addfile(member,io.BytesIO(b'new!'))
            with self.assertRaises(FileExistsError):module.unpack(root/'source.tar',release)
            self.assertEqual((release/'owner').read_text(),'keep')

    def test_manifest_hash_and_unlisted_wheels_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'wheels').mkdir()
            names=['source.tar.gz','frontend.tar.gz','wheels/example-1-py3-none-any.whl']
            for name in names:(root/name).write_bytes(b'example')
            manifest={'revision':'a'*40,'files':{n:hashlib.sha256(b'example').hexdigest() for n in names},'requirements':['example==1']}
            path=root/'manifest.json';path.write_text(json.dumps(manifest));digest=hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(module.manifest_check(root,digest)['revision'],'a'*40)
            with self.assertRaises(ValueError):module.manifest_check(root,'0'*64)
            (root/'wheels/unreviewed.whl').write_bytes(b'extra')
            with self.assertRaises(ValueError):module.manifest_check(root,digest)

    def test_default_service_is_local_and_inert_until_owner_configures_models(self):
        content=module.unit('/opt/kingdom/releases/'+'a'*40,'example-user')
        self.assertIn('--host 127.0.0.1',content);self.assertIn('KINGDOM_MODEL_PROVIDER=disabled',content)
        self.assertNotIn('0.0.0.0',content)
        with self.assertRaises(ValueError):module.unit('/opt/example','bad\nExecStart=other')
