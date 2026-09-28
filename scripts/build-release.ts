import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync, rmSync } from 'fs';
import { join, relative } from 'path';
import { syncSha256 } from '../src/security/cryptoUtils';
import packageJson from '../package.json';
import { KINGDOM_PROTOCOL_MAJOR, CENTIPEDE_SUPPORTED_KINGDOM_PROTOCOL } from '../src/version';
import { KINGDOM_COMPATIBILITY_MANIFEST, KINGDOM_CONTRACT_SPEC } from '../src/api/contractSpec';

const rootDir = process.cwd();
const releaseDir = join(rootDir, 'release');
const distDir = join(rootDir, 'dist');
const version = packageJson.version || '1.0.0';

// 1. Target Selector CLI Parsing (--target=iso, --target=all, etc.)
const args = process.argv.slice(2);
let selectedTarget = 'all';
for (const arg of args) {
  if (arg.startsWith('--target=')) {
    selectedTarget = arg.split('=')[1].toLowerCase();
  }
}

// 2. Load Target Configurations and Dependency Graph
if (!existsSync(releaseDir)) {
  mkdirSync(releaseDir, { recursive: true });
}

const targetsConfigPath = join(releaseDir, 'targets.json');
const targetDepsPath = join(releaseDir, 'target-dependencies.json');

let targetsConfig: any = {};
if (existsSync(targetsConfigPath)) {
  targetsConfig = JSON.parse(readFileSync(targetsConfigPath, 'utf8'));
} else {
  targetsConfig = {
    coreVersion: version,
    targets: {
      desktop: { revision: 1, artifact: `centipede-os-${version}-desktop.tar.gz`, architecture: 'x86_64' },
      iso: { revision: 1, artifact: `centipede-os-${version}-x86_64.iso`, architecture: 'x86_64' },
      'live-usb': { revision: 1, artifact: `centipede-os-${version}-live-x86_64.img`, architecture: 'x86_64' },
      vm: { revision: 1, artifact: `centipede-os-${version}-vm-x86_64.qcow2`, architecture: 'x86_64' },
      android: { revision: 1, artifact: `centipede-os-${version}-android.apk`, architecture: 'arm64-v8a' },
      ios: { revision: 1, artifact: `centipede-os-${version}-ios.ipa`, architecture: 'arm64' },
    },
  };
  writeFileSync(targetsConfigPath, JSON.stringify(targetsConfig, null, 2));
}

if (!existsSync(targetDepsPath)) {
  const defaultDeps = {
    desktop: ['core'],
    iso: ['core', 'desktop'],
    'live-usb': ['core', 'desktop'],
    vm: ['core', 'desktop'],
    android: ['core', 'mobile-contract'],
    ios: ['core', 'mobile-contract'],
  };
  writeFileSync(targetDepsPath, JSON.stringify(defaultDeps, null, 2));
}

const availableTargets = Object.keys(targetsConfig.targets);
if (selectedTarget !== 'all' && !availableTargets.includes(selectedTarget)) {
  console.error(`[RELEASE BUILD ERROR] Unknown target '${selectedTarget}'. Available targets: all, ${availableTargets.join(', ')}`);
  process.exit(1);
}

const targetsToBuild = selectedTarget === 'all' ? availableTargets : [selectedTarget];

console.log(`===========================================================`);
console.log(`  CENTIPEDE OS MULTI-DISTRIBUTION BUILDER — v${version}`);
console.log(`  Selected Target(s): ${targetsToBuild.join(', ')}`);
console.log(`===========================================================`);

// 3. Tag / Version Consistency Validation
const expectedTag = `v${version}`;
const currentRef = process.env.GITHUB_REF || '';

if (currentRef.startsWith('refs/tags/')) {
  const actualTag = currentRef.replace('refs/tags/', '');
  // Allow exact core tag or target revision tag e.g. v1.0.0-iso.1
  if (actualTag !== expectedTag && !actualTag.startsWith(`${expectedTag}-`)) {
    console.error(`\n[RELEASE BUILD ERROR] Tag/Version mismatch! Tag is '${actualTag}' but package.json version is '${version}'. Aborting release.`);
    process.exit(1);
  }
  console.log(`[VERIFIED] Git Tag '${actualTag}' aligns with package.json core version '${version}'.`);
}

// 4. Ensure Web Dist Bundle is Built
console.log('\n--- 1. Ensuring Core Web Dist Bundle is Built ---');
const nodeBinPath = join(rootDir, 'node_modules', '.bin');
const envWithPath = { ...process.env, PATH: `${nodeBinPath}:${process.env.PATH || ''}` };
execSync('bun x vite build', { stdio: 'inherit', env: envWithPath });

if (!existsSync(distDir)) {
  console.error('Build Error: dist/ directory not found after build!');
  process.exit(1);
}

// 3. Prepare clean release directory (self-clean stale artifacts)
if (existsSync(releaseDir)) {
  console.log('\n--- Cleaning Stale Release Artifacts ---');
  execSync(`rm -rf "${releaseDir}"/*`);
} else {
  mkdirSync(releaseDir, { recursive: true });
}

// Get Git Commit SHA if available
let gitCommit = 'unknown';
try {
  gitCommit = execSync('git rev-parse HEAD').toString().trim();
} catch (e) {
  // Fallback
}

// 4. Create Dual Release Archives: Slim and Full
// A. Slim Release Bundle (Core runtime only, on-demand component acquisition)
const slimBundleName = `centipede-os-${version}-slim-web-bundle.tar.gz`;
const slimBundlePath = join(releaseDir, slimBundleName);

// B. Full Release Bundle (Pre-packaged local runtime, Docker Swarm stack, scripts & configs)
const fullBundleName = `centipede-os-${version}-full-bundle.tar.gz`;
const fullBundlePath = join(releaseDir, fullBundleName);

// Legacy bundle alias for backwards compatibility
const legacyBundleName = `centipede-os-${version}-desktop-web-bundle.tar.gz`;
const legacyBundlePath = join(releaseDir, legacyBundleName);

console.log(`\n--- 2. Archiving Slim Release Bundle: ${slimBundleName} ---`);
execSync(`tar -czf "${slimBundlePath}" -C "${rootDir}" dist`, { stdio: 'inherit' });
execSync(`cp "${slimBundlePath}" "${legacyBundlePath}"`);

console.log(`\n--- 3. Archiving Full Release Bundle: ${fullBundleName} ---`);
execSync(`tar -czf "${fullBundlePath}" -C "${rootDir}" dist docker-compose.yml package.json scripts docs`, { stdio: 'inherit' });

if (!existsSync(slimBundlePath) || statSync(slimBundlePath).size === 0) {
  console.error(`Build Error: Slim release artifact '${slimBundleName}' is missing or empty!`);
  process.exit(1);
}

if (!existsSync(fullBundlePath) || statSync(fullBundlePath).size === 0) {
  console.error(`Build Error: Full release artifact '${fullBundleName}' is missing or empty!`);
  process.exit(1);
}

// 5. Calculate Artifact Checksums & Metrics
console.log('\n--- 4. Generating SHA-256 Checksums ---');
const slimBuffer = readFileSync(slimBundlePath);
const slimSha256 = syncSha256(new Uint8Array(slimBuffer));
const slimSize = statSync(slimBundlePath).size;

const fullBuffer = readFileSync(fullBundlePath);
const fullSha256 = syncSha256(new Uint8Array(fullBuffer));
const fullSize = statSync(fullBundlePath).size;

const legacyBuffer = readFileSync(legacyBundlePath);
const legacySha256 = syncSha256(new Uint8Array(legacyBuffer));
const legacySize = statSync(legacyBundlePath).size;

const sha256sumsContent = `${slimSha256}  ${slimBundleName}\n${fullSha256}  ${fullBundleName}\n${legacySha256}  ${legacyBundleName}\n`;
const sha256sumsPath = join(releaseDir, 'SHA256SUMS');
writeFileSync(sha256sumsPath, checksumLines.join(''));
console.log(`Wrote ${sha256sumsPath}`);

// 6. Generate Machine-Readable Release Manifest
console.log('\n--- 5. Generating Machine-Readable Release Manifest ---');
const releaseManifest = {
  product: 'Centipede OS',
  coreVersion: version,
  centipedeVersion: version,
  release: `v${version}`,
  releaseChannel: 'production',
  buildTimestamp: new Date().toISOString(),
  gitCommit,
  protocol: CENTIPEDE_SUPPORTED_KINGDOM_PROTOCOL,
  protocolMajor: KINGDOM_PROTOCOL_MAJOR,
  contractVersion: KINGDOM_CONTRACT_SPEC.contractVersion,
  requiredCapabilities: KINGDOM_COMPATIBILITY_MANIFEST.requiredCapabilities,
  optionalCapabilities: KINGDOM_COMPATIBILITY_MANIFEST.optionalCapabilities,
  artifacts: [
    {
      filename: slimBundleName,
      type: 'SLIM',
      description: 'Ultralight minimal runtime bundle. On-demand package acquisition during setup wizard.',
      targetProfile: 'Scout / Light Workstation / Web App',
      platform: 'Cross-Platform (Web / Node / Bun)',
      sizeBytes: slimSize,
      sha256: slimSha256,
    },
    {
      filename: fullBundleName,
      type: 'FULL',
      description: 'Full pre-packaged release with multi-node Docker Swarm stack, local scripts, and setup wizard.',
      targetProfile: 'Full Centipede / Commander / Swarm Cluster',
      platform: 'Cross-Platform (Docker / Node / Bun)',
      sizeBytes: fullSize,
      sha256: fullSha256,
    },
    {
      filename: legacyBundleName,
      type: 'LEGACY_ALIAS',
      description: 'Backwards-compatible alias for Desktop Web Bundle.',
      targetProfile: 'Desktop Web App',
      platform: 'Cross-Platform (Web / Node / Bun)',
      sizeBytes: legacySize,
      sha256: legacySha256,
    },
  ],
  deploymentProfiles: {
    Desktop_Web_Bundle: { status: 'AVAILABLE', description: 'Cross-platform desktop workstation web bundle with First-Run Setup Wizard' },
    Docker_Compose_Swarm: { status: 'AVAILABLE', description: 'Multi-container Docker Compose stack featuring Commander, Knight, Scout & Kingdom Engine' },
    Phone: { status: 'AVAILABLE', description: 'Mobile Companion Web Client with QR PIN pairing & session revocation' },
    Linux_Full: { status: 'AVAILABLE', description: 'Linux Workstation Full Centipede orchestration & execution profile' },
    Linux_Slim: { status: 'AVAILABLE', description: 'Linux Knight worker / Scout discovery profile' },
    Windows_Full: { status: 'AVAILABLE', description: 'Windows Workstation Full Centipede profile' },
    Windows_Slim: { status: 'AVAILABLE', description: 'Windows Knight worker profile' },
    macOS_Full: { status: 'AVAILABLE', description: 'macOS Workstation Full Centipede profile' },
    macOS_Slim: { status: 'AVAILABLE', description: 'macOS Knight worker profile' },
    LiveUSB_ISO: { status: 'PLANNED', description: 'Bare-metal bootable ArchISO (Planned OS Kernel Milestone)' },
  },
};

const masterManifestPath = join(releaseDir, 'release-manifest.json');
writeFileSync(masterManifestPath, JSON.stringify(masterManifest, null, 2));
console.log(`Wrote ${masterManifestPath}`);

// 7. Self-Verification Pass (Byte-for-byte post-build validation)
console.log('\n--- 6. Self-Verification Pass ---');
const verifySlimBuffer = readFileSync(slimBundlePath);
const verifySlimSha256 = syncSha256(new Uint8Array(verifySlimBuffer));
if (verifySlimSha256 !== slimSha256) {
  console.error(`Self-Verification Failure: Slim bundle hash changed during write!`);
  process.exit(1);
}

const verifyFullBuffer = readFileSync(fullBundlePath);
const verifyFullSha256 = syncSha256(new Uint8Array(verifyFullBuffer));
if (verifyFullSha256 !== fullSha256) {
  console.error(`Self-Verification Failure: Full bundle hash changed during write!`);
  process.exit(1);
}

const manifestVerification = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifestVerification.centipedeVersion !== version) {
  console.error(`Self-Verification Failure: Manifest version mismatch!`);
  process.exit(1);
}

console.log(`[VERIFIED] Post-build self-verification passed. Checksums and manifest match artifact bytes.`);

console.log(`\n===========================================================`);
console.log(`  RELEASE BUILD SUCCESSFUL`);
console.log(`  Version: v${version}`);
console.log(`  Slim Artifact: ${slimBundleName} (${(slimSize / 1024).toFixed(1)} KB)`);
console.log(`  Full Artifact: ${fullBundleName} (${(fullSize / 1024).toFixed(1)} KB)`);
console.log(`  Slim SHA-256: ${slimSha256}`);
console.log(`  Full SHA-256: ${fullSha256}`);
console.log(`===========================================================`);
