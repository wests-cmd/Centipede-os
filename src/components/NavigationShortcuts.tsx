import React, { useState } from 'react';
import { SAFE_SHORTCUT_TARGETS, normalizeShortcut, validShortcut, type ShortcutTarget } from '../ai/deterministicRouter';
import { localShortcuts, saveShortcuts } from '../ai/navigationShortcuts';

export function NavigationShortcuts() {
  const [rows,setRows]=useState(localShortcuts);
  const [phrase,setPhrase]=useState('');
  const [destination,setDestination]=useState<ShortcutTarget>('files');
  const [message,setMessage]=useState('');
  const persist=(next:ReturnType<typeof localShortcuts>)=>{
    try { saveShortcuts(window.localStorage,next); setRows(next); return true; }
    catch { setMessage('Could not save shortcuts. Existing settings are unchanged.'); return false; }
  };
  return <section aria-label="Personal shortcuts" className="space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
    <h3 className="font-semibold text-white">Personal shortcuts</h3>
    <p className="text-xs text-slate-300">Teach Segmentor a phrase to open a Centipede view. These explicit, local shortcuts use no AI, cannot perform protected actions, and are not autonomous learned workflows.</p>
    <form className="space-y-2" onSubmit={event=>{
      event.preventDefault(); const candidate={phrase:normalizeShortcut(phrase),destination};
      if (!validShortcut(candidate)) {setMessage('Choose a unique phrase of 2–60 letters, numbers, spaces or hyphens; do not start with a command word.');return;}
      const current=localShortcuts();
      if (current.some(row=>row.phrase===candidate.phrase)){setMessage('That phrase already exists. Remove it first to change it.');return;}
      if (current.length>=32){setMessage('Maximum 32 shortcuts. Remove one first.');return;}
      if(persist([...current,candidate])){setPhrase('');setMessage('Shortcut saved on this browser.');}
    }}>
      <label className="block text-sm">Shortcut phrase<input value={phrase} onChange={e=>setPhrase(e.target.value)} maxLength={60} placeholder="work mode" className="mt-1 block w-full rounded border border-slate-600 bg-slate-950 p-2 text-white"/></label>
      <label className="block text-sm">Open view<select value={destination} onChange={e=>setDestination(e.target.value as ShortcutTarget)} className="mt-1 block w-full rounded border border-slate-600 bg-slate-950 p-2 text-white">
        {Object.entries(SAFE_SHORTCUT_TARGETS).map(([id,label])=><option key={id} value={id}>{label}</option>)}
      </select></label>
      <button type="submit" className="rounded bg-blue-700 px-3 py-2 text-white">Save shortcut</button>
    </form>
    {message && <p role="status" className="text-sm">{message}</p>}
    {rows.map(row=><div key={row.phrase} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-700 py-2 text-sm">
      <span>{row.phrase} → {SAFE_SHORTCUT_TARGETS[row.destination]}</span>
      <button type="button" aria-label={`Remove shortcut ${row.phrase}`} onClick={()=>{if(persist(localShortcuts().filter(item=>item.phrase!==row.phrase)))setMessage('Shortcut removed.');}} className="rounded border border-red-700 px-2 py-1 text-red-200">Remove</button>
    </div>)}
  </section>;
}
