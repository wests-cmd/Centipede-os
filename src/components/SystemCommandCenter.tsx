import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, ChevronRight,
  Cpu, HardDrive, History, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import type { KingdomAdapter } from '../api/kingdomAdapter';
import { kingdomActions } from '../api/kingdomActions';
import { CENTIPEDE_VERSION } from '../version';
import type { ConnectionState, AuditLogEntry, SystemEvent, TaskItem } from '../types';
import {
  buildVisibilityCards, deriveVisibilityAlerts, telemetryIsFresh, type HostTelemetry,
  type VisibilityCard, type VisibilityMode, type VisibilitySnapshot,
} from '../visibility/state';

interface Props {
  adapter: KingdomAdapter;
  onNavigate: (app: string) => void;
}

const emptySnapshot = (connection: ConnectionState): VisibilitySnapshot => ({
  connection, host: null, hostError: null, tasks: null, approvals: null, nodes: null,
  models: null, skills: null, security: null, events: null, audit: null, browserOnline: null,
});

async function optional<T>(call: () => Promise<T>): Promise<T | null> {
  try { return await call(); } catch { return null; }
}

async function loadHost(): Promise<{ host: HostTelemetry | null; error: string | null }> {
  try {
    const response = await fetch('/api/v1/visibility/host', {
      method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { host: null, error: response.status === 403
      ? 'Host measurements are restricted to the locally opened Centipede service.'
      : 'Local telemetry endpoint unavailable (HTTP ' + response.status + ').' };
    const raw: unknown = await response.json();
    if (!raw || typeof raw !== 'object') return { host:null, error:'Invalid telemetry envelope.' };
    const value = raw as Partial<HostTelemetry>;
    if (value.scope !== 'local-centipede-server-kernel-view' || !Number.isFinite(value.observedAt) ||
        !Number.isFinite(value.staleAfterMs) || typeof value.platform !== 'string' ||
        typeof value.serverProcessRssMiB !== 'number') {
      return { host:null, error:'Unrecognized host telemetry; refusing to display unverified measurements.' };
    }
    return { host: value as HostTelemetry, error:null };
  } catch {
    return { host:null, error:'Cannot reach the local, permission-checked telemetry service.' };
  }
}

const detailColor: Record<VisibilityCard['state'], string> = {
  observed:'border-blue-800 bg-blue-950/20 text-blue-200',
  attention:'border-red-800 bg-red-950/20 text-red-200',
  unverified:'border-slate-700 bg-slate-900 text-slate-300',
  unavailable:'border-slate-700 bg-slate-900 text-slate-300',
};
const detailText: Record<VisibilityCard['state'], string> = {
  observed:'Observed',attention:'Needs attention',unverified:'Not verified',unavailable:'Unavailable',
};

const sampleMax = 24; // Session-only, bounded; no CPU polling when page is hidden.
type ResourceSample = { at: number; cpu: number | null; availableMiB: number | null };

function Sparkline({ label, samples, field, ceiling }: {
  label: string;
  samples: ResourceSample[];
  field: 'cpu' | 'availableMiB';
  ceiling: number;
}) {
  return <div className="space-y-2" aria-label={label}>
    <p className="text-xs text-slate-300">{label}</p>
    <div role="img" aria-label={label + ' recent history (current session; readings may be unavailable)'}
      className="flex h-14 items-end gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-2">
      {samples.length === 0
        ? <span className="text-xs text-slate-500">No samples yet</span>
        : samples.map((sample, index) => {
          const value = sample[field];
          return <span key={sample.at + '-' + index}
            title={value === null ? 'Not measured' : value.toFixed(1) + (field === 'cpu' ? '%' : ' MiB')}
            className={value === null ? 'h-1 flex-1 rounded-sm bg-slate-700' : 'min-h-1 flex-1 rounded-sm bg-blue-500'}
            style={value === null ? undefined : { height: Math.min(100, Math.max(2, value / Math.max(1, ceiling) * 100)) + '%' }} />;
        })}
    </div>
  </div>;
}

const dateLabel = (raw?: number): string => {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return 'Time not provided';
  const millis = raw < 1e11 ? raw * 1000 : raw;
  const date = new Date(millis);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Time not provided';
};

export const SystemCommandCenter: React.FC<Props> = ({ adapter, onNavigate }) => {
  const [mode, setMode] = useState<VisibilityMode>('everyday');
  const [connection, setConnection] = useState<ConnectionState>(adapter.getConnectionState());
  const [ownerUnlocked, setOwnerUnlocked] = useState(kingdomActions.isUnlocked());
  const [snapshot, setSnapshot] = useState<VisibilitySnapshot>(() => emptySnapshot(adapter.getConnectionState()));
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [samples, setSamples] = useState<ResourceSample[]>([]);
  const [transitions, setTransitions] = useState<{ value: ConnectionState; at: number }[]>([]);
  const requestNumber = useRef(0);

  useEffect(() => adapter.subscribeConnection(setConnection), [adapter]);
  useEffect(() => kingdomActions.subscribe(setOwnerUnlocked), []);
  // Owner tokens expire independently of UI actions. Recheck while the owner panel is open,
  // so an elapsed session can never continue displaying protected audit previews.
  useEffect(() => {
    if (mode !== 'owner') return;
    const checkExpiry = () => setOwnerUnlocked(kingdomActions.isUnlocked());
    checkExpiry();
    const timer = window.setInterval(checkExpiry, 1000);
    return () => window.clearInterval(timer);
  }, [mode]);
  useEffect(() => {
    setTransitions(previous => previous[0]?.value === connection ? previous :
      [{ value: connection, at: Date.now() }, ...previous].slice(0, 20));
  }, [connection]);

  const refresh = async () => {
    const generation = ++requestNumber.current;
    setRefreshing(true);
    const connected = adapter.getConnectionState() === 'CONNECTED';
    const [hostResult, tasks, approvals, nodes, security, models, skills, events, audit] = await Promise.all([
      loadHost(),
      connected ? optional(() => adapter.list_tasks()) : Promise.resolve(null),
      connected ? optional(() => adapter.list_approvals('pending')) : Promise.resolve(null),
      connected ? optional(async () => (await adapter.get_permissions()).nodes) : Promise.resolve(null),
      connected ? optional(() => adapter.get_security_status()) : Promise.resolve(null),
      connected && mode !== 'everyday' ? optional(() => adapter.get_models()) : Promise.resolve(null),
      connected && mode !== 'everyday' ? optional(() => adapter.get_skills()) : Promise.resolve(null),
      connected && mode !== 'everyday' ? optional(() => adapter.get_events(30)) : Promise.resolve(null),
      connected && mode === 'owner' && ownerUnlocked && kingdomActions.isUnlocked()
        ? optional(async () => (await adapter.get_audit(20)).audit_logs) : Promise.resolve(null),
    ]);
    if (generation !== requestNumber.current) return;
    const next: VisibilitySnapshot = {
      connection: adapter.getConnectionState(),
      host: hostResult.host,
      hostError: hostResult.error,
      tasks: Array.isArray(tasks) ? tasks : null,
      approvals: Array.isArray(approvals) ? approvals : null,
      nodes: Array.isArray(nodes) ? nodes : null,
      security,
      models,
      skills: Array.isArray(skills) ? skills : null,
      events: Array.isArray(events) ? events : null,
      audit: Array.isArray(audit) ? audit : null,
      browserOnline: typeof navigator === 'undefined' ? null : navigator.onLine,
    };
    setSnapshot(next);
    setCheckedAt(Date.now());
    if (telemetryIsFresh(next.host)) setSamples(previous =>
      [...previous, {
        at: next.host!.observedAt,
        cpu: next.host!.cpuUsagePercent,
        availableMiB: next.host!.memory?.availableMiB ?? null,
      }].slice(-sampleMax));
    setRefreshing(false);
  };

  // Only the opened Command Center polls, and not when its browser tab is hidden.
  useEffect(() => {
    let disposed = false;
    const poll = () => { if (!disposed && !document.hidden) void refresh(); };
    poll();
    const interval = window.setInterval(poll, 20000);
    const onVisible = () => { if (!document.hidden) poll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      ++requestNumber.current;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [adapter, connection, mode, ownerUnlocked]);

  const cards = useMemo(() => buildVisibilityCards(snapshot, CENTIPEDE_VERSION, Date.now()),
    [snapshot, checkedAt]);
  const alerts = useMemo(() => deriveVisibilityAlerts(snapshot), [snapshot, checkedAt]);
  const freshHost = telemetryIsFresh(snapshot.host) ? snapshot.host : null;
  const canReadAudit = mode === 'owner' && ownerUnlocked && kingdomActions.isUnlocked() && snapshot.connection === 'CONNECTED';
  const important = new Set(['system','performance','kingdom','segmentor','tasks','notifications']);
  const visibleCards = mode === 'everyday' ? cards.filter(card=>important.has(card.id)) : cards;

  const callout = (card: VisibilityCard) => (
    <article key={card.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">{card.title}</h3>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${detailColor[card.state]}`}>
          {detailText[card.state]}
        </span>
      </div>
      <p className="text-base font-medium text-slate-100">{card.value}</p>
      <p className="text-xs leading-5 text-slate-300">{card.description}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-2">
        <span className="text-[10px] text-slate-500">Source: {card.source}</span>
        <button type="button" onClick={() => {
          if (card.navigate === 'command') {
            document.getElementById(card.id === 'notifications' ? 'attention-heading' : 'performance-heading')?.scrollIntoView({ behavior: 'smooth' });
            if (card.id === 'performance') setMode('advanced');
          } else onNavigate(card.navigate);
        }}
          className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300">
          {card.action}<ChevronRight aria-hidden="true" className="h-3 w-3"/>
        </button>
      </div>
    </article>
  );

  return <div className="mx-auto max-w-6xl space-y-5 p-3 text-slate-100 sm:p-6" aria-labelledby="command-center-heading">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 id="command-center-heading" className="flex items-center gap-2 text-2xl font-bold">
          <Activity aria-hidden="true" className="h-6 w-6 text-blue-300"/>System Command Center
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          What Centipede can actually observe. Measured means a recent reading, not an independently verified safe operating system.
        </p>
        <p className="mt-1 text-xs text-slate-500" data-testid="visibility-observed-at">
          {checkedAt ? 'Last refreshed: ' + new Date(checkedAt).toLocaleTimeString() : 'No successful overview refresh yet'}
          {' · '}Kingdom: {connection}
        </p>
      </div>
      <button type="button" onClick={() => void refresh()} disabled={refreshing}
        className="flex items-center gap-2 rounded-lg border border-blue-800 px-3 py-2 text-sm text-blue-200 hover:bg-blue-950/60 disabled:opacity-50">
        <RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}/>
        {refreshing ? 'Checking…' : 'Refresh now'}
      </button>
    </header>

    <div role="tablist" aria-label="Command Center detail level" className="flex flex-wrap gap-2">
      {([['everyday','Everyday'],['advanced','Advanced'],['owner','Owner']] as const).map(([id,label]) =>
        <button key={id} type="button" role="tab" aria-selected={mode === id}
          onClick={() => setMode(id)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300 ${mode===id?'border-blue-500 bg-blue-950/60 text-blue-100':'border-slate-700 bg-slate-900 text-slate-300'}`}>
          {label}
        </button>)}
    </div>

    <section aria-labelledby="overview-tiles-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="overview-tiles-heading" className="text-lg font-semibold">System overview</h2>
        {mode === 'everyday' && <button className="text-sm text-blue-300 underline-offset-2 hover:underline"
          onClick={() => setMode('advanced')}>See all 16 areas</button>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map(callout)}
      </div>
    </section>

    <section aria-labelledby="attention-heading" className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
      <h2 id="attention-heading" className="flex items-center gap-2 font-semibold">
        <AlertTriangle aria-hidden="true" className="h-4 w-4 text-red-300"/>Needs your attention
      </h2>
      {alerts.length === 0 ? <p className="text-sm text-slate-300">
        No alerts from the checks available right now. Unmeasured subsystems are not declared healthy.
      </p> : alerts.map(alert =>
        <article key={alert.id} className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-slate-100">{alert.title}</strong>
            <span className={alert.level==='critical'?'text-red-200 text-xs':'text-slate-400 text-xs'}>{alert.level}</span>
          </div>
          <p className="text-slate-300">{alert.explanation}</p>
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer text-blue-300">What happened, what Centipede did, and how to fix it</summary>
            <p className="mt-2"><strong>What happened:</strong> {alert.whatHappened}</p>
            <p className="mt-1"><strong>Centipede response:</strong> {alert.whatCentipedeDid}</p>
            <p className="mt-1"><strong>Next step:</strong> {alert.next}</p>
          </details>
          <button onClick={() => onNavigate(alert.navigate)} type="button"
            className="text-xs text-blue-300 hover:underline">Open relevant screen</button>
        </article>)}
    </section>

    {mode !== 'everyday' && <section aria-labelledby="performance-heading" className="space-y-3">
      <div className="flex items-center gap-2"><BarChart3 aria-hidden="true" className="h-5 w-5 text-blue-300"/>
        <h2 id="performance-heading" className="font-semibold">Resource history — current session</h2></div>
      <p className="text-xs text-slate-400">Sampled no more often than every 20 seconds while this page is open and visible. Host/container kernel scope; no invented process totals.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Sparkline label="Host CPU use (%)" samples={samples} field="cpu" ceiling={100}/>
        <Sparkline label="Linux kernel MemAvailable (MiB)" samples={samples} field="availableMiB"
          ceiling={freshHost?.memory?.totalMiB || 4096}/>
      </div>
      <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
        <span className="flex items-center gap-1"><Cpu aria-hidden="true" className="h-4 w-4"/>CPU: {freshHost?.cpuUsagePercent === null || !freshHost ? 'Warming up / unknown' : freshHost.cpuUsagePercent+'%'}</span>
        <span>Service process RSS: {freshHost ? freshHost.serverProcessRssMiB + ' MiB' : 'Not measured'}</span>
        <span className="flex items-center gap-1"><HardDrive aria-hidden="true" className="h-4 w-4"/>Service volume: {freshHost?.serviceVolume?.availableMiB ?? 'Unknown'} MiB available</span>
      </div>
      <p className="text-[11px] text-slate-500">{freshHost?.limitations || 'No trusted local host telemetry.'}</p>
    </section>}

    {mode !== 'everyday' && <section className="space-y-3" aria-labelledby="timeline-heading">
      <h2 id="timeline-heading" className="flex items-center gap-2 font-semibold">
        <History aria-hidden="true" className="h-5 w-5 text-blue-300"/>Real task and observation timeline
      </h2>
      <p className="text-xs text-slate-400">Only IDs and states returned by Kingdom are shown. This dashboard never generates or verifies task results itself.</p>
      {snapshot.tasks === null ? <p className="rounded-lg border border-slate-800 p-3 text-sm text-slate-400">Kingdom task history unavailable.</p>
        : snapshot.tasks.length === 0 ? <p className="text-sm text-slate-300">Kingdom reports no tasks.</p>
        : <div className="space-y-2">{snapshot.tasks.slice(0,10).map((task: TaskItem) =>
          <article key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 p-3 text-xs">
            <div><span className="font-mono text-blue-200">{task.id.slice(0,80)}</span>
              <p className="mt-1 text-slate-400">{dateLabel(task.created_at)}</p></div>
            <span className={task.status==='completed'?'text-blue-300':task.status==='failed'?'text-red-300':'text-slate-200'}>
              Kingdom reports: {task.status}{task.status === 'completed' ? ' (result not independently verified here)' : ''}
            </span>
          </article>)}</div>}
      <h3 className="text-sm font-semibold">Kingdom event records</h3>
      {snapshot.events === null ? <p className="text-xs text-slate-400">Event endpoint unavailable or not loaded.</p>
        : snapshot.events.length === 0 ? <p className="text-xs text-slate-400">No recent events reported.</p>
        : <div className="max-h-60 space-y-1 overflow-auto">{snapshot.events.slice(0,20).map((event: SystemEvent, index) =>
          <div key={index} className="flex flex-wrap justify-between gap-2 border-b border-slate-800 p-2 text-xs text-slate-300">
            <span>{String(event.type || event.event || 'Unclassified event').slice(0,80)}</span>
            <span className="text-slate-500">{dateLabel(event.timestamp)}</span>
          </div>)}</div>}
      <h3 className="text-sm font-semibold">This browser's connection observations</h3>
      <div className="flex flex-wrap gap-2">{transitions.map(t=>
        <span key={t.at} className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-300">
          {t.value} · {new Date(t.at).toLocaleTimeString()}
        </span>)}</div>
      <p className="text-[11px] text-slate-500">Browser observations are temporary and are NOT security audit records.</p>
    </section>}

    {mode === 'owner' && <section aria-labelledby="owner-heading" className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 space-y-3">
      <h2 id="owner-heading" className="flex items-center gap-2 text-lg font-semibold">
        <LockKeyhole aria-hidden="true" className="h-5 w-5 text-blue-300"/>Owner visibility
      </h2>
      {!ownerUnlocked ? <>
        <p className="text-sm text-slate-300" role="status">Owner actions are locked. Open Security & Approvals and unlock using the existing verified host authorization flow.</p>
        <button type="button" onClick={() => onNavigate('security')} className="rounded-lg border border-blue-800 px-3 py-2 text-sm text-blue-200">Open owner authorization</button>
      </> : !canReadAudit ? <p className="text-sm text-slate-300">Owner UI is unlocked, but Kingdom is not connected. Audit records are not available.</p>
        : <>
          <p className="text-sm text-slate-300">Read-only Kingdom audit preview. Authorization and audit validity remain Kingdom's responsibility.</p>
          {snapshot.audit === null ? <p className="text-xs text-slate-400">Audit records unavailable or rejected by Kingdom.</p> :
            snapshot.audit.length === 0 ? <p className="text-xs text-slate-400">Kingdom reports no recent audit records.</p> :
            snapshot.audit.slice(0,20).map((entry: AuditLogEntry,index) =>
              <article key={index} className="grid gap-2 rounded-lg border border-slate-800 p-3 text-xs sm:grid-cols-3">
                <span className="text-blue-200">{entry.decision}</span>
                <span className="break-all">{String(entry.capability).slice(0,100)} · {String(entry.operation).slice(0,100)}</span>
                <span className="text-slate-400">{dateLabel(entry.timestamp)}</span>
              </article>)}
        </>}
      <p className="text-xs text-slate-500">This screen cannot approve jobs, disable security, or grant itself new privileges.</p>
    </section>}

    <footer className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-400">
      <p className="flex items-start gap-2"><ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-300"/>
        Visibility is diagnostic and read-only. It does not certify permanent installation, backups, phone signing, hardware temperature, Kingdom execution or recovery. For those, collect real device acceptance receipts.</p>
      <button type="button" onClick={() => onNavigate('doctor')} className="mt-2 text-blue-300 hover:underline">Open Doctor & Repair diagnostics</button>
    </footer>
  </div>;
};
