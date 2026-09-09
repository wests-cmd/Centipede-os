import { WorkflowCheckpoint, WorkflowDefinition, WorkflowExecutionRun, WorkflowStep } from './types';
import { toolExecutor, toolRegistry } from '../tools';
import { capabilityGrantEngine } from '../agent/grants';
import { workflowPersistenceStore } from './persistence';

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
      budget: { maxRuntimeMs: 30000, maxActions: 10, maxRetries: 3, maxLoopCycles: 5, maxNetworkCalls: 10, maxToolCalls: 20 },
      trustState: 'ACTIVE',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [
        { stepId: 'step_1', name: 'Find Invoices', capabilityId: 'filesystem.read', parameters: { path: '.' }, riskLevel: 'LOW', requiresHumanApproval: false, expectedOutcome: 'List of invoice files' },
        { stepId: 'step_2', name: 'Archive Invoices', capabilityId: 'filesystem.write', parameters: { path: './archive' }, dependsOnStepIds: ['step_1'], riskLevel: 'MEDIUM', requiresHumanApproval: false, expectedOutcome: 'Archived files' },
      ],
    };
    this.registerWorkflow(defaultWorkflow);
  }

  public registerWorkflow(workflow: WorkflowDefinition): void {
    // Immutability Check: Active versions cannot be directly mutated
    const existing = this.workflows.get(workflow.workflowId);
    if (existing && existing.trustState === 'ACTIVE' && existing.version === workflow.version) {
      throw new Error(`WORKFLOW_IMMUTABLE: Active workflow "${workflow.workflowId}" v${workflow.version} is immutable. Create a new version.`);
    }

    this.workflows.set(workflow.workflowId, { ...workflow });
    workflowPersistenceStore.saveWorkflow(workflow);
  }

  public getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    const wf = this.workflows.get(workflowId) || workflowPersistenceStore.getWorkflow(workflowId);
    return wf ? JSON.parse(JSON.stringify(wf)) : undefined;
  }

  public listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values()).map((w) => JSON.parse(JSON.stringify(w)));
  }

  public proposeGeneratedWorkflow(
    name: string,
    description: string,
    steps: WorkflowStep[]
  ): WorkflowDefinition {
    const workflowId = `wf_gen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const proposal: WorkflowDefinition = {
      workflowId,
      name,
      version: '1.0.0',
      description,
      triggerType: 'MANUAL',
      budget: { maxRuntimeMs: 30000, maxActions: 5, maxRetries: 1, maxLoopCycles: 1, maxNetworkCalls: 5, maxToolCalls: 10 },
      trustState: 'DRAFT', // Security Directive: Generated workflows MUST default to DRAFT status!
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps,
    };

    this.registerWorkflow(proposal);
    return proposal;
  }

  public async executeWorkflow(workflowId: string, grantIdsByStep?: Record<string, string>): Promise<WorkflowExecutionRun> {
    const wf = this.getWorkflow(workflowId);
    if (!wf) {
      throw new Error(`WORKFLOW_NOT_FOUND: Workflow "${workflowId}" is not registered.`);
    }

    // Security Rule: Workflows in DRAFT, REVIEW_REQUIRED, BLOCKED, or REVOKED state MUST NOT execute!
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
      checkpoints: [],
      consumedBudget: {
        runtimeMs: 0,
        actionsCount: 0,
        networkCallsCount: 0,
        toolCallsCount: 0,
        loopCyclesCount: 0,
      },
      startTime: Date.now(),
    };

    // Cycle & Action Budget check
    if (wf.steps.length > wf.budget.maxActions) {
      run.status = 'BLOCKED';
      run.error = `Budget Exceeded: Workflow steps count (${wf.steps.length}) exceeds budget max actions (${wf.budget.maxActions}).`;
      this.runs.set(runId, run);
      workflowPersistenceStore.saveRun(run);
      return run;
    }

    const completedStepIds = new Set<string>();

    for (let idx = 0; idx < wf.steps.length; idx++) {
      const step = wf.steps[idx];

      // Dependency validation
      if (step.dependsOnStepIds && step.dependsOnStepIds.length > 0) {
        for (const depId of step.dependsOnStepIds) {
          if (!completedStepIds.has(depId)) {
            run.status = 'BLOCKED';
            run.error = `DEPENDENCY_FAILED: Step "${step.stepId}" depends on prerequisite step "${depId}" which did not successfully complete.`;
            run.history.push({ stepId: step.stepId, capabilityId: step.capabilityId, status: 'BLOCKED', timestamp: Date.now() });
            this.runs.set(runId, run);
            workflowPersistenceStore.saveRun(run);
            return run;
          }
        }
      }

      // Multi-dimensional Budget Bounding
      run.consumedBudget.runtimeMs = Date.now() - run.startTime;
      if (run.consumedBudget.runtimeMs > wf.budget.maxRuntimeMs) {
        run.status = 'BLOCKED';
        run.error = `BUDGET_EXCEEDED: Workflow execution time exceeded maximum runtime budget (${wf.budget.maxRuntimeMs}ms).`;
        this.runs.set(runId, run);
        workflowPersistenceStore.saveRun(run);
        return run;
      }

      run.consumedBudget.toolCallsCount++;
      if (wf.budget.maxToolCalls && run.consumedBudget.toolCallsCount > wf.budget.maxToolCalls) {
        run.status = 'BLOCKED';
        run.error = `BUDGET_EXCEEDED: Tool calls count (${run.consumedBudget.toolCallsCount}) exceeded maximum tool call budget (${wf.budget.maxToolCalls}).`;
        this.runs.set(runId, run);
        workflowPersistenceStore.saveRun(run);
        return run;
      }

      // Resolve tool for step capability
      const tool = toolRegistry.getToolByCapability(step.capabilityId);
      if (!tool) {
        run.status = 'FAILED';
        run.error = `UNKNOWN_CAPABILITY: No verified tool registered for capability "${step.capabilityId}".`;
        run.history.push({ stepId: step.stepId, capabilityId: step.capabilityId, status: 'FAILED', timestamp: Date.now() });
        this.runs.set(runId, run);
        workflowPersistenceStore.saveRun(run);
        return run;
      }

      const grantId = grantIdsByStep?.[step.stepId] || step.grantId;

      // Mandatory Security Fix: Execute capability exclusively through ToolExecutor execution gate!
      const toolRes = await toolExecutor.execute({
        id: `wf_${runId}_${step.stepId}`,
        toolId: tool.toolId,
        capability: step.capabilityId,
        operation: step.operation || 'execute',
        parameters: step.parameters,
        chainDepth: 1,
        riskLevel: step.riskLevel,
        grantId,
        agentId: 'workflow_agent',
        workflowId: wf.workflowId,
        runId,
        stepId: step.stepId,
      });

      if (toolRes.status === 'PENDING') {
        run.status = 'WAITING_APPROVAL';
        run.history.push({ stepId: step.stepId, capabilityId: step.capabilityId, status: 'WAITING_APPROVAL', timestamp: Date.now() });
        this.runs.set(runId, run);
        workflowPersistenceStore.saveRun(run);
        return run;
      }

      if (toolRes.status === 'BLOCKED' || toolRes.status === 'FAILED' || toolRes.status === 'TIMEOUT') {
        run.status = 'FAILED';
        run.error = toolRes.error;
        run.history.push({ stepId: step.stepId, capabilityId: step.capabilityId, status: toolRes.status, timestamp: Date.now() });

        // Trigger Compensating Action if defined
        if (step.compensatingAction) {
          const compTool = toolRegistry.getToolByCapability(step.compensatingAction.capabilityId);
          if (compTool) {
            await toolExecutor.execute({
              id: `comp_${runId}_${step.stepId}`,
              toolId: compTool.toolId,
              capability: step.compensatingAction.capabilityId,
              parameters: step.compensatingAction.parameters,
              chainDepth: 1,
              riskLevel: 'LOW',
            });
          }
        }

        this.runs.set(runId, run);
        workflowPersistenceStore.saveRun(run);
        return run;
      }

      // Mark step completed successfully
      completedStepIds.add(step.stepId);

      // Record durable checkpoint
      const checkpoint: WorkflowCheckpoint = {
        checkpointId: `chk_${Date.now()}_${idx}`,
        stepId: step.stepId,
        stepIndex: idx,
        status: 'SUCCESS',
        timestamp: Date.now(),
        stateSnapshot: { ...step.parameters, resultStatus: toolRes.status, verificationState: toolRes.verificationState },
      };
      run.checkpoints.push(checkpoint);

      run.executedStepsCount++;
      run.history.push({ stepId: step.stepId, capabilityId: step.capabilityId, status: 'VERIFIED', timestamp: Date.now() });
    }

    run.status = 'COMPLETED';
    run.endTime = Date.now();
    this.runs.set(runId, run);
    workflowPersistenceStore.saveRun(run);
    return run;
  }

  public getRun(runId: string): WorkflowExecutionRun | undefined {
    return this.runs.get(runId) || workflowPersistenceStore.getRun(runId);
  }
}

export const workflowEngine = new WorkflowEngine();
