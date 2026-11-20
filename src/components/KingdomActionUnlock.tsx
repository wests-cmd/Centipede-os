import React, { useEffect, useState } from 'react';
import { kingdomActions } from '../api/kingdomActions';

/** Local desktop-only owner unlock; the access code never enters localStorage. */
export const KingdomActionUnlock: React.FC = () => {
  const [unlocked, setUnlocked] = useState(kingdomActions.isUnlocked());
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => kingdomActions.subscribe(setUnlocked), []);
  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try { await kingdomActions.unlock(code); } catch (e) {
      setError(e instanceof Error ? e.message : 'Owner unlock failed.');
    } finally { setBusy(false); setCode(''); }
  };
  if (unlocked) {
    return <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-blue-700 p-3 rounded-xl text-sm text-slate-200">
      <span role="status">Kingdom owner task actions unlocked on this host (15-minute session). Tasks still follow Kingdom policy.</span>
      <button type="button" onClick={() => void kingdomActions.lock()} className="border border-red-700 text-red-300 px-3 py-1 rounded-lg">Lock actions</button>
    </div>;
  }
  return <form onSubmit={unlock} className="bg-slate-900 border border-blue-800 rounded-xl p-3 space-y-2">
    <label htmlFor="kingdom-owner-code" className="block text-sm text-slate-200">Unlock real Kingdom task actions with your owner access code (local computer only)</label>
    <div className="flex flex-wrap gap-2">
      <input id="kingdom-owner-code" type="password" value={code} autoComplete="off" onChange={e => setCode(e.target.value)}
        placeholder="Kingdom owner access code" className="min-w-48 flex-1 bg-slate-950 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
      <button type="submit" disabled={busy || !code} className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm">Unlock</button>
    </div>
    <p className="text-xs text-slate-400">This code is checked only by the local Centipede service; it is not saved in your browser. Remote phones cannot unlock this channel.</p>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </form>;
};
