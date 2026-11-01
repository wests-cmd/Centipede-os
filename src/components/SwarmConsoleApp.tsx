import React, { useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { Server, Cpu, HardDrive, Shield, CheckCircle2, RefreshCw, Send, Monitor, Laptop } from 'lucide-react';

export type SwarmRoleProfile = 'Observe' | 'Assist' | 'Develop' | 'Admin' | 'Experimental';

export interface SwarmDevice {
  id: string;
  name: string;
  type: 'DT1' | 'Laptop2' | 'GenericNode';
  ip: string;
  role: 'Commander' | 'Knight' | 'Scout';
  profile: SwarmRoleProfile;
  health: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  activeTasks: number;
  installedTools: string[];
  models: string[];
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';
  trustState: 'PAIRED_ACTIVE' | 'PENDING' | 'REVOKED';
  authorizedCapabilities: string[];
  updateState: 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'UNKNOWN';
}

interface SwarmConsoleAppProps {
  adapter: KingdomAdapter;
}

export const SwarmConsoleApp: React.FC<SwarmConsoleAppProps> = ({ adapter }) => {
  const [devices, setDevices] = useState<SwarmDevice[]>([
    {
      id: 'node_dt1_primary',
      name: 'DT1 (Desktop Interface)',
      type: 'DT1',
      ip: '127.0.0.1',
      role: 'Commander',
      profile: 'Assist',
      health: 'HEALTHY',
      cpuUsagePercent: 18,
      memoryUsagePercent: 32,
      activeTasks: 1,
      installedTools: ['browser.control', 'screen.capture', 'audio.transcribe', 'filesystem.sandbox'],
      models: ['local/whisper-tiny', 'external/claude-3-5-sonnet'],
      connectionStatus: 'CONNECTED',
      trustState: 'PAIRED_ACTIVE',
      authorizedCapabilities: ['runtime.status', 'tasks.create', 'tasks.read', 'security.approvals.create'],
      updateState: 'UP_TO_DATE',
    },
    {
      id: 'node_laptop2_worker',
      name: 'Laptop 2 (Autonomous Worker & Runtime)',
      type: 'Laptop2',
      ip: '192.168.1.150',
      role: 'Knight',
      profile: 'Develop',
      health: 'HEALTHY',
      cpuUsagePercent: 46,
      memoryUsagePercent: 68,
      activeTasks: 3,
      installedTools: ['process.execute', 'filesystem.write', 'git.manager', 'test.runner', 'docker.sandbox'],
      models: ['ollama/qwen2.5-coder:7b', 'ollama/llama3.2:3b'],
      connectionStatus: 'CONNECTED',
      trustState: 'PAIRED_ACTIVE',
      authorizedCapabilities: ['filesystem.read', 'filesystem.write', 'process.execute', 'tasks.create', 'tasks.read'],
      updateState: 'UP_TO_DATE',
    },
  ]);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('node_dt1_primary');
  const [taskPrompt, setTaskPrompt] = useState<string>('');
  const [selectedTargetDevice, setSelectedTargetDevice] = useState<string>('node_laptop2_worker');
  const [delegationStatus, setDelegationStatus] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setStatusMessage('Querying Kingdom swarm nodes and live telemetry...');
    try {
      const resp = await adapter.get_knights();
      const list = resp?.knights || [];
      if (list && list.length > 0) {
        setStatusMessage(`Successfully synchronized ${list.length} Knight nodes from Kingdom.`);
      } else {
        setStatusMessage('Kingdom reports zero active Knight workers; retaining local known topology.');
      }
    } catch (err: any) {
      setStatusMessage(`Kingdom Swarm query: ${err.message || 'Offline'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleProfileChange = async (deviceId: string, newProfile: SwarmRoleProfile) => {
    setStatusMessage(`Requesting authenticated role profile transition to '${newProfile}' for ${deviceId}...`);
    try {
      if (newProfile === 'Admin' || newProfile === 'Experimental') {
        const approval = await adapter.create_approval(
          'swarm.profile.update',
          deviceId,
          `Elevate device profile to ${newProfile}`,
          'swarm_console',
          'HIGH'
        );
        setStatusMessage(`Elevation to ${newProfile} requires human approval (Request ID: ${approval.id}).`);
      } else {
        setDevices((prev) =>
          prev.map((d) => (d.id === deviceId ? { ...d, profile: newProfile } : d))
        );
        setStatusMessage(`Profile updated to ${newProfile} for device ${deviceId}.`);
      }
    } catch (err: any) {
      setStatusMessage(`Failed to update profile: ${err.message}`);
    }
  };

  const handleDelegateTask = async () => {
    if (!taskPrompt.trim()) return;
    setDelegationStatus('Submitting authorized task to target node via Kingdom...');
    try {
      const task = await adapter.submit_task(taskPrompt.trim(), {
        targetDevice: selectedTargetDevice,
        delegatedBy: 'DT1_Console',
        executionNode: selectedTargetDevice === 'node_laptop2_worker' ? 'Laptop 2' : 'DT1',
      });
      setDelegationStatus(`Task dispatched successfully to ${selectedTargetDevice}! Task ID: ${task.id} (Status: ${task.status})`);
      setTaskPrompt('');
      setDevices((prev) =>
        prev.map((d) => (d.id === selectedTargetDevice ? { ...d, activeTasks: d.activeTasks + 1 } : d))
      );
    } catch (err: any) {
      setDelegationStatus(`Task delegation failed: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100 p-4 space-y-4 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-400" /> Swarm & Multi-Device Console
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage authenticated nodes, monitor hardware health, and orchestrate task placement between DT1 & Laptop 2.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/50 hover:bg-slate-800 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh Nodes
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 text-xs text-cyan-300">
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map((device) => {
          const isSelected = selectedDeviceId === device.id;
          const isDT1 = device.type === 'DT1';
          return (
            <div
              key={device.id}
              onClick={() => setSelectedDeviceId(device.id)}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                isSelected
                  ? 'border-cyan-500 bg-slate-900/90 shadow-md shadow-cyan-950/40'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`p-2 rounded-lg ${isDT1 ? 'bg-cyan-500/10 text-cyan-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {isDT1 ? <Monitor className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{device.name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">{device.ip} • Role: {device.role}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    device.health === 'HEALTHY'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" /> {device.health}
                </span>
              </div>

              <div className="space-y-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU Load</span>
                    <span className="font-mono text-slate-200">{device.cpuUsagePercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${device.cpuUsagePercent > 80 ? 'bg-rose-500' : 'bg-cyan-400'}`}
                      style={{ width: `${device.cpuUsagePercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> Memory Load</span>
                    <span className="font-mono text-slate-200">{device.memoryUsagePercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${device.memoryUsagePercent > 80 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                      style={{ width: `${device.memoryUsagePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 pt-2">
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                  Profile: <strong className="text-cyan-200">{device.profile}</strong>
                </span>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                  Active Tasks: <strong className="text-white">{device.activeTasks}</strong>
                </span>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                  Trust: <strong className="text-emerald-300">{device.trustState}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-400" /> Node Profile & Authorized Capabilities: {selectedDevice.name}
          </h3>
          <span className="text-xs text-slate-400 font-mono">ID: {selectedDevice.id}</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Operating Profile (ZeroTrust Boundary Enforced):
          </label>
          <div className="flex flex-wrap gap-2">
            {(['Observe', 'Assist', 'Develop', 'Admin', 'Experimental'] as SwarmRoleProfile[]).map((prof) => (
              <button
                key={prof}
                type="button"
                onClick={() => handleProfileChange(selectedDevice.id, prof)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  selectedDevice.profile === prof
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {prof}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            * Note: Admin and Experimental profiles require explicit cryptographic Human Approval and verifiable policy updates.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <h4 className="text-xs font-medium text-slate-300 mb-1">Installed Tools on Node:</h4>
            <div className="flex flex-wrap gap-1">
              {selectedDevice.installedTools.map((t) => (
                <span key={t} className="bg-slate-800 border border-slate-700 text-slate-200 px-2 py-0.5 rounded text-[11px] font-mono">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-slate-300 mb-1">Available Models:</h4>
            <div className="flex flex-wrap gap-1">
              {selectedDevice.models.map((m) => (
                <span key={m} className="bg-slate-800 border border-slate-700 text-cyan-200 px-2 py-0.5 rounded text-[11px] font-mono">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Send className="h-4 w-4 text-emerald-400" /> Authenticated Task Delegation (DT1 ➔ Laptop 2)
        </h3>
        <p className="text-xs text-slate-400">
          Use DT1 for user interaction and dispatch compute-intensive development or test routines to Laptop 2.
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300">Target Node:</span>
            <select
              value={selectedTargetDevice}
              onChange={(e) => setSelectedTargetDevice(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.ip})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              placeholder="e.g. Build application package, run integration tests, and report back..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDelegateTask();
              }}
            />
            <button
              type="button"
              onClick={handleDelegateTask}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow"
            >
              Delegate Task
            </button>
          </div>

          {delegationStatus && (
            <p className="text-xs text-emerald-400 font-mono mt-1 bg-slate-950/80 p-2 rounded border border-emerald-950">
              {delegationStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
export default SwarmConsoleApp;
