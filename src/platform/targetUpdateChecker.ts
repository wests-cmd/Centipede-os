export type TargetName = 'desktop' | 'iso' | 'live-usb' | 'vm' | 'android' | 'ios' | 'docker';

export interface TargetUpdateMetadata {
  target: TargetName;
  currentVersion: string; // e.g. "1.0.0+iso.1"
  latestRevision: number; // e.g. 2
  latestArtifactVersion: string; // e.g. "1.0.0+iso.2"
  artifact: string;
  sha256: string;
  downloadLocation: string;
  minCoreVersion: string;
  requiredKingdomProtocol: string;
  architecture: string;
  releaseDate: string;
  mobileStoreUpdateRequired?: boolean;
}

export interface CompatibilityGateResult {
  allowed: boolean;
  reason?: string;
}

export class TargetUpdateChecker {
  public static parseArtifactVersion(versionString: string): { coreVersion: string; target: TargetName; revision: number } | null {
    const match = versionString.match(/^(\d+\.\d+\.\d+)\+([a-z-]+)\.([1-9]\d*)$/);
    const validTargets: TargetName[] = ['desktop', 'iso', 'live-usb', 'vm', 'android', 'ios', 'docker'];
    if (!match || !parseSemver(match[1]) || !validTargets.includes(match[2] as TargetName)) return null;
    const revision = Number.parseInt(match[3], 10);
    if (!Number.isSafeInteger(revision) || revision < 1) return null;
    return { coreVersion: match[1], target: match[2] as TargetName, revision };
  }

  public static verifyCompatibilityGate(
    targetMeta: TargetUpdateMetadata,
    currentCoreVersion: string,
    currentKingdomProtocol: string,
    currentArchitecture: string,
    providedSha256: string
  ): CompatibilityGateResult {
    // 1. Architecture Check
    if (targetMeta.architecture !== currentArchitecture && currentArchitecture !== 'any') {
      return { allowed: false, reason: `ARCHITECTURE_MISMATCH: Target artifact built for ${targetMeta.architecture}, current system is ${currentArchitecture}` };
    }

    // 2. Core Version Compatibility Check
    if (!isCoreVersionSupported(targetMeta.minCoreVersion, currentCoreVersion)) {
      return { allowed: false, reason: `CORE_INCOMPATIBLE: Update requires Centipede Core >= ${targetMeta.minCoreVersion}, current core is ${currentCoreVersion}` };
    }

    // 3. Kingdom Protocol Compatibility Check
    if (targetMeta.requiredKingdomProtocol !== currentKingdomProtocol) {
      return { allowed: false, reason: `KINGDOM_PROTOCOL_INCOMPATIBLE: Update requires Kingdom protocol ${targetMeta.requiredKingdomProtocol}, current is ${currentKingdomProtocol}` };
    }

    // 4. SHA256 Checksum Verification
    if (typeof targetMeta.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(targetMeta.sha256) ||
        typeof providedSha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(providedSha256) ||
        targetMeta.sha256.toLowerCase() !== providedSha256.toLowerCase()) {
      return { allowed: false, reason: `CHECKSUM_MISMATCH: Provided SHA-256 ${providedSha256} does not match manifest ${targetMeta.sha256}` };
    }

    return { allowed: true };
  }

  public static checkTargetUpdateAvailable(
    target: TargetName,
    currentArtifactVersion: string,
    latestManifest: any
  ): { updateAvailable: boolean; isCoreUpdate: boolean; metadata: TargetUpdateMetadata | null } {
    const parsedCurrent = this.parseArtifactVersion(currentArtifactVersion);
    const targetInfo = latestManifest.targets?.[target];
    const targetArtifact = latestManifest.artifacts?.find((a: any) => a.target === target);

    // A missing/invalid installed identity must never be treated as eligible for
    // update. Malformed manifests and blocked mobile release targets fail closed.
    if (!parsedCurrent || parsedCurrent.target !== target || !targetInfo || !targetArtifact ||
      targetInfo.status !== 'BUILDABLE' || typeof latestManifest.coreVersion !== 'string' ||
      typeof targetArtifact.filename !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{1,180}$/.test(targetArtifact.filename) ||
      typeof targetArtifact.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(targetArtifact.sha256)) {
      return { updateAvailable: false, isCoreUpdate: false, metadata: null };
    }
    const latestRevision = targetInfo.revision;
    const latestCoreVersion = latestManifest.coreVersion;
    const latest = parseSemver(latestCoreVersion);
    const installed = parseSemver(parsedCurrent.coreVersion);
    if (!Number.isSafeInteger(latestRevision) || latestRevision < 1 || !latest || !installed) {
      return { updateAvailable: false, isCoreUpdate: false, metadata: null };
    }
    const latestArtifactVersion = `${latestCoreVersion}+${target}.${latestRevision}`;
    // Do not offer downgrades. Revision numbers compare only inside the
    // *same core version*; resetting a revision in a newer core is valid.
    const comparison = compareSemver(latest, installed);
    const isCoreUpdate = comparison > 0;
    const isTargetUpdate = comparison === 0 && latestRevision > parsedCurrent.revision;

    const metadata: TargetUpdateMetadata = {
      target,
      currentVersion: currentArtifactVersion,
      latestRevision,
      latestArtifactVersion,
      artifact: targetArtifact.filename,
      sha256: targetArtifact.sha256,
      downloadLocation: `/release/${target}/${targetArtifact.filename}`,
      minCoreVersion: latestCoreVersion,
      requiredKingdomProtocol: latestManifest.protocol || 'v1.0+',
      architecture: targetMetaArch(target),
      releaseDate: latestManifest.buildTimestamp || new Date().toISOString(),
      mobileStoreUpdateRequired: target === 'android' || target === 'ios',
    };

    return {
      updateAvailable: isCoreUpdate || isTargetUpdate,
      isCoreUpdate,
      metadata,
    };
  }
}

function targetMetaArch(target: TargetName): string {
  switch (target) {
    case 'android':
      return 'arm64-v8a';
    case 'ios':
      return 'arm64';
    default:
      return 'x86_64';
  }
}

function parseSemver(v: string): [number, number, number] | null {
  if (typeof v !== 'string') return null;
  const clean = v.replace(/^v/, '').split('+', 1)[0];
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(clean);
  if (!match) return null;
  const numbers = match.slice(1).map(Number);
  return numbers.every(Number.isSafeInteger) ? numbers as [number, number, number] : null;
}

function compareSemver(a: [number, number, number], b: [number, number, number]): number {
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function isCoreVersionSupported(minVersion: string, currentVersion: string): boolean {
  const min = parseSemver(minVersion);
  const cur = parseSemver(currentVersion);
  return Boolean(min && cur && compareSemver(cur, min) >= 0);
}
