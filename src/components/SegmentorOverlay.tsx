import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, X } from 'lucide-react';
import { routeQuickCommand } from '../ai/deterministicRouter';
import { localShortcuts } from '../ai/navigationShortcuts';

export function SegmentorOverlay({ onNavigate, onDraft }: {
  onNavigate: (id: string) => void;
  onDraft: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  const openPanel = () => { previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setOpen(true); };
  const close = () => { setOpen(false); (previous.current?.isConnected ? previous.current : trigger.current)?.focus(); };
  useEffect(() => { if (open) field.current?.focus(); }, [open]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing || event.defaultPrevented) return;
      if (event.ctrlKey && event.altKey && !event.shiftKey && !event.metaKey && event.code === 'Space') {
        event.preventDefault();
        if (open) close(); else openPanel();
      } else if (open && event.key === 'Escape') {
        event.preventDefault(); close();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open]);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const route = routeQuickCommand(text, localShortcuts());
    if (route.kind === 'empty') return;
    setText(''); close();
    if (route.kind === 'navigate') onNavigate(route.destination);
    else onDraft(route.text);
  };
  return createPortal(<>
    <button ref={trigger} type="button" aria-label="Open Segmentor quick assistant" aria-expanded={open}
      aria-keyshortcuts="Control+Alt+Space" onClick={() => open ? close() : openPanel()}
      className="fixed bottom-16 right-3 z-40 flex items-center gap-2 rounded-full border border-blue-500 bg-slate-950 p-3 text-sm text-blue-200 shadow-xl">
      <Bot className="h-5 w-5" aria-hidden="true"/> <span className="hidden sm:inline">Segmentor</span>
    </button>
    {open && <section aria-label="Segmentor quick assistant" className="fixed bottom-32 right-3 z-50 max-h-[calc(100vh-9rem)] w-[min(25rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-blue-500 bg-slate-950 p-4 text-slate-100 shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-blue-200">Segmentor · Quick assistant</h2>
        <button type="button" onClick={close} aria-label="Close quick assistant" className="rounded p-2 text-slate-300"><X aria-hidden="true" className="h-5 w-5"/></button>
      </div>
      <p className="mt-2 text-xs text-slate-300">Open Centipede apps instantly. Other requests become a reviewable Kingdom task draft; nothing is sent automatically. Ctrl+Alt+Space works inside Centipede.</p>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <label htmlFor="segmentor-quick-input" className="block text-sm">What do you need?</label>
        <input ref={field} id="segmentor-quick-input" value={text} onChange={e => setText(e.target.value)} maxLength={4000} className="w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-white" placeholder="Open files"/>
        <button type="submit" disabled={!text.trim()} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Continue</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {([{label:'Files',id:'files'},{label:'Background work',id:'background'},{label:'Screen capture',id:'perception'},{label:'Approvals',id:'security'}] as const).map(item =>
          <button key={item.id} type="button" onClick={() => { close(); onNavigate(item.id); }} className="rounded-lg border border-slate-600 px-3 py-2 text-xs">{item.label}</button>)}
      </div>
      <p className="mt-3 text-xs text-slate-400">No microphone or native desktop permission is requested here.</p>
    </section>}
  </>, document.body);
}
