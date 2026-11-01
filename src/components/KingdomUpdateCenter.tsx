import React from 'react';
import { KingdomRuntimeInfo } from '../types';
import { AlertTriangle, ExternalLink, Shield } from 'lucide-react';

interface KingdomUpdateCenterProps {
  runtimeInfo: KingdomRuntimeInfo;
}

const connectionLabel = (state: KingdomRuntimeInfo['connectionState']): string => {
  switch (state) {
    case 'CONNECTED':
      return 'Connected';
    case 'DEGRADED':
      return 'Degraded';
    case 'CONNECTING':
    case 'DISCOVERING':
    case 'AUTHENTICATING':
    case 'NEGOTIATING':
    case 'VALIDATING':
    case 'RECONNECTING':
      return 'Connecting';
    case 'AUTHENTICATION_FAILED':
      return 'Authentication failed';
    case 'INCOMPATIBLE':
    case 'VERSION_INCOMPATIBLE':
      return 'Version incompatible';
    case 'ERROR':
      return 'Error';
    default:
      return 'Offline';
  }
};

export const KingdomUpdateCenter: React.FC<KingdomUpdateCenterProps> = ({ runtimeInfo }) => {
  const currentVersion = runtimeInfo.connectedKingdomVersion || runtimeInfo.lastKnownKingdomVersion;
  const connected = runtimeInfo.connectionState === 'CONNECTED';

  return (
    <section
      aria-labelledby="kingdom-update-status-title"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 text-slate-100 shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h3 id="kingdom-update-status-title" className="text-lg font-bold text-white">Kingdom software updates</h3>
          <p className="text-xs text-slate-400">Kingdom is a separately operated service.</p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-700/60 bg-amber-950/40 p-3 text-xs text-amber-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
        <p>
          Centipede does not currently download, verify, or install Kingdom updates. No update check or rollback has run.
          Use Kingdom&apos;s release page to review published updates.
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kingdom connection</dt>
          <dd className={`mt-1 font-semibold ${connected ? 'text-emerald-300' : 'text-amber-200'}`}>
            {connectionLabel(runtimeInfo.connectionState)}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {connected ? 'Connected Kingdom version' : 'Last known Kingdom version'}
          </dt>
          <dd className="mt-1 font-mono text-slate-100">
            {currentVersion ? (currentVersion.startsWith('v') ? currentVersion : `v${currentVersion}`) : 'Unknown'}
          </dd>
        </div>
      </dl>

      <a
        href="https://github.com/wests-cmd/kingdom/releases"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
      >
        View Kingdom releases
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </section>
  );
};
