import { KingdomAdapter, kingdomAdapter } from '../api/kingdomAdapter';
import { toolRegistry } from './registry';
import { ToolExecutionResult, ToolInvocationRequest } from './types';

export class ToolExecutor {
  private adapter: KingdomAdapter;
  private maxChainDepth = 5;

  constructor(adapter: KingdomAdapter = kingdomAdapter) {
    this.adapter = adapter;
  }

  public async execute(req: ToolInvocationRequest): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const idempotencyKey = req.idempotencyKey || `idemp_${req.toolId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Tool Chain Composition Bounding
    if (req.chainDepth > this.maxChainDepth) {
      return {
        invocationId: req.id,
        toolId: req.toolId,
        status: 'BLOCKED',
        error: `CHAIN_LIMIT_EXCEEDED: Maximum tool chain depth (${this.maxChainDepth}) exceeded.`,
        executionTimeMs: Date.now() - startTime,
        idempotencyKey,
      };
    }

    // 2. Registry Lookup
    const tool = toolRegistry.getTool(req.toolId);
    if (!tool) {
      return {
        invocationId: req.id,
        toolId: req.toolId,
        status: 'BLOCKED',
        error: `UNKNOWN_TOOL: Tool "${req.toolId}" is not registered in verified tool registry.`,
        executionTimeMs: Date.now() - startTime,
        idempotencyKey,
      };
    }

    // 3. Input Parameter Schema Validation
    for (const reqProp of tool.inputSchema.required) {
      const val = req.parameters[reqProp];
      if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
        return {
          invocationId: req.id,
          toolId: req.toolId,
          status: 'BLOCKED',
          error: `INVALID_PARAMETERS: Missing or empty required parameter "${reqProp}" for tool "${tool.name}".`,
          executionTimeMs: Date.now() - startTime,
          idempotencyKey,
        };
      }
    }

    // 4. Security & Risk Enforcement
    const effectiveRiskClass = tool.riskClass; // Authoritative registered risk class (cannot be lowered by model)
    const requiresApproval = tool.requiresApproval || effectiveRiskClass === 'CRITICAL';

    if (requiresApproval) {
      try {
        const approvalReq = await this.adapter.create_approval(
          tool.capabilities[0] || 'none',
          tool.toolId,
          `Tool execution requires approval (${tool.name}): ${JSON.stringify(req.parameters)}`,
          'centipede_ai_tools',
          effectiveRiskClass,
          req.parameters
        );

        return {
          invocationId: req.id,
          toolId: tool.toolId,
          status: 'PENDING',
          data: {
            approvalId: approvalReq.id,
            toolId: tool.toolId,
            message: `Approval request created: ${approvalReq.id}. Action pending human approval in Kingdom.`,
          },
          executionTimeMs: Date.now() - startTime,
          idempotencyKey,
        };
      } catch (err: any) {
        return {
          invocationId: req.id,
          toolId: tool.toolId,
          status: 'BLOCKED',
          error: `Failed to create Kingdom approval request: ${err.message}`,
          executionTimeMs: Date.now() - startTime,
          idempotencyKey,
        };
      }
    }

    // 5. Execution with Timeout Enforcement
    const timeoutMs = tool.timeoutMs || 10000;

    try {
      const executionPromise = this.dispatchToolCall(tool.toolId, req.parameters);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TOOL_TIMEOUT')), timeoutMs);
      });

      const data = await Promise.race([executionPromise, timeoutPromise]);

      return {
        invocationId: req.id,
        toolId: tool.toolId,
        status: 'SUCCESS',
        data,
        executionTimeMs: Date.now() - startTime,
        idempotencyKey,
      };
    } catch (err: any) {
      if (err.message === 'TOOL_TIMEOUT') {
        return {
          invocationId: req.id,
          toolId: tool.toolId,
          status: 'TIMEOUT',
          error: `TOOL_TIMEOUT: Tool "${tool.name}" execution exceeded timeout limit (${timeoutMs}ms).`,
          executionTimeMs: Date.now() - startTime,
          idempotencyKey,
        };
      }

      return {
        invocationId: req.id,
        toolId: tool.toolId,
        status: 'FAILED',
        error: `Tool execution error: ${err.message}`,
        executionTimeMs: Date.now() - startTime,
        idempotencyKey,
      };
    }
  }

  private async dispatchToolCall(toolId: string, params: Record<string, any>): Promise<any> {
    switch (toolId) {
      case 'runtime.get_status':
        return this.adapter.get_status();
      case 'runtime.start':
        return this.adapter.start_runtime();
      case 'runtime.stop':
        return this.adapter.stop_runtime();
      case 'runtime.get_mode':
        return this.adapter.get_mode();
      case 'runtime.set_mode':
        return this.adapter.set_mode(params.mode);
      case 'tasks.submit':
        return this.adapter.submit_task(params.prompt, { source: 'verified_tool' });
      case 'tasks.list':
        return this.adapter.list_tasks();
      case 'tasks.get':
        return this.adapter.get_task(params.taskId);
      case 'tasks.cancel':
        return this.adapter.cancel_task(params.taskId);
      case 'knights.list':
        return this.adapter.get_knights();
      case 'models.health':
        return this.adapter.get_models();
      case 'memory.read':
        return this.adapter.get_memory();
      case 'memory.search':
        return this.adapter.search_memory(params.query);
      case 'maps.list':
        return this.adapter.get_maps();
      case 'security.status':
        return this.adapter.get_security_status();
      case 'security.permissions':
        return this.adapter.get_permissions();
      case 'security.approvals_list':
        return this.adapter.list_approvals();
      case 'security.approval_create':
        return this.adapter.create_approval(params.capability, params.operation);
      default:
        throw new Error(`Tool execution dispatch not found for "${toolId}".`);
    }
  }
}

export const toolExecutor = new ToolExecutor();
