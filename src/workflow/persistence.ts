import { syncSha256 } from '../security/cryptoUtils';
import { WorkflowDefinition, WorkflowExecutionRun, WorkflowStep } from './types';

const MAX_EXPORT_CHARS = 2_000_000;
const MAX_RECORDS = 1000;
const MAX_STEPS = 200;
const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 500): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max;
const count = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const positive = (v: unknown): v is number => count(v) && v > 0;
const risk = (v: unknown) => ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(v));

function validateStep(v: unknown): asserts v is WorkflowStep {
  if (!isRecord(v) || !text(v.stepId) || !text(v.name) || !text(v.capabilityId)
      || !isRecord(v.parameters) || !risk(v.riskLevel) || typeof v.requiresHumanApproval !== 'boolean'
      || !text(v.expectedOutcome, 10000)
      || (v.operation !== undefined && !text(v.operation))
      || (v.dependsOnStepIds !== undefined && (!Array.isArray(v.dependsOnStepIds)
        || v.dependsOnStepIds.length > MAX_STEPS || !v.dependsOnStepIds.every(x => text(x))))) {
    throw Error('Invalid workflow step');
  }
}

function importDraft(v: unknown): WorkflowDefinition {
  if (!isRecord(v) || !text(v.workflowId) || !text(v.name) || !text(v.version)
      || typeof v.description !== 'string' || v.description.length > 10000
      || !count(v.createdAt) || !count(v.updatedAt)
      || !Array.isArray(v.steps) || v.steps.length > MAX_STEPS || !isRecord(v.budget)
      || !positive(v.budget.maxRuntimeMs) || !positive(v.budget.maxActions)
      || !count(v.budget.maxRetries) || !count(v.budget.maxLoopCycles)) throw Error('Invalid workflow');
  const ids = new Set<string>();
  const steps = v.steps.map(raw => {
    validateStep(raw);
    if (ids.has(raw.stepId) || raw.dependsOnStepIds?.some(id => !ids.has(id))) throw Error('Invalid dependency order');
    ids.add(raw.stepId);
    // Imported parameters are data, never a grant. Compensation requires fresh review.
    const step: WorkflowStep = { stepId: raw.stepId, name: raw.name, capabilityId: raw.capabilityId,
      parameters: structuredClone(raw.parameters), riskLevel: raw.riskLevel,
      requiresHumanApproval: true, expectedOutcome: raw.expectedOutcome };
    if (raw.operation !== undefined) step.operation = raw.operation;
    if (raw.dependsOnStepIds) step.dependsOnStepIds = [...raw.dependsOnStepIds];
    return step;
  });
  const budget = { maxRuntimeMs: v.budget.maxRuntimeMs, maxActions: v.budget.maxActions,
    maxRetries: v.budget.maxRetries, maxLoopCycles: v.budget.maxLoopCycles };
  for (const key of ['maxNetworkCalls', 'maxToolCalls'] as const) {
    if (v.budget[key] !== undefined) {
      if (!count(v.budget[key])) throw Error('Invalid optional budget');
      Object.assign(budget, { [key]: v.budget[key] });
    }
  }
  return { workflowId: v.workflowId, name: v.name, version: v.version, description: v.description,
    createdAt: v.createdAt, updatedAt: v.updatedAt, steps, budget, triggerType: 'MANUAL', trustState: 'REVIEW_REQUIRED' };
}

function importRun(v: unknown): WorkflowExecutionRun {
  if (!isRecord(v) || !text(v.runId) || !text(v.workflowId) || !text(v.workflowVersion)
      || !count(v.startTime) || !count(v.executedStepsCount) || !isRecord(v.consumedBudget)) throw Error('Invalid run');
  const b = v.consumedBudget;
  if (!count(b.runtimeMs) || !count(b.actionsCount) || !count(b.networkCallsCount)
      || !count(b.toolCallsCount) || !count(b.loopCyclesCount)) throw Error('Invalid run budget');
  // An untrusted export is not a receipt. Preserve identity and bounded counters for reconciliation only.
  return { runId: v.runId, workflowId: v.workflowId, workflowVersion: v.workflowVersion,
    startTime: v.startTime, executedStepsCount: 0, status: 'REQUIRES_HUMAN_REVIEW', history: [], checkpoints: [],
    consumedBudget: { runtimeMs: b.runtimeMs, actionsCount: b.actionsCount, networkCallsCount: b.networkCallsCount,
      toolCallsCount: b.toolCallsCount, loopCyclesCount: b.loopCyclesCount },
    error: 'Imported run is unverified. Reconcile with Kingdom; never replay automatically.' };
}

/** Session state and portable exports only. The checksum detects corruption, not authenticity. */
export class WorkflowPersistenceStore {
  private persistedWorkflows = new Map<string, WorkflowDefinition>();
  private persistedRuns = new Map<string, WorkflowExecutionRun>();

  public saveWorkflow(workflow: WorkflowDefinition): void {
    this.persistedWorkflows.set(workflow.workflowId, structuredClone(workflow));
  }

  public getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    const wf = this.persistedWorkflows.get(workflowId);
    return wf ? structuredClone(wf) : undefined;
  }

  public listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.persistedWorkflows.values(), w => structuredClone(w));
  }

  public saveRun(run: WorkflowExecutionRun): void {
    this.persistedRuns.set(run.runId, structuredClone(run));
  }

  public getRun(runId: string): WorkflowExecutionRun | undefined {
    const run = this.persistedRuns.get(runId);
    return run ? structuredClone(run) : undefined;
  }

  /** Legacy field name retained for export compatibility; not a cryptographic signature. */
  public computeIntegritySignature(payloadJson: string): string {
    return syncSha256(payloadJson);
  }

  public exportDurableState(): string {
    const data = { workflows: this.listWorkflows(), runs: Array.from(this.persistedRuns.values()) };
    return JSON.stringify({ data, signature: this.computeIntegritySignature(JSON.stringify(data)) }, null, 2);
  }

  public recoverFromState(stateJson: string): void {
    try {
      if (typeof stateJson !== 'string' || stateJson.length > MAX_EXPORT_CHARS) throw Error('Export exceeds size limit');
      const parsed: unknown = JSON.parse(stateJson);
      if (!isRecord(parsed) || !isRecord(parsed.data) || !text(parsed.signature, 64)
          || parsed.signature !== this.computeIntegritySignature(JSON.stringify(parsed.data))) {
        throw Error('PERSISTENCE_TAMPERING_DETECTED: Export checksum missing or incorrect.');
      }
      const { workflows, runs } = parsed.data;
      if (!Array.isArray(workflows) || !Array.isArray(runs)
          || workflows.length > MAX_RECORDS || runs.length > MAX_RECORDS) throw Error('Invalid export collections');
      const nextWorkflows = new Map<string, WorkflowDefinition>();
      const nextRuns = new Map<string, WorkflowExecutionRun>();
      for (const raw of workflows) {
        const wf = importDraft(raw);
        if (nextWorkflows.has(wf.workflowId)) throw Error('Duplicate workflow ID');
        nextWorkflows.set(wf.workflowId, wf);
      }
      for (const raw of runs) {
        const run = importRun(raw);
        if (nextRuns.has(run.runId)) throw Error('Duplicate run ID');
        nextRuns.set(run.runId, run);
      }
      // Validate everything before changing either collection. Do not overwrite live authorized records.
      for (const [id, wf] of nextWorkflows) {
        if (!this.persistedWorkflows.has(id)) this.persistedWorkflows.set(id, wf);
      }
      for (const [id, run] of nextRuns) {
        if (!this.persistedRuns.has(id)) this.persistedRuns.set(id, run);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid state';
      if (message.startsWith('PERSISTENCE_TAMPERING_DETECTED')) throw error;
      throw Error('PERSISTENCE_RECOVERY_FAILED: ' + message);
    }
  }
}

export const workflowPersistenceStore = new WorkflowPersistenceStore();
