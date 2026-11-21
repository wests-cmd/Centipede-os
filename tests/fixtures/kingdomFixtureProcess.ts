import { spawn, type ChildProcess } from 'node:child_process';

export async function startKingdomFixture(port: string): Promise<ChildProcess> {
  const child = spawn(process.env.CENTIPEDE_E2E_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
    ['tests/fixtures/kingdom-contract-fixture.py'], { env: { ...process.env, PORT: port }, stdio: ['ignore', 'ignore', 'pipe'] });
  let diagnostic = ''; let failed: Error | undefined;
  child.on('error', error => { failed = error; });
  child.stderr?.on('data', data => { diagnostic = (diagnostic + data.toString()).slice(-4096); });
  for (let attempt = 0; attempt < 50; attempt++) {
    if (failed || child.exitCode !== null) break;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/status`, { signal: AbortSignal.timeout(300) });
      if (response.ok && child.exitCode === null) return child;
    } catch { /* Poll readiness, not a fixed startup delay. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error(`Fixture did not become ready: ${failed?.message || diagnostic || child.exitCode}`);
}
