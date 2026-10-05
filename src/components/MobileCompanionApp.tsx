import React, { useEffect, useState } from 'react';
import { TrustedDevice } from '../security/deviceTrust';
import { contentIngestionPipeline, IngestedContent } from '../ingest/pipeline';
import { QrCode, Smartphone, ShieldCheck, Key, UploadCloud, Camera, RefreshCw, AlertTriangle } from 'lucide-react';

export const MobileCompanionApp: React.FC = () => {
  const [pairingData, setPairingData] = useState<{ deviceId: string; pairingCode: string; qrData: string } | null>(null);
  const [confirmCode, setConfirmCode] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [pairedDevices, setPairedDevices] = useState<TrustedDevice[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [pasteText, setPasteText] = useState<string>('');
  const [ingestionResult, setIngestionResult] = useState<IngestedContent | null>(null);

  const isLocalAdmin = typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  const refreshDevices = async () => {
    if (!isLocalAdmin) {
      setPairedDevices([]);
      return;
    }
    try {
      const response = await fetch('/api/v1/mobile/devices');
      if (!response.ok) throw new Error('Open the Centipede desktop on this computer to manage trusted devices.');
      const data = await response.json();
      setPairedDevices(data.devices || []);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not reach the Centipede pairing service.');
    }
  };

  useEffect(() => {
    refreshDevices();
  }, []);

  const handleInitiatePairing = async () => {
    try {
      const response = await fetch('/api/v1/mobile/pair/initiate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: 'Mobile Companion', endpoint: window.location.origin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not start pairing.');
      setPairingData(data);
      setStatusMessage('Pairing code created by the Centipede service. On your phone, open its address and enter this code.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not reach the Centipede pairing service.');
    }
  };

  const handleConfirmPairing = async () => {
    try {
      const response = await fetch('/api/v1/mobile/pair/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingCode: confirmCode.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.sessionToken) throw new Error(result.error || 'Pairing failed.');
      setSessionToken(result.sessionToken);
      setStatusMessage('This phone is paired with the Centipede service.');
      setPairingData(null);
      setConfirmCode('');
      await refreshDevices();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not reach the Centipede pairing service.');
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    const response = await fetch('/api/v1/mobile/revoke', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId }),
    });
    if (!response.ok) {
      setStatusMessage('Could not revoke this device. Open Centipede on the desktop to manage trusted devices.');
      return;
    }
    setStatusMessage(`Device "${deviceId}" access revoked.`);
    await refreshDevices();
  };

  const handleSimulateMobileIngest = async (type: IngestedContent['sourceType']) => {
    if (!pasteText.trim()) {
      setStatusMessage('Please enter content or data to ingest.');
      return;
    }
    const result = await contentIngestionPipeline.ingest(
      pasteText,
      type,
      type === 'IMAGE_UPLOAD' ? 'captured_photo.jpg' : 'mobile_note.txt',
      'mobile_companion_user'
    );
    setIngestionResult(result);
    setStatusMessage(`Content ingested and classified as ${result.trustClassification}.`);
    setPasteText('');
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-3 sm:space-y-6 sm:p-6">
      {/* Header Banner */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800/80 p-4 shadow-xl sm:flex-row sm:items-center sm:rounded-2xl sm:p-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-500/20 p-2.5 text-cyan-400 sm:rounded-xl sm:p-3">
            <Smartphone className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">Mobile Companion</h2>
            <p className="text-xs text-slate-400 mt-1">
              Connect a phone browser to this Centipede service on the same trusted network. Native Android and iOS apps are not included yet.
            </p>
          </div>
        </div>

        {isLocalAdmin && (
          <button
            onClick={() => void handleInitiatePairing()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-600 sm:w-auto sm:rounded-xl"
          >
            <QrCode className="w-4 h-4" />
            <span>Create Pairing Code</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="bg-blue-950/80 border border-blue-500/40 text-blue-200 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-blue-400 hover:text-white">Dismiss</button>
        </div>
      )}

      {/* Pairing Active Modal / Display */}
      {pairingData && (
        <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-bold text-cyan-400 text-lg">
              <Key className="w-5 h-5 text-cyan-400" />
              <span>Active Pairing Session</span>
            </div>
            <span className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-amber-500/30">
              Expires in 5 mins
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="flex flex-col items-center justify-center p-6 bg-slate-950 border border-slate-800 rounded-xl">
              <Smartphone className="w-20 h-20 text-cyan-400 mb-3" />
              <div className="text-xs text-slate-300 text-center">On your phone, open this Centipede address and enter the code:</div>
              <div className="mt-2 break-all text-center font-mono text-xs text-cyan-300">{pairingData.qrData ? JSON.parse(pairingData.qrData).centipedeEndpoint : window.location.origin}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Single-Use Pairing PIN Code</label>
                <div className="text-3xl font-mono font-bold text-cyan-300 tracking-widest bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 mt-1">
                  {pairingData.pairingCode}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
        <label className="text-sm font-semibold text-white">Join this Centipede from your phone</label>
        <p className="mt-1 text-xs text-slate-400">Create a code on the desktop, open the address shown there on your phone, then enter that code here.</p>
        <div className="mt-3 flex gap-2">
          <input type="text" inputMode="numeric" maxLength={6} value={confirmCode} onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))} placeholder="6-digit code" aria-label="Pairing code" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white focus:border-cyan-500 focus:outline-none" />
          <button onClick={() => void handleConfirmPairing()} disabled={confirmCode.length !== 6} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Connect</button>
        </div>
      </div>

      {/* Paired Device Trust List */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Trusted Paired Devices ({pairedDevices.length})</h3>
          </div>
          <button onClick={() => void refreshDevices()} aria-label="Refresh paired devices" className="text-slate-400 hover:text-white p-1">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {pairedDevices.length === 0 ? (
          <p className="text-slate-400 text-sm italic">{isLocalAdmin ? 'No companion devices paired. Create a code, then enter it on the phone.' : 'Pairing is connected. Device management is available from Centipede on the desktop.'}</p>
        ) : (
          <div className="space-y-3">
            {pairedDevices.map((dev) => (
              <div key={dev.deviceId} className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="break-words font-semibold text-white">{dev.deviceName}</span>
                    <span className="break-all text-[10px] font-mono text-slate-500">({dev.deviceId})</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Capabilities: <span className="break-words text-slate-300 font-mono">{dev.allowedCapabilities.join(', ')}</span>
                  </div>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  <span className={`inline-flex max-w-full break-all px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                    dev.trustState === 'PAIRED_ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-red-500/20 text-red-400 border-red-500/40'
                  }`}>
                    {dev.trustState}
                  </span>

                  {dev.trustState === 'PAIRED_ACTIVE' && (
                    <button
                      onClick={() => handleRevokeDevice(dev.deviceId)}
                      className="shrink-0 bg-red-950 hover:bg-red-900 text-red-300 border border-red-700/80 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Knowledge & Content Ingestion Simulator */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <UploadCloud className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">Local Ingestion Preview</h3>
        </div>

        <p className="text-xs text-slate-400">
          This preview runs in this browser only. Its sample content is classified as <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">UNTRUSTED_EXTERNAL_DATA</code>; it is not uploaded from or sent to a paired phone.
        </p>

        <textarea
          rows={3}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="Paste sample text to preview the local ingestion checks..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500"
        />

        <div className="flex space-x-3">
          <button
            onClick={() => handleSimulateMobileIngest('TEXT_PASTE')}
            className="flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600 text-white font-medium px-3.5 py-2 rounded-xl text-xs transition-colors border border-slate-600"
          >
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span>Submit Text</span>
          </button>

          <button
            onClick={() => handleSimulateMobileIngest('IMAGE_UPLOAD')}
            className="flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600 text-white font-medium px-3.5 py-2 rounded-xl text-xs transition-colors border border-slate-600"
          >
            <Camera className="w-4 h-4 text-purple-400" />
            <span>Preview Photo Ingest</span>
          </button>
        </div>

        {ingestionResult && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-white">Ingestion Result: {ingestionResult.contentId}</span>
              <span className="bg-amber-500/20 text-amber-300 font-mono text-[10px] px-2 py-0.5 rounded border border-amber-500/30">
                {ingestionResult.trustClassification}
              </span>
            </div>
            {ingestionResult.hasSecurityWarning && (
              <div className="flex items-center space-x-2 text-red-400 font-semibold bg-red-950/60 p-2 rounded border border-red-800/60">
                <AlertTriangle className="w-4 h-4" />
                <span>Security Warning Flagged: Contains potential instruction injection keywords!</span>
              </div>
            )}
            <pre className="text-slate-400 font-mono text-[10px] overflow-x-auto">
              {JSON.stringify(ingestionResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
