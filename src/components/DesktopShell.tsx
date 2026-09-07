import React, { useEffect, useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
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
} from 'lucide-react';

interface DesktopShellProps {
  adapter: KingdomAdapter;
  activeAppId: string;
  setActiveAppId: (id: string) => void;
  pendingApprovalsCount: number;
  children: React.ReactNode;
}

export const DesktopShell: React.FC<DesktopShellProps> = ({
  adapter,
  activeAppId,
  setActiveAppId,
  pendingApprovalsCount,
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
        return 'bg-red-500/20 border-red-500/50 text-red-400';
      case 'VERSION_INCOMPATIBLE':
        return 'bg-purple-500/20 border-purple-500/50 text-purple-300';
      case 'AUTHENTICATION_FAILED':
        return 'bg-amber-600/20 border-amber-600/50 text-amber-300';
      default:
        return 'bg-red-500/20 border-red-500/50 text-red-400';
    }
  };

  const sidebarPlaces = [
    { id: 'launcher', name: 'Home / Desktop', icon: Home },
    { id: 'files', name: 'Documents', icon: FileText },
    { id: 'files', name: 'Downloads', icon: Download },
    { id: 'files', name: 'Music', icon: Music },
    { id: 'files', name: 'Pictures', icon: Image },
    { id: 'files', name: 'Videos', icon: Video },
  ];

  const sidebarApps = [
    { id: 'ai', name: 'Centipede AI', icon: Bot },
    { id: 'mobile', name: 'Mobile Companion', icon: Smartphone },
    { id: 'status', name: 'Kingdom Engine', icon: Server },
    { id: 'memory', name: 'Memory Explorer', icon: Brain },
    { id: 'skills', name: 'Skill Manager', icon: Cpu },
    { id: 'maps', name: 'Swarm Maps', icon: Map },
    { id: 'tasks', name: 'Activity & Tasks', icon: Activity },
    { id: 'security', name: 'Security & Approvals', icon: Shield, badge: pendingApprovalsCount },
    { id: 'search', name: 'Universal Search', icon: Search },
    { id: 'files', name: 'File Explorer', icon: Folder },
    { id: 'terminal', name: 'Terminal CLI', icon: Terminal },
    { id: 'settings', name: 'Settings', icon: Sliders },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* Top OS Menu Bar */}
      <header className="h-12 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between z-30 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 font-bold text-cyan-400 tracking-wide">
            <Monitor className="w-5 h-5 text-cyan-500" />
            <span className="text-white text-base">Centipede OS</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-xs text-slate-400 font-mono">v{runtimeInfo.centipedeVersion}</span>
        </div>

        {/* Connection & Dynamic Version Badges */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-3 text-xs">
            <span className="text-slate-400">
              Kingdom:{' '}
              <span className="text-slate-200 font-mono">
                {connectionState === 'CONNECTED' && runtimeInfo.connectedKingdomVersion
                  ? `v${runtimeInfo.connectedKingdomVersion}`
                  : runtimeInfo.lastKnownKingdomVersion
                  ? `v${runtimeInfo.lastKnownKingdomVersion} (Offline)`
                  : 'Offline'}
              </span>
            </span>
            <span className="text-slate-400">Mode: <span className="text-purple-400 font-mono capitalize">{status?.mode || 'OFFLINE'}</span></span>
            <span className="text-slate-400">Active Tasks: <span className="text-emerald-400 font-mono">{status?.tasks?.running || 0}</span></span>
          </div>

          <div
            onClick={() => setActiveAppId('status')}
            className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-semibold cursor-pointer transition-all ${getBadgeStyle()}`}
          >
            <span className={`w-2 h-2 rounded-full ${
              connectionState === 'CONNECTED' ? 'bg-emerald-400' : connectionState === 'CONNECTING' ? 'bg-amber-400' : 'bg-red-400'
            }`}></span>
            <span className="uppercase tracking-wider">{connectionState}</span>
          </div>

          <div className="text-xs text-slate-400 font-mono pl-2 border-l border-slate-800">{time}</div>
        </div>
      </header>

      {/* Disconnected Alert Banner */}
      {connectionState === 'DISCONNECTED' && (
        <div className="bg-red-950/90 border-b border-red-800 text-red-100 px-4 py-2 flex items-center justify-between text-xs z-20">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="font-semibold">Kingdom Backend Offline.</span>
            <span>
              Centipede OS is operating in standalone offline mode.{' '}
              {runtimeInfo.lastKnownKingdomVersion ? `Last known version: v${runtimeInfo.lastKnownKingdomVersion}` : 'Version unavailable.'}
            </span>
          </div>
          <button
            onClick={() => adapter.reconnect()}
            className="flex items-center space-x-1 bg-red-800 hover:bg-red-700 px-3 py-1 rounded-lg text-white font-medium border border-red-600 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reconnect</span>
          </button>
        </div>
      )}

      {/* Main Workspace with Left Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Functional Desktop Sidebar */}
        <aside className="w-56 bg-slate-900/80 border-r border-slate-800 p-3 flex flex-col justify-between hidden md:flex backdrop-blur-sm z-20">
          <div className="space-y-4 overflow-y-auto pr-1">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 px-2">Places</div>
              <div className="space-y-0.5">
                {sidebarPlaces.map((p, idx) => {
                  const Icon = p.icon;
                  const isActive = activeAppId === p.id && idx === 0;
                  return (
                    <button
                      key={p.name}
                      onClick={() => setActiveAppId(p.id)}
                      className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 px-2">Applications</div>
              <div className="space-y-0.5">
                {sidebarApps.map((a) => {
                  const Icon = a.icon;
                  const isActive = activeAppId === a.id;
                  return (
                    <button
                      key={a.name}
                      onClick={() => setActiveAppId(a.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{a.name}</span>
                      </div>
                      {a.badge && a.badge > 0 ? (
                        <span className="bg-red-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                          {a.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 text-[10px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-300">ZeroTrust Active</div>
              <div>Capabilities Gated</div>
              <div className="text-emerald-400 font-mono">100% Policy Protection</div>
            </div>
          </div>
        </aside>

        {/* Main View Area */}
        <main className="flex-1 overflow-auto bg-slate-950 p-3">
          {children}
        </main>
      </div>

      {/* Bottom Desktop Dock */}
      <nav className="h-14 bg-slate-900/90 border-t border-slate-800 px-4 flex items-center justify-center space-x-2 z-30 backdrop-blur-md overflow-x-auto">
        {sidebarApps.map((item) => {
          const Icon = item.icon;
          const isActive = activeAppId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveAppId(item.id)}
              className={`relative flex flex-col items-center justify-center px-3 py-1 rounded-xl transition-all group flex-shrink-0 ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full animate-bounce">
                  {item.badge}
                </span>
              ) : null}
              <Icon className={`w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform ${isActive ? 'text-cyan-400' : ''}`} />
              <span className="text-[10px] font-medium tracking-tight">{item.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
