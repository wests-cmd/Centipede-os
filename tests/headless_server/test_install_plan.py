import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('install_plan',Path(__file__).resolve().parents[2]/'scripts/headless-install-plan.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
SIZE=80*1024**3


def fixture():
    return {'version':1,'live_source':'/dev/sdb1','swaps':[], 'blockdevices':[
        {'path':'/dev/sda','type':'disk','serial':'OPTIPLEX-TARGET','size':SIZE,'wwn':'wwn-target','ro':False,'mountpoints':[None],
         'children':[{'path':'/dev/sda1','type':'part','size':SIZE-1048576,'ro':False,'mountpoints':[None],'fstype':'ext4'}]},
        {'path':'/dev/sdb','type':'disk','serial':'LIVE-USB','size':8022654976,'ro':False,'mountpoints':[None],
         'children':[{'path':'/dev/sdb1','type':'part','ro':True,'mountpoints':['/run/live/medium'],'fstype':'iso9660'}]}]}


def plan(first=None,second=None):
    first=fixture() if first is None else first
    return module.make_plan(first,copy.deepcopy(first) if second is None else second,'/dev/sda','OPTIPLEX-TARGET',SIZE)


class InstallPlanTests(unittest.TestCase):
    def test_real_inventory_requests_tree_even_without_name_column(self):
        values=fixture()
        with patch.object(module.sys,'platform','linux'),patch.object(module.os.path,'realpath',side_effect=lambda path:path),patch.object(module.Path,'read_text',return_value='Filename Type Size Used Priority\n'),patch.object(module,'command',side_effect=[{'blockdevices':values['blockdevices']},{'filesystems':[{'source':'/dev/sdb1','target':'/run/live/medium'}]}]) as command:
            self.assertEqual(module.collect(),values)
        self.assertIn('--tree',command.call_args_list[0].args)

    def test_swap_inventory_uses_kernel_format_without_unsupported_swapon_json(self):
        with patch.object(module.os.path,'realpath',side_effect=lambda path:path):
            self.assertEqual(module.parse_swaps('Filename Type Size Used Priority\n'),[])
            self.assertEqual(module.parse_swaps('Filename Type Size Used Priority\n/dev/vda2 partition 1024 0 -2\n/swap\\040file file 2048 10 -3\n'),['/dev/vda2','/swap file'])
        for text in ['', 'unexpected header\n', 'Filename Type Size Used Priority\n/dev/vda2 malformed\n']:
            with self.assertRaises(ValueError):module.parse_swaps(text)

    def test_unused_exact_target_can_be_planned_and_confirmation_never_installs(self):
        value=plan()
        result=module.confirm(value,fixture(),value['confirmation'])
        self.assertEqual(result['phase'],'confirmed-for-review-only')
        self.assertFalse(result['installation_performed'])
        self.assertFalse(result['disk_executor_available'])

    def test_source_disk_never_eligible_even_when_size_and_serial_match(self):
        inventory=fixture();inventory['live_source']='/dev/sda1'
        with self.assertRaisesRegex(ValueError,'live boot source'):plan(inventory)

    def test_disposable_qemu_optical_source_is_protected_without_blocking_blank_target(self):
        inventory=fixture();inventory['live_source']='/dev/sr0'
        inventory['blockdevices'].append({'path':'/dev/sr0','type':'rom','ro':True,'size':1711276032,'mountpoints':['/run/live/medium']})
        self.assertEqual(plan(inventory)['payload']['target']['path'],'/dev/sda')
        inventory['blockdevices'][-1]['type']='loop'
        with self.assertRaisesRegex(ValueError,'source disk'):plan(inventory)

    def test_root_mounted_descendant_and_unknown_mount_state_fail_closed(self):
        for mounts in [['/'],['/mnt/data'],None]:
            inventory=fixture();inventory['blockdevices'][0]['children'][0]['mountpoints']=mounts
            with self.assertRaises(ValueError):plan(inventory)

    def test_swap_and_read_only_children_are_not_erase_candidates(self):
        for mutation in ['active-swap','existing-swap','readonly','unknown-readonly']:
            inventory=fixture();child=inventory['blockdevices'][0]['children'][0]
            if mutation=='active-swap':inventory['swaps']=['/dev/sda1']
            if mutation=='existing-swap':child['fstype']='swap'
            if mutation=='readonly':child['ro']=True
            if mutation=='unknown-readonly':child.pop('ro')
            with self.assertRaises(ValueError):plan(inventory)

    def test_missing_source_and_duplicate_disk_serial_or_path_fail_closed(self):
        for mutation in ['source','serial','path']:
            inventory=fixture()
            if mutation=='source':inventory['live_source']='/dev/unknown'
            if mutation=='serial':inventory['blockdevices'][1]['serial']='OPTIPLEX-TARGET'
            if mutation=='path':inventory['blockdevices'].append(copy.deepcopy(inventory['blockdevices'][0]))
            with self.assertRaises(ValueError):plan(inventory)

    def test_explicit_selection_must_match_size_serial_and_whole_disk_path(self):
        for path,serial,size in [('/dev/sda1','OPTIPLEX-TARGET',SIZE),('/dev/sda','OTHER',SIZE),('/dev/sda','OPTIPLEX-TARGET',SIZE-1),('/dev/../sda','OPTIPLEX-TARGET',SIZE)]:
            with self.assertRaises(ValueError):module.make_plan(fixture(),fixture(),path,serial,size)

    def test_active_mapping_or_duplicate_wwn_is_not_a_safe_target(self):
        inventory=fixture();inventory['blockdevices'][0]['children'][0]['type']='crypt'
        with self.assertRaisesRegex(ValueError,'mapped'):plan(inventory)
        inventory=fixture();inventory['blockdevices'][1]['wwn']='wwn-target'
        with self.assertRaisesRegex(ValueError,'WWN'):plan(inventory)

    def test_storage_changes_between_observations_and_after_review_are_rejected(self):
        first=fixture();second=fixture();second['blockdevices'][0]['wwn']='REPLACED'
        with self.assertRaisesRegex(ValueError,'changed'):plan(first,second)
        value=plan()
        with self.assertRaisesRegex(ValueError,'changed'):module.confirm(value,second,value['confirmation'])
        second=fixture();second['blockdevices'][0]['children'][0]['mountpoints']=['/new-mount']
        with self.assertRaises(ValueError):module.confirm(value,second,value['confirmation'])

    def test_plan_tampering_or_unbound_confirmation_is_rejected(self):
        value=plan()
        with self.assertRaises(ValueError):module.confirm(value,fixture(),'yes')
        changed=copy.deepcopy(value);changed['payload']['target']['size']+=1
        with self.assertRaisesRegex(ValueError,'digest'):module.confirm(changed,fixture(),value['confirmation'])
        changed=copy.deepcopy(value);changed['confirmation']='yes'
        with self.assertRaises(ValueError):module.confirm(changed,fixture(),'yes')

    def test_reviewed_plan_cannot_be_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'plan.json';module.write_plan(path,plan())
            before=path.read_bytes()
            with self.assertRaises(FileExistsError):module.write_plan(path,plan())
            self.assertEqual(path.read_bytes(),before)


if __name__=='__main__':unittest.main()
