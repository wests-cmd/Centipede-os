/**
 * Read-only host metrics for the LOCAL Centipede operator.
 * Never use remote Kingdom data, browser guesses, shell commands or a privileged broker.
 * Container Linux /proc and os.* may describe its HOST; the scope label is explicit.
 */
import { cpus, freemem, platform, totalmem, uptime } from 'node:os';
import { readFileSync, statfsSync } from 'node:fs';
import type { ApiRequest, ApiResponse } from './routes';

type CpuSnapshot = { idle: number; total: number; at: number };
let lastCpu: CpuSnapshot | null = null;

function cpuMeasurement(): number | null {
  const cores = cpus();
  if (!cores.length) return null;
  const idle = cores.reduce((sum, core) => sum + core.times.idle, 0);
  const total = cores.reduce((sum, core) => sum +
    core.times.user + core.times.nice + core.times.sys + core.times.idle + core.times.irq, 0);
  const now = Date.now();
  const previous = lastCpu;
  lastCpu = { idle, total, at: now };
  if (!previous || now <= previous.at || total <= previous.total) return null;
  const percent = 100 * (1 - (idle - previous.idle) / (total - previous.total));
  return Math.round(Math.max(0, Math.min(100, percent)) * 10) / 10;
}

function linuxAvailableMemory(): number | null {
  if (platform() !== 'linux') return null;
  try {
    const match = /^MemAvailable:\\s+(\\d+) kB$/m.exec(readFileSync('/proc/meminfo', 'utf8'));
    return match ? Math.round(Number(match[1]) / 1024) : null;
  } catch { return null; }
}

function serviceVolume(): { totalMiB: number; availableMiB: number } | null {
  try {
    const fs = statfsSync(process.cwd());
    const blockSize = Number(fs.bsize);
    const total = blockSize * Number(fs.blocks);
    const available = blockSize * Number(fs.bavail);
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger(available) ||
        blockSize <= 0 || total <= 0 || available < 0 || available > total) return null;
    return { totalMiB: Math.round(total / 1048576), availableMiB: Math.round(available / 1048576) };
  } catch { return null; }
}

export function readHostTelemetry() {
  const total = totalmem();
  const free = freemem();
  const available = linuxAvailableMemory();
  const memoryValid = total > 0 && free >= 0 && free <= total;
  const memory = memoryValid ? {
    totalMiB: Math.round(total / 1048576),
    freeMiB: Math.round(free / 1048576),
    availableMiB: available !== null && available <= total / 1048576 ? available : null,
    // No 'used' claim: free memory != available memory; Linux's cache is reclaimable.
  } : null;
  return {
    scope: 'local-centipede-server-kernel-view',
    observedAt: Date.now(),
    staleAfterMs: 20000,
    platform: platform(),
    logicalCpus: cpus().length,
    cpuUsagePercent: cpuMeasurement(), // null on first sample: needs two real samples
    memory,
    serverProcessRssMiB: Math.round(process.memoryUsage().rss / 1048576),
    serviceVolume: serviceVolume(), // THIS volume only; not all user disks
    osUptimeSeconds: Math.floor(uptime()),
    limitations: 'Host/kernel view may include a Docker host or VM; not full desktop RAM, Kingdom, model, or all physical disks.',
  };
}

/** Deny remote, cross-origin, and non-local requests BEFORE measuring anything. */
export function handleHostTelemetry(req: ApiRequest): ApiResponse | null {
  if (req.path !== '/api/v1/visibility/host') return null;
  if (req.method !== 'GET') return { status: 405, error: 'Read-only telemetry endpoint.' };
  if (!req.isLocalAdmin) return { status: 403, error: 'Local host telemetry requires a same-origin loopback operator.' };
  return { status: 200, data: readHostTelemetry() };
}
