import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoiceProcessor, STTProvider } from '../../src/ai/voiceInterface';
import { AutonomyEngine, AutonomousRoutine } from '../../src/ai/autonomyEngine';

describe('VoiceProcessor Unit Tests', () => {
  let voiceProcessor: VoiceProcessor;
  let mockSTT: STTProvider;

  beforeEach(() => {
    voiceProcessor = new VoiceProcessor();
  });

  it('1. Requires user confirmation when STT confidence is < 0.85', async () => {
    mockSTT = {
      id: 'stt_mock',
      name: 'Mock STT',
      transcribe: vi.fn().mockResolvedValue({
        text: 'delete restricted files',
        confidence: 0.72, // Below 0.85 threshold!
      }),
    };

    voiceProcessor.setProviders(mockSTT);

    const dummyAudio = new ArrayBuffer(8);
    const result = await voiceProcessor.processVoiceInput(dummyAudio);

    expect(result).toBeNull();
    const state = voiceProcessor.getState();
    expect(state.requiresConfirmation).toBe(true);
    expect(state.pendingText).toBe('delete restricted files');
  });

  it('2. Interruption keywords (STOP, CANCEL) immediately abort voice input', async () => {
    mockSTT = {
      id: 'stt_mock',
      name: 'Mock STT',
      transcribe: vi.fn().mockResolvedValue({
        text: 'CANCEL',
        confidence: 0.99,
      }),
    };

    voiceProcessor.setProviders(mockSTT);

    const dummyAudio = new ArrayBuffer(8);
    const result = await voiceProcessor.processVoiceInput(dummyAudio);

    expect(result).toBeNull();
    const state = voiceProcessor.getState();
    expect(state.requiresConfirmation).toBe(false);
    expect(state.statusMessage).toContain('cancelled by user interrupt');
  });

  it('3. High confidence voice input routes through AI pipeline with ZeroTrust permission check', async () => {
    mockSTT = {
      id: 'stt_mock',
      name: 'Mock STT',
      transcribe: vi.fn().mockResolvedValue({
        text: 'status',
        confidence: 0.95,
      }),
    };

    voiceProcessor.setProviders(mockSTT);

    const dummyAudio = new ArrayBuffer(8);
    const message = await voiceProcessor.processVoiceInput(dummyAudio);

    expect(message).not.toBeNull();
    expect(message?.intent?.type).toBe('QUERY_STATUS');
  });
});

describe('AutonomyEngine Unit Tests', () => {
  let autonomyEngine: AutonomyEngine;

  const sampleRoutine: AutonomousRoutine = {
    id: 'rot_1',
    name: 'Check Kingdom Status',
    trigger: 'schedule_morning',
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
  });

  it('1. Defaults to Level 0 (Manual Only) and blocks routine execution', async () => {
    expect(autonomyEngine.getState().currentLevel).toBe('LEVEL_0');

    await expect(autonomyEngine.executeRoutine(sampleRoutine)).rejects.toThrow(
      /prohibits autonomous execution/
    );
  });

  it('2. Global Kill Switch immediately blocks execution and locks autonomy level modification', async () => {
    autonomyEngine.setAutonomyLevel('LEVEL_3');
    expect(autonomyEngine.getState().currentLevel).toBe('LEVEL_3');

    autonomyEngine.activateKillSwitch();
    expect(autonomyEngine.getState().killSwitchActive).toBe(true);

    // Attempting to run routine throws kill switch error
    await expect(autonomyEngine.executeRoutine(sampleRoutine)).rejects.toThrow(
      /Global Kill Switch is engaged/
    );

    // Attempting to change level throws kill switch error
    expect(() => autonomyEngine.setAutonomyLevel('LEVEL_2')).toThrow(
      /Disengage kill switch/
    );
  });

  it('3. Level 3 permits low-risk routine execution', async () => {
    autonomyEngine.setAutonomyLevel('LEVEL_3');

    const msg = await autonomyEngine.executeRoutine(sampleRoutine);
    expect(msg).toBeDefined();
    expect(msg.intent?.type).toBe('QUERY_STATUS');
  });
});
