export type ReleaseChannel = 'stable' | 'candidate';
export interface Attestation {
  approved: boolean;
  version: string | null;
  commit: string | null;
  evidenceUrl: string | null;
  approvedBy: string | null;
}
/**
 * Stable publication is never inferred from a passing build. A pre-release
 * channel must have an explicit -rc.N suffix, and cannot become Latest.
 */
export function classifyReleaseRef(ref: string, coreVersion: string): {
  channel: ReleaseChannel; tag: string; tagged: boolean;
} {
  if (!/^\d+\.\d+\.\d+$/.test(coreVersion)) throw Error('Invalid core package version.');
  const stableTag = 'v' + coreVersion;
  if (!ref || !ref.startsWith('refs/tags/'))
    return { channel: 'candidate', tag: stableTag + '-unpublished', tagged: false };
  const tag = ref.slice('refs/tags/'.length);
  if (tag === stableTag) return { channel: 'stable', tag, tagged: true };
  if (new RegExp('^' + stableTag.replaceAll('.', '\\.') + '-rc\\.[1-9]\\d*$').test(tag))
    return { channel: 'candidate', tag, tagged: true };
  throw Error('Release tag must match the current core version exactly or end in -rc.N.');
}
export function requireReleaseEligibility(
  ref: string, version: string, commit: string, attestation: Attestation,
  stableApproved: boolean,
): { channel: ReleaseChannel; tag: string; tagged: boolean } {
  const identity = classifyReleaseRef(ref, version);
  if (!identity.tagged) throw Error('A verified Git tag is required to publish a release.');
  if (identity.channel === 'stable') {
    if (!stableApproved || !attestation.approved || attestation.version !== version ||
      attestation.commit !== commit ||
      typeof attestation.approvedBy !== 'string' || !/^[A-Za-z0-9_-]{2,40}$/.test(attestation.approvedBy) ||
      typeof attestation.evidenceUrl !== 'string' ||
      !/^https:\/\/github\.com\/wests-cmd\/Centipede-os\/issues\/150(?:#issuecomment-\d+)?$/.test(attestation.evidenceUrl)) {
      throw Error('Stable GA publication blocked: physical hardware, owner approvals and issue #150 evidence must be attested for this exact commit.');
    }
  }
  return identity;
}
