import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock, LockKeyhole, MonitorOff, Pause, Play, RefreshCw, ShieldCheck } from 'lucide-react';
import { kingdomActions } from '../api/kingdomActions';
import { KingdomActionUnlock } from './KingdomActionUnlock';

type StepAction = 'none' | 'screenshot' | 'click_link' | 'fill';

interface BrowserRoutine {
  id: string;
  name: string;
  url: string;
  interval_seconds: number;
  enabled: number;
  next_due: number;
}
interface BrowserRun {
  id: string;
  routine_id: string;
  state: string;
  started: number;
  completed: number | null;
  summary: string;
  sha256: string | null;
}
interface BrowserChangeAlert {
  run_id: string;
  routine_id: string;
  created: number;
  previous_digest: string;
  current_digest: string;
}
interface WorkerStatus {
  scope: 'isolated-headless-browser-only';
  enabled: boolean;
  paused: boolean;
  routines: BrowserRoutine[];
  runs: BrowserRun[];
  needsAttention?: BrowserChangeAlert[];
  attentionCount?: number;
  limits: { maxConcurrent: number; maxJobSeconds: number; maxSteps: number; minIntervalSeconds: number };
  browserIsolation: string;
  machineOffPolicy: string;
  resourceGate?: { ready: boolean; explanation: string; scope: string };
}

const shortDate = (time: number | null) =>
  time && Number.isFinite(time) ? new Date(time * 1000).toLocaleString() : 'Not recorded';

export const BackgroundHarnessApp: React.FC = () => {
  const [data, setData] = useState<WorkerStatus | null>(null);
  const [unlocked, setUnlocked] = useState(kingdomActions.isUnlocked());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [stepAction, setStepAction] = useState<StepAction>('none');
  const [selector, setSelector] = useState('');
  const [fillValue, setFillValue] = useState('');

  useEffect(() => kingdomActions.subscribe(setUnlocked), []);

  const refresh = async () => {
    try {
      const response = await fetch('/api/v1/harness/status', { cache: 'no-store', signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error(response.status === 503
        ? 'The isolated worker is not configured or running. It does not ship in the RC11 image.'
        : 'The local worker status was rejected (HTTP ' + response.status + ').');
      const received: unknown = await response.json();
      if (!received || typeof received !== 'object' ||
          (received as Partial<WorkerStatus>).scope !== 'isolated-headless-browser-only' ||
          !Array.isArray((received as WorkerStatus).routines) ||
          !Array.isArray((received as WorkerStatus).runs)) {
        throw new Error('The worker returned an unrecognized status; no autonomy state can be assumed.');
      }
      setData(received as WorkerStatus);
      setError('');
    } catch (cause) {
      setData(null);
      setError(cause instanceof Error ? cause.message : 'Worker status unavailable.');
    }
  };

  useEffect(() => {
    let active = true;
    const poll = () => { if (active && !document.hidden) void refresh(); };
    poll();
    const timer = window.setInterval(poll, 12000);
    document.addEventListener('visibilitychange', poll);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', poll); };
  }, []);

  const act = async (action: 'enable' | 'disable' | 'pause' | 'resume') => {
    if (!unlocked || busy) return;
    setBusy(true); setMessage('');
    try {
      await kingdomActions.harnessControl(action);
      setMessage(action === 'enable'
        ? 'Autonomy enabled for explicitly approved recurring routines only. Active desktop input remains untouched.'
        : action === 'pause'
          ? 'Pause requested. The active browser child will be interrupted; its outcome may be unknown.'
          : 'Owner control accepted; checking the durable worker state.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Owner control rejected.');
    } finally { setBusy(false); }
  };

  const addRoutine = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!unlocked || busy) return;
    setBusy(true); setMessage('');
    const steps: Array<{ action: 'screenshot' | 'click_link' | 'fill'; selector?: string; value?: string }> = [];
    if (stepAction === 'screenshot') steps.push({ action: 'screenshot' });
    if (stepAction === 'click_link') steps.push({ action: 'click_link', selector });
    if (stepAction === 'fill') steps.push({ action: 'fill', selector, value: fillValue });
    try {
      await kingdomActions.harnessAddRoutine({ name: name.trim(), url: url.trim(), intervalSeconds: minutes * 60, steps });
      setName(''); setUrl(''); setStepAction('none'); setSelector(''); setFillValue('');
      setMessage('Approved routine saved. It only runs if master autonomy is enabled and not paused.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Browser routine rejected.');
    } finally { setBusy(false); }
  };

  const acknowledgeAlert = async (runId: string) => {
    if (!unlocked || busy) return;
    setBusy(true); setMessage(''); setError('');
    try {
      await kingdomActions.harnessAcknowledgeAlert(runId);
      setMessage('Change alert acknowledged. The approved routine remains scheduled.');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Alert acknowledgement was rejected.'); }
    finally { setBusy(false); }
  };

  const deleteRoutine = async (id: string) => {
    if (!unlocked || busy || !window.confirm('Remove this approved routine and request cancellation of its active run? Existing receipts remain.')) return;
    setBusy(true);
    try {
      await kingdomActions.harnessDeleteRoutine(id);
      setMessage('Routine removed; active work is being cancelled and no new runs will be scheduled.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Routine removal rejected.');
    } finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-5xl space-y-5 p-4 text-slate-100 sm:p-6">
    <header className="space-y-2">
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <MonitorOff aria-hidden="true" className="h-6 w-6 text-blue-300"/>Background Work
      </h2>
      <p className="text-sm text-slate-300">
        An independent, opt-in headless browser worker. It can revisit owner-approved public sites while this window is closed.
        It never controls your active mouse, keyboard, logged-in browser, local files or Kingdom approvals.
      </p>
    </header>

    <section className="rounded-xl border border-blue-900 bg-slate-900/70 p-4 space-y-3" aria-label="Harness status">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Worker status</h3>
          <p className="mt-1 text-sm text-slate-300" role="status">
            {data ? (data.enabled ? (data.paused ? 'Paused by owner' : 'Enabled — approved jobs may run') : 'Autonomy OFF — no jobs scheduled')
              : 'Worker not verified'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Isolated browser, one job at a time; maximum 30 seconds per run.</p>
          <p className="mt-1 text-xs text-slate-400">{data?.resourceGate ? data.resourceGate.explanation : 'Host resource headroom not verified.'}</p>
        </div>
        <button type="button" onClick={() => void refresh()}
          className="flex items-center gap-1 rounded-lg border border-blue-800 px-3 py-2 text-sm text-blue-300 hover:text-white">
          <RefreshCw aria-hidden="true" className="h-4 w-4"/>Refresh
        </button>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-blue-800 bg-blue-950/30 p-3 text-sm text-blue-100">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!unlocked || busy || !data || data.enabled}
          onClick={() => void act('enable')} className="rounded-lg border border-blue-600 bg-blue-950/70 px-4 py-2 text-sm disabled:opacity-40">
          Enable approved work
        </button>
        <button type="button" disabled={!unlocked || busy || !data || !data.enabled}
          onClick={() => void act('disable')} className="rounded-lg border border-red-800 px-4 py-2 text-sm text-red-200 disabled:opacity-40">
          Disable autonomy
        </button>
        <button type="button" disabled={!unlocked || busy || !data || data.paused}
          onClick={() => void act('pause')} className="rounded-lg border border-slate-600 px-4 py-2 text-sm disabled:opacity-40">
          <Pause aria-hidden="true" className="mr-1 inline h-3 w-3"/>Pause
        </button>
        <button type="button" disabled={!unlocked || busy || !data || !data.paused}
          onClick={() => void act('resume')} className="rounded-lg border border-blue-600 px-4 py-2 text-sm disabled:opacity-40">
          <Play aria-hidden="true" className="mr-1 inline h-3 w-3"/>Resume
        </button>
      </div>
      <p className="flex items-start gap-2 text-xs text-slate-400">
        <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-300"/>
        Nothing auto-runs until both this worker's master switch is enabled AND at least one routine has explicit owner authorization. The background process is independent of the browser window.
      </p>
    </section>

    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <LockKeyhole aria-hidden="true" className="h-5 w-5 text-blue-300"/>Owner authorization
      </h3>
      <KingdomActionUnlock/>
      <p className="text-xs text-slate-400">
        Owner authorization reuses Centipede's short-lived local action session. If Kingdom credentials have never been configured,
        the owner control cannot be unlocked, even though an already-approved worker can continue offline.
      </p>
    </section>

    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-4">
      <h3 className="text-lg font-semibold">Give the worker a recurring public-web task</h3>
      <p className="text-sm text-slate-300">
        This first safe computer-control mode is for public HTTPS pages. No account login, file uploads, JS execution, payments,
        form submission or access to your current desktop. A page change becomes a reviewable receipt; site content cannot create new permissions.
      </p>
      <form onSubmit={addRoutine} className="grid gap-3">
        <label className="space-y-1 text-sm">Task name
          <input value={name} onChange={e => setName(e.target.value)} required maxLength={80}
            placeholder="Check a public project page" className="block w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white"/>
        </label>
        <label className="space-y-1 text-sm">Public HTTPS page
          <input type="url" value={url} onChange={e => setUrl(e.target.value)} required maxLength={500}
            placeholder="https://example.org" className="block w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white"/>
        </label>
        <label className="space-y-1 text-sm">Repeat every (minutes; minimum 15)
          <input type="number" min={15} max={10080} step={1} value={minutes} onChange={e => setMinutes(Number(e.target.value))}
            className="block w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white"/>
        </label>
        <label className="space-y-1 text-sm">Optional authorized browser action
          <select value={stepAction} onChange={e => setStepAction(e.target.value as StepAction)}
            className="block w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white">
            <option value="none">Read the page and record changes</option>
            <option value="screenshot">Capture an isolated-page screenshot</option>
            <option value="click_link">Click one same-site link (not a button)</option>
            <option value="fill">Fill one nonsensitive field without submitting</option>
          </select>
        </label>
        {(stepAction === 'click_link' || stepAction === 'fill') &&
          <label className="space-y-1 text-sm">CSS selector for the approved element
            <input value={selector} onChange={e => setSelector(e.target.value)} required maxLength={180}
              placeholder={stepAction === 'click_link' ? 'a[href="/updates"]' : 'input[name="search"]'}
              className="block w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white"/>
          </label>}
        {stepAction === 'fill' && <label className="space-y-1 text-sm">Public, nonsecret field value
          <input value={fillValue} onChange={e => setFillValue(e.target.value)} maxLength={200}
            className="block w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white"/>
        </label>}
        <button disabled={!unlocked || busy || !data} type="submit"
          className="w-fit rounded-lg border border-blue-600 bg-blue-950 px-4 py-2 text-sm font-semibold text-blue-100 disabled:opacity-40">
          Save approved recurring routine
        </button>
      </form>
    </section>

    <section aria-label="Approved routines" className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-3">
      <h3 className="text-lg font-semibold">Approved recurring routines ({data?.routines.length ?? 'unknown'})</h3>
      {!data ? <p className="text-sm text-slate-400">Worker unavailable: routine list not verified.</p> :
        data.routines.length === 0 ? <p className="text-sm text-slate-400">No routines approved. This worker has nothing to run.</p> :
          data.routines.map(routine => <article key={routine.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="min-w-0">
              <p className="font-semibold text-white">{routine.name}</p>
              <p className="break-all text-xs text-slate-400">{routine.url}</p>
              <p className="mt-1 text-xs text-slate-400">Every {routine.interval_seconds / 60} minutes · next due {shortDate(routine.next_due)}</p>
            </div>
            <button type="button" disabled={!unlocked || busy} onClick={() => void deleteRoutine(routine.id)}
              className="rounded-lg border border-red-800 px-3 py-2 text-xs text-red-300 disabled:opacity-40">Remove</button>
          </article>)}
    </section>

    <section aria-label="Needs attention" className="rounded-xl border border-blue-900 bg-slate-900/70 p-4 space-y-3">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <AlertTriangle aria-hidden="true" className="h-5 w-5 text-blue-300"/>
        Needs attention ({data?.attentionCount ?? 'unknown'})
      </h3>
      <p className="text-xs text-slate-400">This is a bounded, hash-only record of changes on sites you approved. The first observation establishes a baseline; website text cannot grant permissions or start a new action.</p>
      {!data ? <p className="text-sm text-slate-400">Worker status unavailable. No alerts can be verified.</p> :
        !data.needsAttention ? <p className="text-sm text-slate-400">This worker version has no verified change-alert feed.</p> :
        data.needsAttention.length === 0 ? <p className="text-sm text-slate-400">No unacknowledged page changes recorded.</p> :
          data.needsAttention.map(alert => <article key={alert.run_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-blue-200">Approved page changed</p>
              <p className="break-all text-xs text-slate-300">Routine {alert.routine_id} · {shortDate(alert.created)}</p>
              <p className="break-all text-xs text-slate-400">Prior digest: {alert.previous_digest.slice(0,12)}… · New digest: {alert.current_digest.slice(0,12)}…</p>
            </div>
            <button type="button" disabled={!unlocked || busy} onClick={() => void acknowledgeAlert(alert.run_id)}
              className="rounded-lg border border-blue-700 px-3 py-2 text-xs text-blue-200 disabled:opacity-40">Acknowledge</button>
          </article>)}
    </section>

    <section aria-label="Recent background work" className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-3">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Activity aria-hidden="true" className="h-5 w-5 text-blue-300"/>Real background-work receipts
      </h3>
      {!data ? <p className="text-sm text-slate-400">Receipts unavailable; no success can be assumed.</p> :
        data.runs.length === 0 ? <p className="text-sm text-slate-400">No recorded runs yet.</p> :
          data.runs.slice(0,20).map(run => <article key={run.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <code className="text-xs text-blue-200">{run.id}</code>
              <span className={run.state === 'failed' || run.state === 'interrupted' ? 'text-red-300' : 'text-slate-200'}>
                {run.state.toUpperCase()}
              </span>
            </div>
            <p className="mt-2 text-slate-300">{run.summary || 'No outcome recorded; in-progress or interrupted.'}</p>
            <p className="mt-1 text-xs text-slate-500">{shortDate(run.started)}
              {run.sha256 ? ' · page digest: ' + run.sha256.slice(0,12) + '…' : ' · page result unverified'}</p>
          </article>)}
    </section>

    <footer className="space-y-2 rounded-xl border border-slate-800 p-4 text-xs text-slate-400">
      <p className="flex items-start gap-2"><Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-300"/>
        Work persists when the **desktop window is closed** and resumes after the worker restarts. If the host is shut down,
        nothing can run on that host; use an always-on authorized second computer for genuine round-the-clock operation.
      </p>
      <p className="flex items-start gap-2"><AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0 text-red-300"/>
        This is not unattended control of your main operating system, arbitrary self-building, a privileged desktop harness,
        or an approved mass-market daily-driver installer. Those require independent sandbox, permission, physical, and Kingdom acceptance tests.
      </p>
      <a className="text-blue-300 underline-offset-2 hover:underline"
        href="https://github.com/wests-cmd/Centipede-os/blob/main/docs/BACKGROUND_HARNESS.md"
        target="_blank" rel="noopener noreferrer">Installation, isolation, limitations and verification guide</a>
    </footer>
  </div>;
};
