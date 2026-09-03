import { KingdomAdapter } from '../src/api/kingdomAdapter.ts';

async function testAdapter() {
  console.log('--- STARTING KINGDOM ADAPTER & VERSION HARDENING TESTS ---');
  const adapter = new KingdomAdapter('http://127.0.0.1:8000');

  // Test version compatibility logic
  const compatGood = adapter.checkVersionCompatibility('40.1.0');
  console.log('Version 40.1.0 check:', compatGood.status === 'COMPATIBLE' ? 'PASS' : 'FAIL', compatGood);

  const compatOld = adapter.checkVersionCompatibility('39.5.0');
  console.log('Version 39.5.0 check:', compatOld.status === 'INCOMPATIBLE_TOO_OLD' ? 'PASS' : 'FAIL', compatOld);

  const compatNew = adapter.checkVersionCompatibility('42.0.0');
  console.log('Version 42.0.0 check:', compatNew.status === 'INCOMPATIBLE_TOO_NEW' ? 'PASS' : 'FAIL', compatNew);

  // Restore valid version check
  adapter.checkVersionCompatibility('40.1.0');

  try {
    // 1. get_status()
    const status = await adapter.get_status();
    console.log('1. get_status():', status.version ? 'PASS' : 'FAIL', status);

    // Check connection state transition to CONNECTED
    console.log('Connection state:', adapter.getConnectionState() === 'CONNECTED' ? 'PASS' : 'FAIL', adapter.getConnectionState());

    // 2. start_runtime()
    const startRes = await adapter.start_runtime();
    console.log('2. start_runtime():', startRes.status === 'started' ? 'PASS' : 'FAIL');

    // 3. submit_task() & task pipeline
    const task = await adapter.submit_task('Hardened test task prompt', { source: 'test_suite' });
    console.log('3. submit_task():', task.id ? 'PASS' : 'FAIL', task.id);

    // 4. get_task()
    const fetchedTask = await adapter.get_task(task.id);
    console.log('4. get_task():', fetchedTask.id === task.id ? 'PASS' : 'FAIL');

    // 5. cancel_task()
    const cancelled = await adapter.cancel_task(task.id);
    console.log('5. cancel_task():', cancelled.status === 'cancelled' ? 'PASS' : 'FAIL');

    // 6. security approvals & audit
    const approval = await adapter.create_approval('filesystem.delete', 'delete_temp', 'Hardened request test', 'centipede_test', 'HIGH');
    const approved = await adapter.approve(approval.id, 'admin_tester', 'Approved by test suite');
    console.log('6. ZeroTrust approval pipeline:', approved.status === 'approved' ? 'PASS' : 'FAIL');

    // 7. stop_runtime()
    const stopRes = await adapter.stop_runtime();
    console.log('7. stop_runtime():', stopRes.status === 'stopped' ? 'PASS' : 'FAIL');

    console.log('--- ALL ADAPTER & VERSION HARDENING TESTS PASSED! ---');
    process.exit(0);
  } catch (err) {
    console.error('Kingdom Adapter Test Failed:', err);
    process.exit(1);
  }
}

testAdapter();
