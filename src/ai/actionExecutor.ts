import { KingdomAdapter, kingdomAdapter } from '../api/kingdomAdapter';
import { ActionRequest, ActionResult, Intent } from './types';

export class ActionExecutor {
  private adapter: KingdomAdapter;

  constructor(adapter: KingdomAdapter = kingdomAdapter) {
    this.adapter = adapter;
  }

  public async execute(action: ActionRequest, intent: Intent): Promise<ActionResult> {
    const timestamp = Date.now();

    // Security Gate Enforcement
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
          'execute_action',
          `Centipede AI request requires approval (${action.capability}): ${intent.originalInput}`,
          'centipede_ai',
          action.riskLevel
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

    // Dispatch Authorized Action via KingdomAdapter
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
        case 'GET_KNIGHTS':
          data = await this.adapter.get_knights();
          break;
        case 'CREATE_TASK':
          data = await this.adapter.submit_task(intent.parameters.prompt || intent.originalInput, { source: 'centipede_ai' });
          break;
        case 'LIST_TASKS':
          data = await this.adapter.list_tasks();
          break;
        case 'CANCEL_TASK':
          data = await this.adapter.cancel_task(intent.parameters.taskId);
          break;
        case 'GET_SECURITY_STATUS':
          data = await this.adapter.get_security_status();
          break;
        case 'GET_MEMORY':
          data = await this.adapter.get_memory();
          break;
        default:
          data = await this.adapter.get_status();
          break;
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
