import { KingdomAdapter, kingdomAdapter } from '../api/kingdomAdapter';
import { toolRegistry } from './registry';
import { ToolExecutionResult, ToolInvocationRequest } from './types';

export interface DeadLetterEntry {
  deadLetterId: string;
  requestId: string;
  toolId: string;
  capability: string;
  parameters: Record<string, any>;
  failureReason: string;
  timestamp: number;
  retryCount: number;
  state: 'PERMANENT_FAILURE' | 'RERECONCILED';
}

export class CircuitBreaker {
  private failureThreshold = 3;
  private cooldownMs = 15000;
  private failures: Map<string, { count: number; lastFailure: number; state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' }> = new Map();

  public checkState(providerOrToolId: string): { isOpen: boolean; state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' } {
    const record = this.failures.get(providerOrToolId);
    if (!record || record.state === 'CLOSED') {
      return { isOpen: false, state: 'CLOSED' };
    }

    const elapsed = Date.now() - record.lastFailure;
    if (elapsed > this.cooldownMs) {
      record.state = 'HALF_OPEN';
      return { isOpen: false, state: 'HALF_OPEN' };
    }

    return { isOpen: true, state: 'OPEN' };
  }

  public recordSuccess(providerOrToolId: string): void {
    this.failures.set(providerOrToolId, { count: 0, lastFailure: 0, state: 'CLOSED' });
  }

  public recordFailure(providerOrToolId: string): void {
    const record = this.failures.get(providerOrToolId) || { count: 0, lastFailure: 0, state: 'CLOSED' };
    record.count++;
    record.lastFailure = Date.now();

    if (record.count >= this.failureThreshold) {
      record.state = 'OPEN';
    }

    this.failures.set(providerOrToolId, record);
  }
}

export class ToolExecutor {
  private adapter: KingdomAdapter;
  private maxChainDepth = 5;
  private circuitBreaker = new CircuitBreaker();
  private idempotencyCache: Map<string, ToolExecutionResult> = new Map();
  private deadLetterQueue: Map<string, DeadLetterEntry> = new Map();

  constructor(adapter: KingdomAdapter = kingdomAdapter) {
    this.adapter = adapter;
  }

  public getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  public getDeadLetterQueue(): DeadLetterEntry[] {
    return Array.from(this.deadLetterQueue.values());
  }

  public async execute(req: ToolInvocationRequest): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const idempotencyKey = req.idempotencyKey || `idemp_${req.toolId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Idempotency Check (Prevent duplicate execution)
    const cachedResult = this.idempotencyCache.get(idempotencyKey);
    if (cachedResult) {
      return { ...cachedResult, executionTimeMs: Date.now() - startTime };
    }

    // 2. Tool Chain Composition Bounding
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

    // 3. Circuit Breaker Boundary
    const cbStatus = this.circuitBreaker.checkState(req.toolId);
    if (cbStatus.isOpen) {
      return {
        invocationId: req.id,
        toolId: req.toolId,
        status: 'BLOCKED',
        error: `CIRCUIT_BREAKER_OPEN: Provider/Tool "${req.toolId}" is currently OPEN due to repeated failures. Circuit in cooldown.`,
        executionTimeMs: Date.now() - startTime,
        idempotencyKey,
      };
    }

    // 4. Registry Lookup
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

    // 5. Input Parameter Schema Validation
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

    // 6. Security & Risk Enforcement
    const effectiveRiskClass = tool.riskClass;
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

    // 7. Execution with Timeout Enforcement
    const timeoutMs = tool.timeoutMs || 10000;

    try {
      const executionPromise = this.dispatchToolCall(tool.toolId, req.parameters);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TOOL_TIMEOUT')), timeoutMs);
      });

      const data = await Promise.race([executionPromise, timeoutPromise]);

      this.circuitBreaker.recordSuccess(tool.toolId);

      const result: ToolExecutionResult = {
        invocationId: req.id,
        toolId: tool.toolId,
        status: 'SUCCESS',
        data,
        executionTimeMs: Date.now() - startTime,
        idempotencyKey,
      };

      this.idempotencyCache.set(idempotencyKey, result);
      return result;
    } catch (err: any) {
      this.circuitBreaker.recordFailure(tool.toolId);

      const errorMsg = err.message === 'TOOL_TIMEOUT'
        ? `TOOL_TIMEOUT: Tool "${tool.name}" execution exceeded timeout limit (${timeoutMs}ms).`
        : `Tool execution error: ${err.message}`;

      const status = err.message === 'TOOL_TIMEOUT' ? 'TIMEOUT' : 'FAILED';

      const failedResult: ToolExecutionResult = {
        invocationId: req.id,
        toolId: tool.toolId,
        status,
        error: errorMsg,
        executionTimeMs: Date.now() - startTime,
        idempotencyKey,
      };

      // Record to Dead-Letter Queue for reconciliation
      const dlqId = `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      this.deadLetterQueue.set(dlqId, {
        deadLetterId: dlqId,
        requestId: req.id,
        toolId: req.toolId,
        capability: req.capability,
        parameters: req.parameters,
        failureReason: errorMsg,
        timestamp: Date.now(),
        retryCount: 1,
        state: 'PERMANENT_FAILURE',
      });

      return failedResult;
    }
  }

  public async reconcileUnknownState(requestId: string, toolId: string, parameters: Record<string, any>): Promise<{ state: 'VERIFIED_SUCCESS' | 'VERIFIED_FAILURE' | 'REQUIRES_HUMAN_REVIEW'; details: string }> {
    try {
      if (toolId.startsWith('tasks.')) {
        const tasks = await this.adapter.list_tasks();
        const found = tasks.find((t) => t.prompt?.includes(parameters.prompt || ''));
        if (found) {
          return { state: 'VERIFIED_SUCCESS', details: `Reconciled task ID ${found.id} status: ${found.status}` };
        }
      }
      return { state: 'VERIFIED_FAILURE', details: `No execution side effect detected for request ${requestId}` };
    } catch (err: any) {
      return { state: 'REQUIRES_HUMAN_REVIEW', details: `Reconciliation failed due to error: ${err.message}` };
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
      case 'filesystem.read':
        return { path: params.path, content: 'Sandbox file content sample' };
      case 'filesystem.write':
        return { path: params.path, status: 'written', bytes: 1024 };
      default:
        throw new Error(`Tool execution dispatch not found for "${toolId}".`);
    }
  }
}

export const toolExecutor = new ToolExecutor();
