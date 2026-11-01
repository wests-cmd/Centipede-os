import { generateSecureRandomHex } from '../security/cryptoUtils';

export interface ActiveWindowInfo {
  windowId: string;
  title: string;
  appName: string;
  bounds: { x: number; y: number; width: number; height: number };
  isFocused: boolean;
}

export interface DesktopFrame {
  frameId: string;
  timestamp: number;
  width: number;
  height: number;
  activeWindows: ActiveWindowInfo[];
  detectedText?: string[];
  uiElements?: { id: string; type: string; label: string; bounds: { x: number; y: number; width: number; height: number } }[];
}

export interface AutomationOpportunity {
  opportunityId: string;
  title: string;
  description: string;
  confidenceScore: number; // 0.0 - 1.0
  suggestedAction: string;
  sourceWindowId?: string;
  timestamp: number;
}

export interface ControlAction {
  actionId: string;
  type: 'MOUSE_MOVE' | 'MOUSE_CLICK' | 'KEYBOARD_TYPE' | 'WINDOW_FOCUS' | 'SYSTEM_COMMAND';
  parameters: Record<string, any>;
  requiresRoot: boolean;
  executedAt?: number;
  status: 'PENDING' | 'EXECUTED' | 'BLOCKED_EMERGENCY_STOP' | 'FAILED';
}

export interface PrivilegeEscalationState {
  isElevated: boolean;
  elevationId: string | null;
  reason: string | null;
  elevatedAt: number | null;
  expiresAt: number | null;
}

export class DesktopVisionEngine {
  private activeFrame: DesktopFrame | null = null;
  private opportunities: AutomationOpportunity[] = [];
  private emergencyStopActive = false;
  private emergencyStopReason: string | null = null;
  private escalationState: PrivilegeEscalationState = {
    isElevated: false,
    elevationId: null,
    reason: null,
    elevatedAt: null,
    expiresAt: null,
  };
  private actionLog: ControlAction[] = [];

  public captureFrame(
    width = 1920,
    height = 1080,
    windows: ActiveWindowInfo[] = [],
    detectedText: string[] = []
  ): DesktopFrame {
    const frameId = `frm_${Date.now()}_${generateSecureRandomHex(4)}`;
    this.activeFrame = {
      frameId,
      timestamp: Date.now(),
      width,
      height,
      activeWindows: windows,
      detectedText,
      uiElements: windows.map((w) => ({
        id: `ui_${w.windowId}`,
        type: 'WINDOW',
        label: w.title,
        bounds: w.bounds,
      })),
    };

    this.analyzeOpportunities(this.activeFrame);
    return { ...this.activeFrame };
  }

  private analyzeOpportunities(frame: DesktopFrame): void {
    const newOpps: AutomationOpportunity[] = [];

    // Analyze detected text and windows for automation triggers
    for (const win of frame.activeWindows) {
      if (win.title.toLowerCase().includes('terminal') || win.appName.toLowerCase().includes('bash')) {
        newOpps.push({
          opportunityId: `opp_${Date.now()}_${generateSecureRandomHex(3)}`,
          title: 'Terminal Command Helper',
          description: `Active terminal window detected (${win.title}). Proactive command assistance available.`,
          confidenceScore: 0.88,
          suggestedAction: 'process.execute',
          sourceWindowId: win.windowId,
          timestamp: Date.now(),
        });
      }
    }

    if (frame.detectedText && frame.detectedText.some((t) => t.toLowerCase().includes('invoice'))) {
      newOpps.push({
        opportunityId: `opp_${Date.now()}_${generateSecureRandomHex(3)}`,
        title: 'Invoice Processing Opportunity',
        description: 'Detected invoice text on screen. Automated archiving routine available.',
        confidenceScore: 0.92,
        suggestedAction: 'wf_invoice_cleanup',
        timestamp: Date.now(),
      });
    }

    this.opportunities = newOpps;
  }

  public getOpportunities(): AutomationOpportunity[] {
    return [...this.opportunities];
  }

  public triggerEmergencyStop(source: 'STOP_BUTTON' | 'VOICE_STOP_COMMAND' | 'HOTKEY' = 'STOP_BUTTON', reason = 'User Emergency Stop'): void {
    this.emergencyStopActive = true;
    this.emergencyStopReason = `[${source}] ${reason}`;
    this.dropPrivileges();
  }

  public resetEmergencyStop(): void {
    this.emergencyStopActive = false;
    this.emergencyStopReason = null;
  }

  public isEmergencyStopActive(): boolean {
    return this.emergencyStopActive;
  }

  public elevatePrivileges(reason: string, durationMs = 60000): PrivilegeEscalationState {
    if (this.emergencyStopActive) {
      throw new Error('Privilege escalation denied: Emergency Stop is active.');
    }

    const elevationId = `elev_${Date.now()}_${generateSecureRandomHex(4)}`;
    this.escalationState = {
      isElevated: true,
      elevationId,
      reason,
      elevatedAt: Date.now(),
      expiresAt: Date.now() + durationMs,
    };

    return { ...this.escalationState };
  }

  public dropPrivileges(): PrivilegeEscalationState {
    this.escalationState = {
      isElevated: false,
      elevationId: null,
      reason: null,
      elevatedAt: null,
      expiresAt: null,
    };
    return { ...this.escalationState };
  }

  public getPrivilegeState(): PrivilegeEscalationState {
    if (this.escalationState.isElevated && this.escalationState.expiresAt && Date.now() > this.escalationState.expiresAt) {
      this.dropPrivileges();
    }
    return { ...this.escalationState };
  }

  public executeControlAction(action: Omit<ControlAction, 'actionId' | 'status'>): ControlAction {
    if (this.emergencyStopActive) {
      const blockedAction: ControlAction = {
        ...action,
        actionId: `act_${Date.now()}_${generateSecureRandomHex(3)}`,
        status: 'BLOCKED_EMERGENCY_STOP',
      };
      this.actionLog.push(blockedAction);
      throw new Error(`Control Action Blocked: Emergency Stop active (${this.emergencyStopReason}).`);
    }

    if (action.requiresRoot) {
      const privState = this.getPrivilegeState();
      if (!privState.isElevated) {
        throw new Error('Control Action Denied: Action requires root elevation.');
      }
    }

    const executedAction: ControlAction = {
      ...action,
      actionId: `act_${Date.now()}_${generateSecureRandomHex(3)}`,
      status: 'EXECUTED',
      executedAt: Date.now(),
    };

    this.actionLog.push(executedAction);
    return executedAction;
  }

  public getActionLog(): ControlAction[] {
    return [...this.actionLog];
  }
}

export const desktopVisionEngine = new DesktopVisionEngine();
