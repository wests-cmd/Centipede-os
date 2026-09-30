import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TargetUpdateChecker } from '../../src/platform/targetUpdateChecker';
import { expectedArtifactSha256 } from '../../src/platform/releaseIntegrity';

const root = process.cwd();
const config = JSON.parse(readFileSync(join(root, 'release/targets.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const sha = 'a'.repeat(64);

describe('Centipede release target contract', () => {
  it('uses package.json as the only core version source', () => {
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(config.version).toBeUndefined();
    expect(config.coreVersion).toBeUndefined();
    expect(config.schemaVersion).toBe(1);
  });

  it('classifies every target with an artifact name and positive independent revision', () => {
    expect(Object.keys(config.targets).sort()).toEqual(['android', 'desktop', 'docker', 'ios', 'iso', 'live-usb', 'vm']);
    for (const target of Object.values(config.targets) as Array<any>) {
      expect(target.revision).toBeGreaterThan(0);
      expect(target.artifact).toContain('{version}');
      expect(['BUILDABLE', 'BLOCKED', 'PLANNED']).toContain(target.status);
      if (target.status !== 'BUILDABLE') expect(target.reason).toBeTruthy();
    }
    for (const target of ['desktop', 'iso', 'live-usb', 'vm', 'docker']) expect(config.targets[target].status).toBe('BUILDABLE');
    expect(config.targets.android.status).toBe('BLOCKED');
    expect(config.targets.ios.status).toBe('BLOCKED');
  });

  it('parses target identities and hyphenated target names while rejecting unknown targets', () => {
    expect(TargetUpdateChecker.parseArtifactVersion('1.0.0+desktop.2')).toEqual({ coreVersion: '1.0.0', target: 'desktop', revision: 2 });
    expect(TargetUpdateChecker.parseArtifactVersion('1.0.0+live-usb.3')).toEqual({ coreVersion: '1.0.0', target: 'live-usb', revision: 3 });
    expect(TargetUpdateChecker.parseArtifactVersion('1.0.0+not-a-target.1')).toBeNull();
    expect(TargetUpdateChecker.parseArtifactVersion('1.0.0+docker.0')).toBeNull();
  });

  it('does not offer updates for targets absent from a built artifact manifest', () => {
    const result = TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.0+iso.1', { targets: config.targets, artifacts: [] });
    expect(result.updateAvailable).toBe(false);
    expect(result.metadata).toBeNull();
  });

  it('accepts one checksum for the named artifact and rejects stale, malformed, or ambiguous entries', () => {
    expect(expectedArtifactSha256(`${sha}  release/iso/image.iso`, 'image.iso')).toBe(sha);
    expect(expectedArtifactSha256(`${sha} *image.iso`, 'image.iso')).toBe(sha);
    expect(expectedArtifactSha256(`${sha}  old-image.iso`, 'image.iso')).toBeNull();
    expect(expectedArtifactSha256(`${sha} image.iso\n${sha} another/image.iso`, 'image.iso')).toBeNull();
    expect(expectedArtifactSha256(`not-a-hash image.iso`, 'image.iso')).toBeNull();
  });
});
