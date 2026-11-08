import {
  evaluateAutonomy,
  type AutonomyMode,
  type ActionCategory,
} from '../agent/autonomyPolicy';
import { KingdomAdapter } from '../api/kingdomAdapter';

export interface ComputerUseAction {
  action:
    | 'click'
    | 'type'
    | 'key'
    | 'mouse_move'
    | 'open_app'
    | 'inspect_window'
    | 'wait';
  coordinate?: [number, number];
  text?: string;
  key?: string;
  appName?: string;
  windowTitle?: string;
  durationMs?: number;
}

export interface ExecutionReceipt {
  success: boolean;
  actionId: string;
  timestamp: number;
  screenshotHash?: string;
  error?: string;
}

export interface ExecutionContext {
  mode: AutonomyMode;
  authenticated: boolean;
  trustedDevice: boolean;
  emergencyStop: boolean;
  deviceId: string;
  sessionId: string;
}

export interface KingdomComputerExecutor {
  execute(
    action: ComputerUseAction,
    context: ExecutionContext
  ): Promise<ExecutionReceipt>;
}

export class KingdomHttpComputerExecutor implements KingdomComputerExecutor {
  constructor(private readonly adapter: KingdomAdapter) {}

  async execute(
    action: ComputerUseAction,
    context: ExecutionContext
  ): Promise<ExecutionReceipt> {
    if (context.emergencyStop) {
      throw new Error('Emergency stop is active; execution blocked');
    }

    const payload = {
      action: action.action,
      params: {
        coordinate: action.coordinate,
        text: action.text,
        appName: action.appName,
        windowTitle: action.windowTitle,
      },
      context: {
        deviceId: context.deviceId,
        sessionId: context.sessionId,
        autonomyMode: context.mode,
      },
    };

    const task = await this.adapter.submit_task(
      `computer_use.${action.action}: ${action.appName || action.text || ''}`,
      payload
    );

    return {
      success: task.status !== 'failed' && task.status !== 'cancelled',
      actionId: task.id,
      timestamp: task.created_at ? new Date(task.created_at).getTime() : Date.now(),
      error: task.status === 'failed' ? task.error : undefined,
    };
  }
}

export function categorizeAction(action: ComputerUseAction): ActionCategory {
  if (action.action === 'open_app') {
    const sensitiveApps = ['terminal', 'bash', 'cmd', 'powershell', 'regedit', 'diskpart'];
    if (action.appName && sensitiveApps.some((app) => action.appName!.toLowerCase().includes(app))) {
      return 'system_change';
    }
  }
  if (action.action === 'type' && action.text) {
    const sensitiveTokens = ['rm -rf', 'format', 'drop database', 'delete from', 'sudo', 'transfer', 'buy'];
    if (sensitiveTokens.some((tok) => action.text!.toLowerCase().includes(tok))) {
      return 'system_change';
    }
  }
  return 'app_control';
}

export class ComputerUseInterface {
  constructor(
    private readonly executor: KingdomComputerExecutor
  ) {}

  async executeAction(
    action: ComputerUseAction,
    context: ExecutionContext
  ): Promise<ExecutionReceipt> {
    const category: ActionCategory = categorizeAction(action);

    const decision = evaluateAutonomy({
      mode: context.mode,
      category,
      authenticated: context.authenticated,
      trustedDevice: context.trustedDevice,
      withinWorkspace: true,
      recoverable: true,
      emergencyStop: context.emergencyStop,
    });

    if (decision.kind !== 'ALLOW') {
      throw new Error(
        `${decision.kind}: ${decision.reason}`
      );
    }

    if (
      action.action === 'click' &&
      (
        !action.coordinate ||
        action.coordinate.length !== 2 ||
        !action.coordinate.every(Number.isFinite)
      )
    ) {
      throw new Error('Valid click coordinates required');
    }

    if (
      action.action === 'open_app' &&
      !action.appName?.trim()
    ) {
      throw new Error('Application name required');
    }

    if (
      action.action === 'type' &&
      typeof action.text !== 'string'
    ) {
      throw new Error('Text required');
    }

    const receipt = await this.executor.execute(
      action,
      context
    );

    if (
      !receipt ||
      typeof receipt.actionId !== 'string' ||
      !receipt.actionId ||
      typeof receipt.success !== 'boolean' ||
      !Number.isFinite(receipt.timestamp)
    ) {
      throw new Error(
        'Invalid execution receipt from Kingdom'
      );
    }

    return receipt;
  }
}
