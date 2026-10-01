import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import packageJson from '../package.json';

const rootDir = process.cwd();
const dataDir = join(rootDir, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

console.log(`Centipede OS v${packageJson.version}`);
console.log('Preparing the web app and shared pairing service...');
execFileSync('bun', ['run', 'build'], { cwd: rootDir, stdio: 'inherit' });

const kingdomUrl = process.env.KINGDOM_API_URL || 'http://localhost:8000';
try {
  const response = await fetch(`${kingdomUrl}/status`, { signal: AbortSignal.timeout(2000) });
  console.log(response.ok
    ? `[ONLINE] Kingdom service responded at ${kingdomUrl}`
    : `[STANDBY] Kingdom service returned ${response.status}; Centipede remains available locally.`);
} catch {
  console.log(`[STANDBY] Kingdom service is unavailable at ${kingdomUrl}; Centipede remains available locally.`);
}

const service = spawn('bun', ['run', 'src/server/production.ts'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT || '3000' },
});
service.on('error', (error) => {
  console.error(`Failed to start Centipede: ${error.message}`);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => service.kill(signal));
}
