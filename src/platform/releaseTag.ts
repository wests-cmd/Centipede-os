export type ReleaseChannel = 'stable' | 'candidate';

export interface ReleaseIdentity {
  releaseTag: string;
  channel: ReleaseChannel;
}

/** Resolve a build ref to the single core-version release identity. */
export function releaseIdentityFromRef(ref: string, version: string): ReleaseIdentity {
  const stableTag = `v${version}`;
  if (!ref.startsWith('refs/tags/')) return { releaseTag: stableTag, channel: 'candidate' };

  const releaseTag = ref.slice('refs/tags/'.length);
  if (releaseTag === stableTag) return { releaseTag, channel: 'stable' };

  const candidatePrefix = `${stableTag}-rc.`;
  if (releaseTag.startsWith(candidatePrefix) && /^\d+$/.test(releaseTag.slice(candidatePrefix.length))) {
    return { releaseTag, channel: 'candidate' };
  }

  throw new Error(`Release tag ${releaseTag} does not match core version ${stableTag} or a numbered release candidate.`);
}
