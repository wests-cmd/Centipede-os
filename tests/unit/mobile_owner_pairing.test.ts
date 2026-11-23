import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiRouter } from '../../src/server/routes';
import { resetOwnerActionSessionsForTests } from '../../src/server/kingdomAction';

const code = 'owner-pairing-credential-over-thirty-two-characters';
const originalToken = process.env.KINGDOM_API_TOKEN;
const originalURL = process.env.KINGDOM_API_URL;
const ownerHeaders = (session: string) => ({
  'x-centipede-owner-intent': '1',
  'x-centipede-action-session': session,
});
const ask = (path: string, method: 'GET' | 'POST', body?: object,
             local = true, headers: Record<string, string> = {}) =>
  apiRouter.handleRequest({ path: '/api/v1/mobile/' + path, method, body, isLocalAdmin: local, headers });

async function unlock(): Promise<string> {
  const response = await apiRouter.handleRequest({
    path: '/api/v1/kingdom/actions/unlock', method: 'POST', isLocalAdmin: true,
    body: { ownerCode: code }, headers: { 'x-centipede-owner-intent': '1' },
  });
  expect(response.status).toBe(200);
  return response.data.sessionToken;
}

beforeEach(() => {
  resetOwnerActionSessionsForTests();
  process.env.KINGDOM_API_URL = 'http://127.0.0.1:8000';
  process.env.KINGDOM_API_TOKEN = code;
});
afterEach(() => {
  resetOwnerActionSessionsForTests();
  if (originalToken === undefined) delete process.env.KINGDOM_API_TOKEN;
  else process.env.KINGDOM_API_TOKEN = originalToken;
  if (originalURL === undefined) delete process.env.KINGDOM_API_URL;
  else process.env.KINGDOM_API_URL = originalURL;
});

describe('mobile pairing owner authorization', () => {
  it('requires owner intent and expiring session to create a code, list devices or administratively revoke', async () => {
    expect((await ask('pair/initiate', 'POST', {deviceName:'Phone'})).status).toBe(401);
    expect((await ask('pair/initiate', 'POST', {deviceName:'Phone'}, false)).status).toBe(403);
    expect((await ask('devices', 'GET')).status).toBe(401);
    expect((await ask('devices', 'GET', undefined, false)).status).toBe(403);
    expect((await ask('revoke', 'POST', {deviceId:'dev_unknown'})).status).toBe(401);
    const session = await unlock();
    const h = ownerHeaders(session);
    expect((await ask('pair/initiate', 'POST', {deviceName:'Phone'}, true,
      {'x-centipede-action-session':session})).status).toBe(401);
    const pending = await ask('pair/initiate', 'POST', {deviceName:'Phone'}, true, h);
    expect(pending.status).toBe(200);
    expect(pending.data.pairingCode).toMatch(/^\d{6}$/);
    const confirmed = await ask('pair/confirm', 'POST', {pairingCode:pending.data.pairingCode}, false);
    expect(confirmed.status).toBe(200);
    expect(confirmed.data.success).toBe(true);
    const list = await ask('devices', 'GET', undefined, true, h);
    expect(list.status).toBe(200);
    const device = list.data.devices.find((entry: {deviceId:string}) => entry.deviceId === pending.data.deviceId);
    expect(device).toBeDefined();
    expect(device).not.toHaveProperty('sessionToken');
    expect(device).not.toHaveProperty('pairingCode');
    expect((await ask('revoke', 'POST', {deviceId:pending.data.deviceId}, true, h)).data.revoked).toBe(true);
    expect((await apiRouter.handleRequest({
      path:'/api/v1/kingdom/actions/lock', method:'POST', isLocalAdmin:true, headers:h, body:{},
    })).status).toBe(200);
    expect((await ask('devices', 'GET', undefined, true, h)).status).toBe(401);
    expect((await ask('pair/initiate', 'POST', {deviceName:'Phone'}, true, h)).status).toBe(401);
  });

  it('still allows a remote phone to confirm a single-use code without seeing owner-only device lists', async () => {
    const session = await unlock();
    const pending = await ask('pair/initiate', 'POST', {deviceName:'Phone'}, true, ownerHeaders(session));
    expect(pending.status).toBe(200);
    const confirmed = await ask('pair/confirm', 'POST', {pairingCode:pending.data.pairingCode}, false);
    expect(confirmed.status).toBe(200);
    expect(confirmed.data.success).toBe(true);
    expect((await ask('devices', 'GET', undefined, false,
      {authorization:'Bearer ' + confirmed.data.sessionToken})).status).toBe(403);
    expect((await ask('pair/confirm', 'POST', {pairingCode:pending.data.pairingCode}, false)).status).not.toBe(200);
    // Remote paired devices retain a narrowly scoped right to revoke themselves.
    const own = await ask('revoke', 'POST', {deviceId:confirmed.data.deviceId}, false,
      {authorization:'Bearer ' + confirmed.data.sessionToken});
    expect(own.status).toBe(200);
    expect(own.data.revoked).toBe(true);
  });
});
