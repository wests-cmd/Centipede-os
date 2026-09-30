import { KINGDOM_CONTRACT_SPEC, KINGDOM_COMPATIBILITY_MANIFEST } from './contractSpec';
import { KingdomRuntimeInfo, ProtocolVersion } from '../types';

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
  private protocolMajor = KINGDOM_COMPATIBILITY_MANIFEST.protocolMajor; // 1

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
        reason: `Kingdom protocol version is incompatible.`,
      };
    }

    // Check protocol major compatibility
    if (kingdomRuntime.protocol) {
      if (kingdomRuntime.protocol.major !== this.protocolMajor) {
        return {
          capability,
          status: 'INCOMPATIBLE',
          reason: `Kingdom protocol major v${kingdomRuntime.protocol.major} is incompatible with Centipede OS protocol v${this.protocolMajor}.`,
        };
      }
    }

    // Check runtime capabilities if supplied by Kingdom
    if (kingdomRuntime.capabilities) {
      const isAvailable = kingdomRuntime.capabilities[capability];
      if (isAvailable === false) {
        const isRequired = KINGDOM_COMPATIBILITY_MANIFEST.requiredCapabilities.includes(capability);
        if (isRequired) {
          return {
            capability,
            status: 'INCOMPATIBLE',
            reason: `Mandatory capability "${capability}" is disabled or unsupported by Kingdom.`,
          };
        }
        return {
          capability,
          status: 'UNSUPPORTED',
          reason: `Optional capability "${capability}" is unavailable on current Kingdom node. Feature degraded.`,
        };
      }
    }

    const knownSpec = KINGDOM_CONTRACT_SPEC.capabilities[capability];
    if (!knownSpec && (!kingdomRuntime.capabilities || !(capability in kingdomRuntime.capabilities))) {
      return {
        capability,
        status: 'UNKNOWN',
        reason: `Capability "${capability}" is not recognized in contract specification or Kingdom metadata.`,
      };
    }

    return {
      capability,
      status: 'SUPPORTED',
      reason: `Capability "${capability}" is fully supported and negotiated.`,
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
