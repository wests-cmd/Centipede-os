import { KingdomAdapter, kingdomAdapter } from '../api/kingdomAdapter';
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
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mainCapability = plan.requiredCapabilities[0] || 'none';
    const operation = plan.operation || 'execute';
    const parameters = plan.parameters || {};

    // Mandatory Security Fix: Default state is FAIL CLOSED (DENIED / UNAUTHORIZED)
    let authorizationState: AuthorizationState = 'DENIED';

    // Critical or human-approval-required operations automatically require human approval
    if (plan.requiresApproval || plan.riskLevel === 'CRITICAL' || plan.riskLevel === 'HIGH') {
      authorizationState = 'APPROVAL_REQUIRED';
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
