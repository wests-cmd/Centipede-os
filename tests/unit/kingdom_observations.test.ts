import { afterEach, describe, expect, it, vi } from 'vitest';
import { KingdomAdapter } from '../../src/api/kingdomAdapter';
import { observationIsCurrent, summarizeObservation } from '../../src/api/kingdomObservations';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe('Optional read-only observations', () => {
  it('keeps unavailable and stale evidence distinct from observed zero', () => {
    expect(summarizeObservation('/orchestration/activity', {}, 100).count).toBeNull();
    expect(summarizeObservation('/orchestration/activity', { state: 'observed', jobs: [], observed_at: 0 }, 100).state).toBe('stale');
    expect(summarizeObservation('/orchestration/activity', { state: 'observed', jobs: [], observed_at: 100 }, 100).count).toBe(0);
    expect(summarizeObservation('/service-nodes/discovery', { state: 'unsupported', scope: 'container' }, 100)).toMatchObject({ state: 'unsupported', count: null });
  });

  it('does not count stale/missing peer reports as an empty fleet', () => {
    for (const report of [{ state: 'stale' }, { state: 'missing' }, { state: 'revoked' }]) {
      const summary = summarizeObservation('/hierarchy', { inventory: { reports: [report] } }, 100);
      expect(summary.state).toBe('stale');
      expect(summary.count).toBeNull();
      expect(summary.stalePeers).toBe(1);
    }
    expect(summarizeObservation('/hierarchy', {}, 100).count).toBeNull();
  });

  it('projects current peer activity and scoped services, dropping private fields', () => {
    const summary = summarizeObservation('/hierarchy', { secret: 'private', inventory: { reports: [{
      state: 'current', received_at: 100, activity: { state: 'observed', observed_at: 100, jobs: [{ prompt: 'private' }] },
      services: { state: 'observed', observed_at: 100, services: [{ name: 'private' }] },
    }] } }, 100);
    expect(summary).toMatchObject({ state: 'observed', count: 1, serviceCount: 1 });
    expect(JSON.stringify(summary)).not.toContain('private');
  });

  it('falls back to unavailable for old Kingdom 404 without inventing zero counts', async () => {
    const calls: string[] = [];
    globalThis.fetch = (async input => { calls.push(String(input)); return new Response('{}', { status: 404 }); }) as typeof fetch;
    const adapter = new KingdomAdapter('http://localhost:3000/api/v1/kingdom');
    const summaries = await adapter.get_read_observations();
    expect(calls).toHaveLength(3);
    expect(summaries.every(value => value.state === 'unavailable' && value.count === null)).toBe(true);
    adapter.disconnect();
  });

  it('keeps peer activity usable when container service discovery is unsupported', () => {
    const summary = summarizeObservation('/hierarchy', { inventory: { reports: [{
      state: 'current', received_at: 100, activity: { state: 'observed', observed_at: 100, jobs: [] },
      services: { state: 'unsupported', scope: 'container' },
    }] } }, 100);
    expect(summary).toMatchObject({ state: 'observed', count: 0, serviceCount: null, serviceState: 'unsupported' });
  });

  it('never expands the direct backend/mobile contract to these observations', async () => {
    globalThis.fetch = (async () => { throw new Error('must not fetch'); }) as typeof fetch;
    const adapter = new KingdomAdapter('https://example.com');
    expect((await adapter.get_read_observations()).every(value => value.state === 'unavailable')).toBe(true);
    adapter.disconnect();
  });

  it('uses upstream clock for local observations and receipt clock for their UI lifetime', () => {
    const summary = summarizeObservation('/orchestration/activity',
      { state: 'observed', observed_at: 228, jobs: [] }, 228, 100);
    expect(summary.state).toBe('observed'); // Known 128-second clock offset is harmless.
    expect(observationIsCurrent(summary, 100)).toBe(true);
    expect(observationIsCurrent(summary, 161)).toBe(false);
    expect(observationIsCurrent({ ...summary, receivedAt: 1000000 }, 100)).toBe(false);
    expect(summarizeObservation('/orchestration/activity', { state: 'observed', observed_at: 228, jobs: [] }).state).toBe('unavailable');
    expect(summarizeObservation('/orchestration/activity', { state: 'observed', observed_at: 1000000, jobs: [] }, 100, 100).state).toBe('stale');
  });

  it('uses receiver-attested peer freshness despite executor timestamps and never extends UI freshness', () => {
    const report = { state: 'current', received_at: 228,
      activity: { state: 'observed', observed_at: 1000000, jobs: [] },
      services: { state: 'observed', observed_at: 228, services: [] } };
    const summary = summarizeObservation('/hierarchy', { inventory: { reports: [report] } }, 100, 100);
    expect(summary).toMatchObject({ state: 'observed', count: 0, serviceCount: 0, observedAt: null, receivedAt: 100 });
    expect(observationIsCurrent(summary, 161)).toBe(false);
    report.state = 'stale';
    expect(summarizeObservation('/hierarchy', { inventory: { reports: [report] } }, 100, 100).state).toBe('stale');
  });

  it('discards old-session reads across disconnect/reconnect and timestamps new reads on the browser clock', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(100000);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    globalThis.fetch = (async input => {
      if (String(input).endsWith('/status')) return new Response(JSON.stringify({ version: '1.2.3', running: false,
        mode: 'adaptive', tasks: { queued: 0, running: 0, completed: 0, failed: 0 } }));
      await gate;
      return new Response(JSON.stringify({ state: 'observed', count: 1, observedAt: 1000000,
        receivedAt: 1000000, scope: 'local_recent_job_records', truncated: false }));
    }) as typeof fetch;
    const adapter = new KingdomAdapter('http://localhost:3000/api/v1/kingdom');
    await adapter.get_status();
    const old = adapter.get_read_observations();
    adapter.disconnect();
    await adapter.get_status();
    release();
    expect((await old).every(value => value.state === 'unavailable')).toBe(true);
    const current = await adapter.get_read_observations();
    expect(current.every(value => value.receivedAt === 100 && observationIsCurrent(value, 100))).toBe(true);
    expect(current.every(value => !observationIsCurrent(value, 161))).toBe(true);
    adapter.disconnect();
  });
});
