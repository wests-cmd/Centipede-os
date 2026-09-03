import {
  ApprovalRequest,
  AuditLogEntry,
  ConnectionState,
  KnightItem,
  KnightsResponse,
  MemoryEntry,
  ModelHealth,
  RuntimeStatus,
  SecurityPermissionsResponse,
  SecurityStatus,
  SystemEvent,
  TaskItem,
  VersionCompatibility,
  VersionCompatibilityStatus,
} from '../types';

export class KingdomAdapter {
  private baseUrl: string;
  private wsUrl: string;
  private connectionState: ConnectionState = 'DISCONNECTED';
  private heartbeatTimer: any = null;
  private ws: WebSocket | null = null;
  private consecutiveFailures = 0;
  private maxConsecutiveFailures = 2;
  private currentBackoffDelay = 2000;
  private isReconnecting = false;

  private minSupportedVersion = '40.0.0';
  private maxTestedVersion = '40.1.9';

  private compatibilityInfo: VersionCompatibility = {
    detectedVersion: null,
    minSupportedVersion: '40.0.0',
    maxTestedVersion: '40.1.9',
    status: 'UNKNOWN',
    message: 'Kingdom version not yet checked.',
  };

  private statusListeners: Set<(status: RuntimeStatus | null) => void> = new Set();
  private connectionListeners: Set<(state: ConnectionState) => void> = new Set();
  private eventListeners: Set<(event: SystemEvent) => void> = new Set();
  private compatibilityListeners: Set<(info: VersionCompatibility) => void> = new Set();

  private lastKnownStatus: RuntimeStatus | null = null;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/ws';
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
    this.wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/ws';
    this.reconnect();
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getCompatibilityInfo(): VersionCompatibility {
    return { ...this.compatibilityInfo };
  }

  public subscribeConnection(listener: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(listener);
    listener(this.connectionState);
    return () => this.connectionListeners.delete(listener);
  }

  public subscribeStatus(listener: (status: RuntimeStatus | null) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.lastKnownStatus);
    return () => this.statusListeners.delete(listener);
  }

  public subscribeEvents(listener: (event: SystemEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public subscribeCompatibility(listener: (info: VersionCompatibility) => void): () => void {
    this.compatibilityListeners.add(listener);
    listener(this.compatibilityInfo);
    return () => this.compatibilityListeners.delete(listener);
  }

  private notifyConnection(state: ConnectionState): void {
    this.connectionState = state;
    this.connectionListeners.forEach((l) => l(state));
  }

  private notifyStatus(status: RuntimeStatus | null): void {
    this.lastKnownStatus = status;
    this.statusListeners.forEach((l) => l(status));
  }

  private notifyEvent(event: SystemEvent): void {
    this.eventListeners.forEach((l) => l(event));
  }

  private notifyCompatibility(info: VersionCompatibility): void {
    this.compatibilityInfo = info;
    this.compatibilityListeners.forEach((l) => l(info));
  }

  public checkVersionCompatibility(rawVersion: string): VersionCompatibility {
    if (!rawVersion) {
      const info: VersionCompatibility = {
        detectedVersion: null,
        minSupportedVersion: this.minSupportedVersion,
        maxTestedVersion: this.maxTestedVersion,
        status: 'UNKNOWN',
        message: 'No version header received from Kingdom server.',
      };
      this.notifyCompatibility(info);
      return info;
    }

    const clean = rawVersion.trim().replace(/^v/i, '');
    const parts = clean.split('.').map((p) => parseInt(p, 10) || 0);
    const major = parts[0] || 0;

    let status: VersionCompatibilityStatus = 'COMPATIBLE';
    let message = `Kingdom v${clean} is fully compatible.`;

    if (major < 40) {
      status = 'INCOMPATIBLE_TOO_OLD';
      message = `Kingdom v${clean} is older than minimum supported version v${this.minSupportedVersion}.`;
    } else if (major > 40) {
      status = 'INCOMPATIBLE_TOO_NEW';
      message = `Kingdom v${clean} exceeds maximum supported major version v${this.maxTestedVersion}.`;
    }

    const info: VersionCompatibility = {
      detectedVersion: clean,
      minSupportedVersion: this.minSupportedVersion,
      maxTestedVersion: this.maxTestedVersion,
      status,
      message,
    };

    this.notifyCompatibility(info);

    if (status !== 'COMPATIBLE') {
      this.notifyConnection('VERSION_INCOMPATIBLE');
    } else if (this.connectionState === 'VERSION_INCOMPATIBLE') {
      this.notifyConnection('CONNECTED');
    }

    return info;
  }

  private maskSensitiveError(message: string): string {
    if (!message) return 'An error occurred during Kingdom API communication.';
    let safeMsg = message
      .replace(/Traceback \(most recent call last\):[\s\S]*/g, 'Internal Kingdom Execution Exception.')
      .replace(/(bearer|token|secret|password|key)\s*[:=]\s*[^\s,]+/gi, '$1=[REDACTED]');
    return safeMsg.substring(0, 300);
  }

  private async fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    try {
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        ...options,
      });

      if (res.status === 401 || res.status === 403) {
        this.notifyConnection('AUTHENTICATION_FAILED');
        throw new Error('Authentication or capability authorization failed on Kingdom endpoint.');
      }

      if (!res.ok) {
        const errorText = await res.text();
        const safeText = this.maskSensitiveError(errorText);
        throw new Error(`HTTP ${res.status}: ${safeText || res.statusText}`);
      }

      this.recordSuccess();
      return (await res.json()) as T;
    } catch (err: any) {
      if (err.message?.includes('Authentication')) {
        throw err;
      }
      this.recordFailure();
      throw new Error(this.maskSensitiveError(err.message));
    }
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.currentBackoffDelay = 2000;
    this.isReconnecting = false;

    if (this.compatibilityInfo.status === 'COMPATIBLE' || this.compatibilityInfo.status === 'UNKNOWN') {
      if (this.connectionState !== 'CONNECTED') {
        this.notifyConnection('CONNECTED');
        this.initWebSocket();
      }
    }
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.maxConsecutiveFailures && this.connectionState !== 'DISCONNECTED') {
      this.notifyConnection('DISCONNECTED');
      this.notifyStatus(null);
      this.closeWebSocket();
    }
  }

  public startHeartbeat(intervalMs = 3000): void {
    this.stopHeartbeat();
    const poll = async () => {
      if (this.isReconnecting) return;
      try {
        const status = await this.get_status();
        this.notifyStatus(status);
        if (status.version) {
          this.checkVersionCompatibility(status.version);
        }
      } catch (e) {
        // Handled in recordFailure()
      }
    };
    poll();
    this.heartbeatTimer = setInterval(poll, intervalMs);
  }

  public stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public async reconnect(): Promise<boolean> {
    if (this.isReconnecting) return false;
    this.isReconnecting = true;
    this.notifyConnection('CONNECTING');

    try {
      const status = await this.get_status();
      this.notifyStatus(status);
      if (status.version) {
        const compat = this.checkVersionCompatibility(status.version);
        if (compat.status !== 'COMPATIBLE') {
          this.isReconnecting = false;
          return false;
        }
      }
      this.recordSuccess();
      return true;
    } catch (e) {
      this.recordFailure();
      setTimeout(() => {
        this.currentBackoffDelay = Math.min(this.currentBackoffDelay * 2, 16000);
        this.isReconnecting = false;
      }, this.currentBackoffDelay);
      return false;
    }
  }

  private initWebSocket(): void {
    if (typeof WebSocket === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.notifyEvent(parsed);
          if (parsed.type === 'runtime.snapshot' || parsed.type === 'heartbeat') {
            if (parsed.data) {
              const statusData = parsed.data as RuntimeStatus;
              this.notifyStatus(statusData);
              if (statusData.version) {
                this.checkVersionCompatibility(statusData.version);
              }
            }
          }
        } catch (err) {
          console.warn('Failed to parse WebSocket frame', err);
        }
      };

      this.ws.onerror = () => {
        // Socket error handled in onclose
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.connectionState === 'CONNECTED') {
          this.notifyConnection('DISCONNECTED');
        }
      };
    } catch (e) {
      // WS unavailable
    }
  }

  private closeWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // --- Required 18 Adapter Functions ---

  public async get_status(): Promise<RuntimeStatus> {
    return this.fetchJson<RuntimeStatus>('/status');
  }

  public async start_runtime(): Promise<{ status: string; timestamp?: number }> {
    return this.fetchJson<{ status: string }>('/start', { method: 'POST' });
  }

  public async stop_runtime(): Promise<{ status: string; timestamp?: number }> {
    return this.fetchJson<{ status: string }>('/stop', { method: 'POST' });
  }

  public async get_mode(): Promise<{ mode: string }> {
    return this.fetchJson<{ mode: string }>('/mode');
  }

  public async set_mode(mode: string): Promise<any> {
    return this.fetchJson<any>('/mode', {
      method: 'PUT',
      body: JSON.stringify({ mode }),
    });
  }

  public async submit_task(prompt: string, metadata: Record<string, any> = {}): Promise<TaskItem> {
    return this.fetchJson<TaskItem>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ prompt, metadata }),
    });
  }

  public async get_task(task_id: string): Promise<TaskItem> {
    return this.fetchJson<TaskItem>(`/tasks/${encodeURIComponent(task_id)}`);
  }

  public async list_tasks(status?: string): Promise<TaskItem[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.fetchJson<TaskItem[]>(`/tasks${query}`);
  }

  public async cancel_task(task_id: string): Promise<TaskItem> {
    return this.fetchJson<TaskItem>(`/tasks/${encodeURIComponent(task_id)}/cancel`, {
      method: 'POST',
    });
  }

  public async get_events(limit = 50): Promise<SystemEvent[]> {
    return this.fetchJson<SystemEvent[]>(`/events?limit=${limit}`);
  }

  public async get_knights(): Promise<KnightsResponse> {
    return this.fetchJson<KnightsResponse>('/knights');
  }

  public async get_models(): Promise<ModelHealth> {
    return this.fetchJson<ModelHealth>('/models');
  }

  public async get_memory(limit = 100): Promise<MemoryEntry[]> {
    return this.fetchJson<MemoryEntry[]>(`/memory?limit=${limit}`);
  }

  public async search_memory(query: string, limit = 5): Promise<any[]> {
    return this.fetchJson<any[]>(`/memory/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  }

  public async get_maps(): Promise<string[]> {
    return this.fetchJson<string[]>('/maps');
  }

  public async get_security_status(): Promise<SecurityStatus> {
    return this.fetchJson<SecurityStatus>('/security/status');
  }

  public async get_permissions(): Promise<SecurityPermissionsResponse> {
    return this.fetchJson<SecurityPermissionsResponse>('/security/permissions');
  }

  public async create_approval(
    capability: string,
    operation: string,
    reason = '',
    requesting_actor = 'system',
    risk_level = 'HIGH',
    parameters: Record<string, any> = {}
  ): Promise<ApprovalRequest> {
    return this.fetchJson<ApprovalRequest>('/security/approvals', {
      method: 'POST',
      body: JSON.stringify({
        capability,
        operation,
        reason,
        requesting_actor,
        risk_level,
        parameters,
      }),
    });
  }

  public async list_approvals(status?: string): Promise<ApprovalRequest[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.fetchJson<ApprovalRequest[]>(`/security/approvals${q}`);
  }

  public async approve(approval_id: string, approver = 'admin', reason = 'Human approved in Centipede OS'): Promise<ApprovalRequest> {
    return this.fetchJson<ApprovalRequest>(`/security/approvals/${encodeURIComponent(approval_id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approver, reason }),
    });
  }

  public async deny(approval_id: string, denier = 'admin', reason = 'Denied in Centipede OS'): Promise<ApprovalRequest> {
    return this.fetchJson<ApprovalRequest>(`/security/approvals/${encodeURIComponent(approval_id)}/deny`, {
      method: 'POST',
      body: JSON.stringify({ approver: denier, reason }),
    });
  }

  public async get_audit(limit = 100, actor?: string, decision?: string, capability?: string): Promise<AuditLogEntry[]> {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    if (actor) params.set('actor', actor);
    if (decision) params.set('decision', decision);
    if (capability) params.set('capability', capability);

    return this.fetchJson<AuditLogEntry[]>(`/security/audit?${params.toString()}`);
  }
}

export const kingdomAdapter = new KingdomAdapter();
