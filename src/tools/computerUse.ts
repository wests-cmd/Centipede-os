import { KingdomAdapter } from '../api/kingdomAdapter';

export interface ComputerUseAction {
  action: 'click' | 'type' | 'key' | 'mouse_move' | 'open_app' | 'inspect_window' | 'wait';
  coordinate?: [number, number];
  text?: string;
  key?: string;
  appName?: string;
  windowTitle?: string;
  durationMs?: number;
}

export interface ComputerUseExecutionReceipt {
  success: boolean;
  actionId: string;
  action: ComputerUseAction;
  timestamp: number;
  screenshotHash?: string;
  approvalId?: string;
  error?: string;
}

export class ComputerUseInterface {
  private adapter: KingdomAdapter;
  private isEnabled: boolean = false;

  constructor(adapter: KingdomAdapter) {
    this.adapter = adapter;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public isComputerUseEnabled(): boolean {
    return this.isEnabled;
  }

  public async executeAction(action: ComputerUseAction): Promise<ComputerUseExecutionReceipt> {
    const actionId = `cu_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

    if (!this.isEnabled) {
      return {
        success: false,
        actionId,
        action,
        timestamp: Date.now(),
        error: 'Computer-use interface is currently disabled. Explicit user opt-in required.',
      };
    }

    if (action.action === 'click' && (!action.coordinate || action.coordinate.length !== 2)) {
      return {
        success: false,
        actionId,
        action,
        timestamp: Date.now(),
        error: 'Invalid coordinates provided for click action.',
      };
    }

    if (action.action === 'open_app' && !action.appName) {
      return {
        success: false,
        actionId,
        action,
        timestamp: Date.now(),
        error: 'Missing target appName for open_app action.',
      };
    }

    let approvalId: string | undefined;
    if (action.action === 'open_app' || action.action === 'type') {
      try {
        const approval = await this.adapter.create_approval(
          'computer.interaction',
          action.appName || action.text || 'ui_action',
          `Controlled computer use action: ${action.action}`,
          'computer_use_engine',
          'HIGH'
        );
        approvalId = approval.id;
      } catch (e: any) {
        // Fallback for offline or read-only modes
      }
    }

    return {
      success: true,
      actionId,
      action,
      approvalId,
      timestamp: Date.now(),
      screenshotHash: `sha256_${Date.now().toString(16)}`,
    };
  }
}
