import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AutonomyEngine, AutonomousRoutine } from '../../src/ai/autonomyEngine';
import { IncidentManager } from '../../src/agent/incidentManager';

describe('Self-Running & Self-Healing Autonomy Test Suite', () => {
  let autonomyEngine: AutonomyEngine;
  let incidentManager: IncidentManager;

  const sampleRoutine: AutonomousRoutine = {
    id: 'rot_self_1',
    name: 'Self-Running Health Check',
    trigger: 'schedule_interval',
    prompt: 'query kingdom status',
    allowedCapabilities: ['runtime.status'],
    riskCeiling: 'LOW',
    budget: {
      maxActions: 5,
      maxRuntimeMs: 10000,
      maxRetries: 2,
      maxRiskCeiling: 'LOW',
    },
    enabled: true,
  };

  beforeEach(() => {
    autonomyEngine = new AutonomyEngine();
    incidentManager = new IncidentManager();
  });

  afterEach(() => {
    autonomyEngine.stopSelfRunningLoop();
  });

  it('1. Manages self-running background loop lifecycle and blocks execution on Kill Switch', () => {
    autonomyEngine.setAutonomyLevel('LEVEL_3');
    autonomyEngine.startSelfRunningLoop([sampleRoutine], 100);

    expect(autonomyEngine.getState().selfRunningLoopActive).toBe(true);

    autonomyEngine.activateKillSwitch();
    expect(autonomyEngine.getState().selfRunningLoopActive).toBe(false);
    expect(autonomyEngine.getState().killSwitchActive).toBe(true);
  });

  it('2. Records incidents and executes automated self-healing remediation', async () => {
    const incident = incidentManager.recordIncident(
      'HIGH',
      'TEST_COMPONENT',
      'KINGDOM_OFFLINE',
      'Kingdom backend is offline or disconnected.',
      'SELF_HEALING'
    );

    expect(incident.incidentId).toBeDefined();
    expect(incident.actionTaken).toBe('SELF_HEALING');

    const healingResult = await incidentManager.attemptSelfHealing(incident);
    expect(healingResult.incidentId).toBe(incident.incidentId);
    expect(healingResult.actionTaken).toContain('RECONNECT');
    expect(incidentManager.getHealingLog().length).toBe(1);
  });

  it('3. Auto-remediates execution problems encountered during autonomous routine execution', async () => {
    autonomyEngine.setAutonomyLevel('LEVEL_3');

    const healed = await autonomyEngine.autoRemediateProblem(new Error('Kingdom storage pressure or disconnected'));
    expect(typeof healed).toBe('boolean');
    expect(autonomyEngine.getState().statusMessage).toContain('Auto-Healing');
  });
});
