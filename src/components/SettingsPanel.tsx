import React, { useEffect, useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { Sliders, CheckCircle2, RotateCcw, HardDrive, Cpu, Sparkles, Check, Server, Paintbrush } from 'lucide-react';
import { platformDetector } from '../platform/detector';
import { CentipedeProfile, ProfileRecommendation } from '../platform/types';
import { HOME_VISUALS, HomeVisual } from './CentipedeWorldVisual';

interface SettingsPanelProps {
  adapter: KingdomAdapter;
  homeVisual: HomeVisual;
  onHomeVisualChange: (visual: HomeVisual) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ adapter, homeVisual, onHomeVisualChange }) => {
  const [url, setUrl] = useState(adapter.getBaseUrl());
  const [pollInterval, setPollInterval] = useState('3000');
  const [savedMessage, setSavedMessage] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<CentipedeProfile>('FULL_CENTIPEDE');
  const [profileRec, setProfileRec] = useState<ProfileRecommendation | null>(null);

  useEffect(() => {
    platformDetector.detectRuntimeInfo()
      .then((runtime) => setProfileRec(platformDetector.getProfileRecommendation(runtime.hardware)))
      .catch(() => setProfileRec(null));
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    adapter.setBaseUrl(url);
    void adapter.reconnect();
    setSavedMessage('Settings applied successfully! Reconnecting to updated API URL...');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  const handleReset = () => {
    const defaultUrl = 'http://localhost:8000';
    setUrl(defaultUrl);
    adapter.setBaseUrl(defaultUrl);
    void adapter.reconnect();
    setSavedMessage('Reset to default API URL (http://localhost:8000).');
    setTimeout(() => setSavedMessage(''), 4000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-2">
        <Sliders className="w-7 h-7 text-slate-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Desktop App Settings</h2>
          <p className="text-slate-400 text-sm">The Kingdom API endpoint is configurable here. Profile and storage displays are illustrative, not host system controls.</p>
        </div>
      </div>

      {savedMessage && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{savedMessage}</span>
        </div>
      )}

      <section aria-labelledby="home-visual-heading" className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <Paintbrush aria-hidden="true" className="h-6 w-6 text-cyan-300" />
          <div>
            <h3 id="home-visual-heading" className="text-lg font-bold text-white">Home screen visual</h3>
            <p className="text-xs text-slate-400">Choose the scene shown on Home. Your choice stays on this device.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {HOME_VISUALS.map((profile) => {
            const selected = homeVisual === profile.id;
            const swatch = {
              'centipede-world': 'from-blue-950 via-cyan-900 to-orange-500',
              'neon-dragon': 'from-fuchsia-950 via-purple-800 to-pink-400',
              'space-nebula': 'from-indigo-950 via-violet-700 to-cyan-400',
              'abstract-orb': 'from-slate-950 via-blue-700 to-sky-300',
            }[profile.id];
            return (
              <button
                key={profile.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onHomeVisualChange(profile.id)}
                className={`group overflow-hidden rounded-xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${selected ? 'border-cyan-300 bg-cyan-950/40 ring-1 ring-cyan-300/30' : 'border-slate-700 bg-slate-900/70 hover:border-slate-500'}`}
              >
                <span aria-hidden="true" className={`relative block h-20 bg-gradient-to-br ${swatch}`}>
                  <span className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-white/10 shadow-[0_0_28px_rgba(103,232,249,.45)]" />
                  <span className="absolute left-1/2 top-1/2 h-5 w-16 -translate-x-1/2 -translate-y-1/2 rotate-[-20deg] rounded-[50%] border border-white/70" />
                  {selected && <span className="absolute right-2 top-2 rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-medium text-cyan-100">Selected</span>}
                </span>
                <span className="block p-3">
                  <span className="block text-xs font-semibold text-white">{profile.name}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-slate-400">{profile.description}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Animation pauses when the scene is off screen, the app is hidden, or reduced motion is enabled.</p>
      </section>

      {/* Centipede OS Profile Selector & Hardware Auto-Detector */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Server className="w-6 h-6 text-purple-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Centipede OS Deployment Profile</h3>
              <p className="text-xs text-slate-400">Select your active role or let Segmentor auto-recommend based on hardware</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-purple-950/80 border border-purple-500/40 text-purple-300 font-mono text-xs font-semibold rounded-full flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{profileRec ? `Suggestion: ${profileRec.recommendedProfile}` : 'Suggestion unavailable'}</span>
          </span>
        </div>

        {/* Hardware Suitability Explanation Banner */}
        <div className="bg-slate-900 border border-slate-700/80 p-3.5 rounded-xl text-xs space-y-1">
          <div className="text-slate-300 font-bold flex items-center justify-between">
            <span>Reported hardware: {profileRec?.hardwareSummary || 'Not available'}</span>
            {profileRec && <span className="text-slate-400 font-mono">{profileRec.suitabilityScore === null ? 'Not scored' : `Heuristic: ${profileRec.suitabilityScore}/100`}</span>}
          </div>
          <p className="text-slate-400">{profileRec?.explanation || 'Hardware information could not be read. Select a profile manually.'}</p>
        </div>

        {/* Profile Choice Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          {[
            { id: 'FULL_CENTIPEDE', title: 'Full Centipede', desc: 'Commander + Knight + Scout' },
            { id: 'COMMANDER', title: 'Commander', desc: 'System coordination & swarm manager' },
            { id: 'KNIGHT', title: 'Knight', desc: 'Worker node for approved task workloads' },
            { id: 'SCOUT', title: 'Scout', desc: 'Lightweight observation & discovery node' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedProfile(p.id as CentipedeProfile);
                setSavedMessage(`Active Centipede Profile set to "${p.title}". Configuration updated!`);
                setTimeout(() => setSavedMessage(''), 3000);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all relative ${
                selectedProfile === p.id
                  ? 'bg-purple-950/60 border-purple-500 text-white shadow-lg shadow-purple-950/50'
                  : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span>{p.title}</span>
                {selectedProfile === p.id && <Check className="w-4 h-4 text-purple-400" />}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Graphical Storage Manager Card */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HardDrive className="w-6 h-6 text-blue-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Host storage</h3>
              <p className="text-xs text-slate-400">This browser app cannot inspect disk usage or manage host storage.</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-slate-900 border border-slate-700 text-slate-300 font-mono text-xs font-semibold rounded-full">
            Not measured
          </span>
        </div>
        <p className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
          Disk totals, free space, and system storage pressure are unavailable here. No storage pressure or free-space claim is being made.
        </p>
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
            Specify the backend host and port for Kingdom API server. WebSocket endpoint will be derived as <span className="font-mono text-slate-300">{url.replace(/^http/, 'ws')}/ws</span>.
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
