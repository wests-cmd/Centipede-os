import { createHash } from 'node:crypto';
import { WorkflowDefinition, WorkflowExecutionRun } from './types';

export class WorkflowPersistenceStore {
  private persistedWorkflows: Map<string, WorkflowDefinition> = new Map();
  private persistedRuns: Map<string, WorkflowExecutionRun> = new Map();

  public saveWorkflow(workflow: WorkflowDefinition): void {
    this.persistedWorkflows.set(workflow.workflowId, JSON.parse(JSON.stringify(workflow)));
  }

  public getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    const wf = this.persistedWorkflows.get(workflowId);
    return wf ? JSON.parse(JSON.stringify(wf)) : undefined;
  }

  public saveRun(run: WorkflowExecutionRun): void {
    this.persistedRuns.set(run.runId, JSON.parse(JSON.stringify(run)));
  }

  public getRun(runId: string): WorkflowExecutionRun | undefined {
    const run = this.persistedRuns.get(runId);
    return run ? JSON.parse(JSON.stringify(run)) : undefined;
  }

  public computeIntegritySignature(payloadJson: string): string {
    return createHash('sha256').update(payloadJson).digest('hex');
  }

  public exportDurableState(): string {
    const rawData = {
      workflows: Array.from(this.persistedWorkflows.values()),
      runs: Array.from(this.persistedRuns.values()),
    };
    const jsonContent = JSON.stringify(rawData);
    const signature = this.computeIntegritySignature(jsonContent);
    return JSON.stringify({
      data: rawData,
      signature,
    }, null, 2);
  }

  public recoverFromState(stateJson: string): void {
    try {
      const parsed = JSON.parse(stateJson);
      if (!parsed || !parsed.data || !parsed.signature) {
        throw new Error('PERSISTENCE_TAMPERING_DETECTED: State integrity signature missing or invalid! Unsigned state rejected.');
      }

      const expectedSignature = this.computeIntegritySignature(JSON.stringify(parsed.data));
      if (parsed.signature !== expectedSignature) {
        throw new Error('PERSISTENCE_TAMPERING_DETECTED: State integrity signature check failed. Persisted data was modified!');
      }

      const dataToLoad = parsed.data;

      if (Array.isArray(dataToLoad.workflows)) {
        dataToLoad.workflows.forEach((w: WorkflowDefinition) => {
          this.persistedWorkflows.set(w.workflowId, w);
        });
      }
      if (Array.isArray(dataToLoad.runs)) {
        dataToLoad.runs.forEach((r: WorkflowExecutionRun) => this.persistedRuns.set(r.runId, r));
      }
    } catch (e: any) {
      if (e.message.startsWith('PERSISTENCE_TAMPERING_DETECTED')) {
        throw e;
      }
      throw new Error(`PERSISTENCE_RECOVERY_FAILED: ${e.message}`);
    }
  }
}

export const workflowPersistenceStore = new WorkflowPersistenceStore();
