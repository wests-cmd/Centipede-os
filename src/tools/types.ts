import { RiskLevel } from '../ai/types';

export type ToolCategory = 'READ_ONLY' | 'MUTATING' | 'EXTERNAL_SIDE_EFFECT' | 'PRIVILEGED';

export interface ParameterPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ParameterPropertySchema>;
  required: string[];
}

export interface ToolDefinition {
  toolId: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  category: ToolCategory;
  inputSchema: ToolInputSchema;
  riskClass: RiskLevel;
  requiresApproval: boolean;
  timeoutMs: number;
  sideEffects: boolean;
}

export interface ExecutionAuthorizationContext {
  requestId: string;
  agentId: string;
  userId?: string;
  deviceId?: string;
  sessionId?: string;
  workflowId?: string;
  runId?: string;
  stepId?: string;
  capability: string;
  operation: string;
  resource: string;
  parameters: Record<string, any>;
  parameterHash: string;
  grantId?: string;
  approvalId?: string;
  riskClass: ToolCategory;
}

export interface ToolInvocationRequest {
  id: string;
  toolId: string;
  capability: string;
  parameters: Record<string, any>;
  idempotencyKey?: string;
  chainDepth: number;
  riskLevel: RiskLevel;
  grantId?: string;
  approvalId?: string;
  agentId?: string;
  userId?: string;
  deviceId?: string;
  sessionId?: string;
  workflowId?: string;
  runId?: string;
  stepId?: string;
  operation?: string;
  resource?: string;
  parameterHash?: string;
}

export type VerificationState = 'VERIFIED' | 'EXECUTED_UNVERIFIED' | 'SIMULATED' | 'FAILED';

export interface ToolExecutionResult {
  invocationId: string;
  toolId: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'PENDING' | 'TIMEOUT';
  verificationState?: VerificationState;
  data?: any;
  error?: string;
  executionTimeMs: number;
  idempotencyKey?: string;
}

export interface ToolRegistryDiscoveryItem {
  toolId: string;
  name: string;
  description: string;
  category: ToolCategory;
  capabilities: string[];
  riskClass: RiskLevel;
  requiresApproval: boolean;
}
