const SHA256_LINE = /^([a-f0-9]{64})\s+\*?(.+)$/i;

export function expectedArtifactSha256(checksumFile: string, artifactName: string): string | null {
  const matches = checksumFile.split(/\r?\n/).flatMap((line) => {
    const match = line.trim().match(SHA256_LINE);
    if (!match) return [];
    const listedName = match[2].replaceAll('\\', '/').split('/').at(-1);
    return listedName === artifactName ? [match[1].toLowerCase()] : [];
  });
  return matches.length === 1 ? matches[0] : null;
}
