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

const TARGETS: TargetName[] = ['desktop', 'iso', 'live-usb', 'vm', 'android', 'ios', 'docker'];
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const CORE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCoreVersion(version: unknown): [number, number, number] | null {
  if (typeof version !== 'string') return null;
  const match = version.match(CORE_VERSION_PATTERN);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => !Number.isSafeInteger(part))) return null;
  return parts as [number, number, number];
}

function compareVersions(left: [number, number, number], right: [number, number, number]): number {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  }
  return 0;
}

function isSafeArtifactFilename(filename: unknown): filename is string {
  return typeof filename === 'string'
    && /^[A-Za-z0-9][A-Za-z0-9._+-]{0,254}$/.test(filename)
    && filename !== '.'
    && filename !== '..'
    && !filename.includes('..');
}

export class TargetUpdateChecker {
  public static parseArtifactVersion(versionString: string): { coreVersion: string; target: TargetName; revision: number } | null {
    if (typeof versionString !== 'string') return null;
    const match = versionString.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)\+([a-z-]+)\.([1-9]\d*)$/);
    if (!match || !TARGETS.includes(match[4] as TargetName)) return null;
    if (match.slice(1, 4).some((part) => !Number.isSafeInteger(Number(part)))) return null;
    const targetRevision = Number.parseInt(match[5], 10);
    if (!Number.isSafeInteger(targetRevision) || targetRevision < 1) return null;
    return { coreVersion: `${match[1]}.${match[2]}.${match[3]}`, target: match[4] as TargetName, revision: targetRevision };
  }

  public static verifyCompatibilityGate(
    targetMeta: TargetUpdateMetadata,
    currentCoreVersion: string,
    currentKingdomProtocol: string,
    currentArchitecture: string,
    providedSha256: string
  ): CompatibilityGateResult {
    if (!targetMeta || typeof targetMeta !== 'object'
      || typeof currentKingdomProtocol !== 'string'
      || typeof currentArchitecture !== 'string'
      || typeof providedSha256 !== 'string') {
      return { allowed: false, reason: 'INVALID_UPDATE_METADATA: Required update metadata is malformed or inconsistent' };
    }
    const currentArtifact = this.parseArtifactVersion(targetMeta.currentVersion);
    const latestArtifact = this.parseArtifactVersion(targetMeta.latestArtifactVersion);
    const currentArtifactCore = parseCoreVersion(currentArtifact?.coreVersion);
    const currentCore = parseCoreVersion(currentCoreVersion);
    const minimumCore = parseCoreVersion(targetMeta.minCoreVersion);
    if (!TARGETS.includes(targetMeta.target)
      || !currentArtifact || currentArtifact.target !== targetMeta.target
      || !latestArtifact || latestArtifact.target !== targetMeta.target
      || latestArtifact.coreVersion !== targetMeta.minCoreVersion
      || latestArtifact.revision !== targetMeta.latestRevision
      || !currentArtifactCore || !currentCore || !minimumCore
      || compareVersions(currentArtifactCore, currentCore) !== 0
      || !isSafeArtifactFilename(targetMeta.artifact)
      || typeof targetMeta.sha256 !== 'string'
      || !SHA256_PATTERN.test(targetMeta.sha256)
      || !SHA256_PATTERN.test(providedSha256)
      || typeof targetMeta.requiredKingdomProtocol !== 'string'
      || !targetMeta.requiredKingdomProtocol.trim()
      || typeof targetMeta.architecture !== 'string'
      || !targetMeta.architecture.trim()) {
      return { allowed: false, reason: 'INVALID_UPDATE_METADATA: Required update metadata is malformed or inconsistent' };
    }

    const coreOrder = compareVersions(minimumCore, currentCore);
    if (coreOrder < 0 || (coreOrder === 0 && latestArtifact.revision <= currentArtifact.revision)) {
      return { allowed: false, reason: 'DOWNGRADE_OR_REPLAY: Update does not advance the installed target identity' };
    }

    // 1. Architecture Check
    if (targetMeta.architecture !== 'any' && currentArchitecture !== 'any' && targetMeta.architecture !== currentArchitecture) {
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
      return { allowed: false, reason: 'CHECKSUM_MISMATCH: Downloaded artifact does not match the manifest SHA-256' };
    }

    return { allowed: true };
  }

  public static checkTargetUpdateAvailable(
    target: TargetName,
    currentArtifactVersion: string,
    latestManifest: unknown
  ): { updateAvailable: boolean; isCoreUpdate: boolean; metadata: TargetUpdateMetadata | null } {
    const parsedCurrent = this.parseArtifactVersion(currentArtifactVersion);
    if (!TARGETS.includes(target) || !parsedCurrent || parsedCurrent.target !== target || !isRecord(latestManifest)) {
      return { updateAvailable: false, isCoreUpdate: false, metadata: null };
    }

    const latestCore = parseCoreVersion(latestManifest.coreVersion);
    const currentCore = parseCoreVersion(parsedCurrent.coreVersion);
    const targetInfo = isRecord(latestManifest.targets) ? latestManifest.targets[target] : null;
    const matchingArtifacts = Array.isArray(latestManifest.artifacts)
      ? latestManifest.artifacts.filter((artifact: unknown): artifact is Record<string, unknown> => isRecord(artifact) && artifact.target === target)
      : [];
    if (!latestCore || !currentCore || !isRecord(targetInfo) || targetInfo.status !== 'BUILDABLE'
      || typeof targetInfo.revision !== 'number' || !Number.isSafeInteger(targetInfo.revision) || targetInfo.revision < 1
      || matchingArtifacts.length !== 1) {
      return { updateAvailable: false, isCoreUpdate: false, metadata: null };
    }

    const targetArtifact = matchingArtifacts[0];
    const latestCoreVersion = latestManifest.coreVersion as string;
    const latestRevision = targetInfo.revision as number;
    const latestArtifactVersion = `${latestCoreVersion}+${target}.${latestRevision}`;
    const latestArtifact = this.parseArtifactVersion(latestArtifactVersion);
    const expectedFilename = typeof targetInfo.artifact === 'string'
      ? targetInfo.artifact.replaceAll('{version}', latestCoreVersion)
      : '';
    const protocol = isRecord(latestManifest.kingdom) ? latestManifest.kingdom.protocol : null;
    const architecture = targetArtifact.architecture ?? targetInfo.architecture;
    if (!latestArtifact
      || targetArtifact.targetRevision !== latestRevision
      || targetArtifact.coreVersion !== latestCoreVersion
      || targetArtifact.artifactVersion !== latestArtifactVersion
      || !isSafeArtifactFilename(targetArtifact.filename)
      || !isSafeArtifactFilename(expectedFilename)
      || targetArtifact.filename !== expectedFilename
      || targetArtifact.relativePath !== `${target}/${targetArtifact.filename}`
      || typeof targetArtifact.sha256 !== 'string'
      || !SHA256_PATTERN.test(targetArtifact.sha256)
      || typeof targetArtifact.sizeBytes !== 'number'
      || !Number.isSafeInteger(targetArtifact.sizeBytes) || targetArtifact.sizeBytes <= 0
      || typeof protocol !== 'string' || !protocol.trim()
      || typeof architecture !== 'string' || !architecture.trim()
      || (typeof targetInfo.architecture === 'string' && typeof targetArtifact.architecture === 'string' && targetInfo.architecture !== targetArtifact.architecture)) {
      return { updateAvailable: false, isCoreUpdate: false, metadata: null };
    }

    const coreOrder = compareVersions(latestCore, currentCore);
    if (coreOrder < 0) return { updateAvailable: false, isCoreUpdate: false, metadata: null };
    const isCoreUpdate = coreOrder > 0;
    const isTargetUpdate = coreOrder === 0 && parsedCurrent.revision < latestRevision;
    if (!isCoreUpdate && !isTargetUpdate) return { updateAvailable: false, isCoreUpdate: false, metadata: null };

    const metadata: TargetUpdateMetadata = {
      target,
      currentVersion: currentArtifactVersion,
      latestRevision,
      latestArtifactVersion,
      artifact: targetArtifact.filename as string,
      sha256: (targetArtifact.sha256 as string).toLowerCase(),
      downloadLocation: `https://github.com/wests-cmd/Centipede-os/releases/download/v${latestCoreVersion}/${targetArtifact.filename}`,
      minCoreVersion: latestCoreVersion,
      requiredKingdomProtocol: protocol as string,
      architecture: architecture as string,
      releaseDate: typeof latestManifest.publishedAt === 'string' ? latestManifest.publishedAt : 'unknown',
      mobileStoreUpdateRequired: target === 'android' || target === 'ios',
    };

    return {
      updateAvailable: isCoreUpdate || isTargetUpdate,
      isCoreUpdate,
      metadata,
    };
  }
}

function isCoreVersionSupported(minVersion: string, currentVersion: string): boolean {
  const min = parseCoreVersion(minVersion);
  const current = parseCoreVersion(currentVersion);
  return Boolean(min && current && compareVersions(current, min) >= 0);
}
