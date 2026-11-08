import { describe, it, expect } from 'vitest';
import { VoiceProcessor } from '../../src/ai/voiceInterface';
import { LocalAudioSTTProvider, WebSpeechTTSProvider } from '../../src/ai/voiceProviders';

describe('Voice Assistant Pipeline with Real Providers', () => {
  it('1. Successfully processes audio buffer using LocalAudioSTTProvider when transcript configured', async () => {
    const stt = new LocalAudioSTTProvider('Segmentor, check system status and running tasks.');
    const tts = new WebSpeechTTSProvider();
    const processor = new VoiceProcessor(stt, tts);

    const dummyAudio = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    const result = await stt.transcribe(dummyAudio);

    expect(result.text).toBe('Segmentor, check system status and running tasks.');
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('1b. Fails closed when no local model engine is loaded into memory', async () => {
    const stt = new LocalAudioSTTProvider();
    const dummyAudio = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    await expect(stt.transcribe(dummyAudio)).rejects.toThrow('Local speech-to-text recognition model not loaded');
  });

  it('2. Fails closed with error when empty audio buffer is passed', async () => {
    const stt = new LocalAudioSTTProvider();
    const emptyBuffer = new Uint8Array(0).buffer;

    await expect(stt.transcribe(emptyBuffer)).rejects.toThrow('Empty audio buffer');
  });

  it('3. Cancels processing immediately when interrupt keywords are detected', async () => {
    const mockInterruptSTT = {
      id: 'mock-interrupt',
      name: 'Mock Interrupt STT',
      transcribe: async () => ({
        text: 'stop',
        confidence: 0.98,
      }),
    };
    const processor = new VoiceProcessor(mockInterruptSTT as any, new WebSpeechTTSProvider());

    const result = await processor.processVoiceInput(new Uint8Array([1]).buffer);
    expect(result).toBeNull();
    expect(processor.getState().statusMessage).toContain('cancelled by user interrupt');
  });
});
