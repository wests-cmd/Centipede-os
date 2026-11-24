import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRouter } from '../../src/server/routes';
import { resetOwnerActionSessionsForTests } from '../../src/server/kingdomAction';
import { KingdomActions } from '../../src/api/kingdomActions';

const originalFetch = globalThis.fetch;
const originalUrl = process.env.KINGDOM_API_URL;
const originalToken = process.env.KINGDOM_API_TOKEN;
const secret = 'test-owner-secret-this-is-at-least-32-characters';
const request = (path: string, body: object = {}, headers: Record<string,string> = {}, isLocalAdmin = true) =>
  apiRouter.handleRequest({ path: `/api/v1/kingdom/actions/${path}`, method: 'POST', body,
    isLocalAdmin, headers: { 'x-centipede-owner-intent': '1', ...headers } });
const unlock = () => request('unlock', { ownerCode: secret });
beforeEach(() => {
  resetOwnerActionSessionsForTests();
  process.env.KINGDOM_API_URL = 'https://kingdom.internal:8000';
  process.env.KINGDOM_API_TOKEN = secret;
});
afterEach(() => {
  if (originalUrl === undefined) delete process.env.KINGDOM_API_URL; else process.env.KINGDOM_API_URL = originalUrl;
  if (originalToken === undefined) delete process.env.KINGDOM_API_TOKEN; else process.env.KINGDOM_API_TOKEN = originalToken;
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});
describe('owner-verified local Kingdom task channel', () => {
  it('rejects unencrypted remote Kingdom credentials even for the correct owner', async () => {
    process.env.KINGDOM_API_URL = 'http://kingdom.internal:8000';
    const network = vi.fn();
    globalThis.fetch = network as typeof fetch;
    const result = await unlock();
    expect(result.status).toBe(503);
    expect(network).not.toHaveBeenCalled();
    process.env.KINGDOM_API_URL = 'http://127.0.0.1:8000';
    expect((await unlock()).status).toBe(200);
  });
  it('blocks LAN clients, missing intent, wrong owner code and unauthenticated writes without forwarding', async () => {
    const upstream = vi.fn();
    globalThis.fetch = upstream as typeof fetch;
    expect((await request('unlock', { ownerCode: secret }, {}, false)).status).toBe(403);
    expect((await request('unlock', { ownerCode: secret }, { 'x-centipede-owner-intent': '' })).status).toBe(403);
    expect((await request('unlock', { ownerCode: 'invalid-secret' })).status).toBe(401);
    expect((await request('tasks', { prompt: 'do work' })).status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('only forwards an owner-unlocked, bounded Kingdom task, keeping credentials server-side', async () => {
    const login = await unlock();
    expect(login.status).toBe(200);
    expect(login.data.sessionToken).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(login.data)).not.toContain(secret);
    const upstream = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ id: 'task_verified_1', status: 'queued', prompt: 'audit' }), { status: 201 }));
    globalThis.fetch = upstream as typeof fetch;
    const result = await request('tasks', { prompt: 'audit', metadata: { actor_id: 'attacker' } },
      { 'x-centipede-action-session': login.data.sessionToken });
    expect(result.status).toBe(200);
    expect(result.data.id).toBe('task_verified_1');
    const [url, options] = upstream.mock.calls[0];
    expect(String(url)).toBe('https://kingdom.internal:8000/tasks');
    expect(options?.headers).toMatchObject({ Authorization: `Bearer ${secret}` });
    expect(JSON.parse(String(options?.body))).toEqual({ prompt: 'audit', metadata: { client: 'centipede_os_owner_ui' } });
    const locked = await request('lock', {}, { 'x-centipede-action-session': login.data.sessionToken });
    expect(locked.status).toBe(200);
    expect((await request('tasks', { prompt: 'no' }, { 'x-centipede-action-session': login.data.sessionToken })).status).toBe(401);
    expect(upstream).toHaveBeenCalledTimes(1);
  });
  it('never fabricates confirmation IDs or success when Kingdom is unreachable or refuses the request', async () => {
    const login = await unlock(); const headers = { 'x-centipede-action-session': login.data.sessionToken };
    globalThis.fetch = vi.fn(async () => { throw new Error('offline'); }) as typeof fetch;
    const unreachable = await request('tasks', { prompt: 'audit' }, headers);
    expect(unreachable.status).toBe(502);
    expect(unreachable.error).toContain('outcome unknown');
    expect(unreachable.data).toBeUndefined();
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ status: 'queued' }), { status: 201 })) as typeof fetch;
    const missingId = await request('tasks', { prompt: 'audit' }, headers);
    expect(missingId.status).toBe(502);
    expect(missingId.error).toContain('valid task ID');
    globalThis.fetch = vi.fn(async () => new Response('', { status: 403 })) as typeof fetch;
    const forbidden = await request('tasks', { prompt: 'audit' }, headers);
    expect(forbidden.status).toBe(403);
  });
  it('supports only fixed task actions and rejects malformed IDs or session reuse after credential rotation', async () => {
    const login = await unlock(); const h = { 'x-centipede-action-session': login.data.sessionToken };
    expect((await request('tasks', { prompt: '' }, h)).status).toBe(422);
    expect((await request('security/approvals', {}, h)).status).toBe(404);
    expect((await request('tasks/bad%2Fid/cancel', {}, h)).status).toBe(404);
    process.env.KINGDOM_API_TOKEN = 'rotated-secret-this-is-at-least-32-characters';
    expect((await request('tasks', { prompt: 'audit' }, h)).status).toBe(401);
  });
  it('invalidates owner sessions on Kingdom endpoint changes, including other owner brokers', async () => {
    const login = await unlock();
    const headers = { 'x-centipede-action-session': login.data.sessionToken };
    const upstream = vi.fn();
    globalThis.fetch = upstream as typeof fetch;
    process.env.KINGDOM_API_URL = 'https://other-kingdom.internal:8000';
    expect((await request('tasks', {prompt:'audit'}, headers)).status).toBe(401);
    expect((await apiRouter.handleRequest({path:'/api/v1/host-files/list',method:'POST',isLocalAdmin:true,
      body:{directory:''},headers:{...headers,'x-centipede-owner-intent':'1'}})).status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('rejects mismatched cancellation receipts and invalid task status values', async () => {
    const login = await unlock();
    const h = { 'x-centipede-action-session': login.data.sessionToken };
    for (const receipt of [{id:'other',status:'cancelled'}, {id:'target',status:'invented'}]) {
      globalThis.fetch = vi.fn(async () => Response.json(receipt)) as typeof fetch;
      expect((await request('tasks/target/cancel', {}, h)).status).toBe(502);
    }
    globalThis.fetch = vi.fn(async () => Response.json({id:'target',status:'cancelled'})) as typeof fetch;
    expect((await request('tasks/target/cancel', {}, h)).data).toMatchObject({id:'target',status:'cancelled'});
  });
  it('client does not allow task submission until unlocked and sends no code in subsequent tasks', async () => {
    const client = new KingdomActions();
    await expect(client.submitTask('task')).rejects.toThrow('Unlock');
    const upstream = vi.fn(async (_url: RequestInfo | URL, opts?: RequestInit) => {
      if (String(_url).endsWith('/unlock')) return new Response(JSON.stringify({ sessionToken: 'a'.repeat(64), expiresAt: Date.now() + 100_000 }), { status: 200 });
      return new Response(JSON.stringify({ id: 't123', status: 'queued' }), { status: 200 });
    });
    globalThis.fetch = upstream as typeof fetch;
    await client.unlock('owner-code-to-be-sent-once');
    const result = await client.submitTask('task');
    expect(result.id).toBe('t123');
    expect(String(upstream.mock.calls[1][1]?.body)).not.toContain('owner-code-to-be-sent-once');
    expect(client.isUnlocked()).toBe(true);
  });
});
