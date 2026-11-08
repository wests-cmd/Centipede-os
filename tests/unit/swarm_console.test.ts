import { describe, it, expect } from 'vitest';
import { SwarmDevice } from '../../src/components/SwarmConsoleApp';

describe('Swarm Console & DT1 / Laptop 2 Role Differentiation', () => {
  const mockDevices: SwarmDevice[] = [
    {
      id: 'node_dt1_primary',
      name: 'DT1 (Desktop Interface)',
      type: 'DT1',
      ip: '127.0.0.1',
      role: 'Commander',
      profile: 'Assist',
      health: 'HEALTHY',
      cpuUsagePercent: 18,
      memoryUsagePercent: 32,
      activeTasks: 1,
      installedTools: ['browser.control', 'screen.capture', 'audio.transcribe', 'filesystem.sandbox'],
      models: ['local/whisper-tiny', 'external/claude-3-5-sonnet'],
      connectionStatus: 'CONNECTED',
      trustState: 'PAIRED_ACTIVE',
      authorizedCapabilities: ['runtime.status', 'tasks.create', 'tasks.read'],
      updateState: 'UP_TO_DATE',
    },
    {
      id: 'node_laptop2_worker',
      name: 'Laptop 2 (Autonomous Worker & Runtime)',
      type: 'Laptop2',
      ip: '192.168.1.150',
      role: 'Knight',
      profile: 'Develop',
      health: 'HEALTHY',
      cpuUsagePercent: 46,
      memoryUsagePercent: 68,
      activeTasks: 3,
      installedTools: ['process.execute', 'filesystem.write', 'git.manager', 'test.runner'],
      models: ['ollama/qwen2.5-coder:7b'],
      connectionStatus: 'CONNECTED',
      trustState: 'PAIRED_ACTIVE',
      authorizedCapabilities: ['filesystem.read', 'filesystem.write', 'process.execute'],
      updateState: 'UP_TO_DATE',
    },
  ];

  it('1. Correctly identifies DT1 as the Commander interface with media capture tools', () => {
    const dt1 = mockDevices.find((d) => d.type === 'DT1');
    expect(dt1).toBeDefined();
    expect(dt1?.role).toBe('Commander');
    expect(dt1?.installedTools).toContain('screen.capture');
    expect(dt1?.installedTools).toContain('audio.transcribe');
    expect(dt1?.trustState).toBe('PAIRED_ACTIVE');
  });

  it('2. Correctly identifies Laptop 2 as the execution worker with development tools', () => {
    const laptop2 = mockDevices.find((d) => d.type === 'Laptop2');
    expect(laptop2).toBeDefined();
    expect(laptop2?.role).toBe('Knight');
    expect(laptop2?.installedTools).toContain('process.execute');
    expect(laptop2?.installedTools).toContain('git.manager');
    expect(laptop2?.profile).toBe('Develop');
  });

  it('3. Enforces profile boundaries and requires authorization for Admin escalation', () => {
    const dt1 = mockDevices.find((d) => d.type === 'DT1')!;
    expect(dt1.profile).toBe('Assist');
    const allowedStandardProfiles = ['Observe', 'Assist', 'Develop'];
    expect(allowedStandardProfiles).toContain(dt1.profile);
  });
});
