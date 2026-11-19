import { afterEach, describe, expect, it, vi } from 'vitest';
import { KingdomAdapter } from '../../src/api/kingdomAdapter';
import { PermissionGate } from '../../src/ai/permissionGate';
import { intentParser } from '../../src/ai/intentParser';
import { planner } from '../../src/ai/planner';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe('Kingdom route matching and read-only boundary', () => {
  it('validates dynamic routes by method and path', async () => {
    const adapter = new KingdomAdapter('http://127.0.0.1:8000');
    globalThis.fetch = (async () => new Response(JSON.stringify({}), { status: 200 })) as typeof fetch;
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await (adapter as any).fetchJson('/maps/example', { method: 'GET' }, false);
    expect(warning).not.toHaveBeenCalled();
    await (adapter as any).fetchJson('/maps/example', { method: 'POST', body: '{}' }, false);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('/maps/example'));
  });
  it('blocks mutations before network dispatch over the local read proxy', async () => {
    const adapter = new KingdomAdapter('http://127.0.0.1:3000/api/v1/kingdom');
    const network = vi.fn();
    globalThis.fetch = network as typeof fetch;
    expect(adapter.isReadOnlyConnection()).toBe(true);
    await expect(adapter.submit_task('make a change')).rejects.toMatchObject({ code: 'AUTHORIZATION_DENIED' });
    expect(network).not.toHaveBeenCalled();
  });
  it('accepts only narrow low-risk reads from an established read-proxy transport', async () => {
    const adapter = new KingdomAdapter('http://127.0.0.1:3000/api/v1/kingdom');
    const gate = new PermissionGate(adapter);
    (adapter as any).connectionState = 'CONNECTED'; // transport fixture, not authority
    const input = (text: string) => ({ id: 'test', text, timestamp: Date.now(), conversationId: 'test' });
    expect((await gate.evaluate(planner.createPlan(intentParser.parse(input('What is the current Kingdom status?'))))).authorizationState).toBe('AUTHORIZED');
    expect((await gate.evaluate(planner.createPlan(intentParser.parse(input('create task audit system'))))).authorizationState).toBe('DENIED');
    expect((await gate.evaluate(planner.createPlan(intentParser.parse(input('delete file /tmp/demo'))))).authorizationState).toBe('APPROVAL_REQUIRED');
  });
it('keeps the HTTP connection online when only the optional WebSocket closes', () => {
    const adapter = new KingdomAdapter('http://127.0.0.1:8000');
    const originalWebSocket = globalThis.WebSocket;
    class FakeSocket {
      static OPEN = 1;
      static CONNECTING = 0;
      readyState = 0;
      onclose: null | (() => void) = null;
      onmessage: null | ((event: any) => void) = null;
      onerror: null | (() => void) = null;
      constructor(_url: string) {}
      close() {}
    }
    try {
      (globalThis as any).WebSocket = FakeSocket;
      (adapter as any).connectionState = 'CONNECTED';
      (adapter as any).initWebSocket();
      const socket = (adapter as any).ws as FakeSocket;
      socket.onclose?.();
      expect(adapter.getConnectionState()).toBe('CONNECTED');
    } finally {
      (globalThis as any).WebSocket = originalWebSocket;
      adapter.disconnect();
    }
  });

  it('reads genuine Kingdom skill registry records through the client contract', async () => {
    const adapter = new KingdomAdapter('http://127.0.0.1:8000');
    const upstream = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify([
      { id: 'trusted', name: 'Verified Skill', version: '1.0.0', state: 'INSTALLED', trust_level: 'VERIFIED' },
    ]), { status: 200 }));
    globalThis.fetch = upstream as typeof fetch;
    const skills = await adapter.get_skills();
    expect(skills).toHaveLength(1);
    expect(skills[0].state).toBe('INSTALLED');
    expect(upstream).toHaveBeenCalled();
    expect(String(upstream.mock.calls[0][0])).toBe('http://127.0.0.1:8000/skills');
  });

  it('rejects malformed Kingdom skill registry responses rather than showing fake skills', async () => {
    const adapter = new KingdomAdapter('http://127.0.0.1:8000');
    globalThis.fetch = (async () => new Response('{"skills":"not-a-list"}', { status: 200 })) as typeof fetch;
    await expect(adapter.get_skills()).rejects.toMatchObject({ code: 'SERVER_ERROR' });
  });

});
