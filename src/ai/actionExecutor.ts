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

    // 1. Security Gate Enforcement
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

    // 3. Delegate to Verified ToolExecutor
    const toolResult = await toolExecutor.execute({
      id: action.id,
      toolId: tool.toolId,
      capability: action.capability,
      parameters: action.parameters,
      chainDepth: 1,
      riskLevel: tool.riskClass,
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
