import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TargetUpdateChecker } from '../../src/platform/targetUpdateChecker';
import { expectedArtifactSha256 } from '../../src/platform/releaseIntegrity';
import { releaseIdentityFromRef } from '../../src/platform/releaseTag';

const root = process.cwd();
const config = JSON.parse(readFileSync(join(root, 'release/targets.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const sha = 'a'.repeat(64);

function manifestFor(target: string, overrides: Record<string, unknown> = {}) {
  const coreVersion = (overrides.coreVersion as string | undefined) ?? packageJson.version;
  const targetInfo = { ...config.targets[target], ...(overrides.targetInfo as object | undefined) };
  const revision = targetInfo.revision;
  const filename = targetInfo.artifact.replaceAll('{version}', coreVersion);
  const artifact = {
    coreVersion,
    target,
    targetRevision: revision,
    artifactVersion: `${coreVersion}+${target}.${revision}`,
    filename,
    relativePath: `${target}/${filename}`,
    architecture: targetInfo.architecture,
    sizeBytes: 1024,
    sha256: sha,
    ...(overrides.artifact as object | undefined),
  };
  return {
    coreVersion,
    targets: { ...config.targets, [target]: targetInfo },
    kingdom: { protocol: 'v1.0+' },
    artifacts: [artifact],
    ...(overrides.manifest as object | undefined),
  };
}

describe('Centipede release target contract', () => {
  it('accepts only the matching stable tag or a numbered RC for the core version', () => {
    expect(releaseIdentityFromRef('', packageJson.version)).toEqual({ releaseTag: `v${packageJson.version}`, channel: 'candidate' });
    expect(releaseIdentityFromRef(`refs/tags/v${packageJson.version}`, packageJson.version)).toEqual({ releaseTag: `v${packageJson.version}`, channel: 'stable' });
    expect(releaseIdentityFromRef(`refs/tags/v${packageJson.version}-rc.2`, packageJson.version)).toEqual({ releaseTag: `v${packageJson.version}-rc.2`, channel: 'candidate' });
    expect(() => releaseIdentityFromRef(`refs/tags/v${packageJson.version}-rc.nope`, packageJson.version)).toThrow();
    expect(() => releaseIdentityFromRef('refs/tags/v9.9.9-rc.1', packageJson.version)).toThrow();
  });

  it('uses package.json as the only core version source', () => {
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(config.version).toBeUndefined();
    expect(config.coreVersion).toBeUndefined();
    expect(config.schemaVersion).toBe(1);
  });

  it('keeps stable publication blocked until disk installation evidence is verified', () => {
    expect(config.publicationGate.stable).toBe('BLOCKED');
    expect(config.publicationGate.reason).toContain('separate disposable QEMU disk');
    expect(config.publicationGate.requiredEvidence).toHaveLength(4);
    const publisher = readFileSync(join(root, 'scripts/create-platform-release-manifest.ts'), 'utf8');
    expect(publisher).toContain("releaseConfig.publicationGate.stable !== 'VERIFIED'");
    expect(publisher).toContain('Stable release is blocked');
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
    expect(config.targets.android.status).toBe('BUILDABLE');
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

  it('offers only a newer artifact whose version, path, checksum, size, target, and Kingdom protocol agree', () => {
    const result = TargetUpdateChecker.checkTargetUpdateAvailable('iso', `${packageJson.version}+iso.1`, manifestFor('iso'));

    expect(result.updateAvailable).toBe(true);
    expect(result.isCoreUpdate).toBe(false);
    expect(result.metadata).toMatchObject({
      latestArtifactVersion: `${packageJson.version}+iso.${config.targets.iso.revision}`,
      requiredKingdomProtocol: 'v1.0+',
      architecture: 'x86_64',
      sha256: sha,
      downloadLocation: `https://github.com/wests-cmd/Centipede-os/releases/download/v${packageJson.version}/centipede-os-${packageJson.version}-x86_64.iso`,
    });
  });

  it('fails closed for absent, blocked, ambiguous, malformed, or inconsistent release metadata', () => {
    const malformed = [
      null,
      {},
      manifestFor('iso', { manifest: { kingdom: {} } }),
      manifestFor('iso', { manifest: { artifacts: [manifestFor('iso').artifacts[0], manifestFor('iso').artifacts[0]] } }),
      manifestFor('iso', { artifact: { filename: '../image.iso' } }),
      manifestFor('iso', { artifact: { sha256: 'not-a-hash' } }),
      manifestFor('iso', { artifact: { artifactVersion: '1.0.0+vm.2' } }),
      manifestFor('iso', { artifact: { targetRevision: 99 } }),
      manifestFor('iso', { artifact: { sizeBytes: 0 } }),
      manifestFor('android'),
    ];

    for (const manifest of malformed) {
      const result = TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.0+iso.1', manifest);
      expect(result.updateAvailable).toBe(false);
      expect(result.metadata).toBeNull();
    }
  });

  it('never treats a lower core version or older target revision as an available update', () => {
    const coreDowngrade = manifestFor('iso', { coreVersion: '0.9.9' });
    const sameRevision = manifestFor('iso');
    const olderRevision = manifestFor('iso', { targetInfo: { revision: Math.max(1, config.targets.iso.revision - 1) } });

    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', `${packageJson.version}+iso.1`, coreDowngrade).updateAvailable).toBe(false);
    const currentIdentity = `${packageJson.version}+iso.${config.targets.iso.revision}`;
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', currentIdentity, sameRevision).updateAvailable).toBe(false);
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', currentIdentity, olderRevision).updateAvailable).toBe(false);
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', '2.0.0+iso.1', sameRevision).updateAvailable).toBe(false);
  });

  it('rejects malformed hashes, incompatible metadata, and replayed identities at the compatibility gate', () => {
    const metadata = {
      target: 'iso' as const,
      currentVersion: '1.0.0+iso.1',
      latestRevision: 2,
      latestArtifactVersion: '1.0.0+iso.2',
      artifact: 'centipede-os-1.0.0-x86_64.iso',
      sha256: sha,
      downloadLocation: 'https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.0/centipede-os-1.0.0-x86_64.iso',
      minCoreVersion: '1.0.0',
      requiredKingdomProtocol: 'v1.0+',
      architecture: 'x86_64',
      releaseDate: 'unknown',
    };

    expect(TargetUpdateChecker.verifyCompatibilityGate(metadata, '1.0.0', 'v1.0+', 'x86_64', sha).allowed).toBe(true);
    expect(TargetUpdateChecker.verifyCompatibilityGate({ ...metadata, sha256: 'bad' }, '1.0.0', 'v1.0+', 'x86_64', 'bad').allowed).toBe(false);
    expect(TargetUpdateChecker.verifyCompatibilityGate({ ...metadata, downloadLocation: 'https://attacker.example/payload.iso' }, '1.0.0', 'v1.0+', 'x86_64', sha).allowed).toBe(false);
    expect(TargetUpdateChecker.verifyCompatibilityGate(metadata, '1.0.0', 'v2.0', 'x86_64', sha).allowed).toBe(false);
    expect(TargetUpdateChecker.verifyCompatibilityGate({ ...metadata, latestRevision: 1, latestArtifactVersion: '1.0.0+iso.1' }, '1.0.0', 'v1.0+', 'x86_64', sha).allowed).toBe(false);
    expect(TargetUpdateChecker.verifyCompatibilityGate({ ...metadata, architecture: 'any' }, '1.0.0', 'v1.0+', 'arm64', sha).allowed).toBe(true);
  });

  it('accepts one checksum for the named artifact and rejects stale, malformed, or ambiguous entries', () => {
    expect(expectedArtifactSha256(`${sha}  release/iso/image.iso`, 'image.iso')).toBe(sha);
    expect(expectedArtifactSha256(`${sha} *image.iso`, 'image.iso')).toBe(sha);
    expect(expectedArtifactSha256(`${sha}  old-image.iso`, 'image.iso')).toBeNull();
    expect(expectedArtifactSha256(`${sha} image.iso\n${sha} another/image.iso`, 'image.iso')).toBeNull();
    expect(expectedArtifactSha256(`not-a-hash image.iso`, 'image.iso')).toBeNull();
  });
});
