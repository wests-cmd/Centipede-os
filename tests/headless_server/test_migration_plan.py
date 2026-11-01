import copy
import unittest
from test_install_plan import fixture,module,SIZE


def migration_fixture():
    inventory=fixture();target=inventory['blockdevices'][0]
    target['children'].append({'path':'/dev/sda5','type':'part','ro':False,'mountpoints':[None],
        'fstype':'swap','uuid':'11111111-2222-3333-4444-555555555555'})
    policy={'version':1,'target':{'path':'/dev/sda','serial':'OPTIPLEX-TARGET','size':SIZE,'wwn':'wwn-target'},
            'machine':{'vendor':'Example Vendor','product':'Example Server'},'source_disk_serial':'LIVE-USB',
            'inactive_swap':[{'path':'/dev/sda5','uuid':'11111111-2222-3333-4444-555555555555'}],
            'erase_all_existing_partitions':True,'backup_requirement':'partition-metadata-and-prefix-tail',
            'source_squashfs_sha256':'a'*64,'owner_public_key_sha256':'b'*64}
    return inventory,policy


def reviewed(inventory,policy):
    return module.make_migration_plan(inventory,copy.deepcopy(inventory),policy,'REVIEW CENTIPEDE MIGRATION '+module.fingerprint(policy))


class MigrationPlanTests(unittest.TestCase):
    def test_exact_reviewed_inactive_swap_is_a_separate_review_only_mode(self):
        inventory,policy=migration_fixture()
        with self.assertRaises(ValueError):module.make_plan(inventory,inventory,'/dev/sda','OPTIPLEX-TARGET',SIZE)
        plan=reviewed(inventory,policy)
        self.assertEqual(module.confirm_migration(plan,inventory,plan['confirmation'])['phase'],'migration-confirmed-for-review-only')
        self.assertFalse(module.confirm_migration(plan,inventory,plan['confirmation'])['physical_execution_authorized'])
        with self.assertRaises(ValueError):module.confirm(plan,inventory,plan['confirmation'])

    def test_active_swap_never_gets_an_exception(self):
        inventory,policy=migration_fixture();inventory['swaps']=['/dev/sda5']
        with self.assertRaisesRegex(ValueError,'active swap'):reviewed(inventory,policy)

    def test_review_binds_swap_uuid_source_usb_and_target_wwn(self):
        for change in ['swap','source','wwn']:
            inventory,policy=migration_fixture()
            if change=='swap':inventory['blockdevices'][0]['children'][-1]['uuid']='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
            if change=='source':inventory['blockdevices'][1]['serial']='OTHER-USB'
            if change=='wwn':inventory['blockdevices'][0]['wwn']='REPLACED'
            with self.assertRaises(ValueError):reviewed(inventory,policy)

    def test_review_confirmation_and_erase_backup_scope_are_explicit(self):
        inventory,policy=migration_fixture()
        with self.assertRaises(ValueError):module.make_migration_plan(inventory,inventory,policy,'yes')
        policy['erase_all_existing_partitions']=False
        with self.assertRaises(ValueError):reviewed(inventory,policy)
        inventory,policy=migration_fixture();policy['backup_requirement']='none'
        with self.assertRaises(ValueError):reviewed(inventory,policy)

    def test_stale_review_and_new_inactive_swap_are_rejected(self):
        inventory,policy=migration_fixture();plan=reviewed(inventory,policy)
        changed=copy.deepcopy(inventory);changed['blockdevices'][0]['children'][0]['mountpoints']=['/mnt/old-os']
        with self.assertRaises(ValueError):module.confirm_migration(plan,changed,plan['confirmation'])
        inventory['blockdevices'][0]['children'].append({'path':'/dev/sda6','type':'part','ro':False,'mountpoints':[None],
            'fstype':'swap','uuid':'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'})
        with self.assertRaises(ValueError):reviewed(inventory,policy)
