import React, { useEffect, useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { kingdomActions } from '../api/kingdomActions';
import { localInference, type LocalModelStatus } from '../api/localInference';
import type { TaskItem } from '../types';
import { KingdomActionUnlock } from './KingdomActionUnlock';
import { Bot, RefreshCw, ShieldAlert, Play } from 'lucide-react';

interface CentipedeAIProps {
  adapter: KingdomAdapter;
  onNavigateSecurity: () => void;
  draft?: { text: string } | null;
  onDraftConsumed?: () => void;
}

/** Segmentor is a Kingdom task client, not a second executor or fake chat completion engine. */
export const CentipedeAI: React.FC<CentipedeAIProps> = ({ adapter, onNavigateSecurity, draft, onDraftConsumed }) => {
  const [prompt, setPrompt] = useState('');
  useEffect(() => { if (draft) { setPrompt(draft.text); onDraftConsumed?.(); } }, [draft, onDraftConsumed]);
  const [connection, setConnection] = useState(adapter.getConnectionState());
  const [unlocked, setUnlocked] = useState(kingdomActions.isUnlocked());
  const [task, setTask] = useState<TaskItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [localStatus, setLocalStatus] = useState<LocalModelStatus | null>(null);
  const [offlineQuestion, setOfflineQuestion] = useState('');
  const [offlineAnswer, setOfflineAnswer] = useState('');
  const [offlineError, setOfflineError] = useState('');
  const [offlineBusy, setOfflineBusy] = useState(false);
  useEffect(() => adapter.subscribeConnection(setConnection), [adapter]);
  useEffect(() => kingdomActions.subscribe(setUnlocked), []);

  const refreshLocal = async () => {
    setLocalStatus(await localInference.status());
  };
  useEffect(() => { void refreshLocal(); }, []);
  const askOffline = async (event: React.FormEvent) => {
    event.preventDefault();
    if (offlineBusy || localStatus?.state !== 'ready' || !offlineQuestion.trim()) return;
    setOfflineBusy(true);
    setOfflineError('');
    setOfflineAnswer('');
    try {
      const response = await localInference.ask(offlineQuestion.trim());
      if (response.actionsExecuted !== false || response.approvalGranted !== false ||
        response.source !== 'local-cpu-text-only') throw new Error('Invalid unprivileged local inference receipt.');
      setOfflineAnswer(response.text);
    } catch (err) {
      setOfflineError(err instanceof Error ? err.message : 'Local inference unavailable.');
    } finally {
      setOfflineBusy(false);
      await refreshLocal();
    }
  };

  const refresh = async (id: string) => {
    try {
      const latest = await adapter.get_task(id);
      setTask(latest);
      if (latest.status === 'unknown') setError('Kingdom task state unknown due to connection loss. No success is assumed.');
      else setError('');
    } catch (e) {
      setError(`Could not verify Kingdom task state: ${e instanceof Error ? e.message : 'unavailable'}`);
    }
  };
  useEffect(() => {
    if (!task?.id || connection !== 'CONNECTED') return;
    if (['completed', 'failed', 'cancelled'].includes(task.status.toLowerCase())) return;
    const timer = setInterval(() => { void refresh(task.id); }, 3000);
    return () => clearInterval(timer);
  }, [adapter, task?.id, task?.status, connection]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || busy || !unlocked) return;
    setBusy(true); setError('');
    try {
      const actual = await kingdomActions.submitTask(prompt.trim());
      setTask(actual);
      setPrompt('');
      await refresh(actual.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kingdom task submission failed.');
    } finally { setBusy(false); }
  };

  return <div className="p-6 max-w-4xl mx-auto space-y-5">
    <header className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
      <h2 className="text-xl font-bold text-white flex items-center gap-2"><Bot className="text-blue-400"/>Segmentor — Kingdom Tasks</h2>
      <p className="text-sm text-slate-300 mt-2">Give Segmentor work and follow its real Kingdom task. Execution, model selection, worker placement and security are controlled by Kingdom. This screen does not simulate task completion.</p>
    </header>
    <section className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-3" aria-label="Offline AI">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h3 className="text-white font-semibold">Offline AI — small-model questions only</h3>
        <button type="button" onClick={() => void refreshLocal()} className="text-blue-300 text-sm flex gap-1 items-center">
          <RefreshCw className="w-4 h-4"/>Check local model
        </button>
      </div>
      <p className="text-xs text-slate-300">Optional CPU-only text generation on this computer. No tools, filesystem access, computer control or approval authority. This never automatically sends your question to Kingdom or the cloud.</p>
      <p className="text-sm text-slate-200" role="status">
        Local state: <strong>{localStatus?.state || 'checking'}</strong>. {localStatus?.reason}
      </p>
      {localStatus?.model && <p className="text-xs text-slate-300">
        Model: {localStatus.model}, SHA-256: {localStatus.modelSha256?.slice(0, 12)}…;
        context: {localStatus.profile?.context}, CPU threads: {localStatus.profile?.threads};
        available RAM: {localStatus.availableRamMiB ?? 'unknown'} MiB;
        measured peak process RSS: {localStatus.measuredPeakRssKiB ?? 'unknown'} KiB (previous benchmark)
      </p>}
      <form onSubmit={askOffline} className="space-y-2">
        <label htmlFor="offline-ai-question" className="block text-sm font-semibold text-slate-200">Ask a simple offline question</label>
        <textarea id="offline-ai-question" rows={2} maxLength={1000} value={offlineQuestion}
          onChange={e => setOfflineQuestion(e.target.value)}
          placeholder="Explain what a file manager does…" className="w-full bg-slate-950 border border-slate-600 text-white p-3 rounded-xl"/>
        <button type="submit" disabled={offlineBusy || localStatus?.state !== 'ready' || !offlineQuestion.trim()}
          className="bg-blue-700 hover:bg-blue-600 text-white rounded-xl px-4 py-2 disabled:opacity-50">
          {offlineBusy ? 'Generating locally…' : 'Ask offline model'}
        </button>
      </form>
      {offlineError && <p role="alert" className="text-red-300 text-sm">{offlineError}</p>}
      {offlineAnswer && <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg">
        <p className="text-xs text-slate-400">Unverified local model text. It did not perform any actions or grant permission.</p>
        <p className="text-sm text-slate-100 whitespace-pre-wrap break-words mt-2">{offlineAnswer}</p>
      </div>}
      {localStatus?.state !== 'ready' && <p className="text-xs text-slate-400">
        Offline answers require an owner-installed llama.cpp runtime, approved GGUF and matching safe profile benchmark. Kingdom task submission remains separate.
      </p>}
    </section>
    <KingdomActionUnlock />
    {connection !== 'CONNECTED' && <p role="status" className="bg-slate-900 border border-red-700 rounded-xl p-3 text-red-300">
      Kingdom read connection: {connection}. Existing work cannot be verified until connected.
    </p>}
    <form onSubmit={submit} className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-3">
      <label htmlFor="segmentor-prompt" className="block text-sm text-slate-200 font-semibold">What should Kingdom work on?</label>
      <textarea id="segmentor-prompt" rows={3} value={prompt} onChange={e => setPrompt(e.target.value)}
        placeholder="Describe a specific task for Kingdom to perform..." className="w-full bg-slate-950 border border-slate-600 text-white p-3 rounded-xl" />
      <button type="submit" disabled={busy || !unlocked || connection !== 'CONNECTED' || !prompt.trim()}
        className="bg-blue-700 hover:bg-blue-600 text-white rounded-xl px-4 py-2 flex items-center gap-2 disabled:opacity-50">
        <Play className="w-4 h-4"/>{busy ? 'Submitting to Kingdom…' : 'Submit real Kingdom task'}
      </button>
      {!unlocked && <p className="text-sm text-slate-400">Unlock owner actions above to submit. Read-only connection alone cannot run work.</p>}
    </form>
    {error && <div role="alert" className="p-3 border border-red-700 bg-slate-950 rounded-xl text-red-300">{error}</div>}
    {task && <section className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-3">
      <div className="flex flex-wrap justify-between gap-3">
        <h3 className="text-white font-semibold">Kingdom task ID: <code className="text-blue-300">{task.id}</code></h3>
        <button type="button" onClick={() => void refresh(task.id)} className="text-blue-300 flex items-center gap-1 text-sm"><RefreshCw className="w-4 h-4"/>Refresh status</button>
      </div>
      <p className="text-sm text-slate-200">Kingdom reported status: <strong>{task.status}</strong></p>
      {task.error && <p className="text-red-300 text-sm">{task.error}</p>}
      {task.result !== undefined && <pre className="bg-slate-950 text-slate-200 text-xs p-3 rounded-lg overflow-auto">{JSON.stringify(task.result, null, 2)}</pre>}
      <p className="text-xs text-slate-400">A Kingdom task receipt is not proof of completed, verified work. Review the task result and worker evidence.</p>
    </section>}
    <button type="button" onClick={onNavigateSecurity} className="text-blue-300 flex items-center gap-2 text-sm">
      <ShieldAlert className="w-4 h-4" /> Review Kingdom security and approvals
    </button>
  </div>;
};
