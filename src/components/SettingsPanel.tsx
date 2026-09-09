import React, { useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { Sliders, CheckCircle2, RotateCcw, HardDrive, Database, ShieldAlert } from 'lucide-react';

interface SettingsPanelProps {
  adapter: KingdomAdapter;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ adapter }) => {
  const [url, setUrl] = useState(adapter.getBaseUrl());
  const [pollInterval, setPollInterval] = useState('3000');
  const [savedMessage, setSavedMessage] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    adapter.setBaseUrl(url);
    setSavedMessage('Settings applied successfully! Reconnecting to updated API URL...');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  const handleReset = () => {
    const defaultUrl = 'http://localhost:8000';
    setUrl(defaultUrl);
    adapter.setBaseUrl(defaultUrl);
    setSavedMessage('Reset to default API URL (http://localhost:8000).');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-2">
        <Sliders className="w-7 h-7 text-slate-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Centipede OS Settings</h2>
          <p className="text-slate-400 text-sm">System configuration and Kingdom API connection parameters</p>
        </div>
      </div>

      {savedMessage && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Graphical Storage Manager Card */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HardDrive className="w-6 h-6 text-blue-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Centipede OS Storage Manager</h3>
              <p className="text-xs text-slate-400">Total: 512 GB SSD • Used: 256 GB (50%) • Free: 256 GB (50%)</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-semibold rounded-full flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Pressure: NORMAL</span>
          </span>
        </div>

        {/* Overall Storage Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden flex border border-slate-700">
            <div className="bg-blue-500 h-full" style={{ width: '12%' }} title="System Files (31 GB)"></div>
            <div className="bg-purple-500 h-full" style={{ width: '20%' }} title="Virtual Machines (52 GB)"></div>
            <div className="bg-cyan-500 h-full" style={{ width: '11%' }} title="Docker Workloads (28 GB)"></div>
            <div className="bg-emerald-500 h-full" style={{ width: '8%' }} title="AI Models (21 GB)"></div>
            <div className="bg-amber-500 h-full" style={{ width: '9%' }} title="User Files (22 GB)"></div>
            <div className="bg-rose-500 h-full" style={{ width: '5%' }} title="Apps & Skills (19 GB)"></div>
            <div className="bg-slate-700 h-full" style={{ width: '35%' }} title="Free Space (256 GB)"></div>
          </div>
        </div>

        {/* Storage Breakdown List */}
        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl flex justify-between items-center">
            <span className="text-slate-300">Protected System (/system)</span>
            <span className="text-blue-400 font-bold">31 GB</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl flex justify-between items-center">
            <span className="text-slate-300">Virtual Machines (/data/vms)</span>
            <span className="text-purple-400 font-bold">52 GB</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl flex justify-between items-center">
            <span className="text-slate-300">Docker Pools (/data/containers)</span>
            <span className="text-cyan-400 font-bold">28 GB</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl flex justify-between items-center">
            <span className="text-slate-300">AI Models (/data/models)</span>
            <span className="text-emerald-400 font-bold">21 GB</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl flex justify-between items-center">
            <span className="text-slate-300">User Files (/home)</span>
            <span className="text-amber-400 font-bold">22 GB</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-xl flex justify-between items-center">
            <span className="text-slate-300">Kingdom Data (/data/kingdom)</span>
            <span className="text-slate-200 font-bold">4 GB</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200">
            Kingdom API Endpoint Base URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:8000"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-slate-400">
            Specify the backend host and port for Kingdom v40.1 API server. WebSocket endpoint will be derived as <span className="font-mono text-slate-300">{url.replace(/^http/, 'ws')}/ws</span>.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200">
            Health Heartbeat Polling Interval (ms)
          </label>
          <input
            type="number"
            value={pollInterval}
            onChange={(e) => setPollInterval(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-slate-400">Default is 3000ms (3 seconds).</p>
        </div>

        <div className="pt-4 border-t border-slate-700/80 flex justify-between items-center">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-2 text-slate-400 hover:text-white text-sm font-medium px-4 py-2 bg-slate-700/60 rounded-xl border border-slate-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/20"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
