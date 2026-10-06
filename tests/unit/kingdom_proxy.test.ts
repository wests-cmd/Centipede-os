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
});
