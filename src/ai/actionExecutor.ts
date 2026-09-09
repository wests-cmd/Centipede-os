import { KingdomAdapter, kingdomAdapter } from '../api/kingdomAdapter';
import { toolExecutor, toolRegistry } from '../tools';
import { ActionRequest, ActionResult, Intent } from './types';

export class ActionExecutor {
  private adapter: KingdomAdapter;

  constructor(adapter: KingdomAdapter = kingdomAdapter) {
    this.adapter = adapter;
  }

  public async execute(action: ActionRequest, intent: Intent): Promise<ActionResult> {
    const timestamp = Date.now();

    // 1. Mandatory Fail-Closed Security Gate Enforcement
    // NEVER trust a caller-supplied authorizationState string as proof of authorization.
    if (action.authorizationState === 'DENIED') {
      return {
        actionId: action.id,
        status: 'BLOCKED',
        error: 'Action execution denied by ZeroTrust permission policy.',
        timestamp,
      };
    }

    // 2. Resolve target tool from registry
    const tool = toolRegistry.getToolByCapability(action.capability);
    if (!tool) {
      return {
        actionId: action.id,
        status: 'BLOCKED',
        error: `Unsupported or unknown intent/capability "${action.capability}". No Kingdom action executed.`,
        timestamp,
      };
    }

    // 3. Delegate to Verified ToolExecutor Execution Gate
    // ToolExecutor independently validates JIT grant / approval requirements before dispatching
    const toolResult = await toolExecutor.execute({
      id: action.id,
      toolId: tool.toolId,
      capability: action.capability,
      operation: action.operation,
      parameters: action.parameters,
      chainDepth: 1,
      riskLevel: tool.riskClass,
      grantId: action.grantId,
      approvalId: action.approvalId,
      agentId: action.agentId || 'default_agent',
      sessionId: action.sessionId,
      userId: action.userId,
      deviceId: action.deviceId,
      workflowId: action.workflowId,
      runId: action.runId,
      stepId: action.stepId,
    });

    return {
      actionId: action.id,
      status: toolResult.status,
      data: toolResult.data,
      error: toolResult.error,
      timestamp,
    };
  }
}

export const actionExecutor = new ActionExecutor();
