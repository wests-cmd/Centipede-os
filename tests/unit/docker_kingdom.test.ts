import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { KingdomAdapter } from '../../src/api/kingdomAdapter';

describe('Kingdom Docker & HTTP Server Integration Test Suite', () => {
  let serverProcess: ChildProcess | null = null;
  let adapter: KingdomAdapter;

  beforeAll(async () => {
    adapter = new KingdomAdapter('http://localhost:8000');
    try {
      await adapter.get_status();
    } catch (_) {
      serverProcess = spawn('python3', ['scripts/kingdom-server.py'], {
        env: { ...process.env, PORT: '8000' },
        stdio: 'ignore',
      });
      await new Promise((r) => setTimeout(r, 1200));
    }
  });

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
