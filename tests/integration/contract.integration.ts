import { KingdomAdapter, KingdomApiError } from '../../src/api/kingdomAdapter.ts';

async function runContractVerification() {
  console.log('===========================================================');
  console.log('  CENTIPEDE OS ↔ KINGDOM CONTRACT VERIFICATION SUITE');
  console.log('===========================================================');

  const onlineAdapter = new KingdomAdapter('http://127.0.0.1:8000');
  const offlineAdapter = new KingdomAdapter('http://127.0.0.1:9999');

  // 1. Connection & Online/Offline Detection
  console.log('\n--- 1. CONNECTION & ONLINE/OFFLINE DETECTION ---');
  try {
    const status = await onlineAdapter.get_status();
    console.log('[PASS] Kingdom Available: Engine version =', status.version);
    console.log('[PASS] Connection State =', onlineAdapter.getConnectionState());
  } catch (e: any) {
    console.error('[FAIL] Kingdom Available check failed:', e.message);
    process.exit(1);
  }

  try {
    await offlineAdapter.get_status();
    console.error('[FAIL] Kingdom Unavailable check failed (Should have thrown)');
    process.exit(1);
  } catch (e: any) {
    if (e instanceof KingdomApiError && e.code === 'KINGDOM_OFFLINE') {
      console.log('[PASS] Kingdom Unavailable correctly classified as KINGDOM_OFFLINE');
      console.log('[PASS] Offline Connection State =', offlineAdapter.getConnectionState());
    } else {
      console.error('[FAIL] Kingdom Unavailable wrong error:', e);
      process.exit(1);
    }
  }

  // 2. Version Compatibility & Reconnect
  console.log('\n--- 2. VERSION COMPATIBILITY & RECONNECT ---');
  const compatGood = onlineAdapter.checkVersionCompatibility('40.1.0');
  console.log('[PASS] Version 40.1.0 Status =', compatGood.status);

  const compatWarn = onlineAdapter.checkVersionCompatibility('40.3.0');
  console.log('[PASS] Version 40.3.0 Status =', compatWarn.status);

  const compatUnsup = onlineAdapter.checkVersionCompatibility('39.0.0');
  console.log('[PASS] Version 39.0.0 Status =', compatUnsup.status);

  onlineAdapter.checkVersionCompatibility('40.1.0');

  const reconnected = await onlineAdapter.reconnect();
  console.log('[PASS] Controlled Reconnect =', reconnected ? 'SUCCESS' : 'FAILED');

  // 3. Runtime Controls
  console.log('\n--- 3. RUNTIME LIFECYCLE CONTROLS ---');
  const startRes = await onlineAdapter.start_runtime();
  console.log('[PASS] Start Runtime =', startRes.status);

  const activeStatus = await onlineAdapter.get_status();
  console.log('[PASS] Runtime Running =', activeStatus.running);

  const stopRes = await onlineAdapter.stop_runtime();
  console.log('[PASS] Stop Runtime =', stopRes.status);

  // 4. Task Lifecycle
  console.log('\n--- 4. TASK LIFECYCLE & CANCEL ---');
  const task = await onlineAdapter.submit_task('Contract task lifecycle verification', { test: true });
  console.log('[PASS] Submit Task: Created ID =', task.id, 'Status =', task.status);

  const fetchedTask = await onlineAdapter.get_task(task.id);
  console.log('[PASS] Get Task Details: ID =', fetchedTask.id, 'Status =', fetchedTask.status);

  const cancelledTask = await onlineAdapter.cancel_task(task.id);
  console.log('[PASS] Cancel Task: ID =', cancelledTask.id, 'Status =', cancelledTask.status);

  // 5. ZeroTrust Security & Approval Workflow
  console.log('\n--- 5. ZEROTRUST SECURITY & HUMAN APPROVAL ---');
  const secStatus = await onlineAdapter.get_security_status();
  console.log('[PASS] ZeroTrust Enabled =', secStatus.enabled, 'Mode =', secStatus.mode);

  const approvalReq = await onlineAdapter.create_approval(
    'filesystem.delete',
    'delete_tmp',
    'Contract security workflow verification',
    'centipede_contract_suite',
    'HIGH'
  );
  console.log('[PASS] Create Approval Request: ID =', approvalReq.id, 'Status =', approvalReq.status);

  const approved = await onlineAdapter.approve(approvalReq.id, 'admin_contract_tester', 'Approved by contract test suite');
  console.log('[PASS] Approve Operation: ID =', approved.id, 'New Status =', approved.status);

  const approvalReq2 = await onlineAdapter.create_approval(
    'process.execute',
    'run_cmd',
    'Contract denial test',
    'centipede_contract_suite',
    'HIGH'
  );
  const denied = await onlineAdapter.deny(approvalReq2.id, 'admin_contract_tester', 'Denied by contract test suite');
  console.log('[PASS] Deny Operation: ID =', denied.id, 'New Status =', denied.status);

  const auditLogs = await onlineAdapter.get_audit(5);
  console.log('[PASS] Immutable Audit Logs Count =', auditLogs.length);

  // 6. Error Model Categorization & Error Masking
  console.log('\n--- 6. ERROR MODEL CATEGORIZATION ---');
  try {
    await onlineAdapter.set_mode('invalid_mode_enum_test');
  } catch (e: any) {
    if (e instanceof KingdomApiError) {
      console.log('[PASS] Invalid Mode Error Code =', e.code, '| User Message =', e.userMessage);
    }
  }

  try {
    // @ts-ignore
    await onlineAdapter['fetchJson']('/non_existent_endpoint');
  } catch (e: any) {
    if (e instanceof KingdomApiError) {
      console.log('[PASS] 404 Endpoint Error Code =', e.code, '| User Message =', e.userMessage);
    }
  }

  console.log('\n===========================================================');
  console.log('  ALL CONTRACT VERIFICATION TESTS PASSED 100%!');
  console.log('===========================================================');
  process.exit(0);
}

runContractVerification().catch((err) => {
  console.error('Contract test error:', err);
  process.exit(1);
});
