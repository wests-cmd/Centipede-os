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

  public exportDurableState(): string {
    return JSON.stringify({
      workflows: Array.from(this.persistedWorkflows.values()),
      runs: Array.from(this.persistedRuns.values()),
    }, null, 2);
  }

  public recoverFromState(stateJson: string): void {
    try {
      const data = JSON.parse(stateJson);
      if (Array.isArray(data.workflows)) {
        data.workflows.forEach((w: WorkflowDefinition) => this.persistedWorkflows.set(w.workflowId, w));
      }
      if (Array.isArray(data.runs)) {
        data.runs.forEach((r: WorkflowExecutionRun) => this.persistedRuns.set(r.runId, r));
      }
    } catch (e) {
      // Handled
    }
  }
}

export const workflowPersistenceStore = new WorkflowPersistenceStore();
