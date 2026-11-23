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
    if (targetMeta.architecture !== currentArchitecture && targetMeta.architecture !== 'any') {
      return { allowed: false, reason: `ARCHITECTURE_MISMATCH: Target artifact built for ${targetMeta.architecture}, current system is ${currentArchitecture}` };
    }

    // 2. Core Version Compatibility Check
    if (!isCoreVersionSupported(targetMeta.minCoreVersion, currentCoreVersion)) {
      return { allowed: false, reason: `CORE_INCOMPATIBLE: Update requires Centipede Core >= ${targetMeta.minCoreVersion}, current core is ${currentCoreVersion}` };
    }

    // 3. Kingdom Protocol Compatibility Check
    if (!kingdomProtocolCompatible(targetMeta.requiredKingdomProtocol, currentKingdomProtocol)) {
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
    const targetInfo = latestManifest?.targets?.[target];
    const targetArtifact = Array.isArray(latestManifest?.artifacts)
      ? latestManifest.artifacts.find((a: any) => a && a.target === target) : null;

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
    // The canonical release manifest declares Kingdom compatibility under
    // "kingdom.protocol"; never invent a fallback protocol for an untrusted
    // or incomplete release manifest.
    const protocol = latestManifest.kingdom?.protocol;
    const architecture = targetInfo.architecture;
    const expectedArtifact = typeof targetInfo.artifact === 'string'
      ? targetInfo.artifact.replaceAll('{version}', latestCoreVersion) : null;
    if (typeof protocol !== 'string' || !/^v[0-9]+\.[0-9]+\+?$/.test(protocol) ||
        typeof architecture !== 'string' || !/^[A-Za-z0-9_/-]{1,32}$/.test(architecture) ||
        targetArtifact.filename !== expectedArtifact ||
        (targetArtifact.architecture !== undefined && targetArtifact.architecture !== architecture)) {
      return { updateAvailable: false, isCoreUpdate: false, metadata: null };
    }
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
    if (!isCoreUpdate && !isTargetUpdate) {
      return { updateAvailable: false, isCoreUpdate: false, metadata: null };
    }
    // A cross-core upgrade must explicitly declare the oldest supported
    // *installed* core. Using the new core version as a default wrongly
    // rejects all real upgrades (or tempts a caller to bypass the gate).
    const minCoreVersion = isCoreUpdate ? targetInfo.minCoreVersion : latestCoreVersion;
    const minCore = parseSemver(minCoreVersion);
    if (!minCore || compareSemver(installed, minCore) < 0 || compareSemver(latest, minCore) < 0) {
      return { updateAvailable: false, isCoreUpdate: false, metadata: null };
    }

    const metadata: TargetUpdateMetadata = {
      target,
      currentVersion: currentArtifactVersion,
      latestRevision,
      latestArtifactVersion,
      artifact: targetArtifact.filename,
      sha256: targetArtifact.sha256,
      downloadLocation: `/release/${target}/${targetArtifact.filename}`,
      minCoreVersion,
      requiredKingdomProtocol: protocol,
      architecture,
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

/** A release manifest may specify vMAJOR.MINOR+ (same major, at least MINOR)
 * or an exact vMAJOR.MINOR. An observed runtime version is NEVER a range. */
function kingdomProtocolCompatible(required: string, observed: string): boolean {
  if (typeof required !== 'string' || typeof observed !== 'string') return false;
  const expected = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)(\+)?$/.exec(required);
  const actual = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(observed);
  if (!expected || !actual) return false;
  const [requiredMajor, requiredMinor, actualMajor, actualMinor] = [
    Number(expected[1]), Number(expected[2]), Number(actual[1]), Number(actual[2]),
  ];
  if (![requiredMajor, requiredMinor, actualMajor, actualMinor].every(Number.isSafeInteger)) return false;
  return requiredMajor === actualMajor &&
    (expected[3] ? actualMinor >= requiredMinor : actualMinor === requiredMinor);
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
