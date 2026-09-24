import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

describe('Centipede OS Swarm Node Role Differentiation Test Suite', () => {
  let serverProcess: ChildProcess | null = null;
  const KINGDOM_URL = 'http://localhost:8008';

  beforeAll(async () => {
    serverProcess = spawn('python3', ['scripts/kingdom-server.py'], {
      env: { ...process.env, PORT: '8008' },
      stdio: 'ignore',
    });
    await new Promise((r) => setTimeout(r, 1200));
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  it('1. Registers distinct Commander, Knight, and Scout nodes with unique roles', async () => {
    // Register Commander Node
    const commRes = await fetch(`${KINGDOM_URL}/nodes/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: 'commander-test-1', name: 'Commander Control Node', role: 'COMMANDER' }),
    });
    expect(commRes.status).toBe(200);
    const commData = await commRes.json();
    expect(commData.node.role).toBe('COMMANDER');

    // Register Knight Node
    const knightRes = await fetch(`${KINGDOM_URL}/nodes/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: 'knight-test-1', name: 'Knight Worker 1', role: 'KNIGHT' }),
    });
    expect(knightRes.status).toBe(200);
    const knightData = await knightRes.json();
    expect(knightData.node.role).toBe('KNIGHT');

    // Register Scout Node
    const scoutRes = await fetch(`${KINGDOM_URL}/nodes/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: 'scout-test-1', name: 'Scout Discovery Node', role: 'SCOUT' }),
    });
    expect(scoutRes.status).toBe(200);
    const scoutData = await scoutRes.json();
    expect(scoutData.node.role).toBe('SCOUT');
  });

  it('2. Processes node heartbeat updates and queries registered permissions', async () => {
    const hbRes = await fetch(`${KINGDOM_URL}/nodes/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: 'knight-test-1' }),
    });
    expect(hbRes.status).toBe(200);
    const hbData = await hbRes.json();
    expect(hbData.status).toBe('acknowledged');

    const permRes = await fetch(`${KINGDOM_URL}/security/permissions`);
    expect(permRes.status).toBe(200);
    const permData = await permRes.json();
    expect(permData.nodes).toBeDefined();
    const foundKnight = permData.nodes.find((n: any) => n.node_id === 'knight-test-1');
    expect(foundKnight).toBeDefined();
    expect(foundKnight.role).toBe('KNIGHT');
  });
});
