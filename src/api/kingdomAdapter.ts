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
} from '../types';

export class KingdomAdapter {
  private baseUrl: string;
  private wsUrl: string;
  private connectionState: ConnectionState = 'offline';
  private heartbeatTimer: any = null;
  private ws: WebSocket | null = null;
  private consecutiveFailures = 0;
  private maxConsecutiveFailures = 2;
  private backoffDelay = 2000;

  private statusListeners: Set<(status: RuntimeStatus | null) => void> = new Set();
  private connectionListeners: Set<(state: ConnectionState) => void> = new Set();
  private eventListeners: Set<(event: SystemEvent) => void> = new Set();

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

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
      }

      this.recordSuccess();
      return (await res.json()) as T;
    } catch (err: any) {
      this.recordFailure();
      throw err;
    }
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.backoffDelay = 2000;
    if (this.connectionState !== 'online') {
      this.notifyConnection('online');
      this.initWebSocket();
    }
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.maxConsecutiveFailures && this.connectionState !== 'offline') {
      this.notifyConnection('offline');
      this.notifyStatus(null);
      this.closeWebSocket();
    }
  }

  public startHeartbeat(intervalMs = 3000): void {
    this.stopHeartbeat();
    const poll = async () => {
      try {
        const status = await this.get_status();
        this.notifyStatus(status);
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
    this.notifyConnection('connecting');
    try {
      const status = await this.get_status();
      this.notifyStatus(status);
      this.recordSuccess();
      return true;
    } catch (e) {
      this.recordFailure();
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
              this.notifyStatus(parsed.data as RuntimeStatus);
            }
          }
        } catch (err) {
          console.warn('Failed to parse WebSocket frame', err);
        }
      };

      this.ws.onerror = () => {
        // WebSocket error will trigger onclose
      };

      this.ws.onclose = () => {
        this.ws = null;
      };
    } catch (e) {
      // WS unavailable or invalid URL
    }
  }

  private closeWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // --- Required 18 Adapter Functions ---

  // 1. get_status()
  public async get_status(): Promise<RuntimeStatus> {
    return this.fetchJson<RuntimeStatus>('/status');
  }

  // 2. start_runtime()
  public async start_runtime(): Promise<{ status: string; timestamp?: number }> {
    return this.fetchJson<{ status: string }>('/start', { method: 'POST' });
  }

  // 3. stop_runtime()
  public async stop_runtime(): Promise<{ status: string; timestamp?: number }> {
    return this.fetchJson<{ status: string }>('/stop', { method: 'POST' });
  }

  // 4. get_mode()
  public async get_mode(): Promise<{ mode: string }> {
    return this.fetchJson<{ mode: string }>('/mode');
  }

  // Set mode (additional helper)
  public async set_mode(mode: string): Promise<any> {
    return this.fetchJson<any>('/mode', {
      method: 'PUT',
      body: JSON.stringify({ mode }),
    });
  }

  // 5. submit_task()
  public async submit_task(prompt: string, metadata: Record<string, any> = {}): Promise<TaskItem> {
    return this.fetchJson<TaskItem>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ prompt, metadata }),
    });
  }

  // 6. get_task()
  public async get_task(task_id: string): Promise<TaskItem> {
    return this.fetchJson<TaskItem>(`/tasks/${encodeURIComponent(task_id)}`);
  }

  // List tasks (additional helper)
  public async list_tasks(status?: string): Promise<TaskItem[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.fetchJson<TaskItem[]>(`/tasks${query}`);
  }

  // 7. cancel_task()
  public async cancel_task(task_id: string): Promise<TaskItem> {
    return this.fetchJson<TaskItem>(`/tasks/${encodeURIComponent(task_id)}/cancel`, {
      method: 'POST',
    });
  }

  // 8. get_events()
  public async get_events(limit = 50): Promise<SystemEvent[]> {
    return this.fetchJson<SystemEvent[]>(`/events?limit=${limit}`);
  }

  // 9. get_knights()
  public async get_knights(): Promise<KnightsResponse> {
    return this.fetchJson<KnightsResponse>('/knights');
  }

  // 10. get_models()
  public async get_models(): Promise<ModelHealth> {
    return this.fetchJson<ModelHealth>('/models');
  }

  // 11. get_memory()
  public async get_memory(limit = 100): Promise<MemoryEntry[]> {
    return this.fetchJson<MemoryEntry[]>(`/memory?limit=${limit}`);
  }

  // 12. search_memory()
  public async search_memory(query: string, limit = 5): Promise<any[]> {
    return this.fetchJson<any[]>(`/memory/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // 13. get_maps()
  public async get_maps(): Promise<string[]> {
    return this.fetchJson<string[]>('/maps');
  }

  // 14. get_security_status()
  public async get_security_status(): Promise<SecurityStatus> {
    return this.fetchJson<SecurityStatus>('/security/status');
  }

  // 15. get_permissions()
  public async get_permissions(): Promise<SecurityPermissionsResponse> {
    return this.fetchJson<SecurityPermissionsResponse>('/security/permissions');
  }

  // 16. create_approval()
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

  // List approvals helper
  public async list_approvals(status?: string): Promise<ApprovalRequest[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.fetchJson<ApprovalRequest[]>(`/security/approvals${q}`);
  }

  // 17. approve()
  public async approve(approval_id: string, approver = 'admin', reason = 'Human approved in Centipede OS'): Promise<ApprovalRequest> {
    return this.fetchJson<ApprovalRequest>(`/security/approvals/${encodeURIComponent(approval_id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approver, reason }),
    });
  }

  // 18. deny()
  public async deny(approval_id: string, denier = 'admin', reason = 'Denied in Centipede OS'): Promise<ApprovalRequest> {
    return this.fetchJson<ApprovalRequest>(`/security/approvals/${encodeURIComponent(approval_id)}/deny`, {
      method: 'POST',
      body: JSON.stringify({ approver: denier, reason }),
    });
  }

  // 19. get_audit()
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
