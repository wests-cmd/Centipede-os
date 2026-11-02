import {
  evaluateAutonomy,
  type AutonomyMode,
  type ActionCategory,
} from '../agent/autonomyPolicy';

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

export class ComputerUseInterface {
  constructor(
    private readonly executor: KingdomComputerExecutor
  ) {}

  async executeAction(
    action: ComputerUseAction,
    context: ExecutionContext
  ): Promise<ExecutionReceipt> {
    const category: ActionCategory = 'app_control';

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
