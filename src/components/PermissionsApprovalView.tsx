import React, { useEffect, useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { ApprovalRequest, AuditLogEntry, SecurityNode } from '../types';
import { Shield, Check, X, ShieldAlert, Key, FileText, Plus, RefreshCw } from 'lucide-react';

interface PermissionsApprovalViewProps {
  adapter: KingdomAdapter;
}

export const PermissionsApprovalView: React.FC<PermissionsApprovalViewProps> = ({ adapter }) => {
  const [nodes, setNodes] = useState<SecurityNode[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Create approval form state
  const [cap, setCap] = useState('filesystem.delete');
  const [op, setOp] = useState('delete_tmp');
  const [reason, setReason] = useState('Centipede OS security request test');

  const refreshData = async () => {
    setLoading(true);
    try {
      const [pRes, aRes, auditRes] = await Promise.all([
        adapter.get_permissions().catch(() => ({ nodes: [] })),
        adapter.list_approvals().catch(() => []),
        adapter.get_audit(20).catch(() => []),
      ]);
      setNodes(pRes.nodes || []);
      setApprovals(aRes || []);
      setAuditLogs(auditRes || []);
    } catch (err) {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await adapter.approve(id, 'centipede_admin', 'Approved in Centipede OS UI');
      setMessage(`Approval ${id} GRANTED.`);
      refreshData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Approval failed: ${err.message}`);
    }
  };

  const handleDeny = async (id: string) => {
    try {
      await adapter.deny(id, 'centipede_admin', 'Denied in Centipede OS UI');
      setMessage(`Approval ${id} DENIED.`);
      refreshData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Denial failed: ${err.message}`);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await adapter.create_approval(cap, op, reason, 'centipede_user', 'HIGH');
      setMessage(`Created new approval request: ${created.id}`);
      refreshData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Failed to create request: ${err.message}`);
    }
  };

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-amber-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">ZeroTrust Permissions & Approvals</h2>
            <p className="text-slate-400 text-sm">Kingdom capability restrictions & human approval governance</p>
          </div>
        </div>

        <button
          onClick={refreshData}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {message && (
        <div className="bg-blue-950/60 border border-blue-500/40 text-blue-300 px-4 py-3 rounded-xl text-sm">
          {message}
        </div>
      )}

      {/* Pending Approvals Panel */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Pending Security Approvals ({pendingApprovals.length})</h3>
          </div>
        </div>

        {pendingApprovals.length === 0 ? (
          <p className="text-slate-400 text-sm italic">No pending approval requests. ZeroTrust policy is fully satisfied.</p>
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((appr) => (
              <div
                key={appr.id}
                className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-amber-400 font-bold text-xs">{appr.id}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-bold">
                      Risk: {appr.risk_level || 'HIGH'}
                    </span>
                  </div>
                  <div className="text-white text-sm font-semibold">
                    Capability: <span className="font-mono text-purple-300">{appr.capability}</span> ({appr.operation})
                  </div>
                  <div className="text-slate-400 text-xs">
                    Reason: {appr.reason} • Requesting Actor: <span className="text-slate-200 font-mono">{appr.requesting_actor}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleApprove(appr.id)}
                    className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() => handleDeny(appr.id)}
                    className="flex items-center space-x-1 bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-red-600/20"
                  >
                    <X className="w-4 h-4" />
                    <span>Deny</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Request Creator Form */}
      <form onSubmit={handleCreateRequest} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Create Test Approval Request
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            placeholder="Capability (e.g. process.execute)"
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
          />
          <input
            type="text"
            value={op}
            onChange={(e) => setOp(e.target.value)}
            placeholder="Operation"
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
          />
          <button
            type="submit"
            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Request</span>
          </button>
        </div>
      </form>

      {/* Registered Security Nodes */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Key className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-white">Registered Swarm Node Capabilities ({nodes.length})</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {nodes.map((n) => (
            <div key={n.node_id} className="bg-slate-900/60 border border-slate-700/80 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">{n.name}</span>
                <span className="text-xs font-mono text-slate-400">{n.node_id}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {n.capabilities.map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-700/50 text-[10px] font-mono text-purple-300">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ZeroTrust Security Audit Log */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-3">
        <div className="flex items-center space-x-2 mb-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">Immutable Security Audit Trail</h3>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs max-h-60 overflow-y-auto space-y-2">
          {auditLogs.length === 0 ? (
            <p className="text-slate-500 italic">No audit log entries recorded yet.</p>
          ) : (
            auditLogs.map((log, idx) => (
              <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-900 text-slate-300">
                <div className="flex items-center space-x-2">
                  <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                    log.decision === 'ALLOWED' ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'
                  }`}>
                    {log.decision}
                  </span>
                  <span>Actor: <span className="text-white font-semibold">{log.actor}</span></span>
                  <span>Cap: <span className="text-purple-300">{log.capability}</span></span>
                </div>
                <span className="text-slate-500 text-[10px]">{log.reason || 'N/A'}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
