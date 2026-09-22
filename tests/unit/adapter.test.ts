import { test, expect } from 'vitest';
import { KingdomAdapter, KingdomApiError } from '../../src/api/kingdomAdapter';
import { capabilityNegotiator } from '../../src/api/capabilityNegotiator';

test('KingdomAdapter Unit Tests & Version Verification', async () => {
  const adapter = new KingdomAdapter('http://127.0.0.1:8000');

  // Version/Protocol compatibility status checks (Dynamic Protocol v1.x negotiation)
  const v1 = adapter.checkVersionCompatibility('v1TAS', { major: 1, minor: 0 });
  expect(v1.status).toBe('COMPATIBLE');

  const v2 = adapter.checkVersionCompatibility('v1TAS-next', { major: 1, minor: 4 });
  expect(v2.status).toBe('COMPATIBLE');

  const v3 = adapter.checkVersionCompatibility('v2.0-breaking', { major: 2, minor: 0 });
  expect(v3.status).toBe('INCOMPATIBLE_PROTOCOL');

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

test('Kingdom Dynamic Capability & Reconnect Resilience Matrix', async () => {
  const adapter = new KingdomAdapter('http://127.0.0.1:8000');

  // 1. Unknown / Future capability addition ignored safely
  const runtimeWithUnknownCap = {
    centipedeVersion: '1.0.0',
    expectedKingdomContractVersion: 'v1.0+',
    connectedKingdomVersion: 'v1TAS',
    lastKnownKingdomVersion: 'v1TAS',
    connectionState: 'CONNECTED' as const,
    compatibility: adapter.checkVersionCompatibility('v1TAS', { major: 1, minor: 4 }),
    running: true,
    mode: 'adaptive',
    protocol: { major: 1, minor: 4 },
    capabilities: { quantum_scheduler: true, 'filesystem.read': true },
  };

  const unknownCapResult = capabilityNegotiator.evaluateCapability('quantum_scheduler', runtimeWithUnknownCap);
  expect(unknownCapResult.status).toBe('SUPPORTED');

  // 2. Disconnect during task query returns UNKNOWN state instead of false SUCCESS
  adapter.disconnect();
  const taskResult = await adapter.get_task('task-123-interrupted');
  expect(taskResult.status).toBe('unknown');
  expect(taskResult.error).toContain('Connection interrupted');

  // 3. Reconnect triggers rediscovery and renegotiation
  adapter.disconnect();
  expect(adapter.getConnectionState()).toBe('DISCONNECTED');
});
