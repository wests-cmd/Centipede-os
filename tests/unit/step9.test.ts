import { describe, it, expect, beforeEach } from 'vitest';
import { contextEngine } from '../../src/ai/contextEngine';
import { userKnowledgeStore } from '../../src/learning/userKnowledgeStore';
import { skillManager } from '../../src/learning/skillManager';
import { Plan } from '../../src/ai/types';
import { SkillDefinition } from '../../src/learning/types';

describe('Step 9 — Persistent Knowledge, Context Reasoning & Skill Intelligence Suite', () => {
  beforeEach(() => {
    // Setup clean test environment
  });

  it('Test 1 — Context Engine Ranks Context and Generates Side-Effect-Free Dry Run Simulation', () => {
    const mockPlan: Plan = {
      id: 'plan_sim_1',
      description: 'Simulate file deletion workflow',
      steps: [
        { description: 'Locate files in /tmp', actionType: 'find' },
        { description: 'Delete temp files', actionType: 'delete' },
      ],
      targetCapability: 'filesystem.delete',
      riskLevel: 'HIGH',
      requiresHumanApproval: true,
      reasoning: 'Simulation test plan',
    };

    const dryRun = contextEngine.simulatePlanDryRun(mockPlan);
    expect(dryRun.hasSideEffects).toBe(false); // Security Rule: Dry-run MUST NOT execute mutating side effects
    expect(dryRun.simulatedSteps.length).toBe(2);
    expect(dryRun.securitySummary).toContain('requires ZeroTrust human approval = true');

    const provenance = contextEngine.explainDecisionProvenance('plan_sim_1', 'filesystem.delete', 'HIGH');
    expect(provenance).toContain('ZeroTrust security policy demands explicit human approval');
  });

  it('Test 2 — User Knowledge Store Supports Fact Correction, Conflict Resolution & Memory Forget', () => {
    // Add initial fact
    userKnowledgeStore.addConfirmedFact('fact_inv_path', 'Invoices folder is Documents/Invoices');
    const initial = userKnowledgeStore.getMemory('fact_inv_path');
    expect(initial?.content).toContain('Documents/Invoices');

    // Correct fact (New confirmed fact supersedes old fact)
    userKnowledgeStore.correctFact('fact_inv_path', 'Invoices folder is Finance/Invoices', 'Moved folder');
    const corrected = userKnowledgeStore.getMemory('fact_inv_path');
    expect(corrected?.content).toContain('Finance/Invoices');

    // Memory Forget Workflow
    const forgot = userKnowledgeStore.forgetMemory('fact_inv_path');
    expect(forgot).toBe(true);
    expect(userKnowledgeStore.getMemory('fact_inv_path')).toBeUndefined();
  });

  it('Test 3 — Skill Version Capability Expansion Diffing Prevents Silent Privilege Escalation', () => {
    const skillV1: SkillDefinition = {
      skillId: 'invoice-processor',
      name: 'Invoice Processor',
      description: 'Reads invoice files',
      version: '1.0.0',
      workflow: ['read'],
      requiredCapabilities: ['filesystem.read'],
      risk: 'LOW',
      status: 'ACTIVE',
      createdTime: Date.now(),
      updatedTime: Date.now(),
    };

    skillManager.registerSkill(skillV1);

    const skillV2: SkillDefinition = {
      ...skillV1,
      version: '2.0.0',
      requiredCapabilities: ['filesystem.read', 'filesystem.delete', 'network.send'], // Capability Expansion!
      status: 'CANDIDATE',
    };

    const diff = skillManager.calculateCapabilityDiff(skillV1, skillV2);
    expect(diff.isExpansion).toBe(true);
    expect(diff.added).toContain('filesystem.delete');
    expect(diff.added).toContain('network.send');
  });
});
