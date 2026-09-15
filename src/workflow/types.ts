export type WorkflowTriggerType = 'MANUAL' | 'SCHEDULED' | 'EVENT' | 'CONDITIONAL';
export type WorkflowTrustState = 'DRAFT' | 'REVIEW_REQUIRED' | 'APPROVED' | 'ACTIVE' | 'BLOCKED' | 'REVOKED';

export interface WorkflowStep {
  stepId: string;
  name: string;
  capabilityId: string;
  operation?: string;
  parameters: Record<string, any>;
  dependsOnStepIds?: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresHumanApproval: boolean;
  expectedOutcome: string;
  grantId?: string;
  compensatingAction?: {
    capabilityId: string;
    operation?: string;
    parameters: Record<string, any>;
  };
}

export interface WorkflowBudget {
  maxRuntimeMs: number;
  maxActions: number;
  maxRetries: number;
  maxLoopCycles: number;
  maxNetworkCalls?: number;
  maxToolCalls?: number;
}

export interface WorkflowCheckpoint {
  checkpointId: string;
  stepId: string;
  stepIndex: number;
  status: 'SUCCESS' | 'FAILED' | 'COMPENSATED';
  timestamp: number;
  stateSnapshot: Record<string, any>;
}

export interface WorkflowDefinition {
  workflowId: string;
  name: string;
  version: string;
  description: string;
  triggerType: WorkflowTriggerType;
  steps: WorkflowStep[];
  budget: WorkflowBudget;
  trustState: WorkflowTrustState;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowExecutionRun {
  runId: string;
  workflowId: string;
  workflowVersion: string;
  status: 'PLANNING' | 'WAITING_APPROVAL' | 'EXECUTING' | 'VERIFYING' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'REQUIRES_HUMAN_REVIEW';
  executedStepsCount: number;
  history: { stepId: string; capabilityId: string; status: string; timestamp: number }[];
  checkpoints: WorkflowCheckpoint[];
  consumedBudget: {
    runtimeMs: number;
    actionsCount: number;
    networkCallsCount: number;
    toolCallsCount: number;
    loopCyclesCount: number;
  };
  startTime: number;
  endTime?: number;
  error?: string;
}
