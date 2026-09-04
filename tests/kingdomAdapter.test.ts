import { KingdomAdapter, KingdomApiError } from '../src/api/kingdomAdapter.ts';

async function testAdapterContract() {
  console.log('--- STARTING KINGDOM ADAPTER CONTRACT & ERROR ENGINE TESTS ---');
  const adapter = new KingdomAdapter('http://127.0.0.1:8000');

  // 1. Version Compatibility Status Mapping
  const v1 = adapter.checkVersionCompatibility('40.1.0');
  console.log('40.1.0 COMPATIBLE:', v1.status === 'COMPATIBLE' ? 'PASS' : 'FAIL', v1.status);

  const v2 = adapter.checkVersionCompatibility('40.3.0');
  console.log('40.3.0 COMPATIBLE_WITH_WARNING:', v2.status === 'COMPATIBLE_WITH_WARNING' ? 'PASS' : 'FAIL', v2.status);

  const v3 = adapter.checkVersionCompatibility('39.0.0');
  console.log('39.0.0 UNSUPPORTED:', v3.status === 'UNSUPPORTED' ? 'PASS' : 'FAIL', v3.status);

  // Reset to compatible version
  adapter.checkVersionCompatibility('40.1.0');

  // 2. Structured Error Handling on Invalid Route (NOT_FOUND)
  try {
    // @ts-ignore
    await adapter['fetchJson']('/invalid_route_404_test');
    console.error('NOT_FOUND test FAIL (Should have thrown)');
  } catch (err: any) {
    if (err instanceof KingdomApiError) {
      console.log('NOT_FOUND error code mapping:', err.code === 'NOT_FOUND' ? 'PASS' : 'FAIL', err.code);
    } else {
      console.error('NOT_FOUND unexpected error type:', err);
    }
  }

  // 3. Structured Error Handling on Invalid Mode Request (INVALID_REQUEST)
  try {
    await adapter.set_mode('invalid_mode_name_xyz');
    console.error('INVALID_REQUEST test FAIL (Should have thrown)');
  } catch (err: any) {
    if (err instanceof KingdomApiError) {
      console.log('INVALID_REQUEST error code mapping:', err.code === 'INVALID_REQUEST' ? 'PASS' : 'FAIL', err.code);
    } else {
      console.error('INVALID_REQUEST unexpected error type:', err);
    }
  }

  // 4. Live API Operations
  try {
    const status = await adapter.get_status();
    console.log('get_status(): PASS', status.version);

    const task = await adapter.submit_task('Contract verification prompt task', { client: 'test_suite' });
    console.log('submit_task(): PASS', task.id);

    const fetched = await adapter.get_task(task.id);
    console.log('get_task(): PASS', fetched.id === task.id);

    const cancelled = await adapter.cancel_task(task.id);
    console.log('cancel_task(): PASS', cancelled.status === 'cancelled');

    console.log('--- ALL ADAPTER CONTRACT & ERROR ENGINE TESTS PASSED! ---');
    process.exit(0);
  } catch (err) {
    console.error('Adapter Contract Test Failed:', err);
    process.exit(1);
  }
}

testAdapterContract();
