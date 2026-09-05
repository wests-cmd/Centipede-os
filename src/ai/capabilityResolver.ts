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
      case 'GET_MODE':
      case 'GET_KNIGHTS':
      case 'GET_MODELS':
      case 'GET_SECURITY_STATUS':
      case 'GET_PERMISSIONS':
      case 'LIST_APPROVALS':
      case 'LIST_TASKS':
      case 'GET_TASK':
        return {
          capability: 'node.execute',
          operation: 'query_status',
          riskLevel: 'LOW',
          requiresApproval: false,
        };

      case 'START_RUNTIME':
      case 'STOP_RUNTIME':
      case 'SET_MODE':
      case 'CREATE_TASK':
        return {
          capability: 'node.execute',
          operation: 'task_management',
          riskLevel: 'MEDIUM',
          requiresApproval: false,
        };

      case 'CANCEL_TASK':
        return {
          capability: 'node.execute',
          operation: 'cancel_task',
          riskLevel: 'HIGH',
          requiresApproval: false,
        };

      case 'GET_MEMORY':
      case 'SEARCH_MEMORY':
      case 'GET_MAPS':
        return {
          capability: 'memory.read',
          operation: 'read_memory',
          riskLevel: 'LOW',
          requiresApproval: false,
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

      case 'CREATE_APPROVAL':
        return {
          capability: 'system.admin',
          operation: 'create_approval',
          riskLevel: 'HIGH',
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
