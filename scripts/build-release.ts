import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import packageJson from '../package.json';
import releaseConfig from '../release/targets.json';
import { CENTIPEDE_SUPPORTED_KINGDOM_PROTOCOL, KINGDOM_PROTOCOL_MAJOR } from '../src/version';
import { KINGDOM_CONTRACT_SPEC } from '../src/api/contractSpec';

const rootDir = process.cwd();
const releaseDir = join(rootDir, 'release');
const version = packageJson.version;
const args = process.argv.slice(2);
const targetArg = args.find((arg) => arg.startsWith('--target='))?.slice('--target='.length) ?? 'all';
const config = releaseConfig as {
  schemaVersion: number;
  targets: Record<string, { status: 'BUILDABLE' | 'BLOCKED' | 'PLANNED'; revision: number; artifact?: string; architecture: string; reason?: string }>;
};

function fail(message: string): never {
  console.error(`[RELEASE BLOCKED] ${message}`);
  process.exit(1);
}

if (!['all', ...Object.keys(config.targets)].includes(targetArg)) fail(`Unknown target '${targetArg}'.`);

const requestedTargets = targetArg === 'all' ? Object.keys(config.targets) : [targetArg];
const blocked = requestedTargets.filter((target) => config.targets[target].status !== 'BUILDABLE');
if (blocked.length) fail(blocked.map((target) => `${target}: ${config.targets[target].reason ?? config.targets[target].status}`).join('\n'));
if (requestedTargets.some((target) => target !== 'desktop')) {
  fail('This web-bundle builder only produces the desktop web artifact. Use the platform-builds workflow for native, image, and container targets.');
}

const targets = requestedTargets;
if (!targets.length) fail('No release target selected.');

const expectedTag = `v${version}`;
const ref = process.env.GITHUB_REF ?? '';
const sourceDirty = execFileSync('git', ['status', '--porcelain'], { cwd: rootDir, encoding: 'utf8' }).trim().length > 0;
if (ref.startsWith('refs/tags/') && ref.slice('refs/tags/'.length) !== expectedTag) {
  fail(`Tag ${ref.slice('refs/tags/'.length)} must exactly match ${expectedTag}.`);
}
if (ref === `refs/tags/${expectedTag}` && sourceDirty) fail('Stable releases require a clean, committed source tree.');

const distDir = join(rootDir, 'dist');
console.log(`Building Centipede ${version}: ${targets.join(', ')}`);
execFileSync('npm', ['run', 'build'], { cwd: rootDir, stdio: 'inherit' });
if (!existsSync(join(distDir, 'index.html'))) fail('Web build did not produce dist/index.html.');

const targetManifestsDir = join(releaseDir, 'manifests');
mkdirSync(targetManifestsDir, { recursive: true });
for (const target of targets) {
  const targetConfig = config.targets[target];
  const targetDir = join(releaseDir, target);
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });
  const artifactName = targetConfig.artifact!.replaceAll('{version}', version);
  const artifactPath = join(targetDir, artifactName);
  execFileSync('tar', ['-czf', artifactPath, '-C', rootDir, 'dist'], { stdio: 'inherit' });
  if (!existsSync(artifactPath) || statSync(artifactPath).size === 0) fail(`Artifact was not produced: ${artifactPath}`);

  const sha256 = createHash('sha256').update(readFileSync(artifactPath)).digest('hex');
  const gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8' }).trim();
  const identity = `${version}+${target}.${targetConfig.revision}`;
  const manifest = {
    product: 'Centipede OS', coreVersion: version, target, targetRevision: targetConfig.revision,
    artifactVersion: identity, releaseChannel: ref === `refs/tags/${expectedTag}` ? 'stable' : 'candidate', artifact: artifactName, architecture: targetConfig.architecture,
    sha256, sizeBytes: statSync(artifactPath).size, gitCommit, sourceDirty,
    kingdom: { protocol: CENTIPEDE_SUPPORTED_KINGDOM_PROTOCOL, protocolMajor: KINGDOM_PROTOCOL_MAJOR, contractVersion: KINGDOM_CONTRACT_SPEC.contractVersion },
  };
  writeFileSync(join(targetManifestsDir, `${target}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
}

const checksumEntries: Array<{ path: string; sha256: string; sizeBytes: number; target: string; artifactVersion: string; architecture: string }> = [];
const artifacts = targets.map((target) => {
  const targetConfig = config.targets[target];
  const artifactName = targetConfig.artifact!.replaceAll('{version}', version);
  const relativePath = `${target}/${artifactName}`;
  if (basename(artifactName) !== artifactName) fail(`Unsafe artifact name configured for ${target}.`);
  const artifactPath = resolve(releaseDir, target, artifactName);
  if (!artifactPath.startsWith(`${resolve(releaseDir)}${sep}${target}${sep}`)) fail('Unsafe artifact path in target configuration.');
  const bytes = readFileSync(artifactPath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const sizeBytes = statSync(artifactPath).size;
  checksumEntries.push({ path: relativePath, sha256, sizeBytes, target, artifactVersion: `${version}+${target}.${targetConfig.revision}`, architecture: targetConfig.architecture });
  return { target, coreVersion: version, targetRevision: targetConfig.revision, artifactVersion: `${version}+${target}.${targetConfig.revision}`, filename: basename(relativePath), relativePath, architecture: targetConfig.architecture, sizeBytes, sha256 };
});

writeFileSync(join(releaseDir, 'SHA256SUMS'), checksumEntries.map((entry) => `${entry.sha256}  ${entry.path}`).join('\n') + '\n');
const manifest = {
  product: 'Centipede OS', coreVersion: version, centipedeVersion: version, release: expectedTag,
  releaseChannel: ref === `refs/tags/${expectedTag}` ? 'stable' : 'candidate',
  gitCommit: artifacts.length ? JSON.parse(readFileSync(join(targetManifestsDir, `${targets[0]}.json`), 'utf8')).gitCommit : '',
  sourceDirty,
  kingdom: { protocol: CENTIPEDE_SUPPORTED_KINGDOM_PROTOCOL, protocolMajor: KINGDOM_PROTOCOL_MAJOR, contractVersion: KINGDOM_CONTRACT_SPEC.contractVersion },
  targets: config.targets, artifacts,
};
writeFileSync(join(releaseDir, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

// Fail closed: independently verify every output and ensure blocked targets have no artifacts.
for (const entry of checksumEntries) {
  const path = resolve(releaseDir, entry.path);
  const digest = createHash('sha256');
  await new Promise<void>((resolveHash, rejectHash) => createReadStream(path).on('data', (chunk) => digest.update(chunk)).on('end', resolveHash).on('error', rejectHash));
  if (digest.digest('hex') !== entry.sha256 || statSync(path).size !== entry.sizeBytes) fail(`Artifact integrity validation failed: ${entry.path}`);
}
const writtenManifest = JSON.parse(readFileSync(join(releaseDir, 'release-manifest.json'), 'utf8')) as typeof manifest;
const writtenChecksums = readFileSync(join(releaseDir, 'SHA256SUMS'), 'utf8').trim().split(/\r?\n/);
if (writtenManifest.release !== expectedTag || writtenManifest.artifacts.length !== checksumEntries.length || writtenChecksums.length !== checksumEntries.length) {
  fail('Release manifest and checksum list do not describe exactly the requested artifacts.');
}
for (const artifact of writtenManifest.artifacts) {
  const expected = checksumEntries.find((entry) => entry.path === artifact.relativePath);
  if (!expected || expected.sha256 !== artifact.sha256 || expected.sizeBytes !== artifact.sizeBytes || expected.target !== artifact.target) {
    fail(`Release manifest does not match validated artifact ${artifact.relativePath}.`);
  }
}
for (const [target, targetConfig] of Object.entries(config.targets)) {
  if (targetConfig.status !== 'BUILDABLE' && existsSync(join(releaseDir, target))) fail(`Blocked target output exists and must be removed: ${target}`);
}
console.log(`Release artifacts verified: ${artifacts.map((artifact) => artifact.relativePath).join(', ')}`);
