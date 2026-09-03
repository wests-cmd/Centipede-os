import React, { useEffect, useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { ConnectionState, RuntimeStatus, VersionCompatibility } from '../types';
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
  Monitor,
  ShieldAlert,
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
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const unsubConn = adapter.subscribeConnection(setConnectionState);
    const unsubStatus = adapter.subscribeStatus(setStatus);
    const unsubCompat = adapter.subscribeCompatibility(setCompatInfo);
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

  const navItems = [
    { id: 'launcher', name: 'Launcher', icon: Grid },
    { id: 'ai', name: 'Centipede AI', icon: Bot },
    { id: 'status', name: 'Kingdom Status', icon: Server },
    { id: 'tasks', name: 'Tasks', icon: Activity },
    { id: 'security', name: 'Security', icon: Shield, badge: pendingApprovalsCount },
    { id: 'search', name: 'Search', icon: Search },
    { id: 'files', name: 'Files', icon: Folder },
    { id: 'terminal', name: 'Terminal', icon: Terminal },
    { id: 'settings', name: 'Settings', icon: Sliders },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* Top OS Menu Bar */}
      <header className="h-12 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between z-30 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 font-bold text-blue-400 tracking-wide">
            <Monitor className="w-5 h-5 text-blue-500" />
            <span className="text-white text-base">Centipede OS</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-xs text-slate-400 font-medium">Foundation v1.0</span>
        </div>

        {/* Connection & Status Badges */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-3 text-xs">
            <span className="text-slate-400">Kingdom: <span className="text-slate-200 font-mono">v{status?.version || '40.1'}</span></span>
            <span className="text-slate-400">Mode: <span className="text-purple-400 font-mono capitalize">{status?.mode || 'adaptive'}</span></span>
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
            <span>Centipede OS is operating in standalone offline mode. Retrying connection to {adapter.getBaseUrl()}...</span>
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

      {/* Version Incompatible Banner */}
      {connectionState === 'VERSION_INCOMPATIBLE' && (
        <div className="bg-purple-950/90 border-b border-purple-800 text-purple-100 px-4 py-2 flex items-center justify-between text-xs z-20">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="font-semibold">Kingdom Version Incompatibility Detected.</span>
            <span>{compatInfo.message}</span>
          </div>
          <button
            onClick={() => setActiveAppId('status')}
            className="bg-purple-800 hover:bg-purple-700 px-3 py-1 rounded-lg text-white font-medium border border-purple-600 transition-colors"
          >
            <span>View Details</span>
          </button>
        </div>
      )}

      {/* Main View Workspace */}
      <main className="flex-1 overflow-auto bg-slate-950 p-2">
        {children}
      </main>

      {/* Bottom Desktop Navigation Dock */}
      <nav className="h-16 bg-slate-900/90 border-t border-slate-800 px-4 flex items-center justify-center space-x-2 z-30 backdrop-blur-md">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeAppId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveAppId(item.id)}
              className={`relative flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all group ${
                isActive
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50 shadow-md shadow-blue-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full animate-bounce">
                  {item.badge}
                </span>
              ) : null}
              <Icon className={`w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform ${isActive ? 'text-blue-400' : ''}`} />
              <span className="text-[10px] font-medium tracking-tight">{item.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
