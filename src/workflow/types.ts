export type WorkflowTriggerType = 'MANUAL' | 'SCHEDULED' | 'EVENT' | 'CONDITIONAL';
export type WorkflowTrustState = 'DRAFT' | 'REVIEW_REQUIRED' | 'APPROVED' | 'ACTIVE' | 'BLOCKED' | 'REVOKED';

export interface WorkflowStep {
  stepId: string;
  name: string;
  capabilityId: string;
  parameters: Record<string, any>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresHumanApproval: boolean;
  expectedOutcome: string;
}

export interface WorkflowBudget {
  maxRuntimeMs: number;
  maxActions: number;
  maxRetries: number;
  maxLoopCycles: number;
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
  status: 'PLANNING' | 'WAITING_APPROVAL' | 'EXECUTING' | 'VERIFYING' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
  executedStepsCount: number;
  history: { stepId: string; capabilityId: string; status: string; timestamp: number }[];
  startTime: number;
  endTime?: number;
  error?: string;
}
