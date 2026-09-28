import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { execSync } from 'child_process';

describe('Reality Regression Suite — Production Build & Artifact Truth', () => {
  const rootDir = process.cwd();
  const releaseDir = join(rootDir, 'release');
  const slimBundlePath = join(releaseDir, 'centipede-os-1.0.0-slim-web-bundle.tar.gz');
  const fullBundlePath = join(releaseDir, 'centipede-os-1.0.0-full-bundle.tar.gz');
  const legacyBundlePath = join(releaseDir, 'centipede-os-1.0.0-desktop-web-bundle.tar.gz');
  const manifestPath = join(releaseDir, 'release-manifest.json');
  const checksumPath = join(releaseDir, 'SHA256SUMS');

  it('1. Release artifact bundles exist and are non-empty (Slim & Full)', () => {
    if (!existsSync(slimBundlePath) || !existsSync(fullBundlePath)) {
      execSync('bun run build:release', { stdio: 'inherit' });
    }

    expect(existsSync(slimBundlePath)).toBe(true);
    expect(statSync(slimBundlePath).size).toBeGreaterThan(1000);

    expect(existsSync(fullBundlePath)).toBe(true);
    expect(statSync(fullBundlePath).size).toBeGreaterThan(1000);

    expect(existsSync(legacyBundlePath)).toBe(true);
    expect(statSync(legacyBundlePath).size).toBeGreaterThan(1000);
  });

  it('2. Release manifest exists and registers version 1.0.0 with Slim and Full profiles', () => {
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(manifest.product).toBe('Centipede OS');
    expect(manifest.centipedeVersion).toBe('1.0.0');
    expect(manifest.artifacts.some((a: any) => a.filename.includes('slim'))).toBe(true);
    expect(manifest.artifacts.some((a: any) => a.filename.includes('full'))).toBe(true);
  });

  it('3. Checksums register contains valid SHA256 entries for Slim and Full bundles', () => {
    expect(existsSync(checksumPath)).toBe(true);
    const checksums = readFileSync(checksumPath, 'utf8');
    expect(checksums).toContain('centipede-os-1.0.0-slim-web-bundle.tar.gz');
    expect(checksums).toContain('centipede-os-1.0.0-full-bundle.tar.gz');
    expect(checksums.split('\n')[0].split(' ')[0].length).toBe(64);
  });
});
