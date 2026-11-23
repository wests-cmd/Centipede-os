import type { TaskItem } from '../types';

type Listener = (unlocked: boolean) => void;
export interface HostFileItem { name: string; kind: 'file' | 'directory'; size: number; }
export interface HostFileList { directory: string; entries: HostFileItem[]; truncated: boolean; }
export interface HostFileRead { path: string; content: string; size: number; }

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
  private async request(path: string, payload: object, scope: 'kingdom' | 'files' | 'harness' = 'kingdom'): Promise<any> {
    const base = scope === 'files' ? '/api/v1/host-files' : scope === 'harness' ? '/api/v1/harness' : '/api/v1/kingdom/actions';
    const response = await fetch(`${base}/${path}`, {
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
  public async listHostFiles(directory: string): Promise<HostFileList> {
    if (!this.isUnlocked()) throw new Error('Unlock owner actions to browse local Files.');
    return this.request('list', { directory }, 'files');
  }
  public async readHostFile(path: string): Promise<HostFileRead> {
    if (!this.isUnlocked()) throw new Error('Unlock owner actions to preview local Files.');
    return this.request('read', { path }, 'files');
  }
  public async createHostFile(directory: string, name: string, content: string): Promise<void> {
    if (!this.isUnlocked()) throw new Error('Unlock owner actions to create local Files.');
    await this.request('create', { directory, name, content }, 'files');
  }
  public async createHostDirectory(directory: string, name: string): Promise<void> {
    if (!this.isUnlocked()) throw new Error('Unlock owner actions to create local folders.');
    await this.request('mkdir', { directory, name }, 'files');
  }
  /** Existing expiring host-owner authorization gates every background action. */
  public async harnessControl(action: 'enable' | 'disable' | 'pause' | 'resume'): Promise<void> {
    if (!this.isUnlocked()) throw new Error('Unlock the local owner session before enabling background work.');
    await this.request('control', { action }, 'harness');
  }
  public async harnessAddRoutine(routine: {
    name: string; url: string; intervalSeconds: number;
    steps: Array<{ action: 'click_link' | 'fill' | 'screenshot'; selector?: string; value?: string }>;
  }): Promise<void> {
    if (!this.isUnlocked()) throw new Error('Unlock the local owner session before adding a recurring browser routine.');
    await this.request('routines', routine, 'harness');
  }
  public async harnessDeleteRoutine(id: string): Promise<void> {
    if (!this.isUnlocked()) throw new Error('Unlock the local owner session before deleting browser routines.');
    if (!/^web_[a-f0-9]{16}$/.test(id)) throw new Error('Invalid browser routine ID.');
    await this.request('routines/delete', { id }, 'harness');
  }
  /** Copies an existing regular file inside the confined, owner-only workspace. */
  public async copyHostFile(path: string, directory: string, name: string): Promise<{ path: string; size: number }> {
    if (!this.isUnlocked()) throw new Error('Unlock owner actions to copy local files.');
    const result = await this.request('copy', { path, directory, name }, 'files');
    if (result?.copied !== true || typeof result.path !== 'string' ||
        typeof result.size !== 'number' || !Number.isSafeInteger(result.size))
      throw new Error('File copy did not return a verified copy receipt.');
    return { path: result.path, size: result.size };
  }
  public async cancelTask(id: string): Promise<TaskItem> {
    if (!this.isUnlocked()) throw new Error('Unlock the Kingdom owner session to cancel a task.');
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error('Invalid Kingdom task ID.');
    return this.request(`tasks/${id}/cancel`, {}) as Promise<TaskItem>;
  }
}
export const kingdomActions = new KingdomActions();
