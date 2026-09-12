import { KINGDOM_CONTRACT_SPEC, KingdomContractSpecification } from './contractSpec';

export type CapabilityStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'DEGRADED' | 'INCOMPATIBLE' | 'UNKNOWN';

export interface CapabilityNegotiationResult {
  capability: string;
  status: CapabilityStatus;
  reason?: string;
  requiresKingdomUpdate?: boolean;
}

export interface ContractDriftReport {
  contractVersion: string;
  detectedVersion: string | null;
  overallStatus: 'COMPATIBLE' | 'DEGRADED' | 'INCOMPATIBLE';
  capabilities: CapabilityNegotiationResult[];
  schemaDriftDetected: boolean;
  driftDetails: string[];
}

export class KingdomCapabilityNegotiator {
  private spec: KingdomContractSpecification = KINGDOM_CONTRACT_SPEC;

  public negotiateCapability(
    detectedKingdomVersion: string | null,
    capability: string,
    responseSample?: Record<string, any>
  ): CapabilityNegotiationResult {
    if (!detectedKingdomVersion) {
      return {
        capability,
        status: 'UNKNOWN',
        reason: 'Kingdom version unavailable or connection offline.',
      };
    }

    const clean = detectedKingdomVersion.replace(/^v/i, '').trim();
    const major = parseInt(clean.split('.')[0], 10) || 0;

    const minor = parseInt(clean.split('.')[1], 10) || 0;

    if (major < 40 || major > 40) {
      return {
        capability,
        status: 'INCOMPATIBLE',
        reason: `Kingdom major version v${clean} is unsupported (Requires v40.x). Privileged execution blocked.`,
        requiresKingdomUpdate: true,
      };
    }

    if (minor > 1) {
      return {
        capability,
        status: 'DEGRADED',
        reason: `Kingdom minor version v${clean} exceeds tested minor range (Tested up to v${this.spec.maxTestedKingdomVersion}).`,
      };
    }

    if (!this.spec.requiredCapabilities.includes(capability)) {
      return {
        capability,
        status: 'UNSUPPORTED',
        reason: `Capability "${capability}" is not defined in Kingdom contract v${this.spec.contractVersion}.`,
      };
    }

    if (responseSample && typeof responseSample === 'object') {
      // Check for expected schema drift
      if (responseSample.status === 'DEGRADED' || responseSample.degraded) {
        return {
          capability,
          status: 'DEGRADED',
          reason: `Capability "${capability}" is reporting DEGRADED execution mode from Kingdom.`,
        };
      }
    }

    return {
      capability,
      status: 'SUPPORTED',
    };
  }

  public evaluateContractDrift(detectedKingdomVersion: string | null, healthData?: Record<string, any>): ContractDriftReport {
    const capabilities: CapabilityNegotiationResult[] = this.spec.requiredCapabilities.map((cap) =>
      this.negotiateCapability(detectedKingdomVersion, cap, healthData)
    );

    const incompatible = capabilities.filter((c) => c.status === 'INCOMPATIBLE');
    const degraded = capabilities.filter((c) => c.status === 'DEGRADED');

    let overallStatus: 'COMPATIBLE' | 'DEGRADED' | 'INCOMPATIBLE' = 'COMPATIBLE';
    const driftDetails: string[] = [];

    if (incompatible.length > 0) {
      overallStatus = 'INCOMPATIBLE';
      driftDetails.push(`Major Kingdom version mismatch or incompatible endpoints detected: ${incompatible.length} capabilities blocked.`);
    } else if (degraded.length > 0) {
      overallStatus = 'DEGRADED';
      driftDetails.push(`${degraded.length} capabilities running in DEGRADED status.`);
    }

    return {
      contractVersion: this.spec.contractVersion,
      detectedVersion: detectedKingdomVersion,
      overallStatus,
      capabilities,
      schemaDriftDetected: driftDetails.length > 0,
      driftDetails,
    };
  }
}

export const kingdomCapabilityNegotiator = new KingdomCapabilityNegotiator();
