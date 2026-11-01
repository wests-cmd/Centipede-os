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
});
