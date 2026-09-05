import React, { useEffect, useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { centipedeAIPipeline, conversationManager } from '../ai';
import { Message, UserInput } from '../ai/types';
import { Bot, CheckCircle2, ShieldAlert, ArrowRight, Play, AlertCircle, Lock, Cpu, Sparkles } from 'lucide-react';

interface CentipedeAIProps {
  adapter: KingdomAdapter;
  onNavigateSecurity: () => void;
}

export const CentipedeAI: React.FC<CentipedeAIProps> = ({ adapter, onNavigateSecurity }) => {
  const [promptInput, setPromptInput] = useState('');
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const [messagesHistory, setMessagesHistory] = useState<Message[]>([]);

  useEffect(() => {
    const unsub = centipedeAIPipeline.subscribePipeline((msg) => {
      setActiveMessage(msg);
      setMessagesHistory([...conversationManager.getActiveConversation().messages]);
    });
    return () => unsub();
  }, []);

  const handleRunPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = promptInput.trim();
    if (!prompt) return;

    setPromptInput('');

    const input: UserInput = {
      id: `input_${Date.now()}`,
      text: prompt,
      timestamp: Date.now(),
      conversationId: conversationManager.getActiveConversation().id,
    };

    await centipedeAIPipeline.process(input);
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
            <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
              <span>Centipede AI Core Foundation</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Governed Pipeline Architecture • Zero Unrestricted Shell Access
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-slate-300">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>ZeroTrust Execution Gate Active</span>
        </div>
      </div>

      {/* Pipeline Diagram */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Governed AI Pipeline Execution Lifecycle
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-center text-xs">
          {[
            { label: '1. User Input', color: 'bg-slate-800 text-slate-200' },
            { label: '2. Intent', color: 'bg-blue-950 text-blue-300 border-blue-800' },
            { label: '3. Context', color: 'bg-cyan-950 text-cyan-300 border-cyan-800' },
            { label: '4. Planner', color: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
            { label: '5. Permission Gate', color: 'bg-amber-950 text-amber-300 border-amber-800' },
            { label: '6. Kingdom Adapter', color: 'bg-purple-950 text-purple-300 border-purple-800' },
            { label: '7. Result', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
          ].map((step) => (
            <div key={step.label} className={`p-2.5 rounded-xl border font-semibold ${step.color}`}>
              {step.label}
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Submission Form */}
      <form onSubmit={handleRunPipeline} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200">
            Submit Prompt Instruction to Centipede AI
          </label>
          <textarea
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            rows={2}
            placeholder="e.g. Get Kingdom runtime status, or submit task to run swarm..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!promptInput.trim() || (activeMessage !== null && activeMessage.status !== 'COMPATIBLE' && activeMessage.status !== 'COMPATIBLE' && activeMessage.status !== 'COMPLETED' && activeMessage.status !== 'FAILED' && activeMessage.status !== 'APPROVAL_REQUIRED' && activeMessage.status !== 'DENIED')}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-purple-600/30 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>Process Prompt Pipeline</span>
          </button>
        </div>
      </form>

      {/* Active Pipeline Execution Visualizer */}
      {activeMessage && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              <span>Pipeline Execution Tracker</span>
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              activeMessage.status === 'COMPLETED'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : activeMessage.status === 'APPROVAL_REQUIRED'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                : activeMessage.status === 'DENIED'
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse'
            }`}>
              Pipeline Phase: {activeMessage.status}
            </span>
          </div>

          {activeMessage.intent && (
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1 text-xs">
              <div className="text-slate-400 font-semibold">Parsed Intent & Confidence:</div>
              <div className="flex items-center space-x-3 text-white">
                <span className="font-mono text-purple-300 font-bold">{activeMessage.intent.type}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">Confidence: {(activeMessage.intent.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="text-slate-400">{activeMessage.intent.explanation}</div>
            </div>
          )}

          {activeMessage.plan && (
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="text-slate-400 font-semibold">Generated Plan Steps & Required Capabilities:</div>
              <ul className="space-y-1 pl-4 list-disc text-slate-300">
                {activeMessage.plan.steps.map((s) => (
                  <li key={s.stepNumber}>{s.description}</li>
                ))}
              </ul>
            </div>
          )}

          {activeMessage.status === 'APPROVAL_REQUIRED' && (
            <div className="p-4 bg-amber-950/60 border border-amber-500/50 rounded-xl space-y-3">
              <div className="flex items-start space-x-3 text-amber-300 text-xs">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-400" />
                <div>
                  <div className="font-bold text-sm text-white">Action Blocked by Kingdom Security</div>
                  <div className="mt-1">{activeMessage.text}</div>
                </div>
              </div>

              <button
                onClick={onNavigateSecurity}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors flex items-center space-x-1 shadow-md shadow-amber-600/20"
              >
                <span>Open Permissions & Approvals View</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeMessage.status === 'COMPLETED' && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Result Formatted for User</span>
              </div>
              <div className="text-white text-sm font-medium">{activeMessage.text}</div>
              {activeMessage.actionResult?.data && (
                <pre className="bg-slate-950 p-3 rounded-lg text-slate-300 font-mono text-xs overflow-x-auto">
                  {JSON.stringify(activeMessage.actionResult.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
