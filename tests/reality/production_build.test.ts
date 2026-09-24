import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

describe('Reality Regression Suite — Production Build & Artifact Truth', () => {
  const rootDir = process.cwd();
  const releaseDir = join(rootDir, 'release');
  const bundlePath = join(releaseDir, 'centipede-os-1.0.0-desktop-web-bundle.tar.gz');
  const manifestPath = join(releaseDir, 'release-manifest.json');
  const checksumPath = join(releaseDir, 'SHA256SUMS');

  it('1. Release artifact bundle exists and is non-empty', () => {
    expect(existsSync(bundlePath)).toBe(true);
    expect(statSync(bundlePath).size).toBeGreaterThan(1000);
  });

  it('2. Release manifest exists and matches version 1.0.0', () => {
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(manifest.product).toBe('Centipede OS');
    expect(manifest.centipedeVersion).toBe('1.0.0');
    expect(manifest.artifacts[0].filename).toContain('centipede-os-1.0.0');
  });

  it('3. Checksums register contains valid SHA256 entry', () => {
    expect(existsSync(checksumPath)).toBe(true);
    const checksums = readFileSync(checksumPath, 'utf8');
    expect(checksums).toContain('centipede-os-1.0.0-desktop-web-bundle.tar.gz');
    expect(checksums.split(' ')[0].length).toBe(64);
  });
});
