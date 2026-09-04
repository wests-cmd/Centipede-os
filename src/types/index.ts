export type ConnectionState =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'AUTHENTICATION_FAILED'
  | 'VERSION_INCOMPATIBLE'
  | 'ERROR';

export type VersionCompatibilityStatus =
  | 'COMPATIBLE'
  | 'COMPATIBLE_WITH_WARNING'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

export type KingdomErrorCode =
  | 'INVALID_REQUEST'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_DENIED'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'KINGDOM_OFFLINE'
  | 'ENDPOINT_UNAVAILABLE'
  | 'VERSION_INCOMPATIBLE'
  | 'TASK_FAILED'
  | 'TASK_CANCELLED'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export interface VersionCompatibility {
  detectedVersion: string | null;
  minSupportedVersion: string;
  maxTestedVersion: string;
  status: VersionCompatibilityStatus;
  message: string;
}

export interface TaskCounters {
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface RuntimeStatus {
  running: boolean;
  mode: string;
  version: string;
  scheduler_running: boolean;
  tasks: TaskCounters;
}

export interface TaskItem {
  id: string;
  prompt: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at?: number;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface KnightItem {
  name: string;
  status: string;
  active: number;
  completed: number;
}

export interface KnightsResponse {
  knights: KnightItem[];
}

export interface ModelHealth {
  status: string;
  providers?: any[];
  [key: string]: any;
}

export interface MemoryEntry {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  weight?: number;
  timestamp?: number;
}

export interface SecurityStatus {
  enabled: boolean;
  mode: string;
  registered_nodes: number;
  pending_approvals_count: number;
  audit_logs_count: number;
}

export interface SecurityNode {
  node_id: string;
  name: string;
  capabilities: string[];
  verified: boolean;
  active: boolean;
}

export interface SecurityPermissionsResponse {
  nodes: SecurityNode[];
}

export interface ApprovalRequest {
  id: string;
  capability: string;
  operation: string;
  reason: string;
  requesting_actor: string;
  risk_level: string;
  status: 'pending' | 'approved' | 'denied';
  parameters?: Record<string, any>;
  created_at?: number;
}

export interface AuditLogEntry {
  timestamp: number;
  actor: string;
  operation: string;
  capability: string;
  decision: 'ALLOWED' | 'DENIED' | 'REQUIRES_APPROVAL';
  reason?: string;
  approval_id?: string;
}

export interface SystemEvent {
  type?: string;
  event?: string;
  data?: any;
  timestamp?: number;
}

export interface AIPipelineState {
  prompt: string;
  intent?: string;
  plan?: string[];
  capabilityRequired?: string;
  requiresApproval?: boolean;
  approvalId?: string;
  status: 'idle' | 'analyzing' | 'planning' | 'checking' | 'pending_approval' | 'executing' | 'completed' | 'blocked';
  result?: any;
  error?: string;
}
