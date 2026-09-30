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
    const match = versionString.match(/^(\d+\.\d+\.\d+)\+([a-z-]+)\.(\d+)$/);
    const validTargets: TargetName[] = ['desktop', 'iso', 'live-usb', 'vm', 'android', 'ios', 'docker'];
    if (!match || !validTargets.includes(match[2] as TargetName)) return null;
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
    if (targetMeta.sha256.toLowerCase() !== providedSha256.toLowerCase()) {
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

    if (!targetInfo || !targetArtifact || typeof latestManifest.coreVersion !== 'string') {
      return { updateAvailable: false, isCoreUpdate: false, metadata: null };
    }

    const latestRevision = targetInfo.revision || 1;
    const latestCoreVersion = latestManifest.coreVersion;
    const latestArtifactVersion = `${latestCoreVersion}+${target}.${latestRevision}`;

    const isCoreUpdate = parsedCurrent ? parsedCurrent.coreVersion !== latestCoreVersion : false;
    const isTargetUpdate = parsedCurrent ? parsedCurrent.revision < latestRevision : false;

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

function parseSemver(v: string): [number, number, number] {
  const clean = v.replace(/^v/, '').split('+')[0];
  const parts = clean.split('.').map((p) => parseInt(p, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function isCoreVersionSupported(minVersion: string, currentVersion: string): boolean {
  const min = parseSemver(minVersion);
  const cur = parseSemver(currentVersion);
  if (cur[0] !== min[0]) return cur[0] > min[0];
  if (cur[1] !== min[1]) return cur[1] > min[1];
  return cur[2] >= min[2];
}
