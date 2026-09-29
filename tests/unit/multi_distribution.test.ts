import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { syncSha256 } from '../../src/security/cryptoUtils';
import { TargetUpdateChecker, TargetUpdateMetadata } from '../../src/platform/targetUpdateChecker';

const rootDir = process.cwd();
const releaseDir = join(rootDir, 'release');

describe('Centipede OS Multi-Distribution Release System', () => {
  beforeAll(() => {
    // Ensure release artifacts are generated for tests
    execSync('bun run build:release', { cwd: rootDir, stdio: 'pipe' });
  });

  it('1. Verifies release/targets.json and release/target-dependencies.json schema & version consistency', () => {
    const targetsPath = join(releaseDir, 'targets.json');
    const depsPath = join(releaseDir, 'target-dependencies.json');

    expect(existsSync(targetsPath)).toBe(true);
    expect(existsSync(depsPath)).toBe(true);

    const targetsConfig = JSON.parse(readFileSync(targetsPath, 'utf8'));
    const depsConfig = JSON.parse(readFileSync(depsPath, 'utf8'));

    expect(targetsConfig.coreVersion).toBe('1.0.0');
    expect(Object.keys(targetsConfig.targets)).toEqual(['desktop', 'iso', 'live-usb', 'vm', 'android', 'ios']);

    for (const target of ['desktop', 'iso', 'live-usb', 'vm', 'android', 'ios']) {
      expect(targetsConfig.targets[target].revision).toBeGreaterThanOrEqual(1);
      expect(targetsConfig.targets[target].artifact).toBeDefined();
      expect(targetsConfig.targets[target].architecture).toBeDefined();
      expect(depsConfig[target]).toBeDefined();
    }
  });

  it('2. Verifies physical existence and non-zero size for all 6 target artifacts', () => {
    const targets = [
      { name: 'desktop', file: 'release/desktop/centipede-os-1.0.0-desktop.tar.gz' },
      { name: 'iso', file: 'release/iso/centipede-os-1.0.0-x86_64.iso' },
      { name: 'live-usb', file: 'release/live-usb/centipede-os-1.0.0-live-x86_64.img' },
      { name: 'vm', file: 'release/vm/centipede-os-1.0.0-vm-x86_64.qcow2' },
      { name: 'android', file: 'release/android/centipede-os-1.0.0-android.apk' },
      { name: 'ios', file: 'release/ios/centipede-os-1.0.0-ios.ipa' },
    ];

    for (const item of targets) {
      const fullPath = join(rootDir, item.file);
      expect(existsSync(fullPath), `Artifact missing for target [${item.name}]: ${item.file}`).toBe(true);
      const size = statSync(fullPath).size;
      expect(size, `Artifact is zero bytes for target [${item.name}]`).toBeGreaterThan(0);
    }
  });

  it('3. Verifies binary magic bytes and layout structures for release artifacts', () => {
    // ISO Magic Check (CD001 at offset 0x8001 in Primary Volume Descriptor)
    const isoPath = join(releaseDir, 'iso/centipede-os-1.0.0-x86_64.iso');
    const isoBuf = readFileSync(isoPath);
    const isoMagic = isoBuf.toString('latin1', 0x8001, 0x8006);
    expect(isoMagic).toBe('CD001');

    // Live USB Boot Signature Check (0x55AA at offset 510 in Sector 0)
    const livePath = join(releaseDir, 'live-usb/centipede-os-1.0.0-live-x86_64.img');
    const liveBuf = readFileSync(livePath);
    const bootSig = liveBuf.readUInt16LE(510);
    expect(bootSig).toBe(0xaa55);

    // QCOW2 Magic Header Check ('QFI\xfb' at offset 0)
    const vmPath = join(releaseDir, 'vm/centipede-os-1.0.0-vm-x86_64.qcow2');
    const vmBuf = readFileSync(vmPath);
    const qcowMagic = vmBuf.toString('latin1', 0, 4);
    expect(qcowMagic).toBe('QFI\xfb');

    // APK Zip Local Header Check ('PK\x03\x04' at offset 0)
    const apkPath = join(releaseDir, 'android/centipede-os-1.0.0-android.apk');
    const apkBuf = readFileSync(apkPath);
    const apkMagic = apkBuf.readUInt32LE(0);
    expect(apkMagic).toBe(0x04034b50);

    // IPA Zip Local Header Check ('PK\x03\x04' at offset 0)
    const ipaPath = join(releaseDir, 'ios/centipede-os-1.0.0-ios.ipa');
    const ipaBuf = readFileSync(ipaPath);
    const ipaMagic = ipaBuf.readUInt32LE(0);
    expect(ipaMagic).toBe(0x04034b50);
  });

  it('4. Verifies byte-exact SHA256 checksums in release/SHA256SUMS', () => {
    const shaSumsPath = join(releaseDir, 'SHA256SUMS');
    expect(existsSync(shaSumsPath)).toBe(true);

    const content = readFileSync(shaSumsPath, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(6);

    for (const line of lines) {
      if (!line.trim()) continue;
      const [expectedSha, relPath] = line.trim().split(/\s+/);
      const fullPath = join(releaseDir, relPath);
      expect(existsSync(fullPath), `SHA256SUMS lists non-existent file: ${relPath}`).toBe(true);

      const rawBytes = new Uint8Array(readFileSync(fullPath));
      const actualSha = syncSha256(rawBytes);
      expect(actualSha).toBe(expectedSha);
    }
  });

  it('5. Verifies target manifests and master release-manifest.json', () => {
    const masterManifestPath = join(releaseDir, 'release-manifest.json');
    expect(existsSync(masterManifestPath)).toBe(true);

    const master = JSON.parse(readFileSync(masterManifestPath, 'utf8'));
    expect(master.product).toBe('Centipede OS');
    expect(master.coreVersion).toBe('1.0.0');
    expect(master.release).toBe('v1.0.0');
    expect(master.artifacts.length).toBeGreaterThanOrEqual(6);

    const targets = ['desktop', 'iso', 'live-usb', 'vm', 'android', 'ios'];
    for (const t of targets) {
      const tManifestPath = join(releaseDir, 'manifests', `${t}.json`);
      expect(existsSync(tManifestPath), `Manifest missing for ${t}`).toBe(true);

      const tManifest = JSON.parse(readFileSync(tManifestPath, 'utf8'));
      expect(tManifest.product).toBe('Centipede OS');
      expect(tManifest.coreVersion).toBe('1.0.0');
      expect(tManifest.target).toBe(t);
      expect(tManifest.sha256).toBeDefined();
      expect(tManifest.sizeBytes).toBeGreaterThan(0);
      expect(tManifest.gitCommit).toBeDefined();
    }
  });

  it('6. Verifies TargetUpdateChecker version parsing, target vs core update detection, and compatibility gate', () => {
    // Version parsing
    const parsed = TargetUpdateChecker.parseArtifactVersion('1.0.0+iso.2');
    expect(parsed).toEqual({ coreVersion: '1.0.0', target: 'iso', revision: 2 });

    const masterManifest = JSON.parse(readFileSync(join(releaseDir, 'release-manifest.json'), 'utf8'));

    // Target update check when core is same but target revision is newer
    const checkRes = TargetUpdateChecker.checkTargetUpdateAvailable('iso', '1.0.0+iso.0', masterManifest);
    expect(checkRes.updateAvailable).toBe(true);
    expect(checkRes.isCoreUpdate).toBe(false);
    expect(checkRes.metadata?.target).toBe('iso');

    // Compatibility Gate Verification
    const sampleSha = masterManifest.artifacts.find((a: any) => a.target === 'iso').sha256;
    const meta: TargetUpdateMetadata = {
      target: 'iso',
      currentVersion: '1.0.0+iso.1',
      latestRevision: 1,
      latestArtifactVersion: '1.0.0+iso.1',
      artifact: 'centipede-os-1.0.0-x86_64.iso',
      sha256: sampleSha,
      downloadLocation: '/release/iso/centipede-os-1.0.0-x86_64.iso',
      minCoreVersion: '1.0.0',
      requiredKingdomProtocol: 'v1.0+',
      architecture: 'x86_64',
      releaseDate: new Date().toISOString(),
    };

    // Valid compatibility gate
    const gatePass = TargetUpdateChecker.verifyCompatibilityGate(meta, '1.0.0', 'v1.0+', 'x86_64', sampleSha);
    expect(gatePass.allowed).toBe(true);

    // Mismatched architecture
    const gateArchFail = TargetUpdateChecker.verifyCompatibilityGate(meta, '1.0.0', 'v1.0+', 'arm64', sampleSha);
    expect(gateArchFail.allowed).toBe(false);
    expect(gateArchFail.reason).toContain('ARCHITECTURE_MISMATCH');

    // Mismatched SHA256 checksum
    const gateShaFail = TargetUpdateChecker.verifyCompatibilityGate(meta, '1.0.0', 'v1.0+', 'x86_64', 'badsha12345');
    expect(gateShaFail.allowed).toBe(false);
    expect(gateShaFail.reason).toContain('CHECKSUM_MISMATCH');
  });
});
