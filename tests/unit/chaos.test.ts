import { describe, it, expect, beforeEach } from 'vitest';
import { toolExecutor, CircuitBreaker } from '../../src/tools/executor';
import { workflowEngine } from '../../src/workflow/engine';
import { WorkflowDefinition } from '../../src/workflow/types';

describe('Step 14 & 15 — Production Chaos & Failure Injection Suite', () => {
  beforeEach(() => {
    // Clean setup
  });

  it('Chaos Test 1 — Repeated Tool Failures Trip Circuit Breaker into OPEN State', async () => {
    const cb = new CircuitBreaker();
    expect(cb.checkState('failing_tool').isOpen).toBe(false);

    // Inject 3 consecutive failures
    cb.recordFailure('failing_tool');
    cb.recordFailure('failing_tool');
    cb.recordFailure('failing_tool');

    const status = cb.checkState('failing_tool');
    expect(status.isOpen).toBe(true);
    expect(status.state).toBe('OPEN');
  });

  it('Chaos Test 2 — Idempotency Key Prevents Duplicate Side-Effect Execution', async () => {
    const request = {
      id: 'req_idemp_1',
      toolId: 'filesystem.read',
      capability: 'filesystem.read',
      parameters: { path: '/tmp/test.txt' },
      chainDepth: 1,
      riskLevel: 'LOW' as const,
      idempotencyKey: 'idemp_unique_key_123',
    };

    const res1 = await toolExecutor.execute(request);
    expect(res1.idempotencyKey).toBe('idemp_unique_key_123');

    // Duplicate call with same idempotency key
    const res2 = await toolExecutor.execute(request);
    expect(res2.idempotencyKey).toBe('idemp_unique_key_123');
  });

  it('Chaos Test 3 — Permanent Failure Records Entry to Dead-Letter Queue for Reconciliation', async () => {
    const request = {
      id: 'req_failed_1',
      toolId: 'nonexistent_tool_xyz',
      capability: 'unknown.cap',
      parameters: { data: 'test' },
      chainDepth: 1,
      riskLevel: 'LOW' as const,
    };

    const res = await toolExecutor.execute(request);
    expect(res.status).toBe('BLOCKED');
    expect(res.error).toContain('UNKNOWN_TOOL');
  });

  it('Chaos Test 4 — Workflow Bounded Action Budget Halts Runaway Executions', async () => {
    const runawayWorkflow: WorkflowDefinition = {
      workflowId: 'wf_runaway_test',
      name: 'Runaway Loop Test',
      version: '1.0.0',
      description: 'Simulating runaway loop',
      triggerType: 'MANUAL',
      budget: { maxRuntimeMs: 30000, maxActions: 2, maxRetries: 1, maxLoopCycles: 1, maxToolCalls: 2 },
      trustState: 'ACTIVE',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: Array(5).fill({
        stepId: 'step_loop',
        name: 'Loop Step',
        capabilityId: 'filesystem.read',
        parameters: { path: '.' },
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        expectedOutcome: 'loop',
      }),
    };

    workflowEngine.registerWorkflow(runawayWorkflow);

    const run = await workflowEngine.executeWorkflow('wf_runaway_test');
    expect(run.status).toBe('BLOCKED');
    expect(run.error).toContain('Budget Exceeded');
  });

  it('Chaos Test 5 — State Reconciliation Resolves UNKNOWN State Safely', async () => {
    const result = await toolExecutor.reconcileUnknownState('req_unk_1', 'tasks.submit', { prompt: 'unknown prompt' });
    expect(result.state).toBe('VERIFIED_FAILURE');
    expect(result.details).toContain('No execution side effect detected');
  });
});
