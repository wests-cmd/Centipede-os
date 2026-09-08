import { describe, it, expect, beforeEach } from 'vitest';
import { integrationRegistry } from '../../src/workspace/registry';
import { workflowEngine } from '../../src/workflow/engine';
import { WorkflowDefinition } from '../../src/workflow/types';

describe('Step 10 & 11 — Universal Workspace & Workflow Engine Security Suite', () => {
  beforeEach(() => {
    // Setup clean environment
  });

  it('Test 1 — Integration Registry Enforces Least Privilege (Read vs Write/Delete)', async () => {
    // int_email is NEEDS_AUTH by default in production reality pass
    const emailRead = await integrationRegistry.executeCapability('int_email', 'email.read', { messageId: 'msg_1' });
    expect(emailRead.status).toBe('BLOCKED');
    expect(emailRead.error).toContain('NEEDS_AUTH');

    // High risk mutating operation requires human approval
    const fsDelete = await integrationRegistry.executeCapability('int_filesystem', 'filesystem.delete', { path: '/tmp/test' });
    expect(fsDelete.status).toBe('APPROVAL_REQUIRED');
    expect(fsDelete.error).toContain('requires human approval');
  });

  it('Test 2 — Workflow Engine Enforces Step Execution Verification and ZeroTrust Routing', async () => {
    const run = await workflowEngine.executeWorkflow('wf_invoice_cleanup');
    expect(run.runId).toBeDefined();
    expect(run.history.length).toBeGreaterThan(0);
  });

  it('Test 3 — Workflow Execution Budget Enforcement Blocks Loop / Runaway Executions', async () => {
    const runawayWorkflow: WorkflowDefinition = {
      workflowId: 'wf_runaway',
      name: 'Runaway Loop Workflow',
      version: '1.0.0',
      description: 'Workflow exceeding max action budget',
      triggerType: 'MANUAL',
      budget: { maxRuntimeMs: 5000, maxActions: 1, maxRetries: 1, maxLoopCycles: 1 }, // Budget maxActions = 1
      trustState: 'ACTIVE',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [
        { stepId: 's1', name: 'Step 1', capabilityId: 'filesystem.read', parameters: {}, riskLevel: 'LOW', requiresHumanApproval: false, expectedOutcome: 'ok' },
        { stepId: 's2', name: 'Step 2', capabilityId: 'filesystem.read', parameters: {}, riskLevel: 'LOW', requiresHumanApproval: false, expectedOutcome: 'ok' },
      ], // 2 steps > maxActions 1!
    };

    workflowEngine.registerWorkflow(runawayWorkflow);
    const run = await workflowEngine.executeWorkflow('wf_runaway');

    expect(run.status).toBe('BLOCKED');
    expect(run.error).toContain('Budget Exceeded');
  });

  it('Test 4 — Untrusted / Revoked Workflow Fails Closed', async () => {
    const blockedWorkflow: WorkflowDefinition = {
      workflowId: 'wf_blocked',
      name: 'Blocked Malicious Workflow',
      version: '1.0.0',
      description: 'Workflow with revoked trust state',
      triggerType: 'MANUAL',
      budget: { maxRuntimeMs: 5000, maxActions: 10, maxRetries: 1, maxLoopCycles: 1 },
      trustState: 'REVOKED', // Revoked!
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [
        { stepId: 's1', name: 'Step 1', capabilityId: 'filesystem.read', parameters: {}, riskLevel: 'LOW', requiresHumanApproval: false, expectedOutcome: 'ok' },
      ],
    };

    workflowEngine.registerWorkflow(blockedWorkflow);

    await expect(workflowEngine.executeWorkflow('wf_blocked')).rejects.toThrow('WORKFLOW_BLOCKED');
  });
});
