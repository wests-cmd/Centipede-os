import { describe, it, expect, vi, afterEach } from 'vitest';
import { VoiceProcessor } from '../../src/ai/voiceInterface';
import { centipedeAIPipeline } from '../../src/ai/pipeline';
afterEach(() => vi.restoreAllMocks());
describe('Voice evidence and recovery', () => {
  it.each([NaN, Infinity, -0.1, 1.1, undefined, null])('requires confirmation for invalid confidence %s', async confidence => {
    const process = vi.spyOn(centipedeAIPipeline, 'process'); const voice = new VoiceProcessor();
    voice.setProviders({ id: 'test', name: 'test', transcribe: async () => ({ text: 'status', confidence } as any) });
    expect(await voice.processVoiceInput(new ArrayBuffer(0))).toBeNull();
    expect(voice.getState().requiresConfirmation).toBe(true); expect(process).not.toHaveBeenCalled();
  });
  it('clears a rejected transcription and stale pending confirmation', async () => {
    const voice = new VoiceProcessor(); const transcribe = vi.fn().mockResolvedValueOnce({ text: 'old command', confidence: 0.3 }).mockRejectedValueOnce(new Error('offline'));
    voice.setProviders({ id: 'test', name: 'test', transcribe }); await voice.processVoiceInput(new ArrayBuffer(0));
    await expect(voice.processVoiceInput(new ArrayBuffer(0))).rejects.toThrow('offline');
    expect(voice.getState()).toMatchObject({ isProcessing: false, requiresConfirmation: false, pendingText: undefined });
  });
  it('resets processing when the governed pipeline rejects a command', async () => {
    vi.spyOn(centipedeAIPipeline, 'process').mockRejectedValueOnce(new Error('not connected'));
    const voice = new VoiceProcessor(); voice.setProviders({ id: 'test', name: 'test', transcribe: async () => ({ text: 'status', confidence: 0.99 }) });
    await expect(voice.processVoiceInput(new ArrayBuffer(0))).rejects.toThrow('not connected');
    expect(voice.getState().isProcessing).toBe(false); expect(voice.getState().statusMessage).toContain('failed');
  });
  it('does not dispatch a delayed high-confidence result after cancellation', async () => {
    const process = vi.spyOn(centipedeAIPipeline, 'process');
    const voice = new VoiceProcessor();
    let resolve!: (value: { text: string; confidence: number }) => void;
    voice.setProviders({ id: 'test', name: 'test', transcribe: () => new Promise(r => { resolve = r; }) });
    const pending = voice.processVoiceInput(new ArrayBuffer(0));
    voice.cancelPendingVoiceInput();
    resolve({ text: 'status', confidence: 0.99 });
    expect(await pending).toBeNull();
    expect(process).not.toHaveBeenCalled();
    expect(voice.getState()).toMatchObject({ isProcessing: false, pendingText: undefined, lastTranscription: undefined });
  });

  it('rejects parallel transcription and invalidates results from a replaced provider', async () => {
    const process = vi.spyOn(centipedeAIPipeline, 'process');
    const voice = new VoiceProcessor();
    let reject!: (error: Error) => void;
    voice.setProviders({ id: 'old', name: 'old', transcribe: () => new Promise((_r, j) => { reject = j; }) });
    const old = voice.processVoiceInput(new ArrayBuffer(0));
    await expect(voice.processVoiceInput(new ArrayBuffer(0))).rejects.toThrow('already processing');
    voice.setProviders({ id: 'new', name: 'new', transcribe: async () => ({ text: 'status', confidence: 0.3 }) });
    await voice.processVoiceInput(new ArrayBuffer(0), 'new-conversation');
    reject(new Error('old provider offline'));
    expect(await old).toBeNull();
    expect(process).not.toHaveBeenCalled();
    expect(voice.getState()).toMatchObject({ requiresConfirmation: true, pendingText: 'status' });
  });

  it('binds confirmation to its original conversation and consumes it exactly once', async () => {
    const process = vi.spyOn(centipedeAIPipeline, 'process');
    const voice = new VoiceProcessor();
    voice.setProviders({ id: 'test', name: 'test', transcribe: async () => ({ text: 'status', confidence: 0.2 }) });
    await voice.processVoiceInput(new ArrayBuffer(0), 'original');
    await expect(voice.confirmPendingVoiceInput('different')).rejects.toThrow('different conversation');
    expect(process).not.toHaveBeenCalled();
    await voice.confirmPendingVoiceInput();
    expect(process).toHaveBeenCalledTimes(1);
    expect(process).toHaveBeenCalledWith(expect.objectContaining({ conversationId: 'original' }));
    await expect(voice.confirmPendingVoiceInput()).rejects.toThrow('No pending');
  });
});
