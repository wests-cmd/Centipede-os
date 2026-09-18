import { syncSha256 } from '../security/cryptoUtils';

function canonicalizeObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeObject);
  }
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj: Record<string, any> = {};
  for (const key of sortedKeys) {
    sortedObj[key] = canonicalizeObject(obj[key]);
  }
  return sortedObj;
}

export function computeParameterHash(params: Record<string, any> = {}): string {
  const canonicalJson = JSON.stringify(canonicalizeObject(params || {}));
  return syncSha256(canonicalJson);
}

export interface CapabilityGrantOptions {
  agentId?: string;
  userId?: string;
  deviceId?: string;
  sessionId?: string;
  workflowId?: string;
  runId?: string;
  stepId?: string;
  operation?: string;
  ttlMs?: number;
  approvalId?: string;
  parameterHash?: string;
}

export interface VerificationContext {
  agentId?: string;
  userId?: string;
  deviceId?: string;
  sessionId?: string;
  workflowId?: string;
  runId?: string;
  stepId?: string;
  operation?: string;
}

export interface CapabilityGrant {
  grantId: string;
  agentId: string;
  userId?: string;
  deviceId?: string;
  sessionId?: string;
  workflowId?: string;
  runId?: string;
  stepId?: string;
  capabilityId: string;
  operation?: string;
  resourceScope: string;
  parameterHash?: string;
  issuedAt: number;
  expiresAt: number;
  approvalId?: string;
  isExpired: boolean;
  consumed: boolean;
  revoked: boolean;
}

export function normalizeResourcePath(p: string): string {
  if (!p) return '/';
  // Replace backslashes with forward slashes
  let norm = p.replace(/\\/g, '/');
  // Collapse multiple slashes
  norm = norm.replace(/\/+/g, '/');
  // Resolve relative segments
  const isAbsolute = norm.startsWith('/');
  const parts = norm.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  const result = (isAbsolute ? '/' : '') + stack.join('/');
  return result || (isAbsolute ? '/' : '.');
}

export function isResourceWithinScope(requestedResource: string, resourceScope: string): boolean {
  if (!resourceScope || resourceScope === '*' || resourceScope === 'ALL') {
    return true;
  }

  // If resource doesn't start with / (not a path, e.g., string identifier), exact match or prefix if scoped
  if (!requestedResource.startsWith('/') && !resourceScope.startsWith('/')) {
    return requestedResource === resourceScope || requestedResource.startsWith(resourceScope + ':');
  }

  const normRequested = normalizeResourcePath(requestedResource);
  const normScope = normalizeResourcePath(resourceScope);

  if (normScope === '/' || normRequested === normScope) {
    return true;
  }

  const prefix = normScope.endsWith('/') ? normScope : normScope + '/';
  return normRequested.startsWith(prefix);
}

export class CapabilityGrantEngine {
  private grants: Map<string, CapabilityGrant> = new Map();

  public issueJustInTimeGrant(
    agentId: string,
    capabilityId: string,
    resourceScope: string,
    ttlMs = 600000, // 10 mins JIT TTL
    approvalId?: string,
    parameterHash?: string,
    contextOptions: CapabilityGrantOptions = {}
  ): CapabilityGrant {
    const grantId = `grant_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const grant: CapabilityGrant = {
      grantId,
      agentId,
      userId: contextOptions.userId,
      deviceId: contextOptions.deviceId,
      sessionId: contextOptions.sessionId,
      workflowId: contextOptions.workflowId,
      runId: contextOptions.runId,
      stepId: contextOptions.stepId,
      capabilityId,
      operation: contextOptions.operation,
      resourceScope,
      parameterHash: parameterHash || contextOptions.parameterHash,
      issuedAt: Date.now(),
      expiresAt: Date.now() + (contextOptions.ttlMs || ttlMs),
      approvalId: approvalId || contextOptions.approvalId,
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
    consumeOnUse = true,
    verificationContext?: VerificationContext
  ): { valid: boolean; error?: string; grant?: CapabilityGrant } {
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

    const now = Date.now();
    if (grant.expiresAt <= now) {
      grant.isExpired = true;
      return { valid: false, error: 'GRANT_EXPIRED: Capability grant has expired.' };
    }

    if (grant.capabilityId !== capabilityId) {
      return { valid: false, error: `CAPABILITY_MISMATCH: Grant capability "${grant.capabilityId}" does not match requested capability "${capabilityId}".` };
    }

    // Context Binding Checks
    // 1. Agent ID check (if provided in verificationContext, MUST match grant)
    if (verificationContext?.agentId && grant.agentId !== verificationContext.agentId) {
      return { valid: false, error: `AGENT_MISMATCH: Grant agentId "${grant.agentId}" does not match context agentId "${verificationContext.agentId}".` };
    }

    // 2. Bound fields check: If grant is bound to an optional entity, context MUST provide matching entity!
    if (grant.operation && grant.operation !== verificationContext?.operation) {
      return { valid: false, error: `OPERATION_MISMATCH: Grant operation "${grant.operation}" does not match requested operation "${verificationContext?.operation || 'none'}".` };
    }

    if (grant.userId && grant.userId !== verificationContext?.userId) {
      return { valid: false, error: `USER_MISMATCH: Grant userId "${grant.userId}" does not match context userId "${verificationContext?.userId || 'none'}".` };
    }

    if (grant.deviceId && grant.deviceId !== verificationContext?.deviceId) {
      return { valid: false, error: `DEVICE_MISMATCH: Grant deviceId "${grant.deviceId}" does not match context deviceId "${verificationContext?.deviceId || 'none'}".` };
    }

    if (grant.sessionId && grant.sessionId !== verificationContext?.sessionId) {
      return { valid: false, error: `SESSION_MISMATCH: Grant sessionId "${grant.sessionId}" does not match context sessionId "${verificationContext?.sessionId || 'none'}".` };
    }

    if (grant.workflowId && grant.workflowId !== verificationContext?.workflowId) {
      return { valid: false, error: `WORKFLOW_MISMATCH: Grant workflowId "${grant.workflowId}" does not match context workflowId "${verificationContext?.workflowId || 'none'}".` };
    }

    if (grant.runId && grant.runId !== verificationContext?.runId) {
      return { valid: false, error: `RUN_MISMATCH: Grant runId "${grant.runId}" does not match context runId "${verificationContext?.runId || 'none'}".` };
    }

    if (grant.stepId && grant.stepId !== verificationContext?.stepId) {
      return { valid: false, error: `STEP_MISMATCH: Grant stepId "${grant.stepId}" does not match context stepId "${verificationContext?.stepId || 'none'}".` };
    }

    // Parameter Hash Strict Rule:
    // If grant has a parameterHash, request MUST contain a parameterHash AND it MUST match.
    if (grant.parameterHash) {
      if (!requestParameterHash) {
        return { valid: false, error: 'PARAMETER_HASH_MISSING: Request is missing required parameter hash present in authorized grant.' };
      }
      if (grant.parameterHash !== requestParameterHash) {
        return { valid: false, error: 'PARAMETER_HASH_TAMPERED: Request parameter hash does not match authorized grant parameter hash.' };
      }
    }

    // Resource scope boundary check with path canonicalization
    if (!isResourceWithinScope(requestedResource, grant.resourceScope)) {
      return {
        valid: false,
        error: `RESOURCE_SCOPE_EXCEEDED: Requested resource "${requestedResource}" is outside authorized grant scope "${grant.resourceScope}".`,
      };
    }

    if (consumeOnUse) {
      // Atomic consumption check inside synchronous lock
      grant.consumed = true;
    }

    return { valid: true, grant };
  }

  public getGrant(grantId: string): CapabilityGrant | undefined {
    return this.grants.get(grantId);
  }

  public clearGrants(): void {
    this.grants.clear();
  }
}

export const capabilityGrantEngine = new CapabilityGrantEngine();
