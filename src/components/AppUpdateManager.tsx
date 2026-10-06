import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, RefreshCw, X } from 'lucide-react';
import { appVersionAtLeast, classifyAppUpdate } from '../platform/appUpdate';

type UpdateOffer = { version: string; kind: 'small' | 'large' };
type UpdateState = 'idle' | 'offered' | 'refreshing' | 'failed';
const attemptKey = (version: string) => `centipede-auto-update-${version}`;

function readAttempt(version: string): boolean {
  try { return window.sessionStorage.getItem(attemptKey(version)) === 'attempted'; }
  catch { return false; }
}

function recordAttempt(version: string): void {
  try { window.sessionStorage.setItem(attemptKey(version), 'attempted'); }
  catch { /* Reload still works when browser storage is disabled. */ }
}

function clearAttempt(version: string): void {
  try { window.sessionStorage.removeItem(attemptKey(version)); }
  catch { /* Storage is an optional retry guard. */ }
}

export const AppUpdateManager: React.FC<{ currentVersion: string }> = ({ currentVersion }) => {
  const [offer, setOffer] = useState<UpdateOffer | null>(null);
  const [state, setState] = useState<UpdateState>('idle');
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  const applyUpdate = useCallback(async (nextOffer: UpdateOffer) => {
    setState('refreshing');
    try {
      const response = await fetch(`/api/v1/health?updateApply=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Update server is unavailable.');
      const health: unknown = await response.json();
      if (!health || typeof health !== 'object' || !('version' in health) || health.version !== nextOffer.version) {
        throw new Error('The available version changed. Check again before refreshing.');
      }
      recordAttempt(nextOffer.version);
      const location = new URL(window.location.href);
      location.searchParams.set('__centipede_app_version', nextOffer.version);
      window.location.replace(location.toString());
    } catch {
      setState('failed');
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/health?updateCheck=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const health: unknown = await response.json();
      if (!health || typeof health !== 'object' || !('version' in health) || typeof health.version !== 'string') return;
      const kind = classifyAppUpdate(currentVersion, health.version);
      if (!kind) {
        setOffer(null);
        setState('idle');
        return;
      }

      const nextOffer = { version: health.version, kind } as const;
      setOffer(nextOffer);
      setState('offered');
      if (kind === 'small' && !readAttempt(health.version)) void applyUpdate(nextOffer);
    } catch {
      // A disconnected local service is not evidence that no update exists.
    }
  }, [applyUpdate, currentVersion]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const refreshedVersion = url.searchParams.get('__centipede_app_version');
    if (refreshedVersion) {
      url.searchParams.delete('__centipede_app_version');
      window.history.replaceState({}, '', url.toString());
      if (appVersionAtLeast(currentVersion, refreshedVersion)) clearAttempt(refreshedVersion);
    }

    void checkForUpdate();
    const interval = window.setInterval(() => void checkForUpdate(), 5 * 60 * 1000);
    const onFocus = () => void checkForUpdate();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [checkForUpdate, currentVersion]);

  if (!offer || dismissedVersion === offer.version || state === 'idle') return null;

  const isLarge = offer.kind === 'large';
  return (
    <section
      aria-live="polite"
      aria-atomic="true"
      aria-labelledby="app-update-title"
      className="fixed bottom-4 right-4 z-[100] w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-cyan-700/60 bg-slate-950/95 p-4 text-slate-100 shadow-2xl backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <ArrowDownToLine aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
        <div className="min-w-0 flex-1">
          <h2 id="app-update-title" className="font-semibold text-white">
            {state === 'refreshing' ? 'Loading Centipede web app update' : `Centipede web app ${offer.version} is ready`}
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            {isLarge
              ? 'This larger update includes the browser page, JavaScript, and styles. Approving reload fetches the current files from this Centipede server.'
              : `Patch ${offer.version}: Centipede is refreshing the browser page, JavaScript, and styles from this server automatically.`}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            The browser does not report a reliable byte count. This refresh updates the browser app only; it does not update the live OS image, Docker image, Kingdom, or user files.
          </p>
          {state === 'refreshing' && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label="Loading browser app files">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-cyan-400" />
            </div>
          )}
          {state === 'failed' && <p className="mt-2 text-sm text-rose-300">The app could not refresh. Check the connection and try again.</p>}
          {isLarge && state !== 'refreshing' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void applyUpdate(offer)}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Load and restart app
              </button>
              <button
                type="button"
                onClick={() => setDismissedVersion(offer.version)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                Later
              </button>
            </div>
          )}
          {state === 'failed' && (
            <button type="button" onClick={() => void applyUpdate(offer)} className="mt-3 text-sm font-semibold text-cyan-300 underline underline-offset-4">
              Try again
            </button>
          )}
        </div>
        {!isLarge && state !== 'refreshing' && (
          <button
            type="button"
            aria-label="Dismiss update status"
            onClick={() => setDismissedVersion(offer.version)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
};
