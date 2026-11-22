import { expect, test } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

test('the production API also runs on Node without Bun, preserving locked Files and request limits', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'centipede-node-'));
  mkdirSync(join(directory, 'web'));
  writeFileSync(join(directory, 'web/index.html'), '<div id="root">real static fixture</div>');
  execFileSync(process.env.CENTIPEDE_BUN || process.execPath,
    ['build', '--target=node', 'src/server/production.ts', '--outfile', join(directory, 'server.mjs')], { timeout: 10_000 });
  // Reserve a local port without relying on a fixed service port.
  const { createServer } = await import('node:net');
  const reservation = createServer();
  await new Promise<void>(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = (reservation.address() as { port: number }).port;
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  const child = spawn('node', [join(directory, 'server.mjs')], { cwd: directory,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), CENTIPEDE_WEB_ROOT: join(directory, 'web'),
      CENTIPEDE_FILES_ROOT: join(directory, 'files'), CENTIPEDE_KNOWLEDGE_HOME: join(directory, 'knowledge') }, stdio: 'pipe' });
  let stderr = ''; child.stderr.on('data', data => stderr += data.toString());
  try {
    const origin = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (child.exitCode !== null) throw new Error(`Node exited ${child.exitCode}: ${stderr}`);
      try { ready = (await fetch(origin + '/api/v1/health')).status === 200; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    expect(ready, stderr).toBe(true);
    expect(await (await fetch(origin)).text()).toContain('real static fixture');
    expect((await fetch(origin, { method: 'HEAD' })).headers.get('content-type')).toContain('text/html');
    const post = (body: string) => fetch(origin + '/api/v1/host-files/list', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body });
    expect((await post('{"directory":""}')).status).toBe(401);
    expect((await fetch(origin + '/api/v1/host-files/list', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.invalid', 'X-Forwarded-For': '127.0.0.1' },
      body: '{"directory":""}' })).status).toBe(403);
    expect((await post('not JSON')).status).toBe(400);
    expect((await post('x'.repeat(1024 * 1024 + 1))).status).toBe(413);
    expect((await fetch(origin + '/api/v1/health')).status).toBe(200);
  } finally {
    child.kill();
    await new Promise<void>(resolve => { if (child.exitCode !== null) resolve(); else child.once('exit', () => resolve()); });
    rmSync(directory, { recursive: true, force: true });
  }
}, 15_000);
