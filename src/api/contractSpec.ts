/**
 * Machine-Readable Kingdom ↔ Centipede OS API Contract Specification
 */

export interface ContractEndpointSpec {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  requiredFields?: string[];
  optionalFields?: string[];
  responseRequiredFields?: string[];
}

export interface KingdomContractSpec {
  contractVersion: string;
  targetKingdomEngineVersion: string;
  minSupportedKingdomVersion: string;
  maxTestedKingdomVersion: string;
  endpoints: Record<string, ContractEndpointSpec>;
  capabilities: Record<string, { description: string; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }>;
  errorCodes: string[];
}

export const KINGDOM_CONTRACT_SPEC: KingdomContractSpec = {
  contractVersion: '1.0.0',
  targetKingdomEngineVersion: '40.1.0',
  minSupportedKingdomVersion: '40.0.0',
  maxTestedKingdomVersion: '40.1.9',
  endpoints: {
    get_status: {
      path: '/status',
      method: 'GET',
      description: 'Retrieve Kingdom engine runtime health, mode, and task stats',
      responseRequiredFields: ['running', 'mode', 'version', 'tasks'],
    },
    start_runtime: {
      path: '/start',
      method: 'POST',
      description: 'Start Kingdom runtime engine and task scheduler',
      responseRequiredFields: ['status'],
    },
    stop_runtime: {
      path: '/stop',
      method: 'POST',
      description: 'Gracefully stop Kingdom runtime engine',
      responseRequiredFields: ['status'],
    },
    get_mode: {
      path: '/mode',
      method: 'GET',
      description: 'Get operating mode',
      responseRequiredFields: ['mode'],
    },
    set_mode: {
      path: '/mode',
      method: 'PUT',
      description: 'Set operating mode',
      requiredFields: ['mode'],
    },
    submit_task: {
      path: '/tasks',
      method: 'POST',
      description: 'Submit prompt task to swarm',
      requiredFields: ['prompt'],
      optionalFields: ['metadata'],
      responseRequiredFields: ['id', 'prompt', 'status'],
    },
    get_task: {
      path: '/tasks/{id}',
      method: 'GET',
      description: 'Get task by ID',
      responseRequiredFields: ['id', 'status'],
    },
    list_tasks: {
      path: '/tasks',
      method: 'GET',
      description: 'List task items',
    },
    cancel_task: {
      path: '/tasks/{id}/cancel',
      method: 'POST',
      description: 'Cancel task execution',
    },
    get_events: {
      path: '/events',
      method: 'GET',
      description: 'Get historical events',
    },
    get_knights: {
      path: '/knights',
      method: 'GET',
      description: 'List active swarm knight agents',
      responseRequiredFields: ['knights'],
    },
    get_models: {
      path: '/models',
      method: 'GET',
      description: 'Check model health',
    },
    generate_model: {
      path: '/models/generate',
      method: 'POST',
      description: 'Execute model inference',
      requiredFields: ['prompt'],
    },
    get_memory: {
      path: '/memory',
      method: 'GET',
      description: 'Retrieve recorded memory entries',
    },
    add_memory: {
      path: '/memory',
      method: 'POST',
      description: 'Record memory entry',
      requiredFields: ['content'],
    },
    search_memory: {
      path: '/memory/search',
      method: 'GET',
      description: 'Vector query search',
    },
    get_security_status: {
      path: '/security/status',
      method: 'GET',
      description: 'Retrieve ZeroTrust security status',
      responseRequiredFields: ['enabled', 'mode'],
    },
    get_permissions: {
      path: '/security/permissions',
      method: 'GET',
      description: 'List node permissions',
      responseRequiredFields: ['nodes'],
    },
    authorize_capability: {
      path: '/security/authorize',
      method: 'POST',
      description: 'Authorize execution of capability',
      requiredFields: ['actor_id', 'capability', 'operation'],
      responseRequiredFields: ['allowed'],
    },
    create_approval: {
      path: '/security/approvals',
      method: 'POST',
      description: 'Create human approval request',
      requiredFields: ['capability', 'operation'],
      responseRequiredFields: ['id', 'status'],
    },
    list_approvals: {
      path: '/security/approvals',
      method: 'GET',
      description: 'List pending approval requests',
    },
    approve: {
      path: '/security/approvals/{id}/approve',
      method: 'POST',
      description: 'Approve capability execution',
      requiredFields: ['approver'],
    },
    deny: {
      path: '/security/approvals/{id}/deny',
      method: 'POST',
      description: 'Deny capability execution',
      requiredFields: ['approver'],
    },
    get_audit: {
      path: '/security/audit',
      method: 'GET',
      description: 'Query security audit logs',
    },
  },
  capabilities: {
    'filesystem.read': { description: 'Read files', riskLevel: 'LOW' },
    'filesystem.write': { description: 'Write files', riskLevel: 'MEDIUM' },
    'filesystem.delete': { description: 'Delete files', riskLevel: 'HIGH' },
    'process.execute': { description: 'Execute process', riskLevel: 'HIGH' },
    'system.admin': { description: 'System administration', riskLevel: 'CRITICAL' },
    'docker.execute': { description: 'Container execution', riskLevel: 'HIGH' },
    'node.register': { description: 'Register remote node', riskLevel: 'MEDIUM' },
  },
  errorCodes: [
    'INVALID_REQUEST',
    'AUTHENTICATION_FAILED',
    'AUTHORIZATION_DENIED',
    'NOT_FOUND',
    'TIMEOUT',
    'KINGDOM_OFFLINE',
    'ENDPOINT_UNAVAILABLE',
    'VERSION_INCOMPATIBLE',
    'TASK_FAILED',
    'TASK_CANCELLED',
    'SERVER_ERROR',
    'UNKNOWN_ERROR',
  ],
};
