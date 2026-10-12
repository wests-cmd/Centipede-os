import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Download, HardDrive, RefreshCw, Sparkles, WandSparkles } from 'lucide-react';
import { localModelsApi, LocalModelInfo } from '../api/localModels';

function formatBytes(bytes?: number): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return 'Size unavailable';
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export const LocalModelStudio: React.FC = () => {
  const [models, setModels] = useState<LocalModelInfo[]>([]);
  const [modelName, setModelName] = useState('');
  const [customName, setCustomName] = useState('');
  const [baseModel, setBaseModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [busy, setBusy] = useState<'list' | 'pull' | 'custom' | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [available, setAvailable] = useState(true);

  const refresh = useCallback(async () => {
    setBusy('list');
    try {
      const catalog = await localModelsApi.list();
      setModels(Array.isArray(catalog.models) ? catalog.models : []);
      setAvailable(true);
    } catch (error) {
      setAvailable(false);
      setMessage({ text: error instanceof Error ? error.message : 'Local model service is unavailable.', error: true });
    } finally {
      setBusy((current) => current === 'list' ? null : current);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const pullModel = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = modelName.trim();
    if (!name || busy) return;
    setBusy('pull');
    setMessage({ text: `Downloading ${name}. Ollama resumes interrupted model downloads when you retry.` });
    try {
      await localModelsApi.pull(name);
      setModelName('');
      setMessage({ text: `${name} is ready on this Centipede host.` });
      await refresh();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Model download failed.', error: true });
    } finally {
      setBusy(null);
    }
  };

  const createCustomModel = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customName.trim() || !baseModel || !systemPrompt.trim() || busy) return;
    setBusy('custom');
    setMessage({ text: 'Creating a custom Ollama model from the selected base model…' });
    try {
      await localModelsApi.createCustom(customName.trim(), baseModel, systemPrompt.trim());
      setCustomName('');
      setSystemPrompt('');
      setMessage({ text: `Custom model ${customName.trim()} is ready.` });
      await refresh();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Custom model creation failed.', error: true });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="local-model-heading" className="space-y-5 rounded-2xl border border-slate-700 bg-slate-800/60 p-5 shadow-xl sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <HardDrive aria-hidden="true" className="h-6 w-6 text-cyan-300" />
          <div>
            <h3 id="local-model-heading" className="text-lg font-bold text-white">Local model studio</h3>
            <p className="text-xs text-slate-400">Add open models or create a reusable local model profile.</p>
          </div>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={busy !== null} className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 sm:self-auto">
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${busy === 'list' ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {message && <div role={message.error ? 'alert' : 'status'} className={`flex gap-2 rounded-xl border px-3 py-2.5 text-sm ${message.error ? 'border-rose-800 bg-rose-950/50 text-rose-200' : 'border-cyan-800 bg-cyan-950/40 text-cyan-100'}`}>
        <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{message.text}
      </div>}

      {!available ? <p className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">Start Ollama on this host and set <code className="text-cyan-200">OLLAMA_API_URL</code> for the Centipede service. Model management is restricted to the Centipede host; other computers can be added as worker nodes separately.</p> : <>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-100">Installed on this host ({models.length})</h4>
          {models.length === 0 ? <p className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-400">No local models found. Add one below.</p> : <ul className="grid gap-2 md:grid-cols-2">
            {models.map((model) => <li key={model.name} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{model.name}</p><p className="mt-1 text-xs text-slate-400">{model.details?.parameter_size || model.details?.family || 'Local model'} · {formatBytes(model.size)}</p></div>
              <span className="shrink-0 rounded-full border border-emerald-700/70 bg-emerald-950/60 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-300">Ready</span>
            </li>)}
          </ul>}
        </div>

        <form onSubmit={pullModel} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
          <div><h4 className="flex items-center gap-2 text-sm font-semibold text-white"><Download aria-hidden="true" className="h-4 w-4 text-cyan-300" /> Add a local model</h4><p className="mt-1 text-xs text-slate-400">Enter an Ollama model name or tag. Check its license and download size first; models can use several gigabytes.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="local-model-name">Ollama model name</label>
            <input id="local-model-name" value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder="Model name or tag (for example, llama3.2:3b)" maxLength={128} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30" />
            <button disabled={!modelName.trim() || busy !== null} className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"><Download aria-hidden="true" className="h-4 w-4" />{busy === 'pull' ? 'Downloading…' : 'Download model'}</button>
          </div>
        </form>

        <form onSubmit={createCustomModel} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
          <div><h4 className="flex items-center gap-2 text-sm font-semibold text-white"><WandSparkles aria-hidden="true" className="h-4 w-4 text-violet-300" /> Customize a model</h4><p className="mt-1 text-xs text-slate-400">Creates an Ollama model with a saved system prompt. This changes instructions and defaults; it does not fine-tune model weights.</p></div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-300">New model name<input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="my-centipede-assistant" maxLength={128} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30" /></label>
            <label className="space-y-1 text-xs text-slate-300">Installed base model<select value={baseModel} onChange={(event) => setBaseModel(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30"><option value="">Choose a base model</option>{models.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}</select></label>
          </div>
          <label className="block space-y-1 text-xs text-slate-300">How should it behave?<textarea value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} maxLength={8000} rows={4} placeholder="Describe its role, tone, and task-specific guidance…" className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30" /></label>
          <button disabled={!customName.trim() || !baseModel || !systemPrompt.trim() || busy !== null} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50"><Sparkles aria-hidden="true" className="h-4 w-4" />{busy === 'custom' ? 'Creating…' : 'Create custom model'}</button>
        </form>
      </>}

      <p className="border-t border-slate-700 pt-3 text-xs leading-5 text-slate-400">Local model output remains untrusted. Kingdom’s existing capability checks and approval gates still apply to computer control, external accounts, and other actions. This screen does not collect trading or service credentials.</p>
    </section>
  );
};
