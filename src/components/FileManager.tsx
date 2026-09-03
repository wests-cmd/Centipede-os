import React, { useState } from 'react';
import { FileText, Folder, HardDrive, ChevronRight, FileCode, File } from 'lucide-react';

export const FileManager: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>('KINGDOM_INTEGRATION.md');

  const files = [
    { name: 'KINGDOM_INTEGRATION.md', type: 'doc', size: '4.2 KB', desc: 'Kingdom integration specification' },
    { name: 'configs/runtime.yaml', type: 'config', size: '1.1 KB', desc: 'Runtime configuration file' },
    { name: 'logs/audit.log', type: 'log', size: '12.4 KB', desc: 'ZeroTrust Security audit log' },
    { name: 'memory/snapshots/latest.json', type: 'data', size: '28.1 KB', desc: 'Memory graph snapshot' },
    { name: 'maps/intelligence_map.json', type: 'map', size: '15.0 KB', desc: 'Swarm intelligence graph' },
  ];

  const fileContents: Record<string, string> = {
    'KINGDOM_INTEGRATION.md': '# Kingdom Integration Guide\n\nCentipede OS connects to Kingdom via REST API & WebSockets.\nContract Version: v40.1\nSecurity: ZeroTrust Enabled.',
    'configs/runtime.yaml': 'mode: adaptive\nscheduler: enabled\nsecurity: zero_trust\nauto_connect: true',
    'logs/audit.log': '[2026-03-06T17:00:00Z] decision=ALLOWED actor=admin cap=model.inference\n[2026-03-06T17:01:00Z] decision=REQUIRES_APPROVAL actor=centipede cap=filesystem.delete',
    'memory/snapshots/latest.json': '{\n  "version": "1.0",\n  "entries_count": 42,\n  "graph": { "nodes": [], "edges": [] }\n}',
    'maps/intelligence_map.json': '{\n  "name": "primary_swarm",\n  "nodes": ["planner", "coder", "researcher", "security"]\n}',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-2">
        <Folder className="w-7 h-7 text-cyan-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">File Manager Foundation</h2>
          <p className="text-slate-400 text-sm">System filesystem explorer and virtual storage inspector</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Directory Navigator */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Root System Drive</span>
          </div>

          {files.map((file) => (
            <button
              key={file.name}
              onClick={() => setSelectedFile(file.name)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                selectedFile === file.name
                  ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2 min-w-0">
                <FileCode className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="text-sm font-medium truncate">{file.name}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* File Viewer Panel */}
        <div className="md:col-span-2 bg-slate-800/60 border border-slate-700 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <span className="font-semibold text-white">{selectedFile}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {files.find((f) => f.name === selectedFile)?.size || '0 KB'}
              </span>
            </div>

            <pre className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono p-4 rounded-xl overflow-x-auto min-h-[220px] whitespace-pre-wrap">
              {selectedFile ? fileContents[selectedFile] || 'Empty file content' : 'Select a file to inspect'}
            </pre>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 text-xs text-slate-400 flex justify-between">
            <span>Status: Read Only</span>
            <span>Security Check: Verified Safe</span>
          </div>
        </div>
      </div>
    </div>
  );
};
