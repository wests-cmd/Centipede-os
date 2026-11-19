import { KingdomAdapter, kingdomAdapter } from '../api/kingdomAdapter';
import { generateSecureRandomHex } from '../security/cryptoUtils';
import { ActionRequest, AuthorizationState, Plan } from './types';

export class PermissionGate {
  private adapter: KingdomAdapter;

  constructor(adapter: KingdomAdapter = kingdomAdapter) {
    this.adapter = adapter;
  }

  /**
   * Evaluates a plan against Kingdom ZeroTrust capability rules.
   * Asks Kingdom's authorization engine "Is this capability authorized?"
   * Model outputs, confidence scores, or text prompts CANNOT self-authorize or bypass this gate.
   * DEFAULT STATE IS STRICT FAIL-CLOSED (UNAUTHORIZED / DENIED).
   */
  public async evaluate(plan: Plan): Promise<ActionRequest> {
    const actionId = `action_${Date.now()}_${generateSecureRandomHex(4)}`;
    const mainCapability = plan.requiredCapabilities[0] || 'none';
    const operation = plan.operation || 'execute';
    const parameters = plan.parameters || {};

    // Mandatory Security Fix: Default state is FAIL CLOSED (DENIED / UNAUTHORIZED)
    let authorizationState: AuthorizationState = 'DENIED';

    // Critical or human-approval-required operations automatically require human approval
    if (plan.requiresApproval || plan.riskLevel === 'CRITICAL' || plan.riskLevel === 'HIGH') {
      authorizationState = 'APPROVAL_REQUIRED';
    } else if (this.adapter.isReadOnlyConnection() && this.adapter.getConnectionState() === 'CONNECTED') {
      // Only a fixed low-risk read allowlist may pass to the local-admin GET
      // proxy, which independently enforces loopback identity and credentials.
      const localReadCapabilities = new Set([
        'runtime.status', 'runtime.mode.read', 'tasks.read', 'knights.read',
        'models.read', 'memory.read', 'ai_map.read', 'security.status.read',
        'security.permissions.read', 'security.approvals.read',
      ]);
      authorizationState = plan.riskLevel === 'LOW' && localReadCapabilities.has(mainCapability)
        ? 'AUTHORIZED' : 'DENIED';
    } else if (this.adapter.getConnectionState() === 'CONNECTED') {
      try {
        const authRes = await this.adapter.authorize_capability(
          'centipede_ai',
          mainCapability,
          operation,
          undefined,
          undefined,
          undefined,
          parameters
        );

        if (authRes && authRes.decision === 'ALLOWED') {
          authorizationState = 'AUTHORIZED';
        } else if (authRes && authRes.decision === 'REQUIRES_APPROVAL') {
          authorizationState = 'APPROVAL_REQUIRED';
        } else {
          authorizationState = 'DENIED';
        }
      } catch (err) {
        // Fail closed on error, timeout, or malformed response from Kingdom
        authorizationState = 'DENIED';
      }
    } else {
      // Disconnected or offline -> fail closed
      authorizationState = 'DENIED';
    }

    return {
      id: actionId,
      capability: mainCapability,
      operation,
      parameters,
      planId: plan.id,
      intentId: plan.intentId,
      riskLevel: plan.riskLevel,
      authorizationState,
    };
  }
}

export const permissionGate = new PermissionGate();
