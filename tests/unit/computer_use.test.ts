import { describe, it, expect } from 'vitest';
import { ComputerUseInterface } from '../../src/tools/computerUse';
import { KingdomAdapter } from '../../src/api/kingdomAdapter';

describe('Controlled Computer-Use Security & Execution Boundaries', () => {
  const adapter = new KingdomAdapter('http://127.0.0.1:8000');
  const computerUse = new ComputerUseInterface(adapter);

  it('1. Fails closed when computer-use interface is not explicitly enabled by user', async () => {
    computerUse.setEnabled(false);
    expect(computerUse.isComputerUseEnabled()).toBe(false);

    const receipt = await computerUse.executeAction({
      action: 'click',
      coordinate: [100, 200],
    });

    expect(receipt.success).toBe(false);
    expect(receipt.error).toContain('disabled');
  });

  it('2. Rejects click actions with invalid coordinates', async () => {
    computerUse.setEnabled(true);
    const receipt = await computerUse.executeAction({
      action: 'click',
      coordinate: [100] as any,
    });

    expect(receipt.success).toBe(false);
    expect(receipt.error).toContain('Invalid coordinates');
  });

  it('3. Rejects open_app action missing appName parameter', async () => {
    computerUse.setEnabled(true);
    const receipt = await computerUse.executeAction({
      action: 'open_app',
    });

    expect(receipt.success).toBe(false);
    expect(receipt.error).toContain('Missing target appName');
  });

  it('4. Allows valid interactions when enabled and produces verifiable receipts', async () => {
    computerUse.setEnabled(true);
    const receipt = await computerUse.executeAction({
      action: 'click',
      coordinate: [350, 420],
    });

    expect(receipt.success).toBe(true);
    expect(receipt.actionId).toBeDefined();
    expect(receipt.screenshotHash).toBeDefined();
    expect(receipt.action.action).toBe('click');
  });
});
