import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import packageJson from '../package.json';

const rootDir = process.cwd();
const dataDir = join(rootDir, 'data');
const version = packageJson.version || '1.0.0';

console.log(`===========================================================`);
console.log(`  CENTIPEDE OS ONE-CLICK LAUNCHER — v${version}`);
console.log(`===========================================================`);

// 1. Ensure required data directory exists
if (!existsSync(dataDir)) {
  console.log('--- Initializing local storage directory ./data ---');
  mkdirSync(dataDir, { recursive: true });
}

// 2. Platform Detection
const platform = process.platform;
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';
const isLinux = platform === 'linux';

console.log(`\nPlatform: ${platform.toUpperCase()} (${process.arch})`);

// 3. Test Kingdom connection availability
console.log('\n--- Checking Kingdom Swarm Backend Availability ---');
const kingdomUrl = process.env.KINGDOM_API_URL || 'http://localhost:8000';

fetch(`${kingdomUrl}/status`, { signal: AbortSignal.timeout(2000) })
  .then((res) => {
    if (res.ok) {
      console.log(`[ONLINE] Connected to Kingdom Swarm Engine on ${kingdomUrl}`);
    } else {
      console.log(`[STANDBY] Kingdom backend returned status ${res.status}. Operating in local standby mode.`);
    }
  })
  .catch(() => {
    console.log(`[STANDBY] Kingdom Swarm backend is offline at ${kingdomUrl}.`);
    console.log(`          Centipede OS desktop will operate in local standby mode.`);
    console.log(`          You can launch Kingdom backend anytime with: python -m kingdom\n`);
  })
  .finally(() => {
    // 4. Launch Centipede OS Web Desktop Interface
    console.log('--- Launching Centipede OS Desktop Environment ---');
    console.log('URL: http://localhost:3000\n');

    const dev = spawn('bun', ['run', 'dev'], { stdio: 'inherit', cwd: rootDir });

    dev.on('error', (err) => {
      console.error(`Failed to launch Centipede OS: ${err.message}`);
      process.exit(1);
    });
  });
