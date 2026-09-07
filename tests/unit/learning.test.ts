import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryStore } from '../../src/learning/memoryStore';
import { LearningEngine } from '../../src/learning/learningEngine';
import { SkillManager } from '../../src/learning/skillManager';
import { KingdomAdapter } from '../../src/api/kingdomAdapter';
import { LearningSignal, SkillDefinition } from '../../src/learning/types';

describe('MemoryStore', () => {
  let memoryStore: MemoryStore;
  let mockAdapter: Partial<KingdomAdapter>;

  beforeEach(() => {
    mockAdapter = {
      add_memory: vi.fn().mockResolvedValue({ status: 'ok' }),
      getConnectionState: vi.fn().mockReturnValue('CONNECTED'),
    };
    memoryStore = new MemoryStore(mockAdapter as KingdomAdapter);
  });

  it('stores local memory and calculates trust levels correctly', async () => {
    const memory = await memoryStore.recordMemory({
      type: 'CONVERSATION',
      content: { key: 'user_preference', value: 'dark_theme' },
      trustLevel: 'USER_CONFIRMED',
      scope: 'USER',
    });

    expect(memory.memoryId).toBeDefined();
    expect(memory.trustLevel).toBe('USER_CONFIRMED');
    expect(memoryStore.getMemory(memory.memoryId)).toEqual(memory);
  });

  it('enforces trust level hierarchy during overwrites', async () => {
    const mem1 = await memoryStore.recordMemory({
      memoryId: 'mem-100',
      type: 'FACT',
      content: 'Trusted authority fact',
      trustLevel: 'SYSTEM_AUTHORITY',
      scope: 'GLOBAL',
    });

    // Attempting to overwrite with lower trust level should fail
    await expect(
      memoryStore.recordMemory({
        memoryId: 'mem-100',
        type: 'FACT',
        content: 'Unverified rumor',
        trustLevel: 'UNVERIFIED',
        scope: 'GLOBAL',
      })
    ).rejects.toThrow(/Trust level hierarchy violation/);
  });

  it('filters memories by scope', async () => {
    await memoryStore.recordMemory({
      type: 'TASK_HISTORY',
      content: { task: '1' },
      trustLevel: 'VERIFIED_TOOL_RESULT',
      scope: 'PROJECT',
      projectId: 'proj-A',
    });

    await memoryStore.recordMemory({
      type: 'FEEDBACK',
      content: { text: 'good' },
      trustLevel: 'USER_CONFIRMED',
      scope: 'USER',
    });

    const projectOnly = memoryStore.getMemories('PROJECT');
    expect(projectOnly.length).toBe(1);
    expect(projectOnly[0].projectId).toBe('proj-A');
  });
});

describe('LearningEngine', () => {
  let learningEngine: LearningEngine;

  beforeEach(() => {
    learningEngine = new LearningEngine();
  });

  it('accumulates evidence signals and detects when capability threshold N=3 is reached', () => {
    expect(learningEngine.shouldProposeCandidateSkill('files.write')).toBe(false);

    learningEngine.recordSignal('SUCCESS', 'write_file', 'files.write', 'SUCCESS');
    learningEngine.recordSignal('SUCCESS', 'write_file', 'files.write', 'SUCCESS');
    expect(learningEngine.shouldProposeCandidateSkill('files.write')).toBe(false);

    learningEngine.recordSignal('TASK_COMPLETION', 'write_file', 'files.write', 'SUCCESS');
    expect(learningEngine.shouldProposeCandidateSkill('files.write')).toBe(true);
  });

  it('evaluates candidate skill and fails evaluation if security violations exist', () => {
    const candidate: SkillDefinition = {
      skillId: 'test-skill',
      name: 'Test Skill',
      description: 'A test skill',
      version: '1.0.0',
      workflow: ['step1', 'step2'],
      requiredCapabilities: ['shell.exec'],
      risk: 'HIGH',
      status: 'CANDIDATE',
      createdTime: Date.now(),
      updatedTime: Date.now(),
    };

    const signals: LearningSignal[] = [
      { id: '1', type: 'SUCCESS', intentType: 'run', capability: 'shell.exec', resultStatus: 'SUCCESS', timestamp: Date.now() },
      { id: '2', type: 'USER_DENIAL', intentType: 'run', capability: 'shell.exec', resultStatus: 'BLOCKED', timestamp: Date.now() },
    ];

    const evaluation = learningEngine.evaluateCandidateSkill(candidate, signals);

    expect(evaluation.passed).toBe(false);
    expect(evaluation.securityViolations).toBe(1);
    expect(evaluation.reason).toMatch(/Security Hard Metric Violation/);
  });
});

describe('SkillManager', () => {
  let skillManager: SkillManager;

  const baseSkill: SkillDefinition = {
    skillId: 'web-scraper',
    name: 'Web Scraper',
    description: 'Scrapes web pages safely',
    version: '1.0.0',
    workflow: ['fetch', 'parse'],
    requiredCapabilities: ['http.get'],
    risk: 'LOW',
    status: 'ACTIVE',
    createdTime: Date.now(),
    updatedTime: Date.now(),
  };

  beforeEach(() => {
    skillManager = new SkillManager();
    skillManager.registerSkill(baseSkill);
  });

  it('prevents overwriting active skill version directly', () => {
    expect(() => {
      skillManager.registerSkill(baseSkill);
    }).toThrow(/immutable/);
  });

  it('calculates capability diff accurately and detects capability expansion', () => {
    const expandedSkill: SkillDefinition = {
      ...baseSkill,
      version: '1.1.0',
      requiredCapabilities: ['http.get', 'fs.write'],
    };

    const diff = skillManager.calculateCapabilityDiff(baseSkill, expandedSkill);
    expect(diff.added).toEqual(['fs.write']);
    expect(diff.isExpansion).toBe(true);
  });

  it('supports candidate promotion and rollback engine', () => {
    const candidate = skillManager.proposeCandidateVersion('web-scraper', ['fetch', 'parse', 'save'], ['http.get']);
    expect(candidate.version).toBe('1.1.0');
    expect(candidate.status).toBe('CANDIDATE');

    const promotion = skillManager.promoteCandidate('web-scraper', '1.1.0');
    expect(promotion.skill.status).toBe('ACTIVE');
    expect(skillManager.getActiveSkill('web-scraper')?.version).toBe('1.1.0');

    // Rollback
    const rolledBack = skillManager.rollbackSkill('web-scraper');
    expect(rolledBack.version).toBe('1.0.0');
    expect(skillManager.getActiveSkill('web-scraper')?.version).toBe('1.0.0');
  });
});
