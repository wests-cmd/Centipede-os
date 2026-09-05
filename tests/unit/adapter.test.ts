import { test, expect } from 'bun:test';
import { KingdomAdapter, KingdomApiError } from '../../src/api/kingdomAdapter.ts';

test('KingdomAdapter Unit Tests & Version Verification', async () => {
  const adapter = new KingdomAdapter('http://127.0.0.1:8000');

  // Version compatibility status checks
  const v1 = adapter.checkVersionCompatibility('40.1.0');
  expect(v1.status).toBe('COMPATIBLE');

  const v2 = adapter.checkVersionCompatibility('40.3.0');
  expect(v2.status).toBe('COMPATIBLE_WITH_WARNING');

  const v3 = adapter.checkVersionCompatibility('39.0.0');
  expect(v3.status).toBe('UNSUPPORTED');

  // Offline status check
  const offlineAdapter = new KingdomAdapter('http://127.0.0.1:9999');
  expect(offlineAdapter.getConnectionState()).toBe('DISCONNECTED');

  try {
    await offlineAdapter.get_status();
    expect(true).toBe(false); // Should not reach here
  } catch (err: any) {
    expect(err).toBeInstanceOf(KingdomApiError);
    expect(err.code).toBe('KINGDOM_OFFLINE');
  }
});
