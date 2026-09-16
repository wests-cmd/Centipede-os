export type IntentType =
  | 'QUERY_STATUS'
  | 'QUERY_STORAGE'
  | 'START_RUNTIME'
  | 'STOP_RUNTIME'
  | 'GET_MODE'
  | 'SET_MODE'
  | 'CREATE_TASK'
  | 'GET_TASK'
  | 'CANCEL_TASK'
  | 'LIST_TASKS'
  | 'GET_KNIGHTS'
  | 'GET_MODELS'
  | 'GET_MEMORY'
  | 'SEARCH_MEMORY'
  | 'GET_MAPS'
  | 'GET_SECURITY_STATUS'
  | 'GET_PERMISSIONS'
  | 'LIST_APPROVALS'
  | 'CREATE_APPROVAL'
  | 'RESTRICTED_DELETE'
  | 'RESTRICTED_EXECUTE'
  | 'UPDATE_KINGDOM'
  | 'RESTART_KINGDOM'
  | 'ROLLBACK_KINGDOM'
  | 'UNKNOWN';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface UserInput {
  id: string;
  text: string;
  timestamp: number;
  conversationId: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface Intent {
  id: string;
  type: IntentType;
  confidence: number;
  parameters: Record<string, any>;
  originalInput: string;
  timestamp: number;
  explanation?: string;
}

export interface PlanStep {
  stepNumber: number;
  description: string;
  actionType: string;
  requiredCapability: string;
  operation: string;
  parameters: Record<string, any>;
}

export interface Plan {
  id: string;
  intentId: string;
  steps: PlanStep[];
  requiredCapabilities: string[];
  operation: string;
  parameters: Record<string, any>;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  description?: string;
  reasoning?: string;
  targetCapability?: string;
}

export type AuthorizationState = 'AUTHORIZED' | 'APPROVAL_REQUIRED' | 'DENIED';

export interface ActionRequest {
  id: string;
  capability: string;
  operation: string;
  parameters: Record<string, any>;
  planId: string;
  intentId: string;
  riskLevel: RiskLevel;
  authorizationState: AuthorizationState;
  approvalId?: string;
  grantId?: string;
  agentId?: string;
  sessionId?: string;
  userId?: string;
  deviceId?: string;
  workflowId?: string;
  runId?: string;
  stepId?: string;
}

export interface ActionResult {
  actionId: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'PENDING' | 'TIMEOUT';
  data?: any;
  error?: string;
  timestamp: number;
}

export type AIPipelineStatus =
  | 'RECEIVED'
  | 'UNDERSTANDING'
  | 'INTENT_IDENTIFIED'
  | 'PLANNING'
  | 'PERMISSION_CHECK'
  | 'AUTHORIZED'
  | 'APPROVAL_REQUIRED'
  | 'DENIED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: number;
  intent?: Intent;
  plan?: Plan;
  actionResult?: ActionResult;
  status: AIPipelineStatus;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  activeContext: Record<string, any>;
  createdTime: number;
  updatedTime: number;
}

export interface AIModelResponse {
  rawOutput: string;
  parsedIntent?: Intent;
  isValidSchema: boolean;
  error?: string;
}

export interface AIModelInterface {
  id: string;
  name: string;
  provider: string;
  generate(prompt: string, context?: Record<string, any>): Promise<AIModelResponse>;
  health(): Promise<{ status: string; available: boolean }>;
}
