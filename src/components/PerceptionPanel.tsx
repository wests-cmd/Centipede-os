import React, { useEffect, useRef, useState } from 'react';
import { CaptureKind, CaptureState, MediaCapture, frameSize } from '../platform/mediaCapture';

export function PerceptionPanel() {
  const video = useRef<HTMLVideoElement>(null);
  const capture = useRef<MediaCapture | null>(null);
  const [state, setState] = useState<CaptureState>('idle');
  const [kind, setKind] = useState<CaptureKind>('camera');
  const [frame, setFrame] = useState('');
  const [message, setMessage] = useState('Capture is off. No device is requested on page load.');
  useEffect(() => {
    const controller = new MediaCapture(navigator.mediaDevices, (next, stream) => {
      setState(next);
      if (next !== 'active') setFrame('');
      if (video.current) video.current.srcObject = stream;
    });
    capture.current = controller;
    const hidden = () => { if (document.hidden) { controller.stop(); setFrame(''); } };
    document.addEventListener('visibilitychange', hidden);
    return () => { document.removeEventListener('visibilitychange', hidden); controller.dispose(); capture.current = null; };
  }, []);
  const start = (next: CaptureKind) => {
    setKind(next); setFrame('');
    setMessage('Use the browser permission prompt. A screen source must be selected each time.');
    void capture.current?.start(next);
  };
  const stop = () => { capture.current?.stop(); setFrame(''); setMessage('Capture stopped; preview discarded.'); };
  const snapshot = () => {
    try {
      if (!video.current || state !== 'active' || kind === 'microphone') return;
      const size = frameSize(video.current.videoWidth, video.current.videoHeight);
      const canvas = document.createElement('canvas'); Object.assign(canvas, size);
      const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas unavailable');
      context.drawImage(video.current, 0, 0, size.width, size.height);
      const image = canvas.toDataURL('image/jpeg', 0.75);
      if (image.length > 350000) throw new Error('Preview exceeds size budget');
      setFrame(image); setMessage('One local preview captured. It has not been uploaded or analyzed.');
    } catch { setMessage('No usable frame yet. Wait for the preview and try again.'); }
  };
  return <section className="space-y-4 p-4" aria-label="Camera, screen and microphone controls">
    <h2 className="text-xl font-bold">Perception — explicit, local capture</h2>
    <p className="text-sm text-slate-300">Choose a device only when needed. Stop, browser revocation, closing this window, or hiding the page ends capture. Nothing here is uploaded, recorded or sent to a model.</p>
    <div className="flex flex-wrap gap-2">
      {(['camera', 'screen', 'microphone'] as CaptureKind[]).map(item => <button key={item} disabled={state === 'requesting'} onClick={() => start(item)} className="min-h-11 rounded border border-slate-600 px-3">Start {item}</button>)}
      <button onClick={stop} className="min-h-11 rounded border border-red-400 px-3">Stop and discard</button>
    </div>
    <p role="status" className="font-semibold">{state === 'active' ? `${kind} capture ACTIVE` : `Capture: ${state}`}</p>
    <p className="text-sm">{message}</p>
    <video ref={video} autoPlay muted playsInline hidden={state !== 'active' || kind === 'microphone'} className="max-h-80 w-full rounded bg-black object-contain" />
    <button onClick={snapshot} disabled={state !== 'active' || kind === 'microphone'} className="min-h-11 rounded border border-slate-600 px-3">Preview one frame</button>
    {frame && <img src={frame} alt="User-selected local frame; not model analysis" className="max-h-80 max-w-full" />}
    <p className="rounded border border-amber-600 p-3 text-sm">Image understanding and speech transcription are not connected by this panel. A preview is not AI understanding. Use a verified vision/STT provider and review its data destination before adding analysis. Existing text input and speech output remain available.</p>
  </section>;
}
