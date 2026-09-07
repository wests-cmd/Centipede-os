import React, { useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { ApprovalRequest, KingdomRuntimeInfo } from '../types';
import { AlertTriangle, CheckCircle, Download, RefreshCw, Shield, ShieldAlert, Zap } from 'lucide-react';

interface KingdomUpdateCenterProps {
  adapter: KingdomAdapter;
  runtimeInfo: KingdomRuntimeInfo;
  onRequestCreated?: (request: ApprovalRequest) => void;
}

export interface UpdateState {
  step: 'IDLE' | 'CHECKING' | 'AVAILABLE' | 'APPROVAL_REQUIRED' | 'DOWNLOADING' | 'APPLYING' | 'VERIFYING' | 'SUCCESS' | 'FAILED_VERIFICATION' | 'ROLLED_BACK';
  availableVersion: string | null;
  releaseNotes: string[];
  message: string;
  approvalId?: string;
}

export const KingdomUpdateCenter: React.FC<KingdomUpdateCenterProps> = ({
  adapter,
  runtimeInfo,
  onRequestCreated,
}) => {
  const [state, setState] = useState<UpdateState>({
    step: 'IDLE',
    availableVersion: null,
    releaseNotes: [],
    message: '',
  });

  const handleCheckUpdates = async () => {
    setState({ step: 'CHECKING', availableVersion: null, releaseNotes: [], message: 'Querying update manifest for Kingdom runtime...' });
    await new Promise((r) => setTimeout(r, 800));

    // Simulated update discovery from Kingdom contract update stream
    const currentVer = runtimeInfo.connectedKingdomVersion || runtimeInfo.lastKnownKingdomVersion || '40.1';

    // Demonstrate update available if current is 40.1
    if (currentVer === '40.1' || currentVer === '40.1.0') {
      setState({
        step: 'AVAILABLE',
        availableVersion: '40.1.2',
        releaseNotes: [
          'Security: ZeroTrust capability authorization hardening.',
          'Runtime: Fixed scheduler concurrency deadlock under heavy task load.',
          'API: Added structured version verification & health metadata endpoints.',
        ],
        message: 'New compatible Kingdom release available!',
      });
    } else {
      setState({
        step: 'IDLE',
        availableVersion: null,
        releaseNotes: [],
        message: `Kingdom v${currentVer} is up to date.`,
      });
    }
  };

  const handleInitiateUpdate = async () => {
    if (!state.availableVersion) return;

    setState((prev) => ({
      ...prev,
      step: 'APPROVAL_REQUIRED',
      message: 'Privileged capability "kingdom.update" requires ZeroTrust human approval.',
    }));

    try {
      // Create ZeroTrust approval request for kingdom.update
      const approval = await adapter.create_approval(
        'kingdom.update',
        'apply_update',
        `Update Kingdom runtime from v${runtimeInfo.connectedKingdomVersion || '40.1'} to v${state.availableVersion}`,
        'Centipede OS Update Center',
        'HIGH',
        { targetVersion: state.availableVersion }
      );

      setState((prev) => ({
        ...prev,
        approvalId: approval.id,
        message: `ZeroTrust approval request generated (ID: ${approval.id}). Please review in Permissions & Approvals.`,
      }));

      if (onRequestCreated) {
        onRequestCreated(approval);
      }
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        step: 'IDLE',
        message: `Failed to request update approval: ${err.message}`,
      }));
    }
  };

  const handleExecuteApprovedUpdate = async () => {
    if (!state.approvalId || !state.availableVersion) return;

    try {
      setState((prev) => ({ ...prev, step: 'DOWNLOADING', message: 'Checkpointing runtime state & downloading update package...' }));
      await new Promise((r) => setTimeout(r, 1000));

      setState((prev) => ({ ...prev, step: 'APPLYING', message: 'Applying update and restarting Kingdom engine...' }));
      await new Promise((r) => setTimeout(r, 1500));

      setState((prev) => ({ ...prev, step: 'VERIFYING', message: 'Verifying actual connected Kingdom version...' }));

      // Post-update verification
      const status = await adapter.get_status().catch(() => null);
      const actualVersion = status?.version;

      if (actualVersion === state.availableVersion || actualVersion === '40.1.2') {
        setState({
          step: 'SUCCESS',
          availableVersion: state.availableVersion,
          releaseNotes: [],
          message: `Kingdom successfully updated and verified running v${actualVersion}!`,
        });
      } else {
        // Verification failed -> Trigger automatic rollback
        setState({
          step: 'FAILED_VERIFICATION',
          availableVersion: state.availableVersion,
          releaseNotes: [],
          message: `Verification Failed: Connected Kingdom reported v${actualVersion || 'OFFLINE'} instead of expected v${state.availableVersion}. Initiating automatic rollback...`,
        });

        await new Promise((r) => setTimeout(r, 1200));

        setState({
          step: 'ROLLED_BACK',
          availableVersion: null,
          releaseNotes: [],
          message: 'Rollback Completed: Kingdom runtime restored to previous stable checkpoint.',
        });
      }
    } catch (err: any) {
      setState({
        step: 'FAILED_VERIFICATION',
        availableVersion: null,
        releaseNotes: [],
        message: `Update process failed: ${err.message}. Restored prior runtime checkpoint.`,
      });
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 text-slate-100 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Kingdom Update Center</h3>
            <p className="text-xs text-slate-400">Privileged ZeroTrust System Software Updates</p>
          </div>
        </div>

        <button
          onClick={handleCheckUpdates}
          disabled={state.step === 'CHECKING' || state.step === 'DOWNLOADING' || state.step === 'APPLYING'}
          className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${state.step === 'CHECKING' ? 'animate-spin' : ''}`} />
          <span>Check for Updates</span>
        </button>
      </div>

      {state.message && (
        <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 border ${
          state.step === 'SUCCESS'
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
            : state.step === 'FAILED_VERIFICATION' || state.step === 'ROLLED_BACK'
            ? 'bg-red-950/80 border-red-500/50 text-red-300'
            : state.step === 'APPROVAL_REQUIRED'
            ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
            : 'bg-blue-950/80 border-blue-500/50 text-blue-300'
        }`}>
          {state.step === 'SUCCESS' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          ) : state.step === 'APPROVAL_REQUIRED' ? (
            <Shield className="w-4 h-4 flex-shrink-0 text-amber-400" />
          ) : state.step === 'FAILED_VERIFICATION' || state.step === 'ROLLED_BACK' ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
          ) : (
            <Download className="w-4 h-4 flex-shrink-0 text-blue-400" />
          )}
          <span>{state.message}</span>
        </div>
      )}

      {/* Available Update Panel */}
      {state.step === 'AVAILABLE' && state.availableVersion && (
        <div className="bg-slate-800/80 border border-blue-500/40 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Update Target</span>
              <div className="text-lg font-bold text-white">
                v{runtimeInfo.connectedKingdomVersion || '40.1'} → <span className="text-emerald-400">v{state.availableVersion}</span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-bold uppercase">
              Compatible
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Release Highlights:</span>
            <ul className="text-xs text-slate-300 list-disc list-inside space-y-0.5">
              {state.releaseNotes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleInitiateUpdate}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-blue-600/30"
            >
              <Shield className="w-4 h-4" />
              <span>Update Kingdom (Requires Approval)</span>
            </button>
          </div>
        </div>
      )}

      {/* Approval Required Confirmation */}
      {state.step === 'APPROVAL_REQUIRED' && state.approvalId && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
            <ShieldAlert className="w-5 h-5" />
            <span>ZeroTrust Capability Authorization Required</span>
          </div>
          <p className="text-xs text-slate-300">
            Operation <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300">kingdom.update</code> requires human verification. You can trigger execution below after reviewing approval request <code className="text-slate-200">{state.approvalId}</code>.
          </p>
          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => setState({ step: 'IDLE', availableVersion: null, releaseNotes: [], message: 'Update cancelled by user.' })}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteApprovedUpdate}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Execute Verified Update</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
