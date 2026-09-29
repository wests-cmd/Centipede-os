import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Multi-Distribution Target Specifications & Independent Revisions', () => {
  const rootDir = process.cwd();
  const targetsPath = join(rootDir, 'release', 'targets.json');
  const depsPath = join(rootDir, 'release', 'target-dependencies.json');

  it('1. Authoritative targets specification exists and parses cleanly', () => {
    expect(existsSync(targetsPath)).toBe(true);
    const spec = JSON.parse(readFileSync(targetsPath, 'utf8'));
    expect(spec.version).toBe('1.0.0');
    expect(Object.keys(spec.targets)).toEqual(
      expect.arrayContaining([
        'desktop-slim',
        'desktop-full',
        'docker',
        'iso',
        'live-usb',
        'vm',
        'android',
        'ios',
      ])
    );
  });

  it('2. Target definitions maintain correct status classifications', () => {
    const spec = JSON.parse(readFileSync(targetsPath, 'utf8')).targets;

    expect(spec['desktop-slim'].status).toBe('AVAILABLE');
    expect(spec['desktop-full'].status).toBe('AVAILABLE');
    expect(spec['docker'].status).toBe('AVAILABLE');

    expect(spec['iso'].status).toBe('PLANNED');
    expect(spec['live-usb'].status).toBe('PLANNED');
    expect(spec['vm'].status).toBe('PLANNED');
    expect(spec['android'].status).toBe('PLANNED');
    expect(spec['ios'].status).toBe('PLANNED');
  });

  it('3. Target dependencies specification maps toolchain requirements', () => {
    expect(existsSync(depsPath)).toBe(true);
    const deps = JSON.parse(readFileSync(depsPath, 'utf8')).dependencies;

    expect(deps['desktop-slim'].toolchain).toContain('bun');
    expect(deps['docker'].toolchain).toContain('docker-compose');
    expect(deps['iso'].status).toBe('PLANNED_TOOLCHAIN_REQUIRED');
    expect(deps['android'].status).toBe('PLANNED_TOOLCHAIN_REQUIRED');
  });

  it('4. Independent target tag revision format is syntactically valid', () => {
    const parseTargetTag = (tag: string) => {
      const match = tag.match(/^v(\d+\.\d+\.\d+)-([a-z0-9-]+)\.(\d+)$/);
      if (!match) return null;
      return { coreVersion: match[1], target: match[2], revision: parseInt(match[3], 10) };
    };

    expect(parseTargetTag('v1.0.0-desktop.1')).toEqual({ coreVersion: '1.0.0', target: 'desktop', revision: 1 });
    expect(parseTargetTag('v1.0.0-vm.2')).toEqual({ coreVersion: '1.0.0', target: 'vm', revision: 2 });
    expect(parseTargetTag('invalid-tag')).toBeNull();
  });
});
