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

// 3. Prepare release directory
if (!existsSync(releaseDir)) {
  mkdirSync(releaseDir, { recursive: true });
}

// Get Git Commit SHA if available
let gitCommit = 'unknown';
try {
  gitCommit = execSync('git rev-parse HEAD').toString().trim();
} catch (e) {
  // Git unavailable fallback
}

// 4. Create Web Desktop Bundle Archive
const bundleName = `centipede-os-${version}-desktop-web-bundle.tar.gz`;
const bundlePath = join(releaseDir, bundleName);

console.log(`\n--- 2. Archiving Release Bundle: ${bundleName} ---`);
execSync(`tar -czf "${bundlePath}" -C "${rootDir}" dist`, { stdio: 'inherit' });

if (!existsSync(bundlePath) || statSync(bundlePath).size === 0) {
  console.error(`Build Error: Release artifact '${bundleName}' is missing or empty!`);
  process.exit(1);
}

// 5. Calculate Artifact Checksums & Metrics
console.log('\n--- 3. Generating SHA-256 Checksums ---');
const bundleBuffer = readFileSync(bundlePath);
const bundleSha256 = syncSha256(new Uint8Array(bundleBuffer));
const bundleSize = statSync(bundlePath).size;

const sha256sumsContent = `${bundleSha256}  ${bundleName}\n`;
const sha256sumsPath = join(releaseDir, 'SHA256SUMS');
writeFileSync(sha256sumsPath, sha256sumsContent);
console.log(`Wrote ${sha256sumsPath}`);

// 6. Generate Machine-Readable Release Manifest
console.log('\n--- 4. Generating Machine-Readable Release Manifest ---');
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
  artifacts: [
    {
      filename: bundleName,
      targetProfile: 'Desktop Web App / Commander / Knight',
      platform: 'Cross-Platform (Web / Node / Bun)',
      sizeBytes: bundleSize,
      sha256: bundleSha256,
    },
  ],
  deploymentProfiles: {
    Commander: { status: 'AVAILABLE', description: 'Full orchestration, swarm management & ZeroTrust authorization' },
    Knight: { status: 'AVAILABLE', description: 'Worker node executing assigned tasks & container workloads' },
    Scout: { status: 'AVAILABLE', description: 'Lightweight environment & capability discovery' },
    Ultralight: { status: 'AVAILABLE', description: 'Base install < 5.0 GB for Live USB & VM targets' },
    LiveUSB_ISO: { status: 'PLANNED', description: 'Bare-metal bootable ISO (Planned OS Kernel Milestone)' },
  },
};

const manifestPath = join(releaseDir, 'release-manifest.json');
writeFileSync(manifestPath, JSON.stringify(releaseManifest, null, 2));
console.log(`Wrote ${manifestPath}`);

console.log(`\n===========================================================`);
console.log(`  RELEASE BUILD SUCCESSFUL`);
console.log(`  Version: v${version}`);
console.log(`  Artifact: ${bundleName} (${(bundleSize / 1024).toFixed(1)} KB)`);
console.log(`  SHA-256: ${bundleSha256}`);
console.log(`===========================================================`);
