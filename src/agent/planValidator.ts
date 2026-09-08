import { Plan } from '../ai/types';

export interface PlanDriftEvaluation {
  planId: string;
  originalIntent: string;
  hasPlanDrift: boolean;
  driftReason?: string;
  addedExternalTransfers: string[];
  addedDestructiveOperations: string[];
  riskEscalated: boolean;
}

export class PlanValidator {
  public evaluatePlanDrift(originalIntent: string, proposedPlan: Plan): PlanDriftEvaluation {
    const lowerIntent = originalIntent.toLowerCase();
    const planDescription = proposedPlan.description.toLowerCase();

    const addedExternalTransfers: string[] = [];
    const addedDestructiveOperations: string[] = [];

    // 1. Detect External Transfer Drift
    if (
      (planDescription.includes('upload') || planDescription.includes('email') || planDescription.includes('send')) &&
      !lowerIntent.includes('upload') && !lowerIntent.includes('email') && !lowerIntent.includes('send')
    ) {
      addedExternalTransfers.push('Proposed plan introduces external network transfer not present in original intent.');
    }

    // 2. Detect Destructive Action Drift
    if (
      (planDescription.includes('delete') || planDescription.includes('remove') || planDescription.includes('purge')) &&
      !lowerIntent.includes('delete') && !lowerIntent.includes('remove') && !lowerIntent.includes('purge')
    ) {
      addedDestructiveOperations.push('Proposed plan introduces destructive deletion step not present in original intent.');
    }

    const hasPlanDrift = addedExternalTransfers.length > 0 || addedDestructiveOperations.length > 0;
    const driftReason = hasPlanDrift
      ? [...addedExternalTransfers, ...addedDestructiveOperations].join(' | ')
      : undefined;

    return {
      planId: proposedPlan.id,
      originalIntent,
      hasPlanDrift,
      driftReason,
      addedExternalTransfers,
      addedDestructiveOperations,
      riskEscalated: hasPlanDrift,
    };
  }
}

export const planValidator = new PlanValidator();
