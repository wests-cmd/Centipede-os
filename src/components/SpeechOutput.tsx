import React, { useEffect, useState } from 'react';
import { Pause, Play, Volume2, X } from 'lucide-react';
import { redactSpeechSecrets } from '../ai/accessibilitySpeech';
import { loadAccessibilitySettings } from '../platform/accessibility';

interface SpeechOutputProps {
  text: string;
}

export const SpeechOutput: React.FC<SpeechOutputProps> = ({ text }) => {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState('');
  const [rate, setRate] = useState(() => {
    if (typeof window === 'undefined') return 1;
    try { return loadAccessibilitySettings(window.localStorage).speechRate; } catch { return 1; }
  });
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState('Speech starts only when you press Speak.');

  useEffect(() => {
    if (!supported) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speak = () => {
    if (!supported) {
      setMessage('Speech output is not supported by this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const safeText = redactSpeechSecrets(text);
    const utterance = new SpeechSynthesisUtterance(safeText);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.voice = voices.find((voice) => voice.name === voiceName) || null;
    utterance.onstart = () => { setSpeaking(true); setPaused(false); setMessage('Speaking response.'); };
    utterance.onend = () => { setSpeaking(false); setPaused(false); setMessage('Finished speaking.'); };
    utterance.onerror = () => { setSpeaking(false); setPaused(false); setMessage('Speech could not be played.'); };
    setMessage('Starting speech…');
    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    if (!supported || !window.speechSynthesis.speaking || window.speechSynthesis.paused) return;
    window.speechSynthesis.pause();
    setPaused(true);
    setMessage('Speech paused.');
  };

  const resume = () => {
    if (!supported || !window.speechSynthesis.paused) return;
    window.speechSynthesis.resume();
    setPaused(false);
    setMessage('Speech resumed.');
  };

  const stop = () => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    setMessage('Speech stopped.');
  };

  return (
    <fieldset className="mt-3 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
      <legend className="px-1 text-xs font-semibold text-slate-200">Listen to this response</legend>
      <p className="text-xs text-slate-400">Speech is opt-in. Common password, token, and key patterns are filtered, but the filter cannot recognize every secret format; review sensitive text before playing it. Your browser uses its current audio output; choose headphones in your device settings for private listening.</p>
      {supported && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <span className="min-w-12">Voice</span>
            <select value={voiceName} onChange={(event) => setVoiceName(event.target.value)} className="min-h-11 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-white">
              <option value="">System default</option>
              {voices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} ({voice.lang})</option>)}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-xs text-slate-300">
            <span className="min-w-12">Pitch</span>
            <input aria-label="Speech pitch" type="range" min="0.7" max="1.4" step="0.1" value={pitch} onChange={(event) => setPitch(Number(event.target.value))} className="min-w-0 flex-1" />
            <span>{pitch.toFixed(1)}</span>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-xs text-slate-300">
            <span className="min-w-12">Volume</span>
            <input aria-label="Speech volume" type="range" min="0.2" max="1" step="0.1" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="min-w-0 flex-1" />
            <span>{Math.round(volume * 100)}%</span>
          </label>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!supported || !text.trim()} onClick={speak} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-800 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
          <Volume2 aria-hidden="true" className="h-4 w-4" /> Speak / repeat
        </button>
        <button type="button" disabled={!supported || !speaking || paused} onClick={pause} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 disabled:opacity-50">
          <Pause aria-hidden="true" className="h-4 w-4" /> Pause
        </button>
        <button type="button" disabled={!supported || !paused} onClick={resume} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 disabled:opacity-50">
          <Play aria-hidden="true" className="h-4 w-4" /> Resume
        </button>
        <button type="button" disabled={!supported || (!speaking && !paused)} onClick={stop} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 disabled:opacity-50">
          <X aria-hidden="true" className="h-4 w-4" /> Stop
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-300" role="status" aria-live="polite">{supported ? message : 'Speech output is not available in this browser.'}</p>
    </fieldset>
  );
};
