import React, { useEffect, useState } from 'react';
import { agentIdentityManager, AgentIdentity } from '../agent/identity';
import { capabilityGrantEngine, CapabilityGrant } from '../agent/grants';
import { incidentManager, SecurityIncident } from '../agent/incidentManager';
import { trustedSkillEngine } from '../skills/trustedSkillEngine';
import { Shield, ShieldAlert, Key, AlertTriangle, RefreshCw, Cpu, UserCheck } from 'lucide-react';

export const AgentControlApp: React.FC = () => {
  const [identities, setIdentities] = useState<AgentIdentity[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const refreshData = () => {
    setIncidents(incidentManager.getIncidents());
  };

  useEffect(() => {
    // Initial agent identity setup for control plane display
    const agent = agentIdentityManager.createIdentity('Centipede Primary Agent');
    capabilityGrantEngine.issueJustInTimeGrant(agent.agentId, 'filesystem.read', '/app');
    refreshData();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Agent Control Plane & Security Dashboard</h2>
            <p className="text-xs text-slate-400 mt-1">
              Monitor active agent identities, JIT capability grants, plan drift alerts, and security incidents.
            </p>
          </div>
        </div>

        <button onClick={refreshData} className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors border border-slate-600">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Dashboard</span>
        </button>
      </div>

      {statusMessage && (
        <div className="bg-blue-950/80 border border-blue-500/40 text-blue-200 px-4 py-3 rounded-xl text-xs flex justify-between items-center">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-blue-400 hover:text-white">Dismiss</button>
        </div>
      )}

      {/* Security Incident Log Section */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-white">Security Incident Audit Trail ({incidents.length})</h3>
        </div>

        {incidents.length === 0 ? (
          <p className="text-slate-400 text-sm italic">Zero security incidents recorded. System operating securely under ZeroTrust policy.</p>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc) => (
              <div key={inc.incidentId} className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{inc.eventType}</span>
                    <span className="text-[10px] font-mono text-slate-500">({inc.sourceComponent})</span>
                  </div>
                  <p className="text-slate-400 mt-1">{inc.description}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="bg-red-950 text-red-300 font-bold px-2 py-0.5 rounded border border-red-800 text-[10px]">
                    {inc.actionTaken}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
