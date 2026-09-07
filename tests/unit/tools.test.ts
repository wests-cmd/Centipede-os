import { test, expect } from 'bun:test';
import { toolRegistry, toolExecutor } from '../../src/tools';
import { ToolInvocationRequest } from '../../src/tools/types';

test('Attack 1 — Requesting Nonexistent Tool Fails Closed', async () => {
  const req: ToolInvocationRequest = {
    id: 'inv_1',
    toolId: 'nonexistent_malicious_tool',
    capability: 'system.hack',
    parameters: {},
    chainDepth: 1,
    riskLevel: 'LOW',
  };

  const res = await toolExecutor.execute(req);
  expect(res.status).toBe('BLOCKED');
  expect(res.error).toContain('UNKNOWN_TOOL');
});

test('Attack 2 — Runtime Tool Registration / Modification Prohibited After Init', () => {
  expect(() => {
    toolRegistry.register({
      toolId: 'malicious.backdoor',
      name: 'Backdoor Tool',
      description: 'Attempt to register tool at runtime',
      version: '1.0.0',
      capabilities: ['system.admin'],
      category: 'PRIVILEGED',
      inputSchema: { type: 'object', properties: {}, required: [] },
      riskClass: 'CRITICAL',
      requiresApproval: false,
      timeoutMs: 1000,
      sideEffects: true,
    });
  }).toThrow('ToolRegistry is locked');
});

test('Attack 3 — Model Cannot Lower Authoritative Tool Risk Class', async () => {
  const registeredTool = toolRegistry.getTool('filesystem.delete_restricted');
  expect(registeredTool).toBeDefined();
  expect(registeredTool?.riskClass).toBe('CRITICAL');
  expect(registeredTool?.requiresApproval).toBe(true);

  // Model attempts to invoke with artificially lowered risk level 'LOW'
  const req: ToolInvocationRequest = {
    id: 'inv_risk_tamper',
    toolId: 'filesystem.delete_restricted',
    capability: 'filesystem.delete',
    parameters: { target: '/etc/passwd' },
    chainDepth: 1,
    riskLevel: 'LOW', // Fake low risk level
  };

  const res = await toolExecutor.execute(req);
  // Authoritative CRITICAL risk class and requiresApproval remain enforced!
  expect(res.status).toBe('PENDING');
  expect(res.data?.message).toContain('Approval request created');
});

test('Attack 4 — Missing Required Parameters Block Execution', async () => {
  const req: ToolInvocationRequest = {
    id: 'inv_missing_param',
    toolId: 'tasks.cancel',
    capability: 'tasks.cancel',
    parameters: {}, // Missing required taskId!
    chainDepth: 1,
    riskLevel: 'HIGH',
  };

  const res = await toolExecutor.execute(req);
  expect(res.status).toBe('BLOCKED');
  expect(res.error).toContain('INVALID_PARAMETERS');
});

test('Attack 5 — Tool Chain Depth Limit Enforced (Max Depth 5)', async () => {
  const req: ToolInvocationRequest = {
    id: 'inv_chain_depth',
    toolId: 'runtime.get_status',
    capability: 'runtime.status',
    parameters: {},
    chainDepth: 6, // Exceeds max depth 5!
    riskLevel: 'LOW',
  };

  const res = await toolExecutor.execute(req);
  expect(res.status).toBe('BLOCKED');
  expect(res.error).toContain('CHAIN_LIMIT_EXCEEDED');
});

test('Attack 6 — Generic Execution Primitives (shell, execute_anything) Fail Closed', async () => {
  const req: ToolInvocationRequest = {
    id: 'inv_shell',
    toolId: 'shell',
    capability: 'process.execute',
    parameters: { command: 'rm -rf /' },
    chainDepth: 1,
    riskLevel: 'CRITICAL',
  };

  const res = await toolExecutor.execute(req);
  expect(res.status).toBe('BLOCKED');
  expect(res.error).toContain('UNKNOWN_TOOL');
});

test('Attack 7 — Idempotency Key Generation for Mutating Tools', async () => {
  const req: ToolInvocationRequest = {
    id: 'inv_idemp',
    toolId: 'tasks.submit',
    capability: 'tasks.create',
    parameters: { prompt: 'Test task' },
    idempotencyKey: 'idemp_key_custom_123',
    chainDepth: 1,
    riskLevel: 'MEDIUM',
  };

  // When offline, creation throws KINGDOM_OFFLINE or returns result with idempotencyKey
  const res = await toolExecutor.execute(req);
  expect(res.idempotencyKey).toBe('idemp_key_custom_123');
});
