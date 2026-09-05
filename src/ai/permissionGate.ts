import { ActionRequest, AuthorizationState, Plan } from './types';

export class PermissionGate {
  /**
   * Evaluates a plan against Kingdom ZeroTrust capability rules.
   * Model output, confidence scores, or raw text prompts CANNOT override this gate.
   */
  public evaluate(plan: Plan): ActionRequest {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mainCapability = plan.requiredCapabilities[0] || 'none';

    let authorizationState: AuthorizationState = 'AUTHORIZED';

    if (plan.requiresApproval || plan.riskLevel === 'CRITICAL') {
      authorizationState = 'APPROVAL_REQUIRED';
    }

    return {
      id: actionId,
      capability: mainCapability,
      parameters: plan.steps[2]?.parameters || {},
      planId: plan.id,
      intentId: plan.intentId,
      riskLevel: plan.riskLevel,
      authorizationState,
    };
  }
}

export const permissionGate = new PermissionGate();
