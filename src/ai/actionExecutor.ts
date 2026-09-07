import { KingdomAdapter, kingdomAdapter } from '../api/kingdomAdapter';
import { ActionRequest, ActionResult, Intent } from './types';

export class ActionExecutor {
  private adapter: KingdomAdapter;

  constructor(adapter: KingdomAdapter = kingdomAdapter) {
    this.adapter = adapter;
  }

  public async execute(action: ActionRequest, intent: Intent): Promise<ActionResult> {
    const timestamp = Date.now();

    // 1. Security Gate Enforcement
    if (action.authorizationState === 'DENIED') {
      return {
        actionId: action.id,
        status: 'BLOCKED',
        error: 'Action execution denied by ZeroTrust permission policy.',
        timestamp,
      };
    }

    if (action.authorizationState === 'APPROVAL_REQUIRED') {
      try {
        const approvalReq = await this.adapter.create_approval(
          action.capability,
          action.operation || 'execute_action',
          `Centipede AI request requires approval (${action.capability}): ${intent.originalInput}`,
          'centipede_ai',
          action.riskLevel,
          action.parameters
        );

        return {
          actionId: action.id,
          status: 'PENDING',
          data: {
            approvalId: approvalReq.id,
            capability: action.capability,
            message: `Approval request created: ${approvalReq.id}. Action pending human approval in Kingdom.`,
          },
          timestamp,
        };
      } catch (err: any) {
        return {
          actionId: action.id,
          status: 'BLOCKED',
          error: `Failed to create Kingdom approval request: ${err.message}`,
          timestamp,
        };
      }
    }

    // 2. Parameter Validation
    if (intent.type === 'CANCEL_TASK') {
      if (!action.parameters.taskId || typeof action.parameters.taskId !== 'string' || !action.parameters.taskId.trim()) {
        return {
          actionId: action.id,
          status: 'BLOCKED',
          error: 'Missing required taskId parameter for task cancellation.',
          timestamp,
        };
      }
    }

    if (intent.type === 'CREATE_TASK') {
      if (!action.parameters.prompt || typeof action.parameters.prompt !== 'string' || !action.parameters.prompt.trim()) {
        return {
          actionId: action.id,
          status: 'BLOCKED',
          error: 'Missing required prompt parameter for task creation.',
          timestamp,
        };
      }
    }

    if (intent.type === 'SET_MODE') {
      const mode = action.parameters.mode;
      if (!mode || (mode !== 'adaptive' && mode !== 'lightweight')) {
        return {
          actionId: action.id,
          status: 'BLOCKED',
          error: `Invalid mode parameter "${mode}". Must be 'adaptive' or 'lightweight'.`,
          timestamp,
        };
      }
    }

    // 3. Explicit Dispatch Matrix (Zero Arbitrary Fallback)
    try {
      let data: any = null;

      switch (intent.type) {
        case 'QUERY_STATUS':
          data = await this.adapter.get_status();
          break;
        case 'START_RUNTIME':
          data = await this.adapter.start_runtime();
          break;
        case 'STOP_RUNTIME':
          data = await this.adapter.stop_runtime();
          break;
        case 'GET_MODE':
          data = await this.adapter.get_mode();
          break;
        case 'SET_MODE':
          data = await this.adapter.set_mode(action.parameters.mode);
          break;
        case 'CREATE_TASK':
          data = await this.adapter.submit_task(action.parameters.prompt, { source: 'centipede_ai' });
          break;
        case 'LIST_TASKS':
          data = await this.adapter.list_tasks();
          break;
        case 'GET_TASK':
          data = await this.adapter.get_task(action.parameters.taskId);
          break;
        case 'CANCEL_TASK':
          data = await this.adapter.cancel_task(action.parameters.taskId);
          break;
        case 'GET_KNIGHTS':
          data = await this.adapter.get_knights();
          break;
        case 'GET_MODELS':
          data = await this.adapter.get_models();
          break;
        case 'GET_MEMORY':
          data = await this.adapter.get_memory();
          break;
        case 'SEARCH_MEMORY':
          data = await this.adapter.search_memory(action.parameters.query || intent.originalInput);
          break;
        case 'GET_MAPS':
          data = await this.adapter.get_maps();
          break;
        case 'GET_SECURITY_STATUS':
          data = await this.adapter.get_security_status();
          break;
        case 'GET_PERMISSIONS':
          data = await this.adapter.get_permissions();
          break;
        case 'LIST_APPROVALS':
          data = await this.adapter.list_approvals();
          break;

        case 'UNKNOWN':
        default:
          // FAIL CLOSED: No default fallback action!
          return {
            actionId: action.id,
            status: 'BLOCKED',
            error: `Unsupported or unknown intent/capability "${intent.type}". No Kingdom action executed.`,
            timestamp,
          };
      }

      return {
        actionId: action.id,
        status: 'SUCCESS',
        data,
        timestamp,
      };
    } catch (err: any) {
      return {
        actionId: action.id,
        status: 'FAILED',
        error: `Kingdom execution error: ${err.message}`,
        timestamp,
      };
    }
  }
}

export const actionExecutor = new ActionExecutor();
