import React, { useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { AIPipelineState } from '../types';
import { Bot, CheckCircle2, ShieldAlert, ArrowRight, Play, AlertCircle, Lock } from 'lucide-react';

interface CentipedeAIProps {
  adapter: KingdomAdapter;
  onNavigateSecurity: () => void;
}

export const CentipedeAI: React.FC<CentipedeAIProps> = ({ adapter, onNavigateSecurity }) => {
  const [promptInput, setPromptInput] = useState('');
  const [isSimulatingPrivileged, setIsSimulatingPrivileged] = useState(false);
  const [pipelineState, setPipelineState] = useState<AIPipelineState>({
    prompt: '',
    status: 'idle',
  });

  const handleRunPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = promptInput.trim();
    if (!prompt) return;

    // Step 1: User Intent Analysis
    setPipelineState({
      prompt,
      status: 'analyzing',
    });

    await new Promise((r) => setTimeout(r, 600));

    // Step 2: Planning
    const planSteps = [
      `Analyze user request: "${prompt}"`,
      `Identify target capability requirement`,
      `Verify ZeroTrust security policy with Kingdom`,
      `Dispatch action to Kingdom runtime engine`,
    ];

    const capability = isSimulatingPrivileged ? 'filesystem.delete' : 'model.inference';
    const requiresApproval = isSimulatingPrivileged;

    setPipelineState({
      prompt,
      intent: `Execution of intent: ${prompt}`,
      plan: planSteps,
      capabilityRequired: capability,
      requiresApproval,
      status: 'planning',
    });

    await new Promise((r) => setTimeout(r, 600));

    // Step 3: Permission Check with Kingdom Security
    setPipelineState((prev) => ({ ...prev, status: 'checking' }));

    if (requiresApproval) {
      try {
        const approvalReq = await adapter.create_approval(
          capability,
          'delete_directory',
          `AI request requires restricted capability (${capability}): ${prompt}`,
          'centipede_ai',
          'HIGH'
        );

        setPipelineState((prev) => ({
          ...prev,
          status: 'pending_approval',
          approvalId: approvalReq.id,
          error: `Action restricted by Kingdom ZeroTrust policy! Approval request created: ${approvalReq.id}. Human approval required.`,
        }));
      } catch (err: any) {
        setPipelineState((prev) => ({
          ...prev,
          status: 'blocked',
          error: `Security Check Error: ${err.message}`,
        }));
      }
      return;
    }

    // Step 4: Dispatch Verified Action to Kingdom
    setPipelineState((prev) => ({ ...prev, status: 'executing' }));

    try {
      const task = await adapter.submit_task(prompt, { source: 'centipede_ai_pipeline' });
      await new Promise((r) => setTimeout(r, 1000));

      setPipelineState((prev) => ({
        ...prev,
        status: 'completed',
        result: {
          taskId: task.id,
          status: task.status,
          message: 'Task submitted and verified by Kingdom engine.',
        },
      }));
    } catch (err: any) {
      setPipelineState((prev) => ({
        ...prev,
        status: 'blocked',
        error: `Kingdom Execution Failed: ${err.message}`,
      }));
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-4 rounded-xl bg-purple-500/20 text-purple-400">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Centipede AI Controlled Pipeline</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Strictly Governed AI Architecture • Zero Unrestricted Shell Access
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-300">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>ZeroTrust Sandbox Active</span>
        </div>
      </div>

      {/* Pipeline Diagram */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          AI Execution Pipeline Architecture
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-center text-xs">
          {[
            { label: '1. User', color: 'bg-slate-800 text-slate-200' },
            { label: '2. Intent', color: 'bg-blue-950 text-blue-300 border-blue-800' },
            { label: '3. Plan', color: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
            { label: '4. Permission Check', color: 'bg-amber-950 text-amber-300 border-amber-800' },
            { label: '5. Kingdom Engine', color: 'bg-purple-950 text-purple-300 border-purple-800' },
            { label: '6. Verified Action', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
            { label: '7. Result', color: 'bg-slate-800 text-slate-100' },
          ].map((step, idx) => (
            <React.Fragment key={step.label}>
              <div className={`p-2.5 rounded-xl border font-semibold ${step.color}`}>
                {step.label}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Prompt Submission Form */}
      <form onSubmit={handleRunPipeline} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200">
            Enter AI Instruction / Prompt
          </label>
          <textarea
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            rows={3}
            placeholder="e.g. Analyze system telemetry and optimize active knight workloads..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isSimulatingPrivileged}
              onChange={(e) => setIsSimulatingPrivileged(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
            />
            <span>Simulate Privileged Capability Request (<span className="font-mono text-amber-400">filesystem.delete</span>)</span>
          </label>

          <button
            type="submit"
            disabled={pipelineState.status === 'analyzing' || pipelineState.status === 'planning' || pipelineState.status === 'checking'}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-purple-600/30 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>Process AI Intent</span>
          </button>
        </div>
      </form>

      {/* Pipeline State Display */}
      {pipelineState.status !== 'idle' && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Pipeline Execution Tracker</span>
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              pipelineState.status === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : pipelineState.status === 'pending_approval'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                : pipelineState.status === 'blocked'
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse'
            }`}>
              Status: {pipelineState.status}
            </span>
          </div>

          {pipelineState.plan && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400">Generated Execution Plan:</div>
              <ul className="space-y-1 pl-4 list-disc text-xs text-slate-300">
                {pipelineState.plan.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {pipelineState.capabilityRequired && (
            <div className="p-3 bg-slate-900 rounded-xl text-xs flex items-center justify-between">
              <span className="text-slate-400">Required Capability:</span>
              <span className="font-mono text-purple-300 font-bold">{pipelineState.capabilityRequired}</span>
            </div>
          )}

          {pipelineState.status === 'pending_approval' && (
            <div className="p-4 bg-amber-950/60 border border-amber-500/50 rounded-xl space-y-3">
              <div className="flex items-start space-x-3 text-amber-300 text-xs">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-400" />
                <div>
                  <div className="font-bold text-sm text-white">Action Blocked by Kingdom Security</div>
                  <div className="mt-1">{pipelineState.error}</div>
                </div>
              </div>

              <button
                onClick={onNavigateSecurity}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center space-x-1"
              >
                <span>Go to Permissions & Approvals View</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {pipelineState.status === 'completed' && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Action Verified and Executed</span>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg text-slate-300 font-mono text-xs">
                {JSON.stringify(pipelineState.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
