export interface CapabilityGrant {
  grantId: string;
  agentId: string;
  capabilityId: string;
  resourceScope: string;
  parameterHash?: string;
  issuedAt: number;
  expiresAt: number;
  approvalId?: string;
  isExpired: boolean;
  consumed: boolean;
  revoked: boolean;
}

export class CapabilityGrantEngine {
  private grants: Map<string, CapabilityGrant> = new Map();

  public issueJustInTimeGrant(
    agentId: string,
    capabilityId: string,
    resourceScope: string,
    ttlMs = 600000, // 10 mins JIT TTL
    approvalId?: string,
    parameterHash?: string
  ): CapabilityGrant {
    const grantId = `grant_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const grant: CapabilityGrant = {
      grantId,
      agentId,
      capabilityId,
      resourceScope,
      parameterHash,
      issuedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      approvalId,
      isExpired: false,
      consumed: false,
      revoked: false,
    };

    this.grants.set(grantId, grant);
    return grant;
  }

  public revokeGrant(grantId: string): boolean {
    const grant = this.grants.get(grantId);
    if (grant) {
      grant.revoked = true;
      return true;
    }
    return false;
  }

  public verifyCapabilityGrant(
    grantId: string,
    capabilityId: string,
    requestedResource: string,
    requestParameterHash?: string,
    consumeOnUse = true
  ): { valid: boolean; error?: string } {
    const grant = this.grants.get(grantId);
    if (!grant) {
      return { valid: false, error: 'GRANT_NOT_FOUND: No active JIT capability grant found.' };
    }

    if (grant.revoked) {
      return { valid: false, error: 'GRANT_REVOKED: Capability grant has been explicitly revoked.' };
    }

    if (grant.consumed) {
      return { valid: false, error: 'GRANT_ALREADY_CONSUMED: Capability grant was already single-use consumed.' };
    }

    if (grant.expiresAt < Date.now()) {
      grant.isExpired = true;
      return { valid: false, error: 'GRANT_EXPIRED: Capability grant has expired.' };
    }

    if (grant.capabilityId !== capabilityId) {
      return { valid: false, error: `CAPABILITY_MISMATCH: Grant capability "${grant.capabilityId}" does not match requested capability "${capabilityId}".` };
    }

    if (grant.parameterHash && requestParameterHash && grant.parameterHash !== requestParameterHash) {
      return { valid: false, error: 'PARAMETER_HASH_TAMPERED: Request parameters do not match authorized grant parameter hash.' };
    }

    // Resource scope boundary check
    if (grant.resourceScope !== '*' && !requestedResource.startsWith(grant.resourceScope)) {
      return {
        valid: false,
        error: `RESOURCE_SCOPE_EXCEEDED: Requested resource "${requestedResource}" is outside authorized grant scope "${grant.resourceScope}".`,
      };
    }

    if (consumeOnUse) {
      grant.consumed = true;
    }

    return { valid: true };
  }
}

export const capabilityGrantEngine = new CapabilityGrantEngine();
