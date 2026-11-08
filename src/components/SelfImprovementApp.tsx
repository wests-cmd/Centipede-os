import React, { useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { GitBranch, Wrench, Shield, CheckCircle, Play, FileCode, Check } from 'lucide-react';

export interface AutonomousEngineeringMilestone {
  id: string;
  timestamp: string;
  objective: string;
  plannedSteps: string[];
  activeAgent: string;
  selectedModel: string;
  assignedKnight: string;
  filesChanged: string[];
  testsRunning: string[];
  problemsDetected: string[];
  repairAttempts: string[];
  verificationResults: 'PASSED' | 'FAILED' | 'RETRYING';
  deploymentState: 'STAGED' | 'TESTED' | 'DEPLOYED' | 'ROLLED_BACK';
  rollbackAvailability: boolean;
  retainedLessons: string;
}

interface SelfImprovementAppProps {
  adapter: KingdomAdapter;
}

export const SelfImprovementApp: React.FC<SelfImprovementAppProps> = ({ adapter }) => {
  const [milestones, setMilestones] = useState<AutonomousEngineeringMilestone[]>([
    {
      id: 'm_auto_101',
      timestamp: '10 mins ago',
      objective: 'Implement high-reliability ZeroTrust capability negotiation and rate limit backoff',
      plannedSteps: [
        'Analyze capability matrix in api/kingdomAdapter.ts',
        'Implement exponential backoff in heartbeat and reconnect loops',
        'Run integration test suite tests/unit/adapter.test.ts',
        'Verify zero regression on connection drop scenarios',
      ],
      activeAgent: 'Segmentor Engineering Lead',
      selectedModel: 'ollama/qwen2.5-coder:7b',
      assignedKnight: 'Knight-Worker-02 (Laptop 2)',
      filesChanged: ['src/api/kingdomAdapter.ts', 'tests/unit/adapter.test.ts'],
      testsRunning: ['tests/unit/adapter.test.ts', 'tests/reality/telemetry_truth.test.ts'],
      problemsDetected: ['Rate limit 429 encountered during high-frequency heartbeat probe'],
      repairAttempts: ['Added dynamic jitter and capped retry window to 15000ms'],
      verificationResults: 'PASSED',
      deploymentState: 'DEPLOYED',
      rollbackAvailability: true,
      retainedLessons: 'Do not flood upstream API without jitter on burst reconnect cycles.',
    },
    {
      id: 'm_auto_100',
      timestamp: '1 hour ago',
      objective: 'Secure device trust session validation and reject unverified device tokens',
      plannedSteps: [
        'Inspect sessionTokenIndex validation logic in deviceTrust.ts',
        'Require PAIRED_ACTIVE state before validating API tokens',
        'Add adversarial token bypass test cases',
      ],
      activeAgent: 'Sentinel Security Agent',
      selectedModel: 'external/claude-3-5-sonnet',
      assignedKnight: 'Knight-Master-01',
      filesChanged: ['src/security/deviceTrust.ts', 'tests/unit/step8.test.ts'],
      testsRunning: ['tests/unit/step8.test.ts'],
      problemsDetected: ['Potential auth bypass if pending token passed empty string'],
      repairAttempts: ['Enforce strict string check and PAIRED_ACTIVE requirement'],
      verificationResults: 'PASSED',
      deploymentState: 'DEPLOYED',
      rollbackAvailability: true,
      retainedLessons: 'Always validate device.trustState === PAIRED_ACTIVE on incoming session tokens.',
    },
  ]);

  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('m_auto_101');
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  const selectedMilestone = milestones.find((m) => m.id === selectedMilestoneId) || milestones[0];

  const handleTriggerSelfAudit = async () => {
    setIsTriggering(true);
    setTriggerStatus('Initiating Kingdom autonomous self-audit loop on Laptop 2...');
    try {
      const task = await adapter.submit_task(
        'Execute autonomous self-audit, verify test suites, and record retained lessons.',
        {
          workflow: 'self_improvement',
          targetKnight: 'Laptop 2',
        }
      );
      setTriggerStatus(`Autonomous engineering cycle launched! Task ID: ${task.id} (Status: ${task.status})`);
    } catch (err: any) {
      setTriggerStatus(`Failed to trigger self-audit: ${err.message || 'Offline'}`);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100 p-4 space-y-4 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-cyan-400" /> Kingdom Autonomous Self-Improvement Timeline
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time readable timeline of Kingdom's autonomous engineering cycles, problem repairs, test verifications, and retained lessons.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTriggerSelfAudit}
          disabled={isTriggering}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 transition shadow"
        >
          <Play className={`h-3.5 w-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
          Trigger Autonomous Audit Cycle
        </button>
      </div>

      {triggerStatus && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 text-xs text-cyan-300 font-mono">
          {triggerStatus}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Autonomous Engineering Cycles
          </h3>
          {milestones.map((milestone) => {
            const isSelected = selectedMilestoneId === milestone.id;
            return (
              <div
                key={milestone.id}
                onClick={() => setSelectedMilestoneId(milestone.id)}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  isSelected
                    ? 'border-cyan-500 bg-slate-900 shadow-md shadow-cyan-950/40'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span className="font-mono text-cyan-300">{milestone.id}</span>
                  <span>{milestone.timestamp}</span>
                </div>
                <h4 className="text-xs font-semibold text-white mb-2 leading-snug">
                  {milestone.objective}
                </h4>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Agent: <span className="text-slate-200">{milestone.activeAgent.split(' ')[0]}</span></span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold ${
                      milestone.verificationResults === 'PASSED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {milestone.verificationResults}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-mono text-cyan-400 font-semibold">{selectedMilestone.id}</span>
              <h3 className="text-sm font-semibold text-white mt-0.5">{selectedMilestone.objective}</h3>
            </div>
            <div className="flex gap-2">
              <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-300">
                {selectedMilestone.selectedModel}
              </span>
              <span className="bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-lg text-xs font-mono text-emerald-300">
                {selectedMilestone.deploymentState}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-cyan-400" /> Planned Steps:
            </h4>
            <div className="space-y-1.5">
              {selectedMilestone.plannedSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/50 p-2 rounded-lg border border-slate-850">
                  <span className="font-mono text-cyan-400 font-bold">{idx + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-amber-400" /> Files Modified:
              </h4>
              <div className="space-y-1">
                {selectedMilestone.filesChanged.map((f) => (
                  <div key={f} className="text-[11px] font-mono text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    {f}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Tests Running:
              </h4>
              <div className="space-y-1">
                {selectedMilestone.testsRunning.map((t) => (
                  <div key={t} className="text-[11px] font-mono text-emerald-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-cyan-400" /> Automated Problem Remediation:
            </h4>
            <div className="text-xs text-rose-300 bg-rose-950/30 border border-rose-900/50 p-2 rounded">
              <strong>Problem:</strong> {selectedMilestone.problemsDetected.join(', ')}
            </div>
            <div className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-900/50 p-2 rounded">
              <strong>Repair:</strong> {selectedMilestone.repairAttempts.join(', ')}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
            <h4 className="text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Retained Engineering Lesson:
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "{selectedMilestone.retainedLessons}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SelfImprovementApp;
