import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import packageJson from '../package.json';
import releaseConfig from '../release/targets.json';
import { releaseIdentityFromRef } from '../src/platform/releaseTag';

const root = process.cwd();
const releaseDir = join(root, 'release');
const version = packageJson.version;
const targetArg = process.argv.find((arg) => arg.startsWith('--target='))?.slice('--target='.length) ?? 'desktop';
const targets = releaseConfig.targets as Record<string, { status: string; revision: number; artifact?: string; architecture: string; reason?: string }>;
const target = targets[targetArg];
if (!target) throw new Error(`Unknown release target: ${targetArg}`);
if (target.status !== 'BUILDABLE') throw new Error(`Release target ${targetArg} is ${target.status}: ${target.reason ?? 'not buildable'}`);
if (targetArg !== 'desktop') throw new Error('This builder only produces the desktop web bundle; platform-builds.yml owns ISO, USB, VM, mobile, and Docker builds.');
if (!target.artifact) throw new Error(`No artifact name is configured for ${targetArg}.`);

const ref = process.env.GITHUB_REF ?? '';
const releaseIdentity = releaseIdentityFromRef(ref, version);
if (releaseIdentity.channel === 'stable' && execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) {
  throw new Error('Stable release builds require a clean committed source tree.');
}

execFileSync('bun', ['run', 'build'], { cwd: root, stdio: 'inherit' });
if (!existsSync(join(root, 'dist', 'index.html'))) throw new Error('The web build did not produce dist/index.html.');
const targetDir = join(releaseDir, targetArg);
rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
const artifactName = target.artifact.replaceAll('{version}', version);
if (basename(artifactName) !== artifactName) throw new Error('Unsafe artifact name in release/targets.json.');
const artifactPath = resolve(targetDir, artifactName);
if (!artifactPath.startsWith(`${resolve(releaseDir)}${sep}${targetArg}${sep}`)) throw new Error('Unsafe release artifact path.');
execFileSync('tar', ['-czf', artifactPath, '-C', root, 'dist'], { cwd: root, stdio: 'inherit' });
if (!existsSync(artifactPath) || statSync(artifactPath).size === 0) throw new Error(`Desktop artifact is missing or empty: ${artifactPath}`);
const digest = createHash('sha256').update(readFileSync(artifactPath)).digest('hex');
console.log(`Built desktop artifact ${artifactName} (sha256 ${digest}). Checksums and manifests are emitted only by create-platform-release-manifest.ts.`);
