import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apiRouter } from '../../src/server/routes';
import { memAvailableBytes, memoryAdmitted, verifiedPeakRss } from '../../src/server/localInference';

const vars = [
  'CENTIPEDE_LOCAL_AI_ENABLED', 'CENTIPEDE_LOCAL_AI_PROFILE', 'CENTIPEDE_LOCAL_AI_MODELS_DIR',
  'CENTIPEDE_LOCAL_AI_MODEL', 'CENTIPEDE_LOCAL_AI_CLI', 'CENTIPEDE_LOCAL_AI_RECEIPT',
] as const;
const originals = Object.fromEntries(vars.map(k => [k, process.env[k]]));
const api = (path: 'status' | 'generate', method: 'GET' | 'POST', body?: object,
  localAdmin = true, intent = true) => apiRouter.handleRequest({
    path: '/api/v1/local-ai/' + path, method, body, isLocalAdmin: localAdmin,
    headers: intent ? { 'X-Centipede-Owner-Intent': '1' } : {},
  });
let temp: string | undefined;

const makeReceipt = (digest: string, size: number) => ({
  schema: 1, state: 'completed', runtime: 'llama-cli',
  model_sha256: digest, model_bytes: size, runtime_version: 'fake-test-llama-runtime',
  contexts: [512, 1024], threads: [1, 2], repeats: 3,
  results: [512, 1024].flatMap(context => [1, 2].flatMap(threads =>
    [1, 2, 3].map(repeat => ({
      context, threads, repeat, rss_kib: 50_000, wall_seconds: 1.2,
      swap_delta: { pswpin: 0, pswpout: 0 }, generation_tokens_per_second: 5,
    })))),
});

async function configureFakeModel(delay = false) {
  temp = await mkdtemp(join(tmpdir(), 'centipede-local-ai-test-'));
  const dir = join(temp, 'models');
  await mkdir(dir, { mode: 0o700 });
  const model = join(dir, 'tiny-fixture.gguf');
  const bytes = Buffer.alloc(4096);
  bytes.write('GGUF');
  await writeFile(model, bytes, { mode: 0o444 });
  await chmod(model, 0o444);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const cli = join(temp, 'fake-llama-cli');
  await writeFile(cli, '#!/bin/sh\n' +
    'if [ "$1" = "--version" ]; then echo fake-test-llama-runtime; exit 0; fi\n' +
    (delay ? 'sleep 1\n' : '') +
    'printf "This is an unverified offline explanation from a fake test model.\\n"\n',
    { mode: 0o755 });
  await chmod(cli, 0o755);
  const receipt = join(temp, 'receipt.json');
  await writeFile(receipt, JSON.stringify(makeReceipt(digest, bytes.length)), { mode: 0o600 });
  process.env.CENTIPEDE_LOCAL_AI_ENABLED = '1';
  process.env.CENTIPEDE_LOCAL_AI_MODELS_DIR = dir;
  process.env.CENTIPEDE_LOCAL_AI_MODEL = model;
  process.env.CENTIPEDE_LOCAL_AI_CLI = cli;
  process.env.CENTIPEDE_LOCAL_AI_RECEIPT = receipt;
  process.env.CENTIPEDE_LOCAL_AI_PROFILE = 'low';
  return { model, receipt };
}

beforeEach(() => {
  for (const key of vars) delete process.env[key];
});
afterEach(async () => {
  for (const key of vars) {
    if (originals[key] === undefined) delete process.env[key];
    else process.env[key] = originals[key];
  }
  if (temp) await rm(temp, { recursive: true, force: true });
  temp = undefined;
});

describe('local CPU-only model admission', () => {
  it('requires a measurable reserve and rejects unsupported RSS and missing Linux counters', () => {
    expect(memAvailableBytes('MemAvailable: 1572864 kB\n')).toBe(1536 * 1024 * 1024);
    expect(memAvailableBytes('MemFree: 9999 kB\n')).toBeNull();
    expect(memoryAdmitted(null, 100)).toBe(false);
    expect(memoryAdmitted(1.4 * 1024 ** 3, 100)).toBe(false);
    expect(memoryAdmitted(2 * 1024 ** 3, 900000)).toBe(true);
    expect(memoryAdmitted(3 * 1024 ** 3, 2_000_000)).toBe(false);
  });
  it('rejects incomplete, swapped, tampered or duplicate benchmark receipts', () => {
    const digest = 'a'.repeat(64), sample = makeReceipt(digest, 4096);
    expect(verifiedPeakRss(sample, digest, 4096, 'fake-test-llama-runtime',
      { context: 512, threads: 1 })).toBe(50000);
    expect(verifiedPeakRss(sample, 'b'.repeat(64), 4096, 'fake-test-llama-runtime',
      { context: 512, threads: 1 })).toBeNull();
    expect(verifiedPeakRss({ ...sample, state: 'running' }, digest, 4096,
      'fake-test-llama-runtime', { context: 512, threads: 1 })).toBeNull();
    const duplicate = makeReceipt(digest, 4096);
    duplicate.results[1] = { ...duplicate.results[0] };
    expect(verifiedPeakRss(duplicate, digest, 4096, 'fake-test-llama-runtime',
      { context: 1024, threads: 2 })).toBeNull();
    const swapped = makeReceipt(digest, 4096);
    swapped.results[0].swap_delta.pswpout = 1;
    expect(verifiedPeakRss(swapped, digest, 4096, 'fake-test-llama-runtime',
      { context: 512, threads: 1 })).toBeNull();
  });
  it('fails closed when disabled, unconfigured or invoked from a remote socket', async () => {
    expect((await api('status', 'GET')).data).toMatchObject({ state: 'disabled', enabled: false });
    expect((await api('generate', 'POST', { prompt: 'Explain files' })).status).toBe(503);
    process.env.CENTIPEDE_LOCAL_AI_ENABLED = '1';
    expect((await api('status', 'GET')).data.state).toBe('not_configured');
    expect((await api('generate', 'POST', { prompt: 'Explain files' }, false)).status).toBe(403);
    expect((await api('status', 'GET', undefined, false)).status).toBe(403);
    expect((await api('generate', 'POST', { prompt: 'Explain files' }, true, false)).status).toBe(403);
    expect((await api('generate', 'POST', { prompt: '', command: 'delete' })).status).toBe(422);
    expect((await api('generate', 'POST', { prompt: 'a'.repeat(1001) })).status).toBe(422);
    expect((await api('generate', 'POST', { prompt: 'What is a file?', extra: 'shell' })).status).toBe(422);
  });
});

if (process.platform === 'linux') {
  describe('local inference with an isolated fake executable — no real LLM claimed', () => {
    it('returns only generated text and an explicit no-actions receipt when configured', async () => {
      await configureFakeModel();
      const ready = await api('status', 'GET');
      expect(ready.status).toBe(200);
      expect(ready.data).toMatchObject({
        state: 'ready', enabled: true, loaded: false, model: 'tiny-fixture.gguf',
        profile: { context: 512, threads: 1 }, measuredPeakRssKiB: 50_000,
      });
      const result = await api('generate', 'POST', { prompt: 'Explain folders' });
      expect(result.status).toBe(200);
      expect(result.data.source).toBe('local-cpu-text-only');
      expect(result.data.actionsExecuted).toBe(false);
      expect(result.data.approvalGranted).toBe(false);
      expect(result.data.text).toContain('unverified offline explanation');
      expect(result.data).not.toHaveProperty('taskId');
    });
    it('rejects altered GGUF files and unmatched runtime/benchmark identities', async () => {
      const { model, receipt } = await configureFakeModel();
      await chmod(model, 0o644);
      expect((await api('status', 'GET')).data.state).toBe('blocked');
      await chmod(model, 0o444);
      const receiptData = JSON.parse(await readFile(receipt, 'utf8'));
      receiptData.runtime_version = 'different-runtime';
      await writeFile(receipt, JSON.stringify(receiptData));
      expect((await api('generate', 'POST', { prompt: 'Explain folders' })).status).toBe(503);
    });
    it('admits only one concurrent generation, never queues a second CPU job', async () => {
      await configureFakeModel(true);
      const first = api('generate', 'POST', { prompt: 'Define a directory' });
      await new Promise(ok => setTimeout(ok, 120));
      const second = await api('generate', 'POST', { prompt: 'Define a file' });
      expect(second.status).toBe(429);
      expect((await first).status).toBe(200);
    });
  });
}
