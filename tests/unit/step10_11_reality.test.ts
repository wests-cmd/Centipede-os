import { describe, it, expect, beforeEach } from 'vitest';
import { integrationRegistry } from '../../src/workspace/registry';
import { workflowEngine } from '../../src/workflow/engine';
import { workflowPersistenceStore } from '../../src/workflow/persistence';
import { WorkflowDefinition } from '../../src/workflow/types';

describe('Step 10 & 11 — Production Reality & Security Adversarial Suite', () => {
  beforeEach(() => {
    // Setup test environment
  });

  it('Test 1 — Unauthenticated External Integrations Report NEEDS_AUTH and Fail Closed', async () => {
    const emailRes = await integrationRegistry.executeCapability('int_email', 'email.read', { id: 'm1' });
    expect(emailRes.status).toBe('BLOCKED');
    expect(emailRes.error).toContain('INTEGRATION_UNAVAILABLE');
    expect(emailRes.error).toContain('NEEDS_AUTH');
  });

  it('Test 2 — Generated Natural-Language Workflows Default to DRAFT and Block Direct Execution', async () => {
    const proposal = workflowEngine.proposeGeneratedWorkflow(
      'Clean Temp Files',
      'Deletes temp files in sandbox',
      [
        { stepId: 's1', name: 'Read Temp', capabilityId: 'filesystem.read', parameters: { path: '.' }, riskLevel: 'LOW', requiresHumanApproval: false, expectedOutcome: 'List files' },
      ]
    );

    expect(proposal.trustState).toBe('DRAFT');

    // Attempting to execute a DRAFT workflow fails closed!
    await expect(workflowEngine.executeWorkflow(proposal.workflowId)).rejects.toThrow('WORKFLOW_BLOCKED');
  });

  it('Test 3 — Active Workflow Version Immutability Prevents In-Place Payload Mutation', () => {
    const activeWorkflow: WorkflowDefinition = {
      workflowId: 'wf_immutable_test',
      name: 'Immutable Test Routine',
      version: '1.0.0',
      description: 'Active immutable routine',
      triggerType: 'MANUAL',
      budget: { maxRuntimeMs: 30000, maxActions: 10, maxRetries: 1, maxLoopCycles: 1 },
      trustState: 'ACTIVE',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [],
    };

    workflowEngine.registerWorkflow(activeWorkflow);

    // Attempting to overwrite an active version throws WORKFLOW_IMMUTABLE
    expect(() => workflowEngine.registerWorkflow(activeWorkflow)).toThrow('WORKFLOW_IMMUTABLE');
  });

  it('Test 4 — Workflow Persistence Store Persists State across Restart', () => {
    const durableState = workflowPersistenceStore.exportDurableState();
    expect(durableState).toContain('wf_invoice_cleanup');

    // Recover state
    workflowPersistenceStore.recoverFromState(durableState);
    const recovered = workflowPersistenceStore.getWorkflow('wf_invoice_cleanup');
    expect(recovered?.name).toBe('Invoice Cleanup & Archive Routine');
  });
});
