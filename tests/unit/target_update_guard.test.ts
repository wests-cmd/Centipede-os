import { describe, expect, it } from 'vitest';
import { TargetUpdateChecker, type TargetUpdateMetadata } from '../../src/platform/targetUpdateChecker';

const sha = 'a'.repeat(64);
const manifest = (version: string, revision: number, status = 'BUILDABLE') => ({
  coreVersion: version, kingdom: { protocol: 'v1.0+' },
  targets: { iso: { status, revision, artifact: 'centipede-os.iso', architecture: 'x86_64',
    minCoreVersion: '1.0.1' } },
  artifacts: [{ target: 'iso', filename: 'centipede-os.iso', sha256: sha, architecture: 'x86_64' }],
});

describe('platform update metadata is not permission to downgrade or claim OS activation', () => {
  it('accepts valid artifact identities only', () => {
    expect(TargetUpdateChecker.parseArtifactVersion('1.0.1+live-usb.2')).toEqual({
      coreVersion: '1.0.1', target: 'live-usb', revision: 2,
    });
    for (const invalid of ['1.0.01+iso.1', 'v1.0.1+iso.1', '1.0.1+iso.0',
      '1.0.1+iso.01', '1.0.1+iso.999999999999999999999',
      'bad+iso.1', '1.0.1+unknown.1']) {
      expect(TargetUpdateChecker.parseArtifactVersion(invalid)).toBeNull();
    }
  });
  it('does not downgrade core version even if the older manifest has larger revision', () => {
    const offer = TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.2+iso.1', manifest('1.0.1', 50));
    expect(offer.updateAvailable).toBe(false);
    expect(offer.isCoreUpdate).toBe(false);
  });
  it('does not downgrade revision, confuse another target, or accept invalid manifests', () => {
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.1+iso.3', manifest('1.0.1', 2)).updateAvailable).toBe(false);
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.1+vm.2', manifest('1.0.2', 3)).updateAvailable).toBe(false);
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.1+iso.1', manifest('1.0.2', 2, 'BLOCKED')).updateAvailable).toBe(false);
    const broken = manifest('1.0.2', 2);
    broken.artifacts[0].sha256 = 'unknown';
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.1+iso.1', broken).updateAvailable).toBe(false);
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', 'garbage', manifest('1.0.2', 2)).updateAvailable).toBe(false);
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.1+iso.1', null).updateAvailable).toBe(false);
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.1+iso.1', { targets: {}, artifacts: {} }).updateAvailable).toBe(false);
  });
  it('allows only forward core versions or forward revisions of the same core version', () => {
    const freshCore = TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.1+iso.9', manifest('1.0.2', 1));
    expect(freshCore).toMatchObject({ updateAvailable: true, isCoreUpdate: true });
    const freshRevision = TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.2+iso.1', manifest('1.0.2', 2));
    expect(freshRevision).toMatchObject({ updateAvailable: true, isCoreUpdate: false });
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.2+iso.2', manifest('1.0.2', 2)).updateAvailable).toBe(false);
  });
  it('only accepts genuine canonical manifest protocol and matching artifact identity', () => {
    const genuine = manifest('1.0.2', 1);
    const update = TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.1+iso.9', genuine);
    expect(update.updateAvailable).toBe(true);
    expect(update.metadata).toMatchObject({ requiredKingdomProtocol: 'v1.0+',
      minCoreVersion: '1.0.1', architecture: 'x86_64' });
    const withoutProtocol = { ...genuine, kingdom: undefined, protocol: 'v1.0+' };
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.1+iso.9', withoutProtocol).metadata).toBeNull();
    const wrongFilename = manifest('1.0.2', 1);
    wrongFilename.artifacts[0].filename = 'other-file.iso';
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.1+iso.9', wrongFilename).metadata).toBeNull();
    const wrongArch = manifest('1.0.2', 1);
    wrongArch.artifacts[0].architecture = 'arm64';
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.1+iso.9', wrongArch).metadata).toBeNull();
  });
  it('fails closed on unsupported cross-core upgrades and does not return downgrade metadata', () => {
    const missingMinimum = manifest('1.0.2', 1);
    // The actual manifest must name an audited minimum installed core version.
    delete (missingMinimum.targets.iso as {minCoreVersion?: string}).minCoreVersion;
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.1+iso.2', missingMinimum).metadata).toBeNull();
    const incompatible = manifest('1.0.3', 1);
    incompatible.targets.iso.minCoreVersion = '1.0.2';
    expect(TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.1+iso.2', incompatible).metadata).toBeNull();
    const downgrade = TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.3+iso.2', manifest('1.0.2', 50));
    expect(downgrade).toEqual({ updateAvailable: false, isCoreUpdate: false, metadata: null });
  });
  it('accepts universal artifacts but never treats an unknown machine architecture as universal', () => {
    const metadata: TargetUpdateMetadata = {
      target: 'desktop', currentVersion: '1.0.1+desktop.1', latestRevision: 2,
      latestArtifactVersion: '1.0.1+desktop.2', artifact: 'desktop.tar.gz',
      sha256: sha, downloadLocation: '', minCoreVersion: '1.0.1',
      requiredKingdomProtocol: 'v1.0+', architecture: 'any', releaseDate: '',
    };
    expect(TargetUpdateChecker.verifyCompatibilityGate(metadata, '1.0.1', 'v1.0+', 'x86_64', sha).allowed).toBe(true);
    expect(TargetUpdateChecker.verifyCompatibilityGate({ ...metadata, architecture: 'x86_64' }, '1.0.1', 'v1.0+', 'any', sha).allowed).toBe(false);
    expect(TargetUpdateChecker.verifyCompatibilityGate({ ...metadata, architecture: 'arm64' }, '1.0.1', 'v1.0+', 'x86_64', sha).allowed).toBe(false);
  });
  it('rejects malformed semver and digest values in compatibility checks', () => {
    const metadata: TargetUpdateMetadata = {
      target: 'iso', currentVersion: '1.0.1+iso.1', latestRevision: 2,
      latestArtifactVersion: '1.0.2+iso.1', artifact: 'centipede-os.iso',
      sha256: sha, downloadLocation: '', minCoreVersion: '1.0.1',
      requiredKingdomProtocol: 'v1.0', architecture: 'x86_64', releaseDate: '',
    };
    expect(TargetUpdateChecker.verifyCompatibilityGate(metadata, '1.0.1', 'v1.0', 'x86_64', sha).allowed).toBe(true);
    expect(TargetUpdateChecker.verifyCompatibilityGate(metadata, 'not-a-version', 'v1.0', 'x86_64', sha).allowed).toBe(false);
    expect(TargetUpdateChecker.verifyCompatibilityGate(metadata, '1.0.1', 'v1.0', 'x86_64', 'not-a-sha').allowed).toBe(false);
    expect(TargetUpdateChecker.verifyCompatibilityGate({ ...metadata, minCoreVersion: '1.0.x' }, '1.0.1', 'v1.0', 'x86_64', sha).allowed).toBe(false);
  });
});
