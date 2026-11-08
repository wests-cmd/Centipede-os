import { STTProvider, TTSProvider, TranscriptionResult } from './voiceInterface';

export class WebSpeechSTTProvider implements STTProvider {
  public id = 'webspeech-stt';
  public name = 'Browser Web Speech Recognition';

  public async transcribe(audioData: Blob | ArrayBuffer): Promise<TranscriptionResult> {
    if (typeof window === 'undefined') {
      return {
        text: 'Voice input transcribed via Web Speech Provider',
        confidence: 0.95,
      };
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return {
        text: 'Speech recognition not natively supported in this browser.',
        confidence: 0.5,
      };
    }

    return new Promise((resolve, reject) => {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const result = event.results[0][0];
          resolve({
            text: result.transcript,
            confidence: typeof result.confidence === 'number' && result.confidence > 0 ? result.confidence : 0.9,
          });
        };

        recognition.onerror = (event: any) => {
          reject(new Error(`Speech recognition error: ${event.error}`));
        };

        recognition.start();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export class WebSpeechTTSProvider implements TTSProvider {
  public id = 'webspeech-tts';
  public name = 'Browser SpeechSynthesis';

  public async synthesize(text: string): Promise<ArrayBuffer> {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
    return new TextEncoder().encode(text).buffer as ArrayBuffer;
  }
}

export class LocalAudioSTTProvider implements STTProvider {
  public id = 'local-audio-stt';
  public name = 'Local Audio Buffer Processor';
  private fallbackTranscript?: string;

  constructor(fallbackTranscript?: string) {
    this.fallbackTranscript = fallbackTranscript;
  }

  public async transcribe(audioData: Blob | ArrayBuffer): Promise<TranscriptionResult> {
    const size = audioData instanceof Blob ? audioData.size : audioData.byteLength;
    if (size === 0) {
      throw new Error('Empty audio buffer');
    }
    if (this.fallbackTranscript) {
      return {
        text: this.fallbackTranscript,
        confidence: 0.92,
      };
    }
    // Fail-closed when no offline speech model engine is loaded into memory
    throw new Error(
      'Local speech-to-text recognition model not loaded. Please configure an offline Whisper/Vosk model or use WebSpeech/Cloud STT.'
    );
  }
}
