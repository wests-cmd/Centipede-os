import { capabilityResolver } from './capabilityResolver';
import { Intent, Plan, PlanStep } from './types';

export class Planner {
  public createPlan(intent: Intent): Plan {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const resolvedCap = capabilityResolver.resolve(intent);

    const steps: PlanStep[] = [];

    if (intent.type === 'UNKNOWN') {
      return {
        id: planId,
        intentId: intent.id,
        steps: [],
        requiredCapabilities: [],
        riskLevel: 'LOW',
        requiresApproval: false,
      };
    }

    // Step 1: Pre-execution validation
    steps.push({
      stepNumber: 1,
      description: `Validate intent parameters for ${intent.type}`,
      actionType: 'validate_intent',
      requiredCapability: resolvedCap.capability,
      parameters: intent.parameters,
    });

    // Step 2: ZeroTrust capability check
    steps.push({
      stepNumber: 2,
      description: `Perform ZeroTrust permission check for capability: ${resolvedCap.capability}`,
      actionType: 'check_permission',
      requiredCapability: resolvedCap.capability,
      parameters: { riskLevel: resolvedCap.riskLevel },
    });

    // Step 3: Kingdom API Execution
    steps.push({
      stepNumber: 3,
      description: `Execute action via KingdomAdapter: ${resolvedCap.operation}`,
      actionType: 'execute_kingdom_action',
      requiredCapability: resolvedCap.capability,
      parameters: intent.parameters,
    });

    return {
      id: planId,
      intentId: intent.id,
      steps,
      requiredCapabilities: [resolvedCap.capability],
      riskLevel: resolvedCap.riskLevel,
      requiresApproval: resolvedCap.requiresApproval,
    };
  }
}

export const planner = new Planner();
