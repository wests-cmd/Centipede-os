import { Capacitor } from '@capacitor/core';
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
  Check,
} from 'lucide-react';

interface FirstRunWizardProps {
  onComplete: () => void;
}

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
  const mobileCompanion = Capacitor.isNativePlatform();
  const [step, setStep] = useState<number>(1);
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<CentipedeProfile>('FULL_CENTIPEDE');
  const [kingdomUrl, setKingdomUrl] = useState<string>(() => kingdomAdapter.getBaseUrl());
  const [kingdomStatus, setKingdomStatus] = useState<string>('CHECKING');
  const [deviceName, setDeviceName] = useState<string>(mobileCompanion ? 'Centipede Mobile' : 'Centipede Workstation');
  const [accessibilityHelpWanted, setAccessibilityHelpWanted] = useState(false);

  useEffect(() => {
    platformDetector.detectRuntimeInfo().then((info) => {
      setRuntimeInfo(info);
      const rec = platformDetector.getProfileRecommendation(info.hardware);
      setSelectedProfile(rec.recommendedProfile);
    });

    checkKingdomConnection();
  }, [kingdomUrl]);

  const checkKingdomConnection = async () => {
    if (mobileCompanion && !kingdomUrl.trim()) { setKingdomStatus('CONFIGURE YOUR KINGDOM HTTPS ADDRESS'); return; }
    setKingdomStatus('CHECKING');
    try {
      kingdomAdapter.setBaseUrl(kingdomUrl);
      const isConnected = await kingdomAdapter.reconnect();
      const kingdomInfo = kingdomAdapter.getKingdomRuntimeInfo();
      setKingdomStatus(isConnected ? `CONNECTED (${kingdomInfo.connectedKingdomVersion || 'v1TAS'})` : 'STANDBY / OFFLINE MODE');
    } catch (e) {
      setKingdomStatus('STANDBY / OFFLINE MODE');
    }
  };

  const handleFinish = () => {
    try {
      localStorage.setItem('centipede_first_run_completed', 'true');
      localStorage.setItem('centipede_device_name', deviceName);
      localStorage.setItem('centipede_selected_profile', selectedProfile);
      localStorage.setItem('centipede_kingdom_url', kingdomUrl);
      localStorage.setItem('centipede_accessibility_setup_requested', String(accessibilityHelpWanted));
    } catch {
      // Setup can finish for this session when browser storage is unavailable.
    }
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
            <h1 className="text-lg font-bold text-white">{mobileCompanion ? 'Centipede Mobile Setup' : 'Centipede Desktop Web App Setup'}</h1>
            <p className="text-xs text-slate-400">Version v{CENTIPEDE_VERSION} • Browser Application Configuration</p>
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
            <h2 className="text-2xl font-black text-white">Welcome to Centipede</h2>
            <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              {mobileCompanion ? 'Centipede is a mobile companion for your separately operated Kingdom service. It does not run the Kingdom backend or boot an operating system on your phone. Enter your reachable HTTPS server address to connect.' : 'Centipede is a browser-based desktop application. Kingdom is a separate service that must be deployed and configured independently. This bundle is not a bootable operating system.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto pt-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xs font-bold text-white">ZeroTrust Security</h3>
                <p className="text-[11px] text-slate-400">Client checks do not replace authorization by a connected Kingdom service.</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <Server className="w-5 h-5 text-blue-400" />
                <h3 className="text-xs font-bold text-white">Swarm Runtime</h3>
                <p className="text-[11px] text-slate-400">Connect to a separately operated Kingdom API. No Kingdom service is bundled.</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-xs font-bold text-white">Guided Setup</h3>
                <p className="text-[11px] text-slate-400">Configure this browser client and review browser-reported device estimates.</p>
              </div>
            </div>

            <section aria-labelledby="first-run-accessibility-heading" className="mx-auto max-w-2xl rounded-xl border border-cyan-900 bg-slate-900/80 p-4 text-left">
              <h3 id="first-run-accessibility-heading" className="text-sm font-semibold text-white">Would you like help setting up accessibility features?</h3>
              <p className="mt-1 text-xs text-slate-300">Choose this to open Accessibility settings after setup. You can skip it and change these settings later.</p>
              <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-100">
                <input
                  type="checkbox"
                  checked={accessibilityHelpWanted}
                  onChange={(event) => setAccessibilityHelpWanted(event.target.checked)}
                  className="h-5 w-5 accent-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                />
                <span>Yes, open accessibility settings when setup is done</span>
              </label>
            </section>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Browser and Runtime Information</h2>
              <p className="text-xs text-slate-400 mt-1">These values are reported by the browser or estimated; this is not a host security or installation check.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
                <Globe className="w-6 h-6 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-white">Platform OS</div>
                  <div className="text-xs text-slate-400">{runtimeInfo?.platform.os || 'Unknown'} ({runtimeInfo?.platform.architecture || 'Unknown'})</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
                <Cpu className="w-6 h-6 text-indigo-400" />
                <div>
                  <div className="text-xs font-bold text-white">Browser-Reported CPU & Memory</div>
                  <div className="text-xs text-slate-400">
                    {runtimeInfo?.hardware.cpuCores ?? 'Unknown'} reported logical cores • {runtimeInfo?.hardware.totalMemoryMb ? `approximately ${Math.round(runtimeInfo.hardware.totalMemoryMb / 1024)} GB RAM` : 'memory unavailable'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
                <HardDrive className="w-6 h-6 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-white">Browser Storage Estimate</div>
                  <div className="text-xs text-slate-400">
                    {runtimeInfo?.hardware.storageAvailableGb !== null && runtimeInfo?.hardware.storageAvailableGb !== undefined
                      ? `Approximately ${runtimeInfo.hardware.storageAvailableGb} GB available to this browser origin; this is not host disk space.`
                      : 'Browser storage estimate unavailable; host disk space is not measured.'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
                <ShieldCheck className="w-6 h-6 text-purple-400" />
                <div>
                  <div className="text-xs font-bold text-white">Execution Authority</div>
                  <div className="text-xs text-slate-400">Kingdom is external; this browser app is not an OS sandbox.</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-950/40 border border-blue-500/30 p-4 rounded-xl text-xs text-blue-300 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span>Browser information only. This does not verify host hardware requirements, OS isolation, or bootable system support.</span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Select a Client Profile Label</h2>
              <p className="text-xs text-slate-400 mt-1">This preference labels the browser client; it does not provision a Kingdom node or OS distribution.</p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'FULL_CENTIPEDE',
                  title: 'Desktop Client',
                  desc: 'Use the browser-based desktop interface.',
                  badge: 'Web App',
                  color: 'border-blue-500 bg-blue-950/20',
                },
                {
                  id: 'KNIGHT',
                  title: 'Worker View',
                  desc: 'Select a client preference for worker-related views.',
                  badge: 'Client Preference',
                  color: 'border-emerald-500 bg-emerald-950/20',
                },
                {
                  id: 'SCOUT',
                  title: 'Monitoring View',
                  desc: 'Select a client preference for monitoring views.',
                  badge: 'Client Preference',
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
              <h2 className="text-xl font-bold text-white">Security Responsibilities</h2>
              <p className="text-xs text-slate-400 mt-1">The browser client cannot certify host isolation. Privileged execution must be authorized by the separately deployed Kingdom service.</p>
            </div>

            <div className="space-y-3 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div>
                <div className="text-xs font-bold text-white">Kingdom Authorization</div>
                <div className="text-[11px] text-slate-400">Only a running, compatible Kingdom service can authorize protected operations. A disconnected service cannot be replaced by this setup screen.</div>
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
              <h2 className="text-xl font-bold text-white">Connect to Kingdom</h2>
              <p className="text-xs text-slate-400 mt-1">Check reachability of the separately deployed Kingdom API.</p>
            </div>

            <div className="space-y-3 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <label className="text-xs font-bold text-slate-300">Kingdom API Base Endpoint</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={kingdomUrl}
                  onChange={(e) => setKingdomUrl(e.target.value)}
                  placeholder={mobileCompanion ? 'https://your-computer.your-tailnet.ts.net' : 'http://localhost:8000'}
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
                  kingdomStatus.startsWith('CONNECTED')
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {kingdomStatus}
                </span>
              </div>

              {!kingdomStatus.startsWith('CONNECTED') && (
                <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl text-[11px] text-amber-300 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Kingdom runtime is not reachable at {kingdomUrl}. Kingdom is deployed separately; configure this endpoint to a running Kingdom service before using Kingdom-backed actions.
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
            <h2 className="text-2xl font-black text-white">Client Setup Complete</h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              The browser client preferences are saved. This does not certify system health or host security.
            </p>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-left max-w-md mx-auto space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Device Name:</span>
                <span className="text-white font-bold">{deviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Client Profile:</span>
                <span className="text-cyan-400 font-bold">{selectedProfile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kingdom Endpoint:</span>
                <span className="text-indigo-400">{kingdomUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kingdom Connection:</span>
                <span className={kingdomStatus.startsWith('CONNECTED') ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{kingdomStatus}</span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-2xl text-sm transition-all shadow-xl shadow-blue-600/30"
            >
              Open Centipede Desktop App →
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
