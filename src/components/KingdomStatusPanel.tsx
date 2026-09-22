import React, { useEffect, useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { ApprovalRequest, ConnectionState, KnightItem, ModelHealth, RuntimeStatus, VersionCompatibility } from '../types';
import { KingdomUpdateCenter } from './KingdomUpdateCenter';
import { AlertCircle, AlertTriangle, Cpu, Play, Power, RefreshCw, Server, ShieldAlert, Zap, Activity } from 'lucide-react';

interface KingdomStatusPanelProps {
  adapter: KingdomAdapter;
  status: RuntimeStatus | null;
  connectionState: ConnectionState;
  onRequestCreated?: (request: ApprovalRequest) => void;
}

export const KingdomStatusPanel: React.FC<KingdomStatusPanelProps> = ({
  adapter,
  status,
  connectionState,
  onRequestCreated,
}) => {
  const [knights, setKnights] = useState<KnightItem[]>([]);
  const [models, setModels] = useState<ModelHealth | null>(null);
  const [mode, setMode] = useState<string>('adaptive');
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [compatInfo, setCompatInfo] = useState<VersionCompatibility>(adapter.getCompatibilityInfo());

  const runtimeInfo = adapter.getKingdomRuntimeInfo();

  const refreshDetails = async () => {
    setCompatInfo(adapter.getCompatibilityInfo());
    if (connectionState !== 'CONNECTED') return;
    try {
      const [kRes, mRes, modeRes] = await Promise.all([
        adapter.get_knights().catch(() => ({ knights: [] })),
        adapter.get_models().catch(() => null),
        adapter.get_mode().catch(() => ({ mode: 'adaptive' })),
      ]);
      setKnights(kRes.knights || []);
      setModels(mRes);
      setMode(modeRes.mode);
    } catch (e) {
      // Handled
    }
  };

  useEffect(() => {
    refreshDetails();
    const unsubCompat = adapter.subscribeCompatibility(setCompatInfo);
    const interval = setInterval(refreshDetails, 4000);
    return () => {
      clearInterval(interval);
      unsubCompat();
    };
  }, [connectionState]);

  const handleStartRuntime = async () => {
    setLoadingAction(true);
    try {
      await adapter.start_runtime();
      setMessage('Kingdom runtime started successfully.');
    } catch (err: any) {
      setMessage(`Failed to start engine: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStopRuntime = async () => {
    setLoadingAction(true);
    try {
      await adapter.stop_runtime();
      setMessage('Kingdom runtime engine stopped.');
    } catch (err: any) {
      setMessage(`Failed to stop engine: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleModeChange = async (newMode: string) => {
    setLoadingAction(true);
    try {
      await adapter.set_mode(newMode);
      setMode(newMode);
      setMessage(`Kingdom operating mode updated to ${newMode}.`);
    } catch (err: any) {
      setMessage(`Failed to set mode: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReconnect = async () => {
    setLoadingAction(true);
    setMessage('Initiating controlled handshake & connection retry to Kingdom API...');
    const ok = await adapter.reconnect();
    if (ok) {
      setMessage('Successfully connected and negotiated with Kingdom API!');
    } else {
      setMessage('Reconnection handshake failed. Ensure Kingdom backend is online at ' + adapter.getBaseUrl());
    }
    setLoadingAction(false);
  };

  const getStatusBadge = () => {
    switch (connectionState) {
      case 'CONNECTED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'DISCOVERING':
      case 'AUTHENTICATING':
      case 'NEGOTIATING':
      case 'VALIDATING':
      case 'CONNECTING':
      case 'RECONNECTING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse';
      case 'DEGRADED':
        return 'bg-amber-600/20 text-amber-300 border-amber-600/40';
      case 'INCOMPATIBLE':
      case 'VERSION_INCOMPATIBLE':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'AUTHENTICATION_FAILED':
        return 'bg-red-600/20 text-red-300 border-red-600/40';
      default:
        return 'bg-red-500/20 text-red-400 border-red-500/40';
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Version Incompatibility / Handshake Banner */}
      {compatInfo.status !== 'COMPATIBLE' && compatInfo.status !== 'UNKNOWN' && (
        <div className="bg-purple-950/80 border border-purple-500/60 p-4 rounded-2xl flex items-center space-x-3 text-purple-200 shadow-xl">
          <ShieldAlert className="w-6 h-6 text-purple-400 flex-shrink-0" />
          <div className="text-xs">
            <div className="font-bold text-sm text-white">Kingdom Protocol Compatibility Alert</div>
            <div>{compatInfo.message}</div>
            <div className="text-[10px] text-purple-400 mt-1 font-mono">
              Supported Protocol Major: v{compatInfo.minSupportedVersion}
            </div>
          </div>
        </div>
      )}

      {/* Top Connection Banner */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className={`p-4 rounded-xl ${connectionState === 'CONNECTED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            <Server className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-white">Kingdom Handshake & Runtime Status</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge()}`}>
                ● {connectionState}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              API Endpoint: <span className="text-slate-200 font-mono">{adapter.getBaseUrl()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleReconnect}
            disabled={loadingAction}
            className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors border border-slate-600"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAction ? 'animate-spin' : ''}`} />
            <span>Reconnect Handshake</span>
          </button>

          {status?.running ? (
            <button
              onClick={handleStopRuntime}
              disabled={loadingAction}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-lg shadow-red-600/30"
            >
              <Power className="w-4 h-4" />
              <span>Stop Engine</span>
            </button>
          ) : (
            <button
              onClick={handleStartRuntime}
              disabled={loadingAction || connectionState !== 'CONNECTED'}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-600/30 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>Start Engine</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="bg-blue-950/60 border border-blue-500/40 text-blue-300 px-4 py-3 rounded-xl text-sm">
          {message}
        </div>
      )}

      {/* Grid Metrics & Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Engine State</div>
          <div className="text-2xl font-bold text-white mt-2 flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${status?.running ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`}></span>
            <span>{status?.running ? 'RUNNING' : 'STOPPED'}</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">Scheduler: {status?.scheduler_running ? 'Active' : 'Idle'}</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Kingdom Version</div>
          <div className="text-2xl font-bold text-blue-400 mt-2">
            {connectionState === 'CONNECTED' && runtimeInfo.connectedKingdomVersion
              ? `v${runtimeInfo.connectedKingdomVersion}`
              : runtimeInfo.lastKnownKingdomVersion
              ? `v${runtimeInfo.lastKnownKingdomVersion} (Offline)`
              : 'Offline'}
          </div>
          <div className="text-xs text-slate-400 mt-2">Protocol: {runtimeInfo.protocol ? `v${runtimeInfo.protocol.major}.${runtimeInfo.protocol.minor}` : 'v1.x'}</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Heartbeat Latency</div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 flex items-center space-x-1">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>{runtimeInfo.diagnostics?.latencyMs || 0}ms</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">Retries: {runtimeInfo.diagnostics?.reconnectAttempt || 0}</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Task Counters</div>
          <div className="text-xl font-bold text-white mt-2 flex space-x-3">
            <span className="text-blue-400" title="Queued">{status?.tasks?.queued || 0}Q</span>
            <span className="text-amber-400" title="Running">{status?.tasks?.running || 0}R</span>
            <span className="text-emerald-400" title="Completed">{status?.tasks?.completed || 0}C</span>
            <span className="text-red-400" title="Failed">{status?.tasks?.failed || 0}F</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">Tracked in runtime engine</div>
        </div>
      </div>

      {/* Kingdom Update Center Component */}
      <KingdomUpdateCenter adapter={adapter} runtimeInfo={runtimeInfo} onRequestCreated={onRequestCreated} />

      {/* Swarm Knights List */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">Active Knights & Swarm Nodes ({knights.length})</h3>
        </div>

        {knights.length === 0 ? (
          <p className="text-slate-400 text-sm italic">No knights detected or Kingdom engine is disconnected.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {knights.map((k) => (
              <div key={k.name} className="bg-slate-900/60 border border-slate-700/80 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-white capitalize text-sm">{k.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Active: {k.active} | Completed: {k.completed}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  k.status === 'ready' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'
                }`}>
                  {k.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Model Services */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-white">Model Services & Providers</h3>
        </div>
        {models ? (
          <pre className="bg-slate-950 border border-slate-800 text-xs text-slate-300 p-4 rounded-xl overflow-x-auto font-mono">
            {JSON.stringify(models, null, 2)}
          </pre>
        ) : (
          <p className="text-slate-400 text-sm italic">Model health status unavailable.</p>
        )}
      </div>
    </div>
  );
};
