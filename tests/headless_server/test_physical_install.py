import copy
import importlib.util
from pathlib import Path
import unittest
from test_migration_plan import migration_fixture,reviewed

path=Path(__file__).resolve().parents[2]/'scripts/physical-offline-install.py'
spec=importlib.util.spec_from_file_location('physical',path)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


class PhysicalGateTests(unittest.TestCase):
    def setUp(self):
        self.inventory,self.policy=migration_fixture();self.plan=reviewed(self.inventory,self.policy)
        self.bindings={name:'c'*64 for name in ('shared_executor_sha256','planner_sha256','bootstrap_sha256','vm_proof_sha256','metadata_receipt_sha256')}
        self.proof=dict(self.bindings,status='passed',source_squashfs_sha256='a'*64)
        for flag in ('installed_boot_without_iso','positive_seed_key_login','wrong_key_denied','unique_installed_host_key','unselected_sentinel_unchanged','source_isos_unchanged'):self.proof[flag]=True
        self.approval=dict(self.bindings,approved=True,scope='erase-reviewed-centipede-target',plan_sha256=self.plan['plan_sha256'],policy_sha256=module.planner.fingerprint(self.policy),allow_no_full_user_data_backup=True)

    def check(self,**changes):
        args=dict(plan=self.plan,inventory=self.inventory,confirmation=self.plan['confirmation'],execution='INSTALL REVIEWED CENTIPEDE '+self.plan['plan_sha256']+' '+module.planner.fingerprint(self.approval),source='a'*64,vendor='Example Vendor ',product='Example Server ',uid=0,proof=self.proof,approval=self.approval,bindings=self.bindings,owner_key_sha='b'*64)
        args.update(changes);return module.gates(**args)

    def test_reviewed_exact_gate(self):self.assertEqual(self.check()['path'],'/dev/sda')

    def test_reject_missing_or_changed_authority(self):
        for changes in ({'uid':1000},{'approval':{}},{'vendor':'Other'},{'owner_key_sha':'d'*64},{'source':'e'*64},{'execution':'yes'}):
            with self.assertRaises((ValueError,PermissionError)):self.check(**changes)

    def test_reject_failed_or_different_tested_executor(self):
        for changes in ({'status':'failed'},{'installed_boot_without_iso':False},{'shared_executor_sha256':'f'*64}):
            proof=dict(self.proof,**changes)
            with self.assertRaises(PermissionError):self.check(proof=proof)

    def test_active_swap_still_rejected(self):
        inventory=copy.deepcopy(self.inventory);inventory['swaps']=['/dev/sda5']
        with self.assertRaises(ValueError):self.check(inventory=inventory)
