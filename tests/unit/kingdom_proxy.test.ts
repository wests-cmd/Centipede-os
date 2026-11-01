import { afterEach, describe, expect, it } from 'vitest';
import { apiRouter } from '../../src/server/routes';

const originalApiUrl = process.env.KINGDOM_API_URL;
const originalApiToken = process.env.KINGDOM_API_TOKEN;
const originalFetch = globalThis.fetch;

describe('Centipede read-only Kingdom proxy', () => {
  afterEach(() => {
    if (originalApiUrl === undefined) delete process.env.KINGDOM_API_URL;
    else process.env.KINGDOM_API_URL = originalApiUrl;
    if (originalApiToken === undefined) delete process.env.KINGDOM_API_TOKEN;
    else process.env.KINGDOM_API_TOKEN = originalApiToken;
    globalThis.fetch = originalFetch;
  });

  it('keeps upstream credentials server-side and proxies only an allowlisted local read', async () => {
    process.env.KINGDOM_API_URL = 'http://kingdom.internal:8000';
    process.env.KINGDOM_API_TOKEN = 'test-owner-token';
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    globalThis.fetch = (async (input, init) => {
      calls.push([input, init]);
      return new Response(JSON.stringify({ version: 'v1TAS', running: false }), { status: 200 });
    }) as typeof fetch;

    const response = await apiRouter.handleRequest({
      path: '/api/v1/kingdom/status', method: 'GET', query: '?details=1', isLocalAdmin: true,
    });

    expect(response).toEqual({ status: 200, data: { version: 'v1TAS', running: false } });
    expect(calls.length).toBe(1);
    const [url, options] = calls[0];
    expect(String(url)).toBe('http://kingdom.internal:8000/status?details=1');
    expect((options?.headers as Record<string, string>).Authorization).toBe('Bearer test-owner-token');
    expect(options?.redirect).toBe('error');
  });

  it('denies remote requests, write methods, and paths outside the read-only contract', async () => {
    process.env.KINGDOM_API_URL = 'http://kingdom.internal:8000';
    process.env.KINGDOM_API_TOKEN = 'test-owner-token';
    let called = false;
    globalThis.fetch = (async () => { called = true; throw new Error('must not be called'); }) as typeof fetch;

    const remote = await apiRouter.handleRequest({ path: '/api/v1/kingdom/status', method: 'GET', isLocalAdmin: false });
    const write = await apiRouter.handleRequest({ path: '/api/v1/kingdom/start', method: 'POST', isLocalAdmin: true });
    const unknown = await apiRouter.handleRequest({ path: '/api/v1/kingdom/admin/secrets', method: 'GET', isLocalAdmin: true });

    expect(remote.status).toBe(403);
    expect(write.status).toBe(405);
    expect(unknown.status).toBe(404);
    expect(called).toBe(false);
  });

  it('fails truthfully when credentials are absent and sanitizes upstream authentication errors', async () => {
    process.env.KINGDOM_API_URL = 'http://kingdom.internal:8000';
    process.env.KINGDOM_API_TOKEN = '';
    const unconfigured = await apiRouter.handleRequest({ path: '/api/v1/kingdom/status', method: 'GET', isLocalAdmin: true });
    expect(unconfigured.status).toBe(503);

    process.env.KINGDOM_API_TOKEN = 'test-owner-token';
    globalThis.fetch = (async () => new Response('secret=must-not-leak', { status: 401 })) as typeof fetch;
    const rejected = await apiRouter.handleRequest({ path: '/api/v1/kingdom/status', method: 'GET', isLocalAdmin: true });
    expect(rejected).toEqual({ status: 502, error: 'Kingdom authentication failed. Check server-side credentials.' });
  });

  it('rejects oversized streamed responses without buffering them whole', async () => {
    process.env.KINGDOM_API_URL = 'http://kingdom.internal:8000';
    process.env.KINGDOM_API_TOKEN = 'test-owner-token';
    globalThis.fetch = (async () => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(5 * 1024 * 1024 + 1));
      },
    }), { status: 200 })) as typeof fetch;

    const response = await apiRouter.handleRequest({
      path: '/api/v1/kingdom/status', method: 'GET', isLocalAdmin: true,
    });

    expect(response).toEqual({ status: 502, error: 'Kingdom response exceeded the allowed size.' });
  });

  it('projects optional observations without forwarding prompts, names or node configuration', async () => {
    process.env.KINGDOM_API_URL = 'http://kingdom.internal:8000';
    process.env.KINGDOM_API_TOKEN = 'test-owner-token';
    const now = Date.now() / 1000;
    globalThis.fetch = (async () => new Response(JSON.stringify({ state: 'observed', observed_at: now,
      jobs: [{ id: 'job', prompt: 'private prompt', secret: 'private key' }], configuration: 'private config', truncated: false,
    }), { headers: { Date: new Date(now * 1000).toUTCString() } })) as typeof fetch;
    const response = await apiRouter.handleRequest({ path: '/api/v1/kingdom/orchestration/activity', method: 'GET', isLocalAdmin: true });
    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({ state: 'observed', count: 1, observedAt: now, scope: 'local_recent_job_records', truncated: false });
    expect(response.data.receivedAt).toEqual(expect.any(Number));
    expect(JSON.stringify(response)).not.toContain('private');
  });

  it('denies every new observation to remote clients and denies write/action/programme routes', async () => {
    let calls = 0;
    globalThis.fetch = (async () => { calls++; throw new Error('must not fetch'); }) as typeof fetch;
    for (const path of ['/hierarchy', '/orchestration/activity', '/service-nodes/discovery']) {
      expect((await apiRouter.handleRequest({ path: '/api/v1/kingdom' + path, method: 'GET', isLocalAdmin: false })).status).toBe(403);
      for (const method of ['POST', 'PUT', 'DELETE'] as const) {
        expect((await apiRouter.handleRequest({ path: '/api/v1/kingdom' + path, method, isLocalAdmin: true })).status).toBe(405);
      }
    }
    for (const path of ['/orchestration', '/work-programmes', '/service-nodes/node/actions']) {
      expect((await apiRouter.handleRequest({ path: '/api/v1/kingdom' + path, method: 'GET', isLocalAdmin: true })).status).toBe(404);
    }
    expect(calls).toBe(0);
  });

  it('allows only projected fleet/service reads and preserves old-backend 404', async () => {
    process.env.KINGDOM_API_URL = 'http://kingdom.internal:8000';
    process.env.KINGDOM_API_TOKEN = 'test-owner-token';
    const now = Date.now() / 1000;
    const fixtures = [
      ['/hierarchy', { inventory: { reports: [] }, knights: [{ configuration: 'private' }] }],
      ['/service-nodes/discovery', { state: 'observed', observed_at: now, scope: 'user_services', services: [{ name: 'private' }] }],
    ] as const;
    for (const [path, fixture] of fixtures) {
      globalThis.fetch = (async (input, init) => {
        expect(String(input)).toBe('http://kingdom.internal:8000' + path);
        expect(init?.method).toBe('GET');
        return new Response(JSON.stringify(fixture), { headers: { Date: new Date(now * 1000).toUTCString() } });
      }) as typeof fetch;
      const response = await apiRouter.handleRequest({ path: '/api/v1/kingdom' + path, method: 'GET', isLocalAdmin: true });
      expect(response.status).toBe(200);
      expect(response.data.state).toBe('observed');
      expect(JSON.stringify(response)).not.toContain('private');
      globalThis.fetch = (async () => new Response('private upstream error', { status: 404 })) as typeof fetch;
      expect(await apiRouter.handleRequest({ path: '/api/v1/kingdom' + path, method: 'GET', isLocalAdmin: true }))
        .toEqual({ status: 404, error: 'Kingdom does not provide this endpoint.' });
    }
  });

  it('uses the upstream HTTP clock for local reads and reports missing clock evidence as unavailable', async () => {
    process.env.KINGDOM_API_URL = 'http://kingdom.internal:8000';
    process.env.KINGDOM_API_TOKEN = 'test-owner-token';
    const upstreamNow = Date.now() / 1000 + 128;
    const body = JSON.stringify({ state: 'observed', observed_at: upstreamNow, jobs: [] });
    globalThis.fetch = (async () => new Response(body,
      { headers: { Date: new Date(upstreamNow * 1000).toUTCString() } })) as typeof fetch;
    const req = { path: '/api/v1/kingdom/orchestration/activity', method: 'GET' as const, isLocalAdmin: true };
    expect((await apiRouter.handleRequest(req)).data).toMatchObject({ state: 'observed', count: 0 });
    globalThis.fetch = (async () => new Response(body)) as typeof fetch;
    expect((await apiRouter.handleRequest(req)).data).toMatchObject({ state: 'unavailable', count: null });
  });
});
