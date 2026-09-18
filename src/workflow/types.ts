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
    grantId?: string;
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

export type MissionStatus = 'DRAFT' | 'PLANNING' | 'WAITING_APPROVAL' | 'QUEUED' | 'RUNNING' | 'PAUSED' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'BLOCKED' | 'RECOVERY';

export type TaskStatus = 'DRAFT' | 'WAITING_APPROVAL' | 'QUEUED' | 'DISPATCHED' | 'RUNNING' | 'PAUSED' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT' | 'BLOCKED' | 'RECOVERY';

export interface MissionModel {
  missionId: string;
  userIntent: string;
  createdAt: number;
  updatedAt: number;
  status: MissionStatus;
  planId: string;
  taskIds: string[];
  approvalIds: string[];
  requestedBy: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  result?: Record<string, any>;
  auditTraceId: string;
}

export interface TaskModel {
  taskId: string;
  missionId: string;
  planId: string;
  intentId: string;
  actionId: string;
  capability: string;
  operation?: string;
  parameters: Record<string, any>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  authorizationState: 'UNAUTHORIZED' | 'PENDING_APPROVAL' | 'AUTHORIZED';
  nodeId?: string;
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  timeoutMs: number;
  idempotencyKey: string;
  correlationId: string;
  result?: Record<string, any>;
  error?: string;
}

export interface ActionModel {
  actionId: string;
  taskId: string;
  missionId: string;
  planId: string;
  intentId: string;
  capability: string;
  operation?: string;
  parameters: Record<string, any>;
  parameterHash: string;
  grantId?: string;
  idempotencyKey: string;
  correlationId: string;
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
