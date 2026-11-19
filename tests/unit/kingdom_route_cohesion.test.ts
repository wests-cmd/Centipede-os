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
});
