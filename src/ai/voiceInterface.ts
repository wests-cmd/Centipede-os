import { centipedeAIPipeline } from './pipeline';
import { Message, UserInput } from './types';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  speakerId?: string;
}

export interface STTProvider {
  id: string;
  name: string;
  transcribe(audioData: Blob | ArrayBuffer): Promise<TranscriptionResult>;
}

export interface TTSProvider {
  id: string;
  name: string;
  synthesize(text: string): Promise<ArrayBuffer>;
}

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  lastTranscription?: TranscriptionResult;
  requiresConfirmation: boolean;
  pendingText?: string;
  statusMessage: string;
}

export class VoiceProcessor {
  private sttProvider?: STTProvider;
  private ttsProvider?: TTSProvider;
  private state: VoiceState = {
    isListening: false,
    isProcessing: false,
    requiresConfirmation: false,
    statusMessage: 'Voice Interface Idle',
  };

  private listeners: Set<(state: VoiceState) => void> = new Set();

  public subscribe(listener: (state: VoiceState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  public setProviders(stt?: STTProvider, tts?: TTSProvider): void {
    this.sttProvider = stt;
    this.ttsProvider = tts;
  }

  public async processVoiceInput(audioData: Blob | ArrayBuffer, conversationId = 'default_conv'): Promise<Message | null> {
    if (!this.sttProvider) {
      this.state.statusMessage = 'Voice Error: STT provider not configured.';
      this.notify();
      throw new Error('STT Provider not configured.');
    }

    this.state.isProcessing = true;
    this.state.statusMessage = 'Transcribing voice input...';
    this.notify();

    const transcription = await this.sttProvider.transcribe(audioData);
    this.state.lastTranscription = transcription;

    // Check for voice interruption / cancellation keywords
    const lowerText = transcription.text.trim().toLowerCase();
    if (['stop', 'cancel', 'halt', 'never mind', 'abort'].includes(lowerText)) {
      this.state.isProcessing = false;
      this.state.requiresConfirmation = false;
      this.state.pendingText = undefined;
      this.state.statusMessage = 'Voice operation cancelled by user interrupt command.';
      this.notify();
      return null;
    }

    // Voice confidence rule: Confidence < 0.85 requires explicit user confirmation before processing pipeline
    if (transcription.confidence < 0.85) {
      this.state.isProcessing = false;
      this.state.requiresConfirmation = true;
      this.state.pendingText = transcription.text;
      this.state.statusMessage = `Low voice transcription confidence (${(transcription.confidence * 100).toFixed(0)}%). Confirmation required for: "${transcription.text}"`;
      this.notify();
      return null;
    }

    return this.executeConfirmedText(transcription.text, conversationId);
  }

  public async confirmPendingVoiceInput(conversationId = 'default_conv'): Promise<Message | null> {
    if (!this.state.pendingText) {
      throw new Error('No pending voice input to confirm.');
    }

    const text = this.state.pendingText;
    this.state.requiresConfirmation = false;
    this.state.pendingText = undefined;

    return this.executeConfirmedText(text, conversationId);
  }

  public cancelPendingVoiceInput(): void {
    this.state.requiresConfirmation = false;
    this.state.pendingText = undefined;
    this.state.statusMessage = 'Voice input discarded.';
    this.notify();
  }

  private async executeConfirmedText(text: string, conversationId: string): Promise<Message> {
    this.state.isProcessing = true;
    this.state.statusMessage = 'Dispatching voice input through Centipede AI Pipeline...';
    this.notify();

    const input: UserInput = {
      id: `voice_in_${Date.now()}`,
      text,
      timestamp: Date.now(),
      conversationId,
      source: 'VOICE_INTERFACE',
    };

    // Voice passes through identical CentipedeAIPipeline & PermissionGate as text
    const message = await centipedeAIPipeline.process(input);

    this.state.isProcessing = false;
    this.state.statusMessage = `Completed processing. Status: ${message.status}`;
    this.notify();

    return message;
  }

  public getState(): VoiceState {
    return { ...this.state };
  }
}

export const voiceProcessor = new VoiceProcessor();
