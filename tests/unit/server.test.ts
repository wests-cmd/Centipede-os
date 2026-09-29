import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { centipedeServer } from '../../src/server/server';

describe('Centipede API Server & Transport Test Suite', () => {
  const TEST_PORT = 3099;

  beforeAll(() => {
    centipedeServer.start(TEST_PORT);
  });

  afterAll(() => {
    centipedeServer.stop();
  });

  it('1. Verifies server mode is REAL_HTTP_SERVER in Node/Bun environment', () => {
    expect(centipedeServer.getMode()).toBe('REAL_HTTP_SERVER');
  });

  it('2. Responds to GET /api/v1/health over real HTTP socket', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('HEALTHY');
    expect(data.version).toBe('1.0.0');
    expect(data.timestamp).toBeDefined();
  });

  it('3. Responds to GET /api/v1/runtime over real HTTP socket', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/v1/runtime`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.centipedeVersion).toBe('1.0.0');
    expect(data.platform).toBeDefined();
    expect(data.hardware).toBeDefined();
  });

  it('4. Executes complete Mobile Pairing & Session Auth flow over real HTTP', async () => {
    // Initiate pairing
    const initRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mobile/pair/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceName: 'Pixel 8 Pro Test' }),
    });
    expect(initRes.status).toBe(200);
    const initData = await initRes.json();
    expect(initData.pairingCode).toBeDefined();
    expect(initData.pairingCode.length).toBe(6);

    // Confirm pairing
    const confirmRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mobile/pair/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairingCode: initData.pairingCode }),
    });
    expect(confirmRes.status).toBe(200);
    const confirmData = await confirmRes.json();
    expect(confirmData.success).toBe(true);
    expect(confirmData.sessionToken).toBeDefined();

    // Authenticated request with session token
    const revokeRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/mobile/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${confirmData.sessionToken}`,
      },
      body: JSON.stringify({ deviceId: confirmData.deviceId }),
    });
    expect(revokeRes.status).toBe(200);
    const revokeData = await revokeRes.json();
    expect(revokeData.revoked).toBe(true);
  });
});
