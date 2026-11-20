import React, { useEffect, useState } from 'react';
import { KingdomAdapter, kingdomAdapter } from '../api/kingdomAdapter';
import type { ConnectionState, MemoryEntry as KingdomMemoryEntry } from '../types';
import { memoryStore } from '../learning/memoryStore';
import { MemoryEntry, TrustLevel } from '../learning/types';
import { Brain, Database, Trash2, Edit3, ShieldAlert, CheckCircle, Search, Filter } from 'lucide-react';

export const MemoryApp: React.FC<{adapter?: KingdomAdapter}> = ({adapter = kingdomAdapter}) => {
  const [connection, setConnection] = useState<ConnectionState>(adapter.getConnectionState());
  const [kingdomEntries, setKingdomEntries] = useState<KingdomMemoryEntry[]>([]);
  const [kingdomState, setKingdomState] = useState<'OFFLINE' | 'LOADING' | 'READY' | 'ERROR'>('OFFLINE');
  const [kingdomError, setKingdomError] = useState('');
  useEffect(() => adapter.subscribeConnection(setConnection), [adapter]);
  useEffect(() => {
    let mounted = true;
    if (connection !== 'CONNECTED') {
      setKingdomEntries([]);
      setKingdomState('OFFLINE');
      return () => { mounted = false; };
    }
    setKingdomState('LOADING');
    adapter.get_memory(100).then(items => {
      if (!mounted) return;
      if (!Array.isArray(items)) throw Error('Kingdom returned an invalid memory response.');
      setKingdomEntries(items);
      setKingdomState('READY');
    }).catch((err: unknown) => {
      if (!mounted) return;
      setKingdomEntries([]);
      setKingdomError(err instanceof Error ? err.message : 'Kingdom memory read failed.');
      setKingdomState('ERROR');
    });
    return () => { mounted = false; };
  }, [adapter, connection]);
  const [memories, setMemories] = useState<MemoryEntry[]>(memoryStore.getMemories());
  const [filterScope, setFilterScope] = useState<string>('ALL');
  const [newContent, setNewContent] = useState<string>('');
  const [selectedTrust, setSelectedTrust] = useState<TrustLevel>('USER_CONFIRMED');

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    await memoryStore.recordMemory({
      type: 'SEMANTIC',
      content: newContent,
      trustLevel: selectedTrust,
      scope: 'USER',
      provenance: { source: 'USER_INPUT', sourceId: 'memory_app', timestamp: Date.now() },
      confidence: 1.0,
    });

    setNewContent('');
    setMemories(memoryStore.getMemories());
  };

  const handleDelete = (memoryId: string) => {
    memoryStore.deleteMemory(memoryId);
    setMemories(memoryStore.getMemories());
  };

  const filtered = memories.filter((m) => {
    if (filterScope === 'ALL') return true;
    return m.scope === filterScope;
  });

  const getTrustBadge = (trust: TrustLevel) => {
    switch (trust) {
      case 'SYSTEM_AUTHORITY':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'USER_CONFIRMED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'MODEL_INFERENCE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'EXTERNAL_SOURCE':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Centipede Memory Explorer — Separate Sources</h2>
            <p className="text-xs text-slate-400">Kingdom server records and local browser notes are separate</p>
          </div>
        </div>

        <div className="flex space-x-2">
          {['ALL', 'USER', 'PROJECT', 'GLOBAL'].map((scope) => (
            <button
              key={scope}
              onClick={() => setFilterScope(scope)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase border transition-all ${
                filterScope === scope
                  ? 'bg-cyan-600 border-cyan-400 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {scope}
            </button>
          ))}
        </div>
      </div>

      <section className="p-4 bg-slate-900 border border-blue-900 rounded-xl space-y-3" aria-label="Kingdom memory">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-white font-bold">Kingdom memory — live read-only</h3>
            <p className="text-xs text-slate-400">Read from Kingdom, not from this browser's local memory store.</p>
          </div>
          <span className="text-xs text-blue-300">{kingdomState}</span>
        </div>
        {kingdomState === 'OFFLINE' && <p className="text-xs text-slate-400">Connect Kingdom to inspect its stored memory.</p>}
        {kingdomState === 'LOADING' && <p className="text-xs text-slate-400">Reading Kingdom memory...</p>}
        {kingdomState === 'ERROR' && <p role="alert" className="text-xs text-red-300">{kingdomError}</p>}
        {kingdomState === 'READY' && (kingdomEntries.length === 0
          ? <p className="text-xs text-slate-400">No memory records returned by Kingdom.</p>
          : <ul className="space-y-2">{kingdomEntries.map(e => (
              <li key={e.id} className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                <span className="text-xs text-blue-300">Kingdom · {e.id}</span>
                <p className="mt-1 text-sm text-white whitespace-pre-wrap break-words">{e.content}</p>
              </li>
            ))}</ul>)}
      </section>
      <p className="text-xs text-slate-400">Local notes below are retained in this browser's process and are not a durable backup. Local deletion does not delete a Kingdom memory record. An optional Kingdom write attempt is not proof of synchronization.</p>
      {/* Record Memory Form */}
      <form onSubmit={handleAddMemory} className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Record local session note</div>
        <div className="flex gap-3">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Type user confirmed fact or preference..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <select
            value={selectedTrust}
            onChange={(e) => setSelectedTrust(e.target.value as TrustLevel)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
          >
            <option value="USER_CONFIRMED">USER_CONFIRMED (Verified)</option>
            <option value="MODEL_INFERENCE">MODEL_INFERENCE (Unverified)</option>
            <option value="EXTERNAL_SOURCE">EXTERNAL_SOURCE (Untrusted)</option>
          </select>
          <button
            type="submit"
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-cyan-600/30"
          >
            Record local note
          </button>
        </div>
      </form>

      {/* Memory List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 p-8 rounded-2xl text-center text-slate-500 text-xs italic">
            No memories matching filter criteria.
          </div>
        ) : (
          filtered.map((m) => (
            <div key={m.memoryId} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex justify-between items-center space-x-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getTrustBadge(m.trustLevel)}`}>
                    {m.trustLevel}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Scope: {m.scope}</span>
                  <span className="text-[10px] text-slate-500 font-mono">v{m.version}</span>
                </div>
                <div className="text-sm font-medium text-white">{typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}</div>
              </div>

              <button
                onClick={() => handleDelete(m.memoryId)}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-colors"
                title="Forget / Delete Memory"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
