import React, { useState } from 'react';
import { prepareHomeMedia, storeHomeMedia } from '../platform/homeMedia';

export function HomeMediaPicker({ onSelected, onReset }: { onSelected: () => void; onReset: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <div className="mt-4 space-y-3 rounded-xl border border-slate-600 p-4 text-sm text-slate-300">
    <label className="block space-y-2"><span>Use your own picture, GIF or video</span>
      <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm" disabled={busy} className="block w-full text-xs" onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (!file) return;
        setBusy(true); setMessage('Checking background…');
        try { await storeHomeMedia(await prepareHomeMedia(file)); onSelected(); setMessage(`Saved ${file.name}. It starts as a still preview; choose Play on Home to animate.`); }
        catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save this background.'); }
        finally { setBusy(false); }
      }} />
    </label>
    <p className="text-xs text-slate-400">Local to this browser; never uploaded. Up to 20 MiB, 4096 × 4096 pixels and 2 minutes. Animation is opt-in and pauses when hidden. Reduced motion uses a real still preview. This changes the app Home scene, not your operating system wallpaper.</p>
    <button type="button" disabled={busy} className="rounded border border-slate-500 px-3 py-2" onClick={async () => {
      setBusy(true);
      try { await storeHomeMedia(null); onReset(); setMessage('Removed the saved custom background. Signature artwork selected.'); }
      catch (error) { setMessage(error instanceof Error ? error.message : 'Could not reset the background.'); }
      finally { setBusy(false); }
    }}>Remove custom background</button>
    {message && <p role="status" className="text-xs">{message}</p>}
  </div>;
}
