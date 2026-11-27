import { describe, expect, it, vi, afterEach } from 'vitest';
import { WorkflowPersistenceStore } from '../../src/workflow/persistence';
import { WorkflowEngine } from '../../src/workflow/engine';
import { WorkflowDefinition } from '../../src/workflow/types';
import { toolExecutor, toolRegistry } from '../../src/tools';

const definition = (id: string): WorkflowDefinition => ({
  workflowId: id, name: 'Test workflow', description: 'Bounded test', version: '1.0.0',
  triggerType: 'MANUAL', trustState: 'ACTIVE', createdAt: 1, updatedAt: 1,
  budget: { maxRuntimeMs: 30000, maxActions: 2, maxRetries: 0, maxLoopCycles: 0 },
  steps: [
    { stepId: 'a', name: 'Read', capabilityId: 'filesystem.read', parameters: { path: '.' },
      riskLevel: 'LOW', requiresHumanApproval: false, expectedOutcome: 'Observed read', grantId: 'old-grant' },
    { stepId: 'b', name: 'Read again', capabilityId: 'filesystem.read', parameters: { path: '.' },
      riskLevel: 'LOW', requiresHumanApproval: false, expectedOutcome: 'Observed read', dependsOnStepIds: ['a'] }
  ],
});
afterEach(() => vi.restoreAllMocks());

describe('workflow state and evidence boundary', () => {
  it('imports checksummed data only as review-required drafts without grants', async () => {
    const original = new WorkflowPersistenceStore();
    original.saveWorkflow(definition('portable'));
    const recovered = new WorkflowPersistenceStore();
    recovered.recoverFromState(original.exportDurableState());
    const engine = new WorkflowEngine(recovered);
    expect(engine.getWorkflow('portable')?.trustState).toBe('REVIEW_REQUIRED');
    expect(engine.getWorkflow('portable')?.steps[0].grantId).toBeUndefined();
    expect(engine.getWorkflow('portable')?.steps[0].requiresHumanApproval).toBe(true);
    await expect(engine.executeWorkflow('portable')).rejects.toThrow('WORKFLOW_BLOCKED');
  });
  it('rejects malformed imports atomically and does not replace current records', () => {
    const store = new WorkflowPersistenceStore();
    store.saveWorkflow(definition('existing'));
    const data = { workflows: [definition('new'), { workflowId: 'bad' }], runs: [] };
    expect(() => store.recoverFromState(JSON.stringify({ data, signature: store.computeIntegritySignature(JSON.stringify(data)) }))).toThrow('PERSISTENCE_RECOVERY_FAILED');
    expect(store.getWorkflow('new')).toBeUndefined();
    const other = new WorkflowPersistenceStore();
    other.saveWorkflow({ ...definition('existing'), name: 'Overwritten' });
    store.recoverFromState(other.exportDurableState());
    expect(store.getWorkflow('existing')?.name).toBe('Test workflow');
  });
  it('copies nested workflow data and rejects unverified step evidence before dependents', async () => {
    const store = new WorkflowPersistenceStore();
    const engine = new WorkflowEngine(store);
    const wf = definition('bounded');
    engine.registerWorkflow(wf);
    wf.steps[0].parameters.path = 'changed';
    expect(engine.getWorkflow('bounded')?.steps[0].parameters.path).toBe('.');
    expect(toolRegistry.getToolByCapability('filesystem.read')).toBeDefined();
    const execute = vi.spyOn(toolExecutor, 'execute').mockResolvedValue({
      invocationId: 'a', toolId: 'fixture', status: 'SUCCESS', verificationState: 'SIMULATED'
    } as Awaited<ReturnType<typeof toolExecutor.execute>>);
    const run = await engine.executeWorkflow('bounded');
    expect(run.status).toBe('REQUIRES_HUMAN_REVIEW');
    expect(run.executedStepsCount).toBe(0);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(store.getRun(run.runId)?.status).toBe('REQUIRES_HUMAN_REVIEW');
    run.history.length = 0;
    expect(engine.getRun(run.runId)?.history.length).toBeGreaterThan(0);
  });
  it('retains dispatch observation when an executor throws and never retries automatically', async () => {
    const engine = new WorkflowEngine(new WorkflowPersistenceStore());
    engine.registerWorkflow(definition('unknown'));
    const execute = vi.spyOn(toolExecutor, 'execute').mockRejectedValue(new Error('lost connection'));
    const run = await engine.executeWorkflow('unknown');
    expect(run.status).toBe('REQUIRES_HUMAN_REVIEW');
    expect(run.history.at(-1)?.status).toBe('DISPATCHING');
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
