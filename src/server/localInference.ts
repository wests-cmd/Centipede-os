import { spawn, execFile as runFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, lstat, mkdtemp, open, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import type { ApiRequest, ApiResponse } from './routes';

const PREFIX = '/api/v1/local-ai';
const MIN_AVAILABLE_BYTES = 1536 * 1024 * 1024;
const RESERVE_BYTES = 512 * 1024 * 1024;
const RSS_MAX_KIB = 1258291;
const OUTPUT_MAX = 12 * 1024;
const TIMEOUT_MS = 90_000;
const execFile = promisify(runFile);
let generating = false;

type Profile = { context: 512 | 1024; threads: 1 | 2 };
type Status = {
  state: 'disabled' | 'not_configured' | 'blocked' | 'ready' | 'busy';
  reason: string;
  enabled: boolean;
  loaded: false;
  profile?: Profile;
  model?: string;
  modelSha256?: string;
  version?: string;
  modelBytes?: number;
  measuredPeakRssKiB?: number;
  availableRamMiB?: number;
};
type Verified = { status: Status; cli: string; model: string; maxRssKiB: number };

export function memAvailableBytes(raw: string): number | null {
  const result = raw.match(/^MemAvailable:\s*(\d+)\s+kB$/m);
  if (!result) return null;
  const kib = Number(result[1]);
  return Number.isSafeInteger(kib) && kib > 0 ? kib * 1024 : null;
}

export function memoryAdmitted(availableBytes: number | null, measuredKiB: number): boolean {
  return availableBytes !== null && Number.isSafeInteger(measuredKiB) &&
    measuredKiB > 0 && measuredKiB <= RSS_MAX_KIB &&
    availableBytes >= Math.max(MIN_AVAILABLE_BYTES, measuredKiB * 1024 + RESERVE_BYTES);
}

function chosenProfile(): Profile | null {
  const selected = process.env.CENTIPEDE_LOCAL_AI_PROFILE || 'low';
  return selected === 'low' ? { context: 512, threads: 1 } :
    selected === 'balanced' ? { context: 1024, threads: 2 } : null;
}

async function availableRam(): Promise<number | null> {
  try { return memAvailableBytes(await readFile('/proc/meminfo', 'utf8')); }
  catch { return null; }
}

async function checkFile(path: string, what: string): Promise<string> {
  if (!isAbsolute(path) || /[\x00-\x1f]/.test(path)) throw new Error('Invalid configured ' + what + ' path.');
  const full = resolve(path);
  const info = await lstat(full);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o022) !== 0 ||
    await realpath(full) !== full) throw new Error('Unsafe configured ' + what + ' file.');
  return full;
}

async function digestFile(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export function verifiedPeakRss(
  receipt: any, digest: string, bytes: number, version: string, selected: Profile,
): number | null {
  if (receipt?.schema !== 1 || receipt?.state !== 'completed' || receipt?.runtime !== 'llama-cli' ||
    receipt.model_sha256 !== digest || receipt.model_bytes !== bytes || receipt.runtime_version !== version ||
    !Array.isArray(receipt.results) || receipt.results.length !== 12) return null;
  const samples = new Set<string>();
  let peak = 0;
  for (const r of receipt.results) {
    const signature = [r.context, r.threads, r.repeat].join(':');
    if (![512, 1024].includes(r.context) || ![1, 2].includes(r.threads) ||
      ![1, 2, 3].includes(r.repeat) || samples.has(signature) ||
      !Number.isSafeInteger(r.rss_kib) || r.rss_kib < 1 || r.rss_kib > RSS_MAX_KIB ||
      !Number.isFinite(r.wall_seconds) || r.wall_seconds <= 0 ||
      r.swap_delta?.pswpin !== 0 || r.swap_delta?.pswpout !== 0) return null;
    samples.add(signature);
    if (r.context === selected.context && r.threads === selected.threads) {
      peak = Math.max(peak, r.rss_kib);
    }
  }
  return samples.size === 12 && peak > 0 ? peak : null;
}

async function verifiedConfiguration(): Promise<{ status: Status } | Verified> {
  const enabled = process.env.CENTIPEDE_LOCAL_AI_ENABLED === '1';
  const result: Status = {
    state: enabled ? 'not_configured' : 'disabled', enabled, loaded: false,
    reason: enabled ? 'Requires an installed model, runtime and matching completed CPU benchmark.' :
      'Offline AI has not been enabled by the owner.',
  };
  if (!enabled) return { status: result };
  const profile = chosenProfile();
  if (!profile) return { status: { ...result, state: 'blocked', reason: 'Unsupported local profile.' } };
  result.profile = profile;
  const rootConfig = process.env.CENTIPEDE_LOCAL_AI_MODELS_DIR;
  const modelConfig = process.env.CENTIPEDE_LOCAL_AI_MODEL;
  const cliConfig = process.env.CENTIPEDE_LOCAL_AI_CLI;
  const receiptConfig = process.env.CENTIPEDE_LOCAL_AI_RECEIPT;
  if (!rootConfig || !modelConfig || !cliConfig || !receiptConfig) return { status: result };
  const available = await availableRam();
  if (available !== null) result.availableRamMiB = Math.floor(available / 1048576);
  if (available === null || available < MIN_AVAILABLE_BYTES) return {
    status: { ...result, state: 'blocked', reason: 'Available RAM is unknown or below the 1.5 GiB admission floor.' },
  };
  try {
    if (!isAbsolute(rootConfig) || /[\x00-\x1f]/.test(rootConfig)) throw new Error('Invalid model directory.');
    const root = resolve(rootConfig);
    const rootInfo = await lstat(root);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || (rootInfo.mode & 0o022) !== 0 ||
      await realpath(root) !== root) throw new Error('Model directory is not protected.');
    const model = await checkFile(modelConfig, 'model');
    if (!model.startsWith(root + sep)) throw new Error('Model is outside the approved directory.');
    const cli = await checkFile(cliConfig, 'runtime');
    const receiptFile = await checkFile(receiptConfig, 'receipt');
    const modelBefore = await stat(model);
    if (modelBefore.size < 1024 || modelBefore.size >= 1024 ** 3 ||
      (modelBefore.mode & 0o222) !== 0) throw new Error('Only read-only compact GGUF files are supported.');
    const handle = await open(model, 'r');
    try {
      const signature = Buffer.alloc(4);
      await handle.read(signature, 0, 4, 0);
      if (signature.toString('utf8') !== 'GGUF') throw new Error('Invalid GGUF signature.');
    } finally { await handle.close(); }
    const hash = await digestFile(model);
    const modelAfter = await stat(model);
    if (modelBefore.size !== modelAfter.size || modelBefore.mtimeMs !== modelAfter.mtimeMs ||
      modelBefore.ino !== modelAfter.ino) throw new Error('Model changed during validation.');
    await access(cli, constants.X_OK);
    const runtime = await execFile(cli, ['--version'], {
      timeout: 4000, maxBuffer: 8192, env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' },
    });
    const version = (runtime.stdout + runtime.stderr).trim().slice(0, 300);
    if (!version) throw new Error('Unknown runtime version.');
    const receiptStat = await stat(receiptFile);
    if (receiptStat.size > 64 * 1024 || receiptStat.size <= 0)
      throw new Error('Invalid benchmark receipt size.');
    const receipt = JSON.parse(await readFile(receiptFile, 'utf8'));
    const peak = verifiedPeakRss(receipt, hash, modelBefore.size, version, profile);
    if (peak === null) throw new Error('Missing verified benchmark measurements.');
    if (!memoryAdmitted(available, peak)) throw new Error('Insufficient measured memory reserve.');
    return { cli, model, maxRssKiB: peak, status: {
      state: generating ? 'busy' : 'ready',
      reason: generating ? 'A local response is currently generating.' :
        'Model is verified and eligible for one offline, read-only question.',
      enabled, loaded: false, profile, model: basename(model), modelSha256: hash,
      modelBytes: modelBefore.size, measuredPeakRssKiB: peak,
      availableRamMiB: result.availableRamMiB, version,
    } };
  } catch {
    return { status: { ...result, state: 'blocked',
      reason: 'Model/runtime path, permissions, runtime version, GGUF digest, benchmark or memory validation failed. Check local setup.' } };
  }
}

async function runModel(verified: Verified, prompt: string): Promise<{ text: string; durationMs: number; observedRssKiB: number }> {
  const folder = await mkdtemp(join(tmpdir(), 'centipede-offline-ai-'));
  const promptFile = join(folder, 'prompt.txt');
  try {
    await writeFile(promptFile,
      'Answer only this informational question. You cannot execute commands, approve actions or inspect real files.\nQuestion:\n' +
      prompt + '\nAnswer:\n', { mode: 0o600, flag: 'wx' });
    const profile = verified.status.profile!;
    const args = ['-m', verified.model, '-f', promptFile, '-c', String(profile.context),
      '-t', String(profile.threads), '-tb', String(profile.threads), '-ngl', '0',
      '-n', '128', '--single-turn', '--simple-io', '--no-display-prompt', '--fit', 'off'];
    const start = Date.now();
    const child = spawn(verified.cli, args, {
      detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C', HOME: folder },
    });
    let output = Buffer.alloc(0);
    let stderrLength = 0;
    let maxRss = 0;
    let failure = '';
    let monitoring = false;
    let killer: ReturnType<typeof setTimeout> | null = null;
    const abort = (reason: string) => {
      if (failure) return;
      failure = reason;
      try { if (child.pid) process.kill(-child.pid, 'SIGTERM'); } catch { /* already stopped */ }
      killer = setTimeout(() => {
        try { if (child.pid) process.kill(-child.pid, 'SIGKILL'); } catch { /* already stopped */ }
      }, 1200);
      killer.unref?.();
    };
    try {
      await new Promise<void>((done, fail) => {
        const timeout = setTimeout(() => abort('Offline AI exceeded the 90-second generation limit.'), TIMEOUT_MS);
        const monitor = setInterval(() => {
          if (monitoring || !child.pid) return;
          monitoring = true;
          void (async () => {
            const available = await availableRam();
            if (available === null || available < RESERVE_BYTES)
              abort('The OS is below its 512 MiB available-RAM safety floor.');
            const childStatus = await readFile('/proc/' + child.pid + '/status', 'utf8').catch(() => '');
            const rss = childStatus.match(/^VmRSS:\s*(\d+)\s+kB$/m);
            if (rss) {
              maxRss = Math.max(maxRss, Number(rss[1]));
              if (maxRss > Math.min(RSS_MAX_KIB, Math.floor(verified.maxRssKiB * 1.25 + 65536)))
                abort('Local inference exceeded the measured RSS limit.');
            }
          })().catch(() => abort('Could not monitor available memory.')).finally(() => { monitoring = false; });
        }, 350);
        const finish = (error?: Error) => {
          clearTimeout(timeout);
          clearInterval(monitor);
          if (error) fail(error); else done();
        };
        child.stdout?.on('data', (chunk: Buffer) => {
          output = Buffer.concat([output, chunk]);
          if (output.length > OUTPUT_MAX) abort('Local response was too large.');
        });
        child.stderr?.on('data', (chunk: Buffer) => {
          stderrLength += chunk.byteLength;
          if (stderrLength > 32 * 1024) abort('Local runtime diagnostics were too large.');
        });
        child.once('error', () => finish(new Error('Configured local model executable could not start.')));
        child.once('close', code => {
          if (failure) finish(new Error(failure));
          else if (code !== 0 || !output.toString('utf8').trim()) finish(new Error('Local model did not return a complete answer.'));
          else finish();
        });
      });
      return { text: output.toString('utf8').trim(), durationMs: Date.now() - start, observedRssKiB: maxRss };
    } finally {
      if (killer) clearTimeout(killer);
    }
  } finally { await rm(folder, { recursive: true, force: true }); }
}

export async function handleLocalInference(req: ApiRequest): Promise<ApiResponse | null> {
  if (req.path !== PREFIX + '/status' && req.path !== PREFIX + '/generate') return null;
  if (!req.isLocalAdmin) return { status: 403, error: 'Offline inference is limited to the local desktop.' };
  if (req.path === PREFIX + '/status') {
    if (req.method !== 'GET') return { status: 405, error: 'Only GET is allowed for local model status.' };
    return { status: 200, data: (await verifiedConfiguration()).status };
  }
  if (req.method !== 'POST') return { status: 405, error: 'Only POST is allowed for local generation.' };
  if (!Object.entries(req.headers || {}).some(([k, v]) =>
    k.toLowerCase() === 'x-centipede-owner-intent' && v === '1'))
    return { status: 403, error: 'An explicit local user action is required.' };
  const data = req.body;
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
    Object.keys(data).length !== 1 || typeof data.prompt !== 'string' ||
    !data.prompt.trim() || data.prompt.length > 1000 ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(data.prompt))
    return { status: 422, error: 'Provide one informational question of no more than 1,000 characters.' };
  if (generating) return { status: 429, error: 'The local CPU model is already busy.' };
  generating = true;
  try {
    const verified = await verifiedConfiguration();
    if (!('cli' in verified)) return { status: 503, error: verified.status.reason };
    const generated = await runModel(verified, data.prompt.trim());
    return { status: 200, data: {
      ...generated, model: verified.status.model, modelSha256: verified.status.modelSha256,
      profile: verified.status.profile, source: 'local-cpu-text-only',
      actionsExecuted: false, approvalGranted: false,
    } };
  } catch {
    return { status: 503, error: 'Local inference failed or exceeded safety limits; no actions were executed.' };
  } finally { generating = false; }
}
