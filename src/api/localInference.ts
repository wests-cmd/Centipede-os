export interface LocalModelStatus {
  state: 'disabled' | 'not_configured' | 'blocked' | 'ready' | 'busy' | 'unavailable';
  enabled: boolean;
  loaded: false;
  reason: string;
  model?: string;
  modelSha256?: string;
  modelBytes?: number;
  version?: string;
  profile?: { context: 512 | 1024; threads: 1 | 2 };
  measuredPeakRssKiB?: number;
  availableRamMiB?: number;
}
export interface LocalModelAnswer {
  text: string;
  durationMs: number;
  observedRssKiB: number;
  model: string;
  modelSha256: string;
  profile: { context: 512 | 1024; threads: 1 | 2 };
  source: 'local-cpu-text-only';
  actionsExecuted: false;
  approvalGranted: false;
}
/** No owner/Kingdom secret is sent or saved: offline generation is loopback-only, text-only. */
export const localInference = {
  async status(): Promise<LocalModelStatus> {
    try {
      const response = await fetch('/api/v1/local-ai/status', { signal: AbortSignal.timeout(8_000) });
      if (!response.ok) throw Error('Local AI endpoint is not available on this computer.');
      const data = await response.json() as LocalModelStatus;
      if (!data || !['disabled', 'not_configured', 'blocked', 'ready', 'busy'].includes(data.state))
        throw Error('Local AI returned an invalid status.');
      return data;
    } catch {
      return { state: 'unavailable', enabled: false, loaded: false,
        reason: 'The host-only local AI service is unavailable. No local model has run.' };
    }
  },
  async ask(question: string): Promise<LocalModelAnswer> {
    if (!question.trim() || question.length > 1000) throw Error('A short informational question is required.');
    const response = await fetch('/api/v1/local-ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Centipede-Owner-Intent': '1' },
      body: JSON.stringify({ prompt: question }),
      signal: AbortSignal.timeout(98_000),
    });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(typeof data?.error === 'string' ? data.error : 'Offline generation was not confirmed.');
    if (typeof data?.text !== 'string' || !data.text.trim() ||
      data.source !== 'local-cpu-text-only' || data.actionsExecuted !== false ||
      data.approvalGranted !== false) throw Error('Untrusted local model response was rejected.');
    return data as LocalModelAnswer;
  },
};
