import { execFileSync } from 'node:child_process';
import pkg from '../package.json';
import attestation from '../release/ga-attestation.json';
import { requireReleaseEligibility } from '../src/platform/releaseGate';

const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const ref = process.env.GITHUB_REF || '';
const result = requireReleaseEligibility(ref, pkg.version, sha, attestation,
  process.env.CENTIPEDE_STABLE_RELEASE_APPROVED === 'true',
  process.env.CENTIPEDE_GA_APPROVED_SHA);
console.log('Release gate approved for', result.channel, result.tag, 'commit', sha);
