/** Run with actual Bun: bun tests/integration/selected_knowledge_sources.integration.ts */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

if (!process.versions.bun) throw new Error('This acceptance check requires actual Bun.');
const temporary = mkdtempSync(join(tmpdir(), 'centipede-selected-http-'));
const selected = join(temporary, 'selected'); mkdirSync(selected);
writeFileSync(join(selected, 'notes.md'), 'Synthetic source fixture');
const reservation = createServer();
await new Promise<void>(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = (reservation.address() as { port: number }).port;
await new Promise<void>(resolve => reservation.close(() => resolve()));
const endpoint = `http://127.0.0.1:${port}`;
let child: ChildProcess | undefined;
async function start() {
  child = spawn(process.execPath, [fileURLToPath(new URL('../../src/server/production.ts', import.meta.url))], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), CENTIPEDE_KNOWLEDGE_HOME: join(temporary, 'state') },
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error('Bun production adapter stopped before readiness.');
    try { if ((await fetch(endpoint + '/api/v1/health')).ok) return; } catch { /* Startup only. */ }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Bun production adapter readiness timed out.');
}
async function stop() {
  if (child && child.exitCode === null) {
    const exited = new Promise<void>(resolve => child!.once('exit', () => resolve()));
    child.kill('SIGTERM'); await exited;
  }
}
const request = (path: string, body?: object, headers: Record<string, string> = {}) => fetch(endpoint + '/api/v1/knowledge/' + path, {
  method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...headers },
  body: body ? JSON.stringify(body) : undefined,
});
try {
  await start();
  assert.deepEqual(await (await request('sources')).json(), { sources: [] });
  assert.equal((await request('sources', { root: selected, label: 'Synthetic' }, { origin: 'https://attacker.invalid' })).status, 403);
  assert.equal((await request('sources', undefined, { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await request('sources', undefined, { host: 'attacker.invalid' })).status, 403);
  const created = await request('sources', { root: selected, label: 'Synthetic' });
  assert.equal(created.status, 201); const { id } = await created.json();
  assert.equal((await request('scan', { id, paths: ['../outside.md'] })).status, 400);
  const scanned = await request('scan', { id, paths: ['notes.md'] });
  assert.equal(scanned.status, 200); assert.equal((await scanned.json()).updated, 1);
  const first = await (await request('extract', { id, path: 'notes.md' })).json();
  assert.equal(first.kind, 'UNTRUSTED_SOURCE_EXCERPT'); assert.match(first.markdown, /Synthetic source fixture/);
  await stop(); await start();
  assert.deepEqual(await (await request('extract', { id, path: 'notes.md' })).json(), first);
  assert.equal((await (await request('scan', { id, paths: ['notes.md'] })).json()).unchanged, 1);
  assert.equal((await request('revoke', { id })).status, 200);
  assert.equal((await request('extract', { id, path: 'notes.md' })).status, 403);
  assert.equal((await request('scan', { id, paths: ['notes.md'] })).status, 403);
  assert.equal((await (await request('sources')).json()).sources[0].files, 0);
  console.log('PASS actual Bun production HTTP: opt-in selection, origin/host/CSRF gates, bounded scan, restart, hash reuse and revocation.');
} finally { await stop(); rmSync(temporary, { recursive: true, force: true }); }
