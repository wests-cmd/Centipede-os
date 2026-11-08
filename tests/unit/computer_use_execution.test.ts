import { describe, expect, it as test } from 'vitest';

import {
  ComputerUseInterface,
  KingdomHttpComputerExecutor,
  categorizeAction,
  type KingdomComputerExecutor,
  type ExecutionContext,
} from '../../src/tools/computerUse';
import { KingdomAdapter } from '../../src/api/kingdomAdapter';

const context: ExecutionContext = {
  mode: 'FREE',
  authenticated: true,
  trustedDevice: true,
  emergencyStop: false,
  deviceId: 'test-device',
  sessionId: 'test-session',
};

describe('Computer-use execution', () => {
  test('returns verified executor receipt', async () => {
    let called = false;

    const executor: KingdomComputerExecutor = {
      async execute() {
        called = true;
        return {
          success: true,
          actionId: 'real-execution-1',
          timestamp: Date.now(),
        };
      },
    };

    const computer = new ComputerUseInterface(executor);
    const result = await computer.executeAction(
      { action: 'open_app', appName: 'Firefox' },
      context
    );

    expect(called).toBe(true);
    expect(result.success).toBe(true);
    expect(result.actionId).toBe('real-execution-1');
  });

  test('does not invent success on failure', async () => {
    const executor: KingdomComputerExecutor = {
      async execute() {
        throw new Error('Device offline');
      },
    };

    const computer = new ComputerUseInterface(executor);

    expect(
      computer.executeAction(
        { action: 'inspect_window' },
        context
      )
    ).rejects.toThrow('Device offline');
  });

  test('validates coordinate parameters for click', async () => {
    const executor: KingdomComputerExecutor = {
      async execute() {
        return { success: true, actionId: 'test-1', timestamp: Date.now() };
      },
    };

    const computer = new ComputerUseInterface(executor);

    expect(
      computer.executeAction(
        { action: 'click', coordinate: [100] as any },
        context
      )
    ).rejects.toThrow('Valid click coordinates required');
  });

  test('dynamically categorizes sensitive apps as system_change requiring confirmation in Free mode', () => {
    expect(categorizeAction({ action: 'open_app', appName: 'bash' })).toBe('system_change');
    expect(categorizeAction({ action: 'open_app', appName: 'TextEditor' })).toBe('app_control');
    expect(categorizeAction({ action: 'type', text: 'sudo rm -rf /' })).toBe('system_change');
  });

  test('KingdomHttpComputerExecutor delegates to KingdomAdapter.submit_task', async () => {
    let submittedPrompt = '';
    const mockAdapter = {
      async submit_task(prompt: string, payload: any) {
        submittedPrompt = prompt;
        return {
          id: 'task_kingdom_123',
          status: 'completed',
          created_at: new Date().toISOString(),
        };
      },
    } as unknown as KingdomAdapter;

    const httpExecutor = new KingdomHttpComputerExecutor(mockAdapter);
    const receipt = await httpExecutor.execute(
      { action: 'open_app', appName: 'Calculator' },
      context
    );

    expect(submittedPrompt).toContain('computer_use.open_app: Calculator');
    expect(receipt.success).toBe(true);
    expect(receipt.actionId).toBe('task_kingdom_123');
  });
});
