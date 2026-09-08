import React, { useEffect, useState } from 'react';
import { integrationRegistry } from '../workspace/registry';
import { WorkspaceIntegration } from '../workspace/types';
import { workflowEngine } from '../workflow/engine';
import { WorkflowDefinition, WorkflowExecutionRun } from '../workflow/types';
import { Layers, Workflow, CheckCircle, ShieldAlert, Play, RefreshCw, AlertTriangle, Key, Plus } from 'lucide-react';

export const WorkspaceApp: React.FC = () => {
  const [integrations, setIntegrations] = useState<WorkspaceIntegration[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [activeRun, setActiveRun] = useState<WorkflowExecutionRun | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const refreshData = () => {
    setIntegrations(integrationRegistry.listIntegrations());
    setWorkflows(workflowEngine.listWorkflows());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleExecuteWorkflow = (workflowId: string) => {
    try {
      const run = workflowEngine.executeWorkflow(workflowId);
      setActiveRun(run);
      setStatusMessage(`Workflow run ${run.runId} initiated with status: ${run.status}`);
    } catch (err: any) {
      setStatusMessage(`Workflow execution failed: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Universal Workspace & Workflow Center</h2>
            <p className="text-xs text-slate-400 mt-1">
              Connect external productivity integrations and automate multi-step ZeroTrust workflow procedures.
            </p>
          </div>
        </div>

        <button onClick={refreshData} className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors border border-slate-600">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Workspace</span>
        </button>
      </div>

      {statusMessage && (
        <div className="bg-blue-950/80 border border-blue-500/40 text-blue-200 px-4 py-3 rounded-xl text-xs flex justify-between items-center">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-blue-400 hover:text-white">Dismiss</button>
        </div>
      )}

      {/* Active Workflows Section */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Workflow className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Automated Workflows & Routines ({workflows.length})</h3>
          </div>
        </div>

        <div className="space-y-3">
          {workflows.map((wf) => (
            <div key={wf.workflowId} className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white">{wf.name}</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                    v{wf.version}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{wf.description}</p>
                <div className="text-[10px] text-slate-500 font-mono mt-2 flex space-x-3">
                  <span>Steps: {wf.steps.length}</span>
                  <span>Max Budget Runtime: {wf.budget.maxRuntimeMs / 1000}s</span>
                  <span>Trigger: {wf.triggerType}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                  wf.trustState === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-red-500/20 text-red-400 border-red-500/40'
                }`}>
                  {wf.trustState}
                </span>

                <button
                  onClick={() => handleExecuteWorkflow(wf.workflowId)}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-600/20"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute Workflow</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Active Execution Run Inspector */}
        {activeRun && (
          <div className="bg-slate-950 border border-indigo-500/40 rounded-xl p-4 space-y-3 mt-4 text-xs font-mono">
            <div className="flex justify-between items-center text-white font-bold">
              <span>Run Execution Log: {activeRun.runId}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                activeRun.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {activeRun.status}
              </span>
            </div>
            {activeRun.error && (
              <div className="text-red-400 bg-red-950/60 p-2 rounded border border-red-800">{activeRun.error}</div>
            )}
            <div className="space-y-1 text-slate-400">
              {activeRun.history.map((h, i) => (
                <div key={i} className="flex justify-between border-b border-slate-800/60 py-1">
                  <span>Step {i + 1}: {h.stepId} ({h.capabilityId})</span>
                  <span className="text-emerald-400">{h.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Workspace Integrations Inventory */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Key className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">Registered Workspace Integrations ({integrations.length})</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((item) => (
            <div key={item.integrationId} className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">{item.name}</span>
                <span className="bg-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase px-2 py-0.5 rounded border border-emerald-500/30">
                  {item.status}
                </span>
              </div>
              <div className="text-xs text-slate-400">Provider: {item.provider} | Category: {item.category}</div>
              <div className="text-[10px] text-slate-500 font-mono">
                Capabilities: {item.capabilities.map((c) => c.capabilityId).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
