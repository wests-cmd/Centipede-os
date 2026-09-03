import React, { useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { MemoryEntry, TaskItem } from '../types';
import { Activity, Database, MapPin, Search, Grid, FileText } from 'lucide-react';

interface UniversalSearchProps {
  adapter: KingdomAdapter;
  onNavigateApp: (appId: string) => void;
}

export const UniversalSearch: React.FC<UniversalSearchProps> = ({ adapter, onNavigateApp }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [maps, setMaps] = useState<string[]>([]);

  const systemApps = [
    { id: 'ai', name: 'Centipede AI', desc: 'Controlled intent & action pipeline' },
    { id: 'status', name: 'Kingdom Status', desc: 'Runtime status & knights' },
    { id: 'tasks', name: 'Activity & Tasks', desc: 'Task execution & list' },
    { id: 'security', name: 'Permissions & Approvals', desc: 'ZeroTrust approvals & security' },
    { id: 'files', name: 'File Manager', desc: 'System file explorer' },
    { id: 'terminal', name: 'Terminal', desc: 'Centipede OS interactive CLI' },
    { id: 'settings', name: 'Settings', desc: 'API URL & options' },
  ];

  const matchedApps = query.trim()
    ? systemApps.filter((app) => app.name.toLowerCase().includes(query.toLowerCase()) || app.desc.toLowerCase().includes(query.toLowerCase()))
    : systemApps;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const [tRes, mRes, mapsRes] = await Promise.all([
        adapter.list_tasks().catch(() => []),
        adapter.search_memory(query).catch(() => []),
        adapter.get_maps().catch(() => []),
      ]);

      const filteredTasks = tRes.filter(
        (t) => t.prompt.toLowerCase().includes(query.toLowerCase()) || t.id.toLowerCase().includes(query.toLowerCase())
      );
      setTasks(filteredTasks);
      setMemory(mRes);
      setMaps(mapsRes.filter((m) => m.toLowerCase().includes(query.toLowerCase())));
    } catch (err) {
      // Handled
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <Search className="w-6 h-6 text-slate-400 absolute left-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, memory entries, AI maps, system apps, files..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-28 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-base"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        {/* System Apps */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center space-x-2 mb-3 text-blue-400 font-semibold text-sm">
            <Grid className="w-4 h-4" />
            <span>Applications ({matchedApps.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {matchedApps.map((app) => (
              <button
                key={app.id}
                onClick={() => onNavigateApp(app.id)}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700/80 hover:border-blue-500 text-left transition-colors"
              >
                <div>
                  <div className="text-white font-medium text-sm">{app.name}</div>
                  <div className="text-slate-400 text-xs">{app.desc}</div>
                </div>
                <span className="text-xs text-blue-400 font-medium">Open →</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tasks */}
        {tasks.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center space-x-2 mb-3 text-emerald-400 font-semibold text-sm">
              <Activity className="w-4 h-4" />
              <span>Matching Tasks ({tasks.length})</span>
            </div>
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="p-3 bg-slate-900/60 border border-slate-700/80 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-white text-sm font-medium">{t.prompt}</div>
                    <div className="text-slate-500 text-xs font-mono">ID: {t.id}</div>
                  </div>
                  <span className="px-2 py-1 rounded bg-slate-800 text-xs font-mono text-emerald-300 border border-slate-700">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memory Search Results */}
        {memory.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center space-x-2 mb-3 text-purple-400 font-semibold text-sm">
              <Database className="w-4 h-4" />
              <span>Memory Entries ({memory.length})</span>
            </div>
            <div className="space-y-2">
              {memory.map((m) => (
                <div key={m.id || m.content} className="p-3 bg-slate-900/60 border border-slate-700/80 rounded-xl">
                  <div className="text-slate-200 text-sm">{m.content}</div>
                  <div className="text-slate-500 text-xs mt-1 font-mono">Weight: {m.weight || 1.0}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intelligence Maps */}
        {maps.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center space-x-2 mb-3 text-amber-400 font-semibold text-sm">
              <MapPin className="w-4 h-4" />
              <span>Intelligence Maps ({maps.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {maps.map((m) => (
                <span key={m} className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-mono">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
