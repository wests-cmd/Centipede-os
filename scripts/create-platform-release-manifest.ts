import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import packageJson from '../package.json';
import releaseConfig from '../release/targets.json';
import { CENTIPEDE_SUPPORTED_KINGDOM_PROTOCOL, KINGDOM_PROTOCOL_MAJOR } from '../src/version';
import { KINGDOM_CONTRACT_SPEC } from '../src/api/contractSpec';
import { expectedArtifactSha256 } from '../src/platform/releaseIntegrity';

const root = process.cwd();
const releaseDir = join(root, 'release');
const downloaded = join(releaseDir, 'platforms');
const version = packageJson.version;
const stableTag = `v${version}`;
const ref = process.env.GITHUB_REF ?? '';
const channel = ref === `refs/tags/${stableTag}` ? 'stable' : 'candidate';
const sourceDirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0;
if (channel === 'stable' && sourceDirty) throw new Error('Stable release packaging requires a clean committed tree.');

const paths: Record<string, string> = {
  desktop: join(releaseDir, 'desktop'),
  iso: join(downloaded, 'centipede-iso-live-usb-vm', 'iso'),
  'live-usb': join(downloaded, 'centipede-iso-live-usb-vm', 'live-usb'),
  vm: join(downloaded, 'centipede-iso-live-usb-vm', 'vm'),
  android: join(downloaded, 'centipede-android-release-apk'),
  ios: join(downloaded, 'centipede-ios-release-ipa'),
  docker: join(downloaded, 'centipede-docker-image'),
};

const gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
mkdirSync(join(releaseDir, 'manifests'), { recursive: true });
const artifacts: Array<Record<string, unknown> & { relativePath: string; sha256: string; sizeBytes: number }> = [];
const checksums: string[] = [];

for (const [target, targetConfig] of Object.entries(releaseConfig.targets)) {
  if (targetConfig.status !== 'BUILDABLE') continue;
  if (!targetConfig.artifact) throw new Error(`BUILDABLE target ${target} has no configured artifact.`);
  const artifactName = targetConfig.artifact.replaceAll('{version}', version);
  const sourcePath = join(paths[target], artifactName);
  if (!existsSync(sourcePath) || statSync(sourcePath).size === 0) throw new Error(`Missing built ${target} artifact: ${sourcePath}`);
  const targetDir = join(releaseDir, target);
  mkdirSync(targetDir, { recursive: true });
  const artifactPath = join(targetDir, artifactName);
  if (sourcePath !== artifactPath) copyFileSync(sourcePath, artifactPath);
  const bytes = readFileSync(artifactPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (target !== 'desktop') {
    const checksumRoot = target === 'iso' || target === 'live-usb' || target === 'vm'
      ? join(downloaded, 'centipede-iso-live-usb-vm')
      : join(downloaded, target === 'android' ? 'centipede-android-release-apk' : target === 'ios' ? 'centipede-ios-release-ipa' : 'centipede-docker-image');
    const checksumName = target === 'iso' || target === 'live-usb' || target === 'vm' ? 'platform-SHA256SUMS' : 'SHA256SUMS';
    const checksumPath = join(checksumRoot, checksumName);
    if (!existsSync(checksumPath)) throw new Error(`Missing build-job checksums for ${target}: ${checksumPath}`);
    const expectedSha256 = expectedArtifactSha256(readFileSync(checksumPath, 'utf8'), artifactName);
    if (!expectedSha256 || expectedSha256 !== sha256.toLowerCase()) {
      throw new Error(`Build-job checksum does not match the downloaded ${target} artifact ${artifactName}.`);
    }
  }
  const sizeBytes = statSync(artifactPath).size;
  const identity = `${version}+${target}.${targetConfig.revision}`;
  const relativePath = `${target}/${artifactName}`;
  const manifest = {
    product: 'Centipede OS', coreVersion: version, target, targetRevision: targetConfig.revision,
    artifactVersion: identity, releaseChannel: channel, artifact: artifactName,
    architecture: targetConfig.architecture, sha256, sizeBytes, gitCommit, sourceDirty,
    kingdom: { protocol: CENTIPEDE_SUPPORTED_KINGDOM_PROTOCOL, protocolMajor: KINGDOM_PROTOCOL_MAJOR, contractVersion: KINGDOM_CONTRACT_SPEC.contractVersion },
  };
  writeFileSync(join(releaseDir, 'manifests', `${target}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  artifacts.push({ target, coreVersion: version, targetRevision: targetConfig.revision, artifactVersion: identity, filename: artifactName, relativePath, architecture: targetConfig.architecture, sizeBytes, sha256 });
  checksums.push(`${sha256}  ${relativePath}`);
}

const combined = {
  product: 'Centipede OS', coreVersion: version, centipedeVersion: version, release: stableTag,
  releaseChannel: channel, gitCommit, sourceDirty,
  kingdom: { protocol: CENTIPEDE_SUPPORTED_KINGDOM_PROTOCOL, protocolMajor: KINGDOM_PROTOCOL_MAJOR, contractVersion: KINGDOM_CONTRACT_SPEC.contractVersion },
  targets: releaseConfig.targets, artifacts,
};
writeFileSync(join(releaseDir, 'SHA256SUMS'), `${checksums.join('\n')}\n`);
writeFileSync(join(releaseDir, 'release-manifest.json'), `${JSON.stringify(combined, null, 2)}\n`);

for (const artifact of artifacts) {
  const path = join(releaseDir, artifact.relativePath);
  if (createHash('sha256').update(readFileSync(path)).digest('hex') !== artifact.sha256 || statSync(path).size !== artifact.sizeBytes) {
    throw new Error(`Artifact changed during manifest generation: ${artifact.relativePath}`);
  }
}
console.log(`Created verified ${channel} manifest for ${artifacts.length} target artifacts.`);
