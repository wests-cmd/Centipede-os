import { centipedeAIPipeline } from './pipeline';
import { ActionResult, Message, RiskLevel, UserInput } from './types';

export type AutonomyLevel = 'LEVEL_0' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4';

export interface AutonomyBudget {
  maxActions: number;
  maxRuntimeMs: number;
  maxRetries: number;
  maxRiskCeiling: RiskLevel;
}

export interface AutonomousRoutine {
  id: string;
  name: string;
  trigger: string;
  prompt: string;
  allowedCapabilities: string[];
  riskCeiling: RiskLevel;
  budget: AutonomyBudget;
  enabled: boolean;
}

export interface AutonomyRunState {
  currentLevel: AutonomyLevel;
  killSwitchActive: boolean;
  activeRunId: string | null;
  actionsExecuted: number;
  startTime: number | null;
  statusMessage: string;
  history: { actionId: string; capability: string; timestamp: number }[];
}

export class AutonomyEngine {
  private level: AutonomyLevel = 'LEVEL_0';
  private killSwitchActive = false;
  private activeRunId: string | null = null;
  private actionsExecuted = 0;
  private startTime: number | null = null;
  private statusMessage = 'Autonomy Engine Idle (Level 0 - Manual Only)';
  private actionHistory: { actionId: string; capability: string; timestamp: number }[] = [];

  private listeners: Set<(state: AutonomyRunState) => void> = new Set();

  public subscribe(listener: (state: AutonomyRunState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.getState()));
  }

  public setAutonomyLevel(level: AutonomyLevel): void {
    if (this.killSwitchActive) {
      throw new Error('Kill switch is engaged! Disengage kill switch before modifying autonomy level.');
    }
    this.level = level;
    this.statusMessage = `Autonomy Level updated to ${level}.`;
    this.notify();
  }

  public activateKillSwitch(): void {
    this.killSwitchActive = true;
    this.activeRunId = null;
    this.statusMessage = 'CRITICAL: Global Kill Switch Engaged! All autonomous execution blocked.';
    this.notify();
  }

  public resetKillSwitch(): void {
    this.killSwitchActive = false;
    this.level = 'LEVEL_0';
    this.statusMessage = 'Kill switch disengaged. Reset to Level 0 (Manual Only).';
    this.notify();
  }

  public async executeRoutine(routine: AutonomousRoutine, conversationId = 'auto_conv'): Promise<Message> {
    if (this.killSwitchActive) {
      throw new Error('Autonomous execution blocked: Global Kill Switch is engaged.');
    }

    if (this.level === 'LEVEL_0' || this.level === 'LEVEL_1') {
      throw new Error(`Routine execution blocked: Current Autonomy Level "${this.level}" prohibits autonomous execution.`);
    }

    if (!routine.enabled) {
      throw new Error(`Routine "${routine.name}" is disabled.`);
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.activeRunId = runId;
    this.startTime = Date.now();
    this.actionsExecuted = 0;
    this.actionHistory = [];

    this.statusMessage = `Executing routine "${routine.name}" (Run ID: ${runId})...`;
    this.notify();

    // Budget Enforcement check
    if (routine.budget.maxActions <= 0) {
      this.activeRunId = null;
      throw new Error('Autonomy Budget Exceeded: Max actions budget is zero.');
    }

    const input: UserInput = {
      id: `auto_in_${Date.now()}`,
      text: routine.prompt,
      timestamp: Date.now(),
      conversationId,
      source: 'AUTONOMY_ENGINE',
    };

    // Cycle & Infinite Loop Protection check
    const isLoopDetected = this.detectCycle(routine.prompt);
    if (isLoopDetected) {
      this.activeRunId = null;
      throw new Error('Autonomy Loop Protection: Detected repeating execution cycle. Execution aborted.');
    }

    const message = await centipedeAIPipeline.process(input);

    this.actionsExecuted++;
    this.actionHistory.push({
      actionId: message.id,
      capability: message.plan?.requiredCapabilities[0] || 'none',
      timestamp: Date.now(),
    });

    this.activeRunId = null;
    this.statusMessage = `Routine execution completed with status: ${message.status}`;
    this.notify();

    return message;
  }

  private detectCycle(prompt: string): boolean {
    const recent = this.actionHistory.slice(-3);
    if (recent.length < 3) return false;
    const firstCap = recent[0].capability;
    return recent.every((r) => r.capability === firstCap && firstCap !== 'none');
  }

  public getState(): AutonomyRunState {
    return {
      currentLevel: this.level,
      killSwitchActive: this.killSwitchActive,
      activeRunId: this.activeRunId,
      actionsExecuted: this.actionsExecuted,
      startTime: this.startTime,
      statusMessage: this.statusMessage,
      history: [...this.actionHistory],
    };
  }
}

export const autonomyEngine = new AutonomyEngine();
