import { ActionRequest } from '../ai/types';

export interface VerifiedApprovalPayload {
  approvalId: string;
  capability: string;
  operation: string;
  parameterHash: string;
  rawParametersJson: string;
  requestedTimestamp: number;
}

export class ApprovalTamperGuard {
  private approvedPayloadHashes: Map<string, VerifiedApprovalPayload> = new Map();

  public registerApprovalRequest(approvalId: string, actionReq: ActionRequest): VerifiedApprovalPayload {
    const rawParametersJson = JSON.stringify(actionReq.parameters || {});
    const parameterHash = this.computeHash(rawParametersJson);

    const payload: VerifiedApprovalPayload = {
      approvalId,
      capability: actionReq.capability,
      operation: actionReq.operation || 'execute',
      parameterHash,
      rawParametersJson,
      requestedTimestamp: Date.now(),
    };

    this.approvedPayloadHashes.set(approvalId, payload);
    return payload;
  }

  public verifyAndAuthorizeExecution(
    approvalId: string,
    executionActionReq: ActionRequest
  ): { valid: boolean; error?: string } {
    const record = this.approvedPayloadHashes.get(approvalId);

    if (!record) {
      return { valid: false, error: 'APPROVAL_NOT_FOUND: Unregistered or expired approval ID.' };
    }

    // Anti-Tampering Check 1: Capability Mismatch
    if (record.capability !== executionActionReq.capability) {
      return {
        valid: false,
        error: `APPROVAL_TAMPERING_DETECTED: Approved capability "${record.capability}" does not match requested capability "${executionActionReq.capability}".`,
      };
    }

    // Anti-Tampering Check 2: Parameter Hash Mismatch
    const currentParamJson = JSON.stringify(executionActionReq.parameters || {});
    const currentHash = this.computeHash(currentParamJson);

    if (record.parameterHash !== currentHash) {
      return {
        valid: false,
        error: `APPROVAL_PARAM_TAMPERING: Action parameters were modified after human approval! Original Hash: ${record.parameterHash}, Current Hash: ${currentHash}. Require new human approval!`,
      };
    }

    return { valid: true };
  }

  private computeHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `hash_${Math.abs(hash)}`;
  }
}

export const approvalTamperGuard = new ApprovalTamperGuard();
