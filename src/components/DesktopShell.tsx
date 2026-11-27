import React, { useEffect, useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import type { HomeVisual } from './CentipedeWorldVisual';
import { ART_BACKGROUND } from './LocalMediaBackground';
import { PRIMARY_DESTINATIONS } from '../platform/appCatalog';
import { ConnectionState, KingdomRuntimeInfo, RuntimeStatus, VersionCompatibility } from '../types';
import {
  Activity,
  AlertTriangle,
  Bot,
  Folder,
  Grid,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Terminal,
  Server,
  Smartphone,
  Monitor,
  ShieldAlert,
  Home,
  FileText,
  Download,
  Music,
  Image,
  Video,
  Database,
  Brain,
  Map,
  Cpu,
  Stethoscope,
  BarChart3,
} from 'lucide-react';

interface DesktopShellProps {
  adapter: KingdomAdapter;
  activeAppId: string;
  setActiveAppId: (id: string) => void;
  pendingApprovalsCount: number;
  homeVisual: HomeVisual;
  children: React.ReactNode;
}

export const DesktopShell: React.FC<DesktopShellProps> = ({
  adapter,
  activeAppId,
  setActiveAppId,
  pendingApprovalsCount,
  homeVisual,
  children,
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [compatInfo, setCompatInfo] = useState<VersionCompatibility>(adapter.getCompatibilityInfo());
  const [runtimeInfo, setRuntimeInfo] = useState<KingdomRuntimeInfo>(adapter.getKingdomRuntimeInfo());
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const unsubConn = adapter.subscribeConnection((state) => {
      setConnectionState(state);
      setRuntimeInfo(adapter.getKingdomRuntimeInfo());
    });
    const unsubStatus = adapter.subscribeStatus((st) => {
      setStatus(st);
      setRuntimeInfo(adapter.getKingdomRuntimeInfo());
    });
    const unsubCompat = adapter.subscribeCompatibility((ci) => {
      setCompatInfo(ci);
      setRuntimeInfo(adapter.getKingdomRuntimeInfo());
    });
    adapter.startHeartbeat(3000);

    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    return () => {
      unsubConn();
      unsubStatus();
      unsubCompat();
      adapter.stopHeartbeat();
      clearInterval(timer);
    };
  }, [adapter]);

  const getBadgeStyle = () => {
    switch (connectionState) {
      case 'CONNECTED':
        return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400';
      case 'CONNECTING':
        return 'bg-amber-500/10 border-amber-500/40 text-amber-400 animate-pulse';
      case 'DISCONNECTED':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
      case 'VERSION_INCOMPATIBLE':
        return 'bg-purple-500/20 border-purple-500/50 text-purple-300';
      case 'AUTHENTICATION_FAILED':
        return 'bg-amber-600/20 border-amber-600/50 text-amber-300';
      default:
        return 'bg-red-500/20 border-red-500/50 text-red-400';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* Top OS Menu Bar */}
      <header className="relative z-30 flex min-h-12 items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2 backdrop-blur-md sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-2 font-bold tracking-wide text-cyan-400">
            <Monitor className="w-5 h-5 text-cyan-500" />
            <span className="whitespace-nowrap text-sm text-white sm:text-base">Centipede OS</span>
          </div>
          <span className="hidden text-slate-600 sm:inline">|</span>
          <span className="hidden whitespace-nowrap font-mono text-xs text-slate-400 sm:inline">v{runtimeInfo.centipedeVersion}</span>
        </div>

        {/* Connection & Dynamic Version Badges */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="hidden md:flex items-center space-x-3 text-xs">
            <span className="text-slate-400">
              Kingdom:{' '}
              <span className="text-slate-200 font-mono">
                {connectionState === 'CONNECTED' && runtimeInfo.connectedKingdomVersion
                  ? `${runtimeInfo.connectedKingdomVersion.startsWith('v') ? '' : 'v'}${runtimeInfo.connectedKingdomVersion}`
                  : runtimeInfo.lastKnownKingdomVersion
                  ? `${runtimeInfo.lastKnownKingdomVersion.startsWith('v') ? '' : 'v'}${runtimeInfo.lastKnownKingdomVersion} (Offline)`
                  : 'Offline'}
              </span>
            </span>
            <span className="text-slate-400">Mode: <span className="text-purple-400 font-mono capitalize">{connectionState === 'CONNECTED' && status ? status.mode : 'Unknown'}</span></span>
            <span className="text-slate-400">Active Tasks: <span className="text-emerald-400 font-mono">{connectionState === 'CONNECTED' && status ? status.tasks.running : 'Unknown'}</span></span>
          </div>

          <button type="button"
            onClick={() => setActiveAppId('status')}
            aria-label="Inspect Kingdom connection status"
            className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold transition-all sm:gap-2 sm:px-3 sm:text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300 ${getBadgeStyle()}`}
          >
            <span className={`w-2 h-2 rounded-full ${
              connectionState === 'CONNECTED' ? 'bg-emerald-400' : 'bg-amber-400'
            }`}></span>
            <span className="uppercase tracking-wider">{connectionState === 'DISCONNECTED' ? 'Offline' : connectionState.toLowerCase()}</span>
          </button>

          <div className="hidden border-l border-slate-800 pl-2 font-mono text-xs text-slate-400 lg:block">{time}</div>
        </div>
      </header>

      {/* Disconnected Alert Banner */}
      {connectionState === 'DISCONNECTED' && (
        <div className="z-20 flex flex-wrap items-center justify-between gap-2 border-b border-amber-800/70 bg-amber-950/50 px-3 py-2 text-xs text-amber-100 sm:px-4">
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-300" />
            <span className="font-semibold">Kingdom offline.</span>
            <span className="hidden sm:inline">
              Centipede OS is operating in standalone offline mode.{' '}
              {runtimeInfo.lastKnownKingdomVersion ? `Last known version: v${runtimeInfo.lastKnownKingdomVersion}` : 'Version unavailable.'}
            </span>
          </div>
          <button
            onClick={() => adapter.reconnect()}
            className="flex items-center space-x-1 rounded-lg border border-amber-700 bg-amber-900/60 px-3 py-1 font-medium text-amber-50 transition-colors hover:bg-amber-800"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reconnect</span>
          </button>
        </div>
      )}

      {/* Full-width workspace: navigation lives in the dock and app directory. */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Main View Area */}
        <div className="relative isolate min-w-0 flex-1 overflow-hidden bg-slate-950">
          {activeAppId === 'launcher' && homeVisual === 'centipede-art' && (
            <div data-testid="signature-desktop-wallpaper" className="pointer-events-none absolute inset-0 overflow-hidden bg-slate-950">
              <img src={ART_BACKGROUND} alt="Illuminated metallic centipede curled around Earth" className="h-full w-full object-contain object-center sm:object-right" draggable={false} />
            </div>
          )}
          <main className="relative h-full min-w-0 overflow-x-hidden overflow-y-auto p-2 sm:p-3">
            {children}
          </main>
        </div>
      </div>

      {/* Seven primary destinations, all reachable on mobile. */}
      <nav aria-label="Main navigation" className="z-30 flex h-14 shrink-0 items-center justify-start gap-1 overflow-x-auto border-t border-slate-800 bg-slate-950 px-2 sm:justify-center sm:gap-2">
        {PRIMARY_DESTINATIONS.map(item => {
          const Icon=item.icon;
          const selected=activeAppId===item.id;
          return <button key={item.id} type="button" onClick={()=>setActiveAppId(item.id)}
            aria-current={selected?'page':undefined}
            className={`relative flex min-w-12 shrink-0 flex-col items-center justify-center rounded-lg px-2 py-1 text-xs sm:min-w-16 ${selected?'bg-blue-950 text-blue-200 border border-blue-500':'text-slate-300 hover:bg-slate-800'}`}>
            <Icon aria-hidden="true" className="h-5 w-5"/><span>{item.name}</span>
          </button>;
        })}
        {pendingApprovalsCount>0 && <button type="button" onClick={()=>setActiveAppId('security')} aria-label="Review pending approvals" className="shrink-0 rounded-lg bg-red-950 px-2 py-2 text-xs text-red-200">{pendingApprovalsCount} approvals</button>}
      </nav>
    </div>
  );
};

