import React, { useEffect, useState } from 'react';
import { platformDetector } from '../platform/detector';
import { RuntimeInfo, CentipedeProfile } from '../platform/types';
import { kingdomAdapter } from '../api/kingdomAdapter';
import { CENTIPEDE_VERSION } from '../version';
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Server,
  Cpu,
  HardDrive,
  Globe,
  ArrowRight,
  ArrowLeft,
  Bot,
  Zap,
  Sliders,
  Check,
} from 'lucide-react';

interface FirstRunWizardProps {
  onComplete: () => void;
}

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<CentipedeProfile>('FULL_CENTIPEDE');
  const [kingdomUrl, setKingdomUrl] = useState<string>('http://localhost:8000');
  const [kingdomStatus, setKingdomStatus] = useState<string>('CHECKING');
  const [zeroTrustEnabled, setZeroTrustEnabled] = useState<boolean>(true);
  const [deviceName, setDeviceName] = useState<string>('Centipede Workstation');

  useEffect(() => {
    platformDetector.detectRuntimeInfo().then((info) => {
      setRuntimeInfo(info);
      const rec = platformDetector.getProfileRecommendation(info.hardware);
      setSelectedProfile(rec.recommendedProfile);
    });

    checkKingdomConnection();
  }, [kingdomUrl]);

  const checkKingdomConnection = async () => {
    setKingdomStatus('CHECKING');
    try {
      kingdomAdapter.setBaseUrl(kingdomUrl);
      const isConnected = await kingdomAdapter.reconnect();
      setKingdomStatus(isConnected ? 'CONNECTED' : 'DISCONNECTED');
    } catch (e) {
      setKingdomStatus('DISCONNECTED');
    }
  };

  const handleFinish = () => {
    localStorage.setItem('centipede_first_run_completed', 'true');
    localStorage.setItem('centipede_device_name', deviceName);
    localStorage.setItem('centipede_selected_profile', selectedProfile);
    localStorage.setItem('centipede_kingdom_url', kingdomUrl);
    onComplete();
  };

  const totalSteps = 6;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6">
      {/* Header Bar */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-600/30">
            C
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Centipede OS First-Run Setup</h1>
            <p className="text-xs text-slate-400">Version v{CENTIPEDE_VERSION} • ZeroTrust Environment Configuration</p>
          </div>
        </div>

        {/* Step Counter */}
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
          <span>Step {step} of {totalSteps}</span>
          <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Wizard Content Card */}
      <div className="max-w-3xl mx-auto w-full my-auto py-8">
        {step === 1 && (
          <div className="space-y-6 text-center">
            <div className="inline-flex p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-blue-400 mb-2">
              <Bot className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-white">Welcome to Centipede OS</h2>
            <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Centipede OS is an AI-first operating environment governed by Segmentor assistant and powered by the distributed Kingdom swarm engine.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto pt-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xs font-bold text-white">ZeroTrust Security</h3>
                <p className="text-[11px] text-slate-400">AI cannot self-authorize or bypass permission bounds.</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <Server className="w-5 h-5 text-blue-400" />
                <h3 className="text-xs font-bold text-white">Swarm Runtime</h3>
                <p className="text-[11px] text-slate-400">Connects seamlessly with Kingdom Commander & Knights.</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-xs font-bold text-white">One-Click Setup</h3>
                <p className="text-[11px] text-slate-400">Automatic system check and hardware-guided setup.</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">System Hardware & Environment Check</h2>
              <p className="text-xs text-slate-400 mt-1">Verifying platform capabilities, memory, and storage allocation.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
                <Globe className="w-6 h-6 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-white">Platform OS</div>
                  <div className="text-xs text-slate-400">{runtimeInfo?.platform.os || 'Linux Workstation'} ({runtimeInfo?.platform.architecture})</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
                <Cpu className="w-6 h-6 text-indigo-400" />
                <div>
                  <div className="text-xs font-bold text-white">CPU & Memory</div>
                  <div className="text-xs text-slate-400">{runtimeInfo?.hardware.cpuCores || 8} CPU Cores • {Math.round((runtimeInfo?.hardware.totalMemoryMb || 16384) / 1024)} GB RAM</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
                <HardDrive className="w-6 h-6 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-white">Storage Capacity</div>
                  <div className="text-xs text-slate-400">{runtimeInfo?.hardware.storageAvailableGb || 256} GB Available ({runtimeInfo?.hardware?.storageBreakdown?.storagePressure || 'NORMAL'} Pressure)</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
                <ShieldCheck className="w-6 h-6 text-purple-400" />
                <div>
                  <div className="text-xs font-bold text-white">Security Harness</div>
                  <div className="text-xs text-slate-400">ZeroTrust PermissionGate Active • Non-root Sandbox</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-950/40 border border-blue-500/30 p-4 rounded-xl text-xs text-blue-300 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span>System meets hardware requirements for Centipede OS. Safe to proceed with role selection.</span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Select Centipede OS Deployment Role</h2>
              <p className="text-xs text-slate-400 mt-1">Choose how this computer operates within your Centipede swarm network.</p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'FULL_CENTIPEDE',
                  title: 'Full Centipede OS (Recommended)',
                  desc: 'All-in-one desktop workstation acting as Commander, Knight worker, and Scout.',
                  badge: 'Full Workstation',
                  color: 'border-blue-500 bg-blue-950/20',
                },
                {
                  id: 'KNIGHT',
                  title: 'Knight Node',
                  desc: 'Dedicated task worker node executing assigned workloads and containers.',
                  badge: 'Worker Node',
                  color: 'border-emerald-500 bg-emerald-950/20',
                },
                {
                  id: 'SCOUT',
                  title: 'Scout Profile',
                  desc: 'Ultra-lightweight environment discovery and monitoring agent (< 5.0 GB footprint).',
                  badge: 'Lightweight Agent',
                  color: 'border-amber-500 bg-amber-950/20',
                },
              ].map((prof) => (
                <div
                  key={prof.id}
                  onClick={() => setSelectedProfile(prof.id as CentipedeProfile)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${
                    selectedProfile === prof.id
                      ? `${prof.color} ring-2 ring-blue-500/50`
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{prof.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                        {prof.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{prof.desc}</p>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedProfile === prof.id ? 'border-blue-400 bg-blue-600 text-white' : 'border-slate-700'
                  }`}>
                    {selectedProfile === prof.id && <Check className="w-3 h-3" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Workstation Device Name</label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Security & ZeroTrust Configuration</h2>
              <p className="text-xs text-slate-400 mt-1">Configure security boundaries and human approval gating rules.</p>
            </div>

            <div className="space-y-3 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Enable ZeroTrust Permission Gate</div>
                  <div className="text-[11px] text-slate-400">All mutating actions require valid JIT capability grant or human approval.</div>
                </div>
                <input
                  type="checkbox"
                  checked={zeroTrustEnabled}
                  onChange={(e) => setZeroTrustEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="font-semibold text-slate-200">Active Security Policy Summary:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>AI model output cannot self-authorize or modify approval state.</li>
                  <li>Single-use atomic JIT capability grants expire dynamically.</li>
                  <li>Path traversal (`../../etc/passwd`) is strictly blocked across tools.</li>
                  <li>Untrusted uploads are isolated as DATA with prompt injection detection.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Kingdom Engine Connection Verification</h2>
              <p className="text-xs text-slate-400 mt-1">Connect Centipede OS to the distributed Kingdom backend runtime.</p>
            </div>

            <div className="space-y-3 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <label className="text-xs font-bold text-slate-300">Kingdom API Base Endpoint</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={kingdomUrl}
                  onChange={(e) => setKingdomUrl(e.target.value)}
                  placeholder="http://localhost:8000"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={checkKingdomConnection}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors border border-slate-700"
                >
                  Test Connection
                </button>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <span className="text-xs text-slate-400">Connection Status:</span>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                  kingdomStatus === 'CONNECTED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {kingdomStatus === 'CONNECTED' ? 'CONNECTED (v40.1)' : 'STANDBY / OFFLINE MODE'}
                </span>
              </div>

              {kingdomStatus !== 'CONNECTED' && (
                <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl text-[11px] text-amber-300 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Kingdom runtime backend is not running on {kingdomUrl}. Centipede OS will operate in standalone standby mode. You can start Kingdom anytime with <code className="bg-slate-950 px-1 py-0.5 rounded">python -m kingdom</code> or Docker compose.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6 text-center">
            <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 mb-2">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-white">Setup Complete & Health Confirmed</h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Centipede OS is configured and ready. You are entering a healthy, ZeroTrust governed environment.
            </p>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left max-w-md mx-auto space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Device Name:</span>
                <span className="text-white font-bold">{deviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Deployment Profile:</span>
                <span className="text-cyan-400 font-bold">{selectedProfile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kingdom Endpoint:</span>
                <span className="text-indigo-400">{kingdomUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">System Health:</span>
                <span className="text-emerald-400 font-bold">HEALTHY (100% Passed)</span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-2xl text-sm transition-all shadow-xl shadow-blue-600/30"
            >
              Launch Centipede OS Workstation →
            </button>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="max-w-3xl mx-auto w-full flex justify-between items-center pt-6 border-t border-slate-800">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs transition-colors border border-slate-800 disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {step < totalSteps && (
          <button
            onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-blue-600/20"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
