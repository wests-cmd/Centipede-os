import { LearningSignal, LearningSignalType, RiskLevel, SkillDefinition } from './types';

export interface EvaluationResult {
  passed: boolean;
  successRate: number;
  securityViolations: number;
  avgLatencyMs: number;
  reason: string;
}

export class LearningEngine {
  private signals: LearningSignal[] = [];
  private evidenceThreshold = 3;

  public recordSignal(type: LearningSignalType, intentType: string, capability: string, resultStatus: string, latencyMs = 100): LearningSignal {
    const signal: LearningSignal = {
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      intentType,
      capability,
      resultStatus,
      timestamp: Date.now(),
      metadata: { latencyMs },
    };

    this.signals.unshift(signal);
    if (this.signals.length > 100) {
      this.signals.pop();
    }

    return signal;
  }

  public shouldProposeCandidateSkill(capability: string): boolean {
    const matchingSignals = this.signals.filter(
      (s) => s.capability === capability && (s.type === 'SUCCESS' || s.type === 'TASK_COMPLETION')
    );

    return matchingSignals.length >= this.evidenceThreshold;
  }

  public evaluateCandidateSkill(skill: SkillDefinition, signals: LearningSignal[]): EvaluationResult {
    const relevant = signals.filter((s) => skill.requiredCapabilities.includes(s.capability));

    if (relevant.length === 0) {
      return {
        passed: false,
        successRate: 0,
        securityViolations: 0,
        avgLatencyMs: 0,
        reason: 'Insufficient signal data for evaluation.',
      };
    }

    const successes = relevant.filter((s) => s.type === 'SUCCESS' || s.type === 'TASK_COMPLETION').length;
    const failures = relevant.filter((s) => s.type === 'FAILURE' || s.type === 'TIMEOUT').length;
    const securityViolations = relevant.filter((s) => s.type === 'USER_DENIAL' || s.resultStatus === 'BLOCKED').length;

    const total = relevant.length;
    const successRate = total > 0 ? successes / total : 0;
    const avgLatencyMs = relevant.reduce((acc, s) => acc + (s.metadata?.latencyMs || 100), 0) / total;

    // HARD SECURITY RULE: Any candidate skill with >0 security violations MUST FAIL evaluation!
    if (securityViolations > 0) {
      return {
        passed: false,
        successRate,
        securityViolations,
        avgLatencyMs,
        reason: `Evaluation Failed: Security Hard Metric Violation! Skill produced ${securityViolations} security violations/denials.`,
      };
    }

    if (successRate < 0.8) {
      return {
        passed: false,
        successRate,
        securityViolations: 0,
        avgLatencyMs,
        reason: `Evaluation Failed: Success rate (${(successRate * 100).toFixed(0)}%) is below required threshold (80%).`,
      };
    }

    return {
      passed: true,
      successRate,
      securityViolations: 0,
      avgLatencyMs,
      reason: `Evaluation Passed: Success rate (${(successRate * 100).toFixed(0)}%), 0 security violations.`,
    };
  }

  public getSignals(): LearningSignal[] {
    return [...this.signals];
  }
}

export const learningEngine = new LearningEngine();
