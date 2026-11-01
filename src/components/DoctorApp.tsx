import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, CircleHelp, RefreshCw, ShieldCheck, Stethoscope } from 'lucide-react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { ConnectionState, RuntimeStatus, VersionCompatibility } from '../types';
import { DoctorStatus, buildDoctorChecks } from '../platform/doctor';

interface DoctorAppProps {
  adapter: KingdomAdapter;
  connectionState: ConnectionState;
  runtimeStatus: RuntimeStatus | null;
}

const statusStyle: Record<DoctorStatus, string> = {
  PASS: 'border-emerald-700 bg-emerald-950/50 text-emerald-200',
  WARNING: 'border-amber-700 bg-amber-950/40 text-amber-100',
  FAIL: 'border-red-700 bg-red-950/40 text-red-100',
  'NOT CONFIGURED': 'border-slate-700 bg-slate-900 text-slate-300',
};

const StatusIcon: React.FC<{ status: DoctorStatus }> = ({ status }) => {
  if (status === 'PASS') return <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-300" />;
  if (status === 'FAIL' || status === 'WARNING') return <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-300" />;
  return <CircleHelp aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />;
};

export const DoctorApp: React.FC<DoctorAppProps> = ({ adapter, connectionState, runtimeStatus }) => {
  const [networkOnline, setNetworkOnline] = useState<boolean | null>(null);
  const [modelEndpointResponded, setModelEndpointResponded] = useState<boolean | null>(null);
  const [compatibility, setCompatibility] = useState<VersionCompatibility>(adapter.getCompatibilityInfo());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const updateNetwork = () => setNetworkOnline(navigator.onLine);
    updateNetwork();
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    const unsubscribe = adapter.subscribeCompatibility(setCompatibility);
    return () => {
      window.removeEventListener('online', updateNetwork);
      window.removeEventListener('offline', updateNetwork);
      unsubscribe();
    };
  }, [adapter]);

  const runChecks = async () => {
    setChecking(true);
    setNetworkOnline(typeof navigator === 'undefined' ? null : navigator.onLine);
    setCompatibility(adapter.getCompatibilityInfo());
    if (connectionState !== 'CONNECTED') {
      setModelEndpointResponded(null);
      setChecking(false);
      return;
    }
    try {
      await adapter.get_models();
      setModelEndpointResponded(true);
    } catch {
      setModelEndpointResponded(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void runChecks();
  }, [connectionState, adapter]);

  const checks = useMemo(() => buildDoctorChecks({
    networkOnline,
    kingdomConnection: connectionState,
    kingdomRuntime: runtimeStatus,
    kingdomCompatibility: compatibility.status,
    modelEndpointResponded,
  }), [networkOnline, connectionState, runtimeStatus, compatibility.status, modelEndpointResponded]);

  const issueCount = checks.filter((check) => check.status === 'WARNING' || check.status === 'FAIL').length;

  return (
    <main className="h-full overflow-y-auto p-4 text-slate-100 sm:p-6" aria-labelledby="doctor-heading">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-cyan-800 bg-cyan-950/60 p-3 text-cyan-200">
              <Stethoscope aria-hidden="true" className="h-6 w-6" />
            </div>
            <div>
              <h1 id="doctor-heading" className="text-xl font-bold sm:text-2xl">Centipede Doctor</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">A read-only check of signals this app can actually see. It does not change settings or repair the operating system.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void runChecks()}
            disabled={checking}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking…' : 'Run checks'}
          </button>
        </header>

        <section className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4" aria-live="polite">
          <Activity aria-hidden="true" className={`h-5 w-5 ${issueCount ? 'text-amber-300' : 'text-emerald-300'}`} />
          <p className="text-sm">
            {issueCount === 0 ? 'No warnings from the checks that are currently available.' : `${issueCount} check${issueCount === 1 ? '' : 's'} need attention.`}
            {' '}Some system checks are not configured in this build.
          </p>
        </section>

        <div className="space-y-3">
          {checks.map((check) => (
            <article key={check.id} className={`rounded-xl border p-4 ${statusStyle[check.status]}`}>
              <div className="flex items-start gap-3">
                <StatusIcon status={check.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold">{check.label}</h2>
                    <span className="rounded-full border border-current/30 px-2 py-0.5 text-[10px] font-bold tracking-wide">{check.status}</span>
                  </div>
                  <p className="mt-1 text-sm">{check.summary}</p>
                  <p className="mt-2 text-xs opacity-80">{check.suggestedAction}</p>
                  <details className="mt-3 border-t border-current/15 pt-2 text-xs">
                    <summary className="cursor-pointer font-medium">Technical details</summary>
                    <p className="mt-2 leading-relaxed opacity-80">{check.detail}</p>
                  </details>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          Checks are diagnostic only. Centipede does not run repairs, updates, recovery, host disk scans, or privileged actions from this page.
        </p>
      </div>
    </main>
  );
};
