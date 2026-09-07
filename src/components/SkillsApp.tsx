import React, { useState } from 'react';
import { skillManager } from '../learning/skillManager';
import { SkillDefinition } from '../learning/types';
import { Cpu, ShieldCheck, AlertOctagon, RotateCcw, GitBranch, Play } from 'lucide-react';

export const SkillsApp: React.FC = () => {
  const [baseSkill, setBaseSkill] = useState<SkillDefinition | undefined>(skillManager.getActiveSkill('web-scraper'));
  const [candidate, setCandidate] = useState<SkillDefinition | null>(null);
  const [message, setMessage] = useState<string>('');

  const handleProposeCandidate = () => {
    try {
      const proposed = skillManager.proposeCandidateVersion(
        'web-scraper',
        ['fetch_page', 'extract_text', 'parse_json', 'write_disk'],
        ['http.get', 'filesystem.write']
      );
      setCandidate(proposed);
      setMessage(`Candidate skill version v${proposed.version} created for review.`);
    } catch (err: any) {
      setMessage(`Failed: ${err.message}`);
    }
  };

  const handlePromoteCandidate = () => {
    if (!candidate) return;
    try {
      const res = skillManager.promoteCandidate(candidate.skillId, candidate.version);
      setBaseSkill(res.skill);
      setCandidate(null);
      setMessage(`Promoted skill v${res.skill.version} to ACTIVE! Capability expansion: ${res.diff.isExpansion ? 'YES' : 'NO'}`);
    } catch (err: any) {
      setMessage(`Promotion Failed: ${err.message}`);
    }
  };

  const handleRollback = () => {
    try {
      const restored = skillManager.rollbackSkill('web-scraper');
      setBaseSkill(restored);
      setMessage(`Skill rolled back to restored ACTIVE version v${restored.version}.`);
    } catch (err: any) {
      setMessage(`Rollback Failed: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Skill Version & Capability Engine</h2>
            <p className="text-xs text-slate-400">Immutable Skill Definition, Capability Expansion Diff & Rollback Manager</p>
          </div>
        </div>

        <button
          onClick={handleRollback}
          className="flex items-center space-x-2 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Rollback Skill</span>
        </button>
      </div>

      {message && (
        <div className="bg-blue-950/60 border border-blue-500/40 text-blue-300 px-4 py-3 rounded-xl text-xs">
          {message}
        </div>
      )}

      {/* Active Skill Definition */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Active Verified Skill</span>
            <h3 className="text-lg font-bold text-white">{baseSkill?.name || 'Web Scraper Engine'}</h3>
          </div>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-bold font-mono">
            v{baseSkill?.version || '1.0.0'} • ACTIVE
          </span>
        </div>

        <p className="text-xs text-slate-300">{baseSkill?.description || 'Scrapes web pages safely'}</p>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Workflow Sequence</span>
            <div className="text-xs text-slate-300 font-mono mt-1">
              {(baseSkill?.workflow || ['fetch', 'parse']).join(' → ')}
            </div>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Required Capabilities</span>
            <div className="text-xs text-cyan-400 font-mono mt-1">
              {(baseSkill?.requiredCapabilities || ['http.get']).join(', ')}
            </div>
          </div>
        </div>
      </div>

      {/* Propose / Review Candidate Skill Version */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Propose Capability Expansion Version</h3>
          </div>

          {!candidate ? (
            <button
              onClick={handleProposeCandidate}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-amber-600/30"
            >
              Propose Candidate v1.1.0
            </button>
          ) : (
            <button
              onClick={handlePromoteCandidate}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-600/30"
            >
              Promote to ACTIVE
            </button>
          )}
        </div>

        {candidate && (
          <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 space-y-2 text-xs">
            <div className="font-bold text-amber-300">Candidate Skill v{candidate.version}</div>
            <div className="text-slate-300">Requested Capabilities: {candidate.requiredCapabilities.join(', ')}</div>
            <div className="text-slate-400">Status: {candidate.status}</div>
          </div>
        )}
      </div>
    </div>
  );
};
