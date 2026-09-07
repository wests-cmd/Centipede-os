import { Intent, RiskLevel } from './types';

export interface ResolvedCapability {
  capability: string;
  operation: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
}

export class CapabilityResolver {
  public resolve(intent: Intent): ResolvedCapability {
    switch (intent.type) {
      case 'QUERY_STATUS':
        return {
          capability: 'runtime.status',
          operation: 'get_status',
          riskLevel: 'LOW',
          requiresApproval: false,
        };

      case 'START_RUNTIME':
        return {
          capability: 'runtime.start',
          operation: 'start_runtime',
          riskLevel: 'MEDIUM',
          requiresApproval: false,
        };

      case 'STOP_RUNTIME':
        return {
          capability: 'runtime.stop',
          operation: 'stop_runtime',
          riskLevel: 'HIGH',
          requiresApproval: false,
        };

      case 'GET_MODE':
        return {
          capability: 'runtime.mode.read',
          operation: 'get_mode',
          riskLevel: 'LOW',
          requiresApproval: false,
        };

      case 'SET_MODE':
        return {
          capability: 'runtime.mode.write',
          operation: 'set_mode',
          riskLevel: 'MEDIUM',
          requiresApproval: false,
        };

      case 'CREATE_TASK':
        return {
          capability: 'tasks.create',
          operation: 'submit_task',
          riskLevel: 'MEDIUM',
          requiresApproval: false,
        };

      case 'GET_TASK':
      case 'LIST_TASKS':
        return {
          capability: 'tasks.read',
          operation: 'list_tasks',
          riskLevel: 'LOW',
          requiresApproval: false,
        };

      case 'CANCEL_TASK':
        return {
          capability: 'tasks.cancel',
          operation: 'cancel_task',
          riskLevel: 'HIGH',
          requiresApproval: false,
        };

      case 'GET_KNIGHTS':
        return {
          capability: 'knights.read',
          operation: 'get_knights',
          riskLevel: 'LOW',
          requiresApproval: false,
        };

      case 'GET_MODELS':
        return {
          capability: 'models.read',
          operation: 'get_models',
          riskLevel: 'LOW',
          requiresApproval: false,
        };

      case 'GET_MEMORY':
        return {
          capability: 'memory.read',
          operation: 'get_memory',
          riskLevel: 'LOW',
          requiresApproval: false,
        };

      case 'SEARCH_MEMORY':
        return {
          capability: 'memory.search',
          operation: 'search_memory',
          riskLevel: 'LOW',
          requiresApproval: false,
        };

      case 'GET_MAPS':
        return {
          capability: 'ai_map.read',
          operation: 'get_maps',
          riskLevel: 'LOW',
          requiresApproval: false,
        };

      case 'GET_SECURITY_STATUS':
        return {
          capability: 'security.status.read',
          operation: 'get_security_status',
          riskLevel: 'LOW',
          requiresApproval: false,
        };

      case 'GET_PERMISSIONS':
        return {
          capability: 'security.permissions.read',
          operation: 'get_permissions',
          riskLevel: 'LOW',
          requiresApproval: false,
        };

      case 'LIST_APPROVALS':
        return {
          capability: 'security.approvals.read',
          operation: 'list_approvals',
          riskLevel: 'LOW',
          requiresApproval: false,
        };

      case 'CREATE_APPROVAL':
        return {
          capability: 'security.approvals.create',
          operation: 'create_approval',
          riskLevel: 'HIGH',
          requiresApproval: true,
        };

      case 'UPDATE_KINGDOM':
        return {
          capability: 'kingdom.update',
          operation: 'apply_update',
          riskLevel: 'CRITICAL',
          requiresApproval: true,
        };

      case 'RESTART_KINGDOM':
        return {
          capability: 'kingdom.restart',
          operation: 'restart_kingdom',
          riskLevel: 'HIGH',
          requiresApproval: true,
        };

      case 'ROLLBACK_KINGDOM':
        return {
          capability: 'kingdom.rollback',
          operation: 'rollback_kingdom',
          riskLevel: 'CRITICAL',
          requiresApproval: true,
        };

      case 'RESTRICTED_DELETE':
        return {
          capability: 'filesystem.delete',
          operation: 'delete_file',
          riskLevel: 'CRITICAL',
          requiresApproval: true,
        };

      case 'RESTRICTED_EXECUTE':
        return {
          capability: 'process.execute',
          operation: 'execute_process',
          riskLevel: 'CRITICAL',
          requiresApproval: true,
        };

      case 'UNKNOWN':
      default:
        return {
          capability: 'none',
          operation: 'none',
          riskLevel: 'LOW',
          requiresApproval: false,
        };
    }
  }
}

export const capabilityResolver = new CapabilityResolver();
