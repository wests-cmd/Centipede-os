import { WorkflowDefinition, WorkflowExecutionRun, WorkflowStep } from './types';
import { integrationRegistry } from '../workspace/registry';

export class WorkflowEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private runs: Map<string, WorkflowExecutionRun> = new Map();

  constructor() {
    this.initDefaultWorkflows();
  }

  private initDefaultWorkflows(): void {
    const defaultWorkflow: WorkflowDefinition = {
      workflowId: 'wf_invoice_cleanup',
      name: 'Invoice Cleanup & Archive Routine',
      version: '1.0.0',
      description: 'Finds completed invoice files and archives them safely.',
      triggerType: 'MANUAL',
      budget: { maxRuntimeMs: 30000, maxActions: 10, maxRetries: 3, maxLoopCycles: 5 },
      trustState: 'ACTIVE',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [
        { stepId: 'step_1', name: 'Find Invoices', capabilityId: 'filesystem.read', parameters: { path: '/app/documents' }, riskLevel: 'LOW', requiresHumanApproval: false, expectedOutcome: 'List of invoice files' },
        { stepId: 'step_2', name: 'Archive Invoices', capabilityId: 'filesystem.write', parameters: { dest: '/app/archive' }, riskLevel: 'MEDIUM', requiresHumanApproval: false, expectedOutcome: 'Archived files' },
      ],
    };
    this.workflows.set(defaultWorkflow.workflowId, defaultWorkflow);
  }

  public registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.workflowId, { ...workflow });
  }

  public getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    const wf = this.workflows.get(workflowId);
    return wf ? JSON.parse(JSON.stringify(wf)) : undefined;
  }

  public listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values()).map((w) => JSON.parse(JSON.stringify(w)));
  }

  public executeWorkflow(workflowId: string): WorkflowExecutionRun {
    const wf = this.workflows.get(workflowId);
    if (!wf) {
      throw new Error(`WORKFLOW_NOT_FOUND: Workflow "${workflowId}" is not registered.`);
    }

    if (wf.trustState !== 'ACTIVE' && wf.trustState !== 'APPROVED') {
      throw new Error(`WORKFLOW_BLOCKED: Workflow "${wf.name}" is in trust state "${wf.trustState}" and cannot execute.`);
    }

    const runId = `run_wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const run: WorkflowExecutionRun = {
      runId,
      workflowId: wf.workflowId,
      workflowVersion: wf.version,
      status: 'EXECUTING',
      executedStepsCount: 0,
      history: [],
      startTime: Date.now(),
    };

    // Cycle / Loop protection check
    if (wf.steps.length > wf.budget.maxActions) {
      run.status = 'BLOCKED';
      run.error = `Budget Exceeded: Workflow steps count (${wf.steps.length}) exceeds budget max actions (${wf.budget.maxActions}).`;
      this.runs.set(runId, run);
      return run;
    }

    for (const step of wf.steps) {
      // Execute capability through IntegrationRegistry
      const res = integrationRegistry.executeCapability('int_filesystem', step.capabilityId, step.parameters);

      if (res.status === 'APPROVAL_REQUIRED') {
        run.status = 'WAITING_APPROVAL';
        run.history.push({ stepId: step.stepId, capabilityId: step.capabilityId, status: 'WAITING_APPROVAL', timestamp: Date.now() });
        this.runs.set(runId, run);
        return run;
      }

      if (res.status === 'BLOCKED' || res.status === 'FAILED') {
        run.status = 'FAILED';
        run.error = res.error;
        run.history.push({ stepId: step.stepId, capabilityId: step.capabilityId, status: 'FAILED', timestamp: Date.now() });
        this.runs.set(runId, run);
        return run;
      }

      run.executedStepsCount++;
      run.history.push({ stepId: step.stepId, capabilityId: step.capabilityId, status: 'VERIFIED', timestamp: Date.now() });
    }

    run.status = 'COMPLETED';
    run.endTime = Date.now();
    this.runs.set(runId, run);
    return run;
  }

  public getRun(runId: string): WorkflowExecutionRun | undefined {
    return this.runs.get(runId);
  }
}

export const workflowEngine = new WorkflowEngine();
