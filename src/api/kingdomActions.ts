import type { TaskItem } from '../types';

type Listener = (unlocked: boolean) => void;

/** Owner code is sent once to localhost and never retained in web storage or this class. */
export class KingdomActions {
  private token: string | null = null;
  private expiresAt = 0;
  private listeners = new Set<Listener>();

  public isUnlocked(): boolean {
    return Boolean(this.token && Date.now() < this.expiresAt);
  }
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.isUnlocked());
    return () => { this.listeners.delete(listener); };
  }
  private notify(): void {
    for (const fn of this.listeners) fn(this.isUnlocked());
  }
  private async request(path: string, payload: object): Promise<any> {
    const response = await fetch(`/api/v1/kingdom/actions/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Centipede-Owner-Intent': '1',
        ...(this.token ? { 'X-Centipede-Action-Session': this.token } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    });
    let data: any;
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) {
      if (response.status === 401 && path !== 'unlock') {
        this.token = null;
        this.expiresAt = 0;
        this.notify();
      }
      throw new Error(typeof data.error === 'string' ? data.error : `Kingdom action failed (HTTP ${response.status}).`);
    }
    return data;
  }
  public async unlock(ownerCode: string): Promise<void> {
    const result = await this.request('unlock', { ownerCode });
    if (typeof result.sessionToken !== 'string' || !/^[a-f0-9]{64}$/.test(result.sessionToken) ||
      typeof result.expiresAt !== 'number' || result.expiresAt <= Date.now()) {
      throw new Error('Centipede did not return a valid, expiring owner session.');
    }
    this.token = result.sessionToken;
    this.expiresAt = result.expiresAt;
    this.notify();
  }
  public async lock(): Promise<void> {
    const token = this.token;
    this.token = null;
    this.expiresAt = 0;
    this.notify();
    if (token) {
      try { await fetch('/api/v1/kingdom/actions/lock', {
        method: 'POST', headers: {
          'Content-Type': 'application/json', 'X-Centipede-Owner-Intent': '1',
          'X-Centipede-Action-Session': token,
        }, body: '{}', signal: AbortSignal.timeout(5000),
      }); } catch { /* Memory-only credential was already discarded. */ }
    }
  }
  public async submitTask(prompt: string): Promise<TaskItem> {
    if (!this.isUnlocked()) throw new Error('Unlock the Kingdom owner session on this computer before submitting tasks.');
    const task = await this.request('tasks', { prompt });
    if (!task || typeof task.id !== 'string' || typeof task.status !== 'string') {
      throw new Error('Kingdom did not return a confirmed task ID. Inspect Tasks before retrying.');
    }
    return task as TaskItem;
  }
  public async cancelTask(id: string): Promise<TaskItem> {
    if (!this.isUnlocked()) throw new Error('Unlock the Kingdom owner session to cancel a task.');
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error('Invalid Kingdom task ID.');
    return this.request(`tasks/${id}/cancel`, {}) as Promise<TaskItem>;
  }
}
export const kingdomActions = new KingdomActions();
