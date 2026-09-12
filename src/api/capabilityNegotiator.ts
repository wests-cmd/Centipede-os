import { KINGDOM_CONTRACT_SPEC } from './contractSpec';
import { KingdomRuntimeInfo, RuntimeStatus } from '../types';

export type CapabilityNegotiationStatus =
  | 'SUPPORTED'
  | 'UNSUPPORTED'
  | 'DEGRADED'
  | 'INCOMPATIBLE'
  | 'UNKNOWN'
  | 'REQUIRES_UPDATE';

export interface CapabilityNegotiationResult {
  capability: string;
  status: CapabilityNegotiationStatus;
  reason: string;
  requiredMinVersion?: string;
}

export class CapabilityNegotiator {
  private minSupportedVersion = KINGDOM_CONTRACT_SPEC.minSupportedKingdomVersion; // '40.0.0'
  private maxTestedVersion = KINGDOM_CONTRACT_SPEC.maxTestedKingdomVersion; // '40.1.9'

  public evaluateCapability(
    capability: string,
    kingdomRuntime: KingdomRuntimeInfo
  ): CapabilityNegotiationResult {
    if (kingdomRuntime.connectionState === 'DISCONNECTED' || kingdomRuntime.connectionState === 'CONNECTING') {
      return {
        capability,
        status: 'DEGRADED',
        reason: 'Kingdom server is offline or connecting. Privileged execution unavailable.',
      };
    }

    if (kingdomRuntime.connectionState === 'VERSION_INCOMPATIBLE') {
      return {
        capability,
        status: 'INCOMPATIBLE',
        reason: `Kingdom version ${kingdomRuntime.connectedKingdomVersion || 'unknown'} is incompatible.`,
      };
    }

    if (!KINGDOM_CONTRACT_SPEC.capabilities[capability]) {
      return {
        capability,
        status: 'UNKNOWN',
        reason: `Capability "${capability}" is not recognized in current contract specification.`,
      };
    }

    const version = kingdomRuntime.connectedKingdomVersion;
    if (!version) {
      return {
        capability,
        status: 'UNKNOWN',
        reason: 'Kingdom version header missing or unverified.',
      };
    }

    // Evaluate semver version logic
    const clean = version.trim().replace(/^v/i, '');
    const parts = clean.split('.').map((p) => parseInt(p, 10) || 0);
    const major = parts[0] || 0;
    const minor = parts[1] || 0;

    if (major < 40) {
      return {
        capability,
        status: 'INCOMPATIBLE',
        reason: `Kingdom major version v${clean} is older than minimum supported v${this.minSupportedVersion}.`,
        requiredMinVersion: this.minSupportedVersion,
      };
    }

    if (major > 40) {
      return {
        capability,
        status: 'REQUIRES_UPDATE',
        reason: `Kingdom major version v${clean} requires Centipede OS update.`,
      };
    }

    // Major is 40
    if (minor > 1) {
      return {
        capability,
        status: 'SUPPORTED',
        reason: `Kingdom v${clean} supports "${capability}" (Exceeds tested minor range v${this.maxTestedVersion}).`,
      };
    }

    return {
      capability,
      status: 'SUPPORTED',
      reason: `Capability "${capability}" is fully supported on Kingdom v${clean}.`,
    };
  }

  public validateResponseSchema(
    endpointName: string,
    responsePayload: Record<string, any>
  ): { valid: boolean; missingFields: string[] } {
    const spec = KINGDOM_CONTRACT_SPEC.endpoints[endpointName];
    if (!spec || !spec.responseRequiredFields) {
      return { valid: true, missingFields: [] };
    }

    const missingFields: string[] = [];
    if (!responsePayload || typeof responsePayload !== 'object') {
      return { valid: false, missingFields: spec.responseRequiredFields };
    }

    for (const field of spec.responseRequiredFields) {
      if (!(field in responsePayload) || responsePayload[field] === undefined) {
        missingFields.push(field);
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }
}

export const capabilityNegotiator = new CapabilityNegotiator();
