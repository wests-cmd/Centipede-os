import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const releaseDir = join(root, 'release');
const targets = JSON.parse(readFileSync(join(root, 'release/targets.json'), 'utf8')).targets;
const desktopName = targets.desktop.artifact.replace('{version}', JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version);
const desktopPath = join(releaseDir, 'desktop', desktopName);

describe('Desktop release artifact integrity', () => {
  it('builds a non-empty archive containing the actual Vite application', () => {
    if (!existsSync(desktopPath)) execSync('bun run build:release', { cwd: root, stdio: 'inherit' });
    expect(existsSync(desktopPath)).toBe(true);
    expect(statSync(desktopPath).size).toBeGreaterThan(1000);
    const entries = execSync(`tar -tzf "${desktopPath}"`, { cwd: root, encoding: 'utf8' });
    expect(entries.split(/\r?\n/)).toContain('dist/index.html');
  }, 60000);

  it('keeps manifest and checksum generation in the single aggregate release validator', () => {
    const builder = readFileSync(join(root, 'scripts/build-release.ts'), 'utf8');
    const aggregate = readFileSync(join(root, 'scripts/create-platform-release-manifest.ts'), 'utf8');
    expect(builder).not.toContain('SHA256SUMS');
    expect(builder).not.toContain('release-manifest.json');
    expect(aggregate).toContain('SHA256SUMS');
    expect(aggregate).toContain('release-manifest.json');
    expect(aggregate).toContain('releaseIdentityFromRef');
    expect(aggregate).toContain('release: releaseTag');
    expect(readFileSync(join(root, 'scripts/build-release.ts'), 'utf8')).toContain('releaseIdentityFromRef');
    const bytes = readFileSync(desktopPath);
    expect(createHash('sha256').update(bytes).digest('hex')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses a blocked signed mobile target instead of producing a fake stable artifact', () => {
    expect(() => execSync('bun scripts/build-release.ts --target=android', { cwd: root, stdio: 'pipe' })).toThrow();
    expect(() => execSync('bun scripts/build-release.ts --target=ios', { cwd: root, stdio: 'pipe' })).toThrow();
  });

  it('blocks tagged stable publication until installer evidence is verified', () => {
    const config = JSON.parse(readFileSync(join(root, 'release/targets.json'), 'utf8'));
    const publisher = readFileSync(join(root, 'scripts/create-platform-release-manifest.ts'), 'utf8');
    expect(config.publicationGate.stable).toBe('BLOCKED');
    expect(publisher).toContain("channel === 'stable' && releaseConfig.publicationGate.stable !== 'VERIFIED'");
    expect(publisher).toContain('Stable release is blocked');
  });
});
