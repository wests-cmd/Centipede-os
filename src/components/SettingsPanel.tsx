import React, { useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { Sliders, CheckCircle2, RotateCcw } from 'lucide-react';

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
