import { MemoryItem } from '../learning/types';
import { memoryStore } from '../learning/memoryStore';
import { Plan } from './types';

export interface ContextItem {
  id: string;
  type: 'SHORT_TERM' | 'LONG_TERM' | 'EPISODIC' | 'PROCEDURAL' | 'SEMANTIC';
  content: string;
  source: string;
  relevanceScore: number;
  trustLevel: MemoryItem['trustLevel'];
  isStale: boolean;
  createdAt: number;
}

export interface DryRunResult {
  planId: string;
  intentSummary: string;
  simulatedSteps: {
    stepNumber: number;
    description: string;
    actionType: string;
    targetCapability: string;
    riskLevel: string;
    requiresHumanApproval: boolean;
    simulatedOutcome: string;
  }[];
  hasSideEffects: boolean;
  securitySummary: string;
}

export class ContextEngine {
  public getRankedContext(query: string, maxItems = 5): ContextItem[] {
    const rawMemories = memoryStore.getMemoriesByScope('GLOBAL');
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const items: ContextItem[] = rawMemories.map((mem) => {
      const timestamp = mem.provenance?.timestamp || mem.timestamp || now;
      const ageMs = now - timestamp;
      const isStale = ageMs > thirtyDaysMs;

      // Calculate relevance score
      let score = 0.5;
      if (query.toLowerCase().includes(mem.content.toLowerCase().slice(0, 10))) {
        score += 0.4;
      }
      if (mem.trustLevel === 'SYSTEM_AUTHORITY') score += 0.3;
      if (mem.trustLevel === 'USER_CONFIRMED') score += 0.2;
      if (isStale) score -= 0.2;

      return {
        id: mem.memoryId,
        type: mem.type === 'FACT' ? 'SEMANTIC' : 'LONG_TERM',
        content: mem.content,
        source: mem.trustLevel,
        relevanceScore: Math.min(1.0, Math.max(0.0, score)),
        trustLevel: mem.trustLevel,
        isStale,
        createdAt: timestamp,
      };
    });

    return items
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxItems);
  }

  public simulatePlanDryRun(plan: Plan): DryRunResult {
    const steps = plan.steps || [];
    const targetCap = plan.requiredCapabilities?.[0] || 'unknown';
    const requiresApproval = plan.requiresApproval ?? false;

    const simulatedSteps = steps.map((s, idx) => ({
      stepNumber: idx + 1,
      description: s.description,
      actionType: s.actionType,
      targetCapability: targetCap,
      riskLevel: plan.riskLevel,
      requiresHumanApproval: requiresApproval,
      simulatedOutcome: `[DRY-RUN SIMULATION ONLY]: Step ${idx + 1} would target capability "${targetCap}" with zero side effects.`,
    }));

    return {
      planId: plan.id,
      intentSummary: plan.reasoning || `Execution plan for ${targetCap}`,
      simulatedSteps,
      hasSideEffects: false, // Security Rule: Dry-run MUST NOT perform mutating side effects
      securitySummary: `Dry-run evaluated for plan "${plan.id}". Required capability "${targetCap}" requires ZeroTrust human approval = ${requiresApproval}.`,
    };
  }

  public explainDecisionProvenance(planId: string, targetCapability: string, riskLevel: string): string {
    return `[DECISION PROVENANCE EXPLANATION]: Action plan "${planId}" targeting capability "${targetCapability}" was classified with risk level "${riskLevel}". ZeroTrust security policy demands explicit human approval before Kingdom runtime execution.`;
  }
}

export const contextEngine = new ContextEngine();
