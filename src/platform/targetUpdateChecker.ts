import { syncSha256 } from '../security/cryptoUtils';

export interface TargetDescriptor {
  target: string;
  artifact: string;
  architecture: string;
  revision: number;
  status: 'AVAILABLE' | 'PLANNED' | 'BLOCKED';
  builder: string;
  validation: string;
  releaseChannel: string;
  updateStrategy: string;
  description: string;
}

export interface TargetUpdateManifest {
  product: string;
  coreVersion: string;
  target: string;
  targetRevision: number;
  artifact: string;
  architecture: string;
  gitCommit: string;
  buildTimestamp: string;
  sizeBytes: number;
  sha256: string;
  protocolMajor: number;
}

export interface UpdateVerificationResult {
  allowed: boolean;
  reason?: string;
  updateType?: 'CORE_UPDATE' | 'TARGET_REVISION_UPDATE' | 'MOBILE_STORE_REDIRECT' | 'NO_UPDATE_REQUIRED';
}

export class TargetUpdateChecker {
  public parseTargetTag(tag: string): { coreVersion: string; target: string; revision: number } | null {
    const match = tag.match(/^v(\d+\.\d+\.\d+)-([a-z0-9-]+)\.(\d+)$/);
    if (!match) return null;
    return {
      coreVersion: match[1],
      target: match[2],
      revision: parseInt(match[3], 10),
    };
  }

  public verifyTargetUpdate(
    currentCoreVersion: string,
    currentRevision: number,
    targetManifest: TargetUpdateManifest,
    artifactBytes?: Uint8Array
  ): UpdateVerificationResult {
    // 1. Core Version Alignment
    if (targetManifest.coreVersion !== currentCoreVersion) {
      return {
        allowed: true,
        updateType: 'CORE_UPDATE',
        reason: `Core Centipede version upgrade detected: ${currentCoreVersion} -> ${targetManifest.coreVersion}`,
      };
    }

    // 2. Revision Isolation Check
    if (targetManifest.targetRevision <= currentRevision) {
      return {
        allowed: false,
        updateType: 'NO_UPDATE_REQUIRED',
        reason: `Current target revision (${currentRevision}) is up to date with candidate revision (${targetManifest.targetRevision}).`,
      };
    }

    // 3. Binary Byte Integrity Validation if payload supplied
    if (artifactBytes && artifactBytes.length > 0) {
      const calculatedHash = syncSha256(artifactBytes);
      if (calculatedHash !== targetManifest.sha256) {
        return {
          allowed: false,
          reason: `CHECKSUM_MISMATCH: Artifact SHA-256 hash (${calculatedHash}) does not match manifest hash (${targetManifest.sha256}).`,
        };
      }
    }

    // 4. Mobile Target Strategy Handling
    if (targetManifest.target === 'android' || targetManifest.target === 'ios') {
      return {
        allowed: true,
        updateType: 'MOBILE_STORE_REDIRECT',
        reason: `Native mobile update available via app marketplace/store installer (${targetManifest.artifact}).`,
      };
    }

    return {
      allowed: true,
      updateType: 'TARGET_REVISION_UPDATE',
      reason: `Target revision update approved: revision ${currentRevision} -> ${targetManifest.targetRevision}`,
    };
  }
}

export const targetUpdateChecker = new TargetUpdateChecker();
