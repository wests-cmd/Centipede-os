import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { ChildProcess } from 'child_process';
import { startKingdomFixture } from '../fixtures/kingdomFixtureProcess';
import { KingdomAdapter } from '../../src/api/kingdomAdapter';

describe('Kingdom Docker & HTTP Server Integration Test Suite', () => {
  let serverProcess: ChildProcess | null = null;
  let adapter: KingdomAdapter;
  const TEST_PORT = '8088';

  beforeAll(async () => {
    // The shared readiness helper polls the real Python HTTP socket until it
    // responds (up to its own bounded limit). Windows cold-start plus heavily
    // concurrent tests can legitimately exceed Vitest's default 5s hook.
    // Do not skip readiness or assume a timer means the service is healthy.
    try {
      serverProcess = await startKingdomFixture(TEST_PORT);
      adapter = new KingdomAdapter(`http://localhost:${TEST_PORT}`);
      const registered = await fetch(`http://localhost:${TEST_PORT}/nodes/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: 'commander-1', name: 'commander-1', role: 'COMMANDER' }),
        signal: AbortSignal.timeout(4000),
      });
      expect(registered.ok).toBe(true);
    } catch (error) {
      serverProcess?.kill('SIGTERM');
      throw error;
    }
  }, 25_000);

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  it('1. Connects to Kingdom server and performs dynamic capability handshake', async () => {
    const status = await adapter.get_status();
    expect(status).toBeDefined();
    expect(status.version).toBe('v1TAS');
    expect(status.running).toBe(true);
  });

  it('2. Queries active Knights swarm nodes', async () => {
    const knightsRes = await adapter.get_knights();
    expect(knightsRes).toBeDefined();
    expect(Array.isArray(knightsRes.knights)).toBe(true);
    expect(knightsRes.knights.length).toBeGreaterThan(0);
    expect(knightsRes.knights[0].name).toBe('commander-1');
  });

  it('3. Submits a task to Kingdom engine and checks result', async () => {
    const task = await adapter.submit_task('Analyze system health and execute discovery');
    expect(task).toBeDefined();
    expect(task.id).toBeDefined();
    expect(task.status).toBe('completed');
    expect(task.result).toContain('Analyze system health');
  });

  it('4. Executes ZeroTrust security authorization boundary checks', async () => {
    // Valid authorization
    const auth = await adapter.authorize_capability(
      'commander-1',
      'process.execute',
      'execute_command',
      undefined,
      undefined,
      undefined,
      { command: 'ls -la' }
    );
    expect(auth.decision).toBe('ALLOWED');
    expect(auth.allowed).toBe(true);

    // Denied authorization (revoked actor)
    const deniedAuth = await adapter.authorize_capability(
      'revoked_actor',
      'process.execute',
      'execute_command'
    );
    expect(deniedAuth.decision).toBe('DENIED');
    expect(deniedAuth.allowed).toBe(false);

    // Audit trail logging verification
    const audit = await adapter.get_audit();
    expect(audit).toBeDefined();
    expect(audit.audit_logs).toBeDefined();
    expect(audit.audit_logs.length).toBeGreaterThan(0);
  });
});
