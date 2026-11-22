import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRouter } from '../../src/server/routes';
import { resetOwnerActionSessionsForTests } from '../../src/server/kingdomAction';

const OWNER = 'a'.repeat(64);
const HARNESS = 'b'.repeat(64);

const req = (path: string, method: 'GET' | 'POST' | 'PUT' = 'GET',
  isLocalAdmin = true, body?: object, headers: Record<string,string> = {}) =>
  apiRouter.handleRequest({ path, method, isLocalAdmin, ...(body ? { body } : {}), headers });

describe('isolated background worker proxy trust boundary', () => {
  const original = {
    CENTIPEDE_HARNESS_URL: process.env.CENTIPEDE_HARNESS_URL,
    CENTIPEDE_HARNESS_TOKEN: process.env.CENTIPEDE_HARNESS_TOKEN,
    KINGDOM_API_URL: process.env.KINGDOM_API_URL,
    KINGDOM_API_TOKEN: process.env.KINGDOM_API_TOKEN,
  };
  beforeEach(() => {
    process.env.CENTIPEDE_HARNESS_URL = 'http://127.0.0.1:3011';
    process.env.CENTIPEDE_HARNESS_TOKEN = HARNESS;
    process.env.KINGDOM_API_URL = 'http://127.0.0.1:8000';
    process.env.KINGDOM_API_TOKEN = OWNER;
    resetOwnerActionSessionsForTests();
  });
  afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.unstubAllGlobals();
    resetOwnerActionSessionsForTests();
  });

  it('does not make worker state or controls accessible to remote clients', async () => {
    for (const path of ['/api/v1/harness/status', '/api/v1/harness/control', '/api/v1/harness/routines']) {
      const result = await req(path, path.endsWith('status') ? 'GET' : 'POST', false, { action: 'enable' });
      expect(result.status).toBe(403);
      expect(result.data).toBeUndefined();
    }
  });

  it('requires the existing expiring owner session for all mutating worker actions', async () => {
    for (const path of ['/api/v1/harness/control', '/api/v1/harness/routines', '/api/v1/harness/routines/delete']) {
      const result = await req(path, 'POST', true, { action: 'enable' });
      expect(result.status).toBe(401);
    }
  });

  it('does not accept arbitrary URLs, methods, or unconfigured bearer credentials', async () => {
    expect((await req('/api/v1/harness/http://internal', 'GET')).status).toBe(404);
    expect((await req('/api/v1/harness/status', 'PUT')).status).toBe(405);
    process.env.CENTIPEDE_HARNESS_URL = 'http://169.254.169.254:3011';
    expect((await req('/api/v1/harness/status')).status).toBe(503);
    process.env.CENTIPEDE_HARNESS_URL = 'http://127.0.0.1:3011';
    process.env.CENTIPEDE_HARNESS_TOKEN = '';
    expect((await req('/api/v1/harness/status')).status).toBe(503);
  });

  it('shows only genuine worker status and never exposes the configured worker token', async () => {
    const worker = {
      scope: 'isolated-headless-browser-only', enabled: false, paused: false,
      routines: [], runs: [], limits: { maxConcurrent:1,maxJobSeconds:30,maxSteps:5,minIntervalSeconds:900 },
    };
    const fetcher = vi.fn().mockResolvedValue(Response.json(worker));
    vi.stubGlobal('fetch', fetcher);
    const result = await req('/api/v1/harness/status');
    expect(result.status).toBe(200);
    expect(result.data).toEqual(worker);
    expect(JSON.stringify(result.data)).not.toContain(HARNESS);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe('http://127.0.0.1:3011/v1/status');
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer ' + HARNESS);
  });

  it('fails closed on forged worker identity, timeout and oversized response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ scope: 'unrelated' })));
    expect((await req('/api/v1/harness/status')).status).toBe(502);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')));
    expect((await req('/api/v1/harness/status')).status).toBe(503);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ blob: 'x'.repeat(70000) }), {status:200})
    ));
    expect((await req('/api/v1/harness/status')).status).toBe(502);
  });

  it('permits only a valid local owner control through the fixed authenticated worker endpoint', async () => {
    const unlocked = await req('/api/v1/kingdom/actions/unlock', 'POST', true,
      { ownerCode: OWNER }, { 'x-centipede-owner-intent': '1' });
    expect(unlocked.status).toBe(200);
    const sessionToken = unlocked.data.sessionToken;
    expect(sessionToken).toMatch(/^[a-f0-9]{64}$/);
    const fetcher = vi.fn().mockResolvedValue(Response.json({ enabled: true, paused: false, routines: [], runs: [] }));
    vi.stubGlobal('fetch', fetcher);
    const control = await req('/api/v1/harness/control', 'POST', true, { action: 'enable' },
      { 'x-centipede-owner-intent': '1', 'x-centipede-action-session': sessionToken });
    expect(control.status).toBe(200);
    expect(control.data.enabled).toBe(true);
    const options = fetcher.mock.calls[0][1];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ action: 'enable' }));
    expect(options.headers.Authorization).toBe('Bearer ' + HARNESS);
    expect(options.headers).not.toHaveProperty('X-Centipede-Action-Session');
    const bad = await req('/api/v1/harness/control', 'POST', true, { action: 'enable' },
      { 'x-centipede-owner-intent': '1', 'x-centipede-action-session': '0'.repeat(64) });
    expect(bad.status).toBe(401);
  });
});
