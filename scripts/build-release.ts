import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import { syncSha256 } from '../src/security/cryptoUtils';
import packageJson from '../package.json';
import { KINGDOM_PROTOCOL_MAJOR, CENTIPEDE_SUPPORTED_KINGDOM_PROTOCOL } from '../src/version';
import { KINGDOM_COMPATIBILITY_MANIFEST, KINGDOM_CONTRACT_SPEC } from '../src/api/contractSpec';

const rootDir = process.cwd();
const releaseDir = join(rootDir, 'release');
const distDir = join(rootDir, 'dist');
const version = packageJson.version || '1.0.0';

console.log(`===========================================================`);
console.log(`  CENTIPEDE OS RELEASE BUILDER — v${version}`);
console.log(`===========================================================`);

// 1. Tag / Version Consistency Validation
const expectedTag = `v${version}`;
const currentRef = process.env.GITHUB_REF || '';

if (currentRef.startsWith('refs/tags/')) {
  const actualTag = currentRef.replace('refs/tags/', '');
  if (actualTag !== expectedTag) {
    console.error(`\n[RELEASE BUILD ERROR] Tag/Version mismatch! Tag is '${actualTag}' but package.json version is '${version}' (expected '${expectedTag}'). Aborting release.`);
    process.exit(1);
  }
  console.log(`[VERIFIED] Git Tag '${actualTag}' matches package.json version '${version}'.`);
}

// 2. Ensure clean dist build
console.log('\n--- 1. Building Production Web Bundle ---');
const nodeBinPath = join(rootDir, 'node_modules', '.bin');
const envWithPath = {
  ...process.env,
  PATH: `${nodeBinPath}:${process.env.PATH || ''}`,
};
execSync('bun run build', { stdio: 'inherit', env: envWithPath });

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
  // Git unavailable fallback
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
writeFileSync(sha256sumsPath, sha256sumsContent);
console.log(`Wrote ${sha256sumsPath}`);

// 6. Read Authoritative Target Configuration and Generate Release Manifest
console.log('\n--- 5. Reading Checked-in Target Configuration & Manifest Generation ---');
const targetsSpecPath = join(rootDir, 'release', 'targets.json');
let targetsSpec: any = {};
if (existsSync(targetsSpecPath)) {
  targetsSpec = JSON.parse(readFileSync(targetsSpecPath, 'utf8'));
}

const releaseManifest = {
  product: 'Centipede OS',
  centipedeVersion: version,
  releaseChannel: 'production',
  buildTimestamp: new Date().toISOString(),
  gitCommit,
  protocol: CENTIPEDE_SUPPORTED_KINGDOM_PROTOCOL,
  protocolMajor: KINGDOM_PROTOCOL_MAJOR,
  contractVersion: KINGDOM_CONTRACT_SPEC.contractVersion,
  requiredCapabilities: KINGDOM_COMPATIBILITY_MANIFEST.requiredCapabilities,
  optionalCapabilities: KINGDOM_COMPATIBILITY_MANIFEST.optionalCapabilities,
  targetsSpec: targetsSpec.targets || {},
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

const manifestPath = join(releaseDir, 'release-manifest.json');
writeFileSync(manifestPath, JSON.stringify(releaseManifest, null, 2));
console.log(`Wrote ${manifestPath}`);

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
