import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopVisionEngine } from '../../src/platform/desktopVision';

describe('DesktopVisionEngine Unit Test Suite', () => {
  let visionEngine: DesktopVisionEngine;

  beforeEach(() => {
    visionEngine = new DesktopVisionEngine();
  });

  it('1. Captures desktop frames and scores automation opportunities from screen vision', () => {
    const frame = visionEngine.captureFrame(1920, 1080, [
      {
        windowId: 'win_1',
        title: 'bash terminal',
        appName: 'terminal',
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        isFocused: true,
      },
    ], ['Pending invoice payment due']);

    expect(frame.frameId).toBeDefined();
    expect(frame.activeWindows.length).toBe(1);

    const opps = visionEngine.getOpportunities();
    expect(opps.length).toBeGreaterThan(0);
    const terminalOpp = opps.find((o) => o.title.includes('Terminal'));
    expect(terminalOpp).toBeDefined();
    expect(terminalOpp?.confidenceScore).toBeGreaterThan(0.8);

    const invoiceOpp = opps.find((o) => o.title.includes('Invoice'));
    expect(invoiceOpp).toBeDefined();
  });

  it('2. Reports unavailable native execution and blocks un-elevated root actions', () => {
    const userAction = visionEngine.executeControlAction({
      type: 'MOUSE_CLICK',
      parameters: { x: 100, y: 200 },
      requiresRoot: false,
    });

    expect(userAction.status).toBe('FAILED');
    expect(userAction.executedAt).toBeUndefined();
    expect(visionEngine.getActionLog().length).toBe(1);

    expect(() => {
      visionEngine.executeControlAction({
        type: 'SYSTEM_COMMAND',
        parameters: { command: 'apt update' },
        requiresRoot: true,
      });
    }).toThrow(/requires root elevation/);
  });

  it('3. Cannot grant native privilege through a JavaScript flag', () => {
    expect(() => visionEngine.elevatePrivileges('System maintenance', 30000)).toThrow(/no elevation was granted/);
    expect(visionEngine.getPrivilegeState().isElevated).toBe(false);
    expect(visionEngine.dropPrivileges().isElevated).toBe(false);
  });

  it('4. Dual-trigger Emergency Stop instantly blocks all actions and drops elevated privileges', () => {
    expect(visionEngine.getPrivilegeState().isElevated).toBe(false);

    // Trigger Emergency Stop via Voice "STOP" command
    visionEngine.triggerEmergencyStop('VOICE_STOP_COMMAND', 'User shouted stop');

    expect(visionEngine.isEmergencyStopActive()).toBe(true);
    expect(visionEngine.getPrivilegeState().isElevated).toBe(false);

    expect(() => {
      visionEngine.executeControlAction({
        type: 'MOUSE_CLICK',
        parameters: { x: 50, y: 50 },
        requiresRoot: false,
      });
    }).toThrow(/Emergency Stop active/);

    expect(() => {
      visionEngine.elevatePrivileges('Attempt re-elevation');
    }).toThrow(/Emergency Stop is active/);
  });
});
