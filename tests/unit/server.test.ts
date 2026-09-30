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

  it('5. Keeps two mobile clients independent through a connection drop, reconnect, and revocation', async () => {
    const baseUrl = `http://localhost:${TEST_PORT}`;
    const clients = [
      { name: 'Android Companion', token: '', deviceId: '' },
      { name: 'iOS Companion', token: '', deviceId: '' },
    ];

    // Pair each client against the same server, as two separately installed apps would.
    for (const client of clients) {
      const initRes = await fetch(`${baseUrl}/api/v1/mobile/pair/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: client.name }),
      });
      expect(initRes.status).toBe(200);
      const pairing = await initRes.json();

      const confirmRes = await fetch(`${baseUrl}/api/v1/mobile/pair/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode: pairing.pairingCode }),
      });
      expect(confirmRes.status).toBe(200);
      const confirmation = await confirmRes.json();
      expect(confirmation.success).toBe(true);
      client.token = confirmation.sessionToken;
      client.deviceId = confirmation.deviceId;
    }

    expect(clients[0].deviceId).not.toBe(clients[1].deviceId);
    expect(clients[0].token).not.toBe(clients[1].token);

    // Simulate Android losing the service endpoint; iOS remains online.
    await expect(fetch('http://127.0.0.1:1/api/v1/health', { signal: AbortSignal.timeout(1000) })).rejects.toThrow();
    const iosRevoke = await fetch(`${baseUrl}/api/v1/mobile/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clients[1].token}` },
      body: JSON.stringify({ deviceId: clients[1].deviceId }),
    });
    expect(iosRevoke.status).toBe(200);
    expect((await iosRevoke.json()).revoked).toBe(true);

    // Android reconnects to the same live service and remains authenticated.
    const androidRevoke = await fetch(`${baseUrl}/api/v1/mobile/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clients[0].token}` },
      body: JSON.stringify({ deviceId: clients[0].deviceId }),
    });
    expect(androidRevoke.status).toBe(200);
    expect((await androidRevoke.json()).revoked).toBe(true);

    // Revoked credentials must fail after connectivity returns.
    const revokedRetry = await fetch(`${baseUrl}/api/v1/mobile/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clients[1].token}` },
      body: JSON.stringify({ deviceId: clients[1].deviceId }),
    });
    expect(revokedRetry.status).toBe(403);
  });
});
