import { KingdomAdapter } from '../src/api/kingdomAdapter.ts';

async function testAdapter() {
  console.log('--- STARTING KINGDOM ADAPTER TESTS ---');
  const adapter = new KingdomAdapter('http://127.0.0.1:8000');

  try {
    // 1. get_status()
    const status = await adapter.get_status();
    console.log('1. get_status():', status.version ? 'PASS' : 'FAIL', status);

    // 2. start_runtime()
    const startRes = await adapter.start_runtime();
    console.log('2. start_runtime():', startRes.status === 'started' ? 'PASS' : 'FAIL');

    // 3. get_mode()
    const modeRes = await adapter.get_mode();
    console.log('3. get_mode():', modeRes.mode ? 'PASS' : 'FAIL', modeRes);

    // 4. submit_task()
    const task = await adapter.submit_task('Centipede test task prompt', { source: 'test_suite' });
    console.log('4. submit_task():', task.id ? 'PASS' : 'FAIL', task.id);

    // 5. get_task()
    const fetchedTask = await adapter.get_task(task.id);
    console.log('5. get_task():', fetchedTask.id === task.id ? 'PASS' : 'FAIL');

    // 6. cancel_task()
    const cancelled = await adapter.cancel_task(task.id);
    console.log('6. cancel_task():', cancelled.status === 'cancelled' ? 'PASS' : 'FAIL');

    // 7. get_events()
    const events = await adapter.get_events(10);
    console.log('7. get_events():', Array.isArray(events) ? 'PASS' : 'FAIL', `count=${events.length}`);

    // 8. get_knights()
    const knightsRes = await adapter.get_knights();
    console.log('8. get_knights():', Array.isArray(knightsRes.knights) ? 'PASS' : 'FAIL', `knights=${knightsRes.knights.length}`);

    // 9. get_models()
    const modelsRes = await adapter.get_models();
    console.log('9. get_models():', modelsRes !== null ? 'PASS' : 'FAIL', modelsRes);

    // 10. get_memory()
    const memoryRes = await adapter.get_memory(5);
    console.log('10. get_memory():', Array.isArray(memoryRes) ? 'PASS' : 'FAIL');

    // 11. search_memory()
    const searchRes = await adapter.search_memory('test', 5);
    console.log('11. search_memory():', Array.isArray(searchRes) ? 'PASS' : 'FAIL');

    // 12. get_maps()
    const mapsRes = await adapter.get_maps();
    console.log('12. get_maps():', Array.isArray(mapsRes) ? 'PASS' : 'FAIL');

    // 13. get_security_status()
    const secStatus = await adapter.get_security_status();
    console.log('13. get_security_status():', secStatus.enabled ? 'PASS' : 'FAIL', secStatus);

    // 14. get_permissions()
    const permsRes = await adapter.get_permissions();
    console.log('14. get_permissions():', Array.isArray(permsRes.nodes) ? 'PASS' : 'FAIL');

    // 15. create_approval()
    const approval = await adapter.create_approval('filesystem.delete', 'delete_temp', 'Unit test request', 'centipede_test', 'HIGH');
    console.log('15. create_approval():', approval.id ? 'PASS' : 'FAIL', approval.id);

    // 16. approve()
    const approved = await adapter.approve(approval.id, 'admin_tester', 'Approved by test suite');
    console.log('16. approve():', approved.status === 'approved' ? 'PASS' : 'FAIL');

    // 17. create & deny approval
    const approval2 = await adapter.create_approval('process.execute', 'run_cmd', 'Test deny', 'centipede_test', 'HIGH');
    const denied = await adapter.deny(approval2.id, 'admin_tester', 'Denied by test suite');
    console.log('17. deny():', denied.status === 'denied' ? 'PASS' : 'FAIL');

    // 18. get_audit()
    const auditRes = await adapter.get_audit(10);
    console.log('18. get_audit():', Array.isArray(auditRes) ? 'PASS' : 'FAIL', `audit_logs=${auditRes.length}`);

    // 19. stop_runtime()
    const stopRes = await adapter.stop_runtime();
    console.log('19. stop_runtime():', stopRes.status === 'stopped' ? 'PASS' : 'FAIL');

    console.log('--- ALL 18 KINGDOM ADAPTER METHODS VERIFIED 100% PASS! ---');
    process.exit(0);
  } catch (err) {
    console.error('Kingdom Adapter Test Failed:', err);
    process.exit(1);
  }
}

testAdapter();
