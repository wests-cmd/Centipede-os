import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TargetUpdateChecker } from '../../src/platform/targetUpdateChecker';

const rootDir = process.cwd();
const config = JSON.parse(readFileSync(join(rootDir, 'release/targets.json'), 'utf8'));

describe('Centipede release gates and target identity', () => {
  it('uses package.json as the only core version source', () => {
    const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(config.coreVersion).toBeUndefined();
    expect(config.targets.desktop.status).toBe('BUILDABLE');
  });

  it('has target-specific build outputs and revisions for every release platform', () => {
    for (const target of ['desktop', 'iso', 'live-usb', 'vm', 'android', 'ios', 'docker']) {
      expect(config.targets[target].status).toBe('BUILDABLE');
      expect(config.targets[target].artifact).toMatch(/centipede/);
      expect(config.targets[target].revision).toBeGreaterThan(0);
    }
    expect(config.targets.android.description).toContain('signing secrets');
    expect(config.targets.ios.description).toContain('Apple distribution');
  });

  it('parses independent target revisions including hyphenated target names', () => {
    expect(TargetUpdateChecker.parseArtifactVersion('1.0.0+desktop.2')).toEqual({ coreVersion: '1.0.0', target: 'desktop', revision: 2 });
    expect(TargetUpdateChecker.parseArtifactVersion('1.0.0+live-usb.3')).toEqual({ coreVersion: '1.0.0', target: 'live-usb', revision: 3 });
  });

  it('does not offer updates for targets absent from the built artifact manifest', () => {
    const result = TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.0+iso.1', { targets: config.targets, artifacts: [] });
    expect(result.updateAvailable).toBe(false);
    expect(result.metadata).toBeNull();
  });
});
