import React, { useEffect, useState } from 'react';
import { deviceTrustManager, TrustedDevice } from '../security/deviceTrust';
import { contentIngestionPipeline, IngestedContent } from '../ingest/pipeline';
import { QrCode, Smartphone, ShieldCheck, ShieldAlert, Key, UploadCloud, Camera, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export const MobileCompanionApp: React.FC = () => {
  const [pairingData, setPairingData] = useState<{ deviceId: string; pairingCode: string; qrData: string } | null>(null);
  const [confirmCode, setConfirmCode] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [pairedDevices, setPairedDevices] = useState<TrustedDevice[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [pasteText, setPasteText] = useState<string>('');
  const [ingestionResult, setIngestionResult] = useState<IngestedContent | null>(null);

  const refreshDevices = () => {
    setPairedDevices(deviceTrustManager.getPairedDevices());
  };

  useEffect(() => {
    refreshDevices();
  }, []);

  const handleInitiatePairing = () => {
    const data = deviceTrustManager.initiatePairing('Mobile Companion App', 'MOBILE_APP');
    setPairingData(data);
    setStatusMessage('Pairing initiated. Enter PIN or scan QR code on mobile device.');
  };

  const handleConfirmPairing = () => {
    const res = deviceTrustManager.confirmPairing(confirmCode || pairingData?.pairingCode || '');
    if (res.success && res.sessionToken) {
      setSessionToken(res.sessionToken);
      setStatusMessage('Device successfully paired and authenticated!');
      setPairingData(null);
      setConfirmCode('');
      refreshDevices();
    } else {
      setStatusMessage(`Pairing failed: ${res.error}`);
    }
  };

  const handleRevokeDevice = (deviceId: string) => {
    deviceTrustManager.revokeDevice(deviceId);
    setStatusMessage(`Device "${deviceId}" access revoked.`);
    refreshDevices();
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Smartphone className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Mobile Companion & Pairing Center</h2>
            <p className="text-xs text-slate-400 mt-1">
              Connect external iOS/Android devices using QR codes and 6-digit PIN authentication.
            </p>
          </div>
        </div>

        <button
          onClick={handleInitiatePairing}
          className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-cyan-600/30"
        >
          <QrCode className="w-4 h-4" />
          <span>Pair New Companion</span>
        </button>
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
              <QrCode className="w-32 h-32 text-cyan-400 mb-2" />
              <div className="text-[10px] text-slate-500 font-mono text-center">Scan with Centipede Mobile App</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Single-Use Pairing PIN Code</label>
                <div className="text-3xl font-mono font-bold text-cyan-300 tracking-widest bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 mt-1">
                  {pairingData.pairingCode}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Confirm PIN Code on Device</label>
                <div className="flex space-x-2 mt-1">
                  <input
                    type="text"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    placeholder={pairingData.pairingCode}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleConfirmPairing}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paired Device Trust List */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Trusted Paired Devices ({pairedDevices.length})</h3>
          </div>
          <button onClick={refreshDevices} className="text-slate-400 hover:text-white p-1">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {pairedDevices.length === 0 ? (
          <p className="text-slate-400 text-sm italic">No companion devices paired. Pair a phone or tablet above.</p>
        ) : (
          <div className="space-y-3">
            {pairedDevices.map((dev) => (
              <div key={dev.deviceId} className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">{dev.deviceName}</span>
                    <span className="text-[10px] font-mono text-slate-500">({dev.deviceId})</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Capabilities: <span className="text-slate-300 font-mono">{dev.allowedCapabilities.join(', ')}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                    dev.trustState === 'PAIRED_ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-red-500/20 text-red-400 border-red-500/40'
                  }`}>
                    {dev.trustState}
                  </span>

                  {dev.trustState === 'PAIRED_ACTIVE' && (
                    <button
                      onClick={() => handleRevokeDevice(dev.deviceId)}
                      className="bg-red-950 hover:bg-red-900 text-red-300 border border-red-700/80 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
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
          <h3 className="text-lg font-bold text-white">Mobile Ingestion & Knowledge Ingest</h3>
        </div>

        <p className="text-xs text-slate-400">
          Mobile uploads enter the Content Ingestion Pipeline as <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">UNTRUSTED_EXTERNAL_DATA</code> and cannot bypass ZeroTrust permission bounds.
        </p>

        <textarea
          rows={3}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="Paste or simulate content uploaded from mobile device (e.g. Invoice text, photo capture OCR, task instruction)..."
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
            <span>Simulate Photo Capture</span>
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
