import React, { useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { searchAggregator } from '../search';
import { SearchContext, SearchResultItem } from '../search/types';
import { Search, Grid, FileText, Database, MapPin, Activity, AlertTriangle, ShieldCheck, ExternalLink } from 'lucide-react';

interface UniversalSearchProps {
  adapter: KingdomAdapter;
  onNavigateApp: (appId: string) => void;
}

export const UniversalSearch: React.FC<UniversalSearchProps> = ({ adapter, onNavigateApp }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchCtx, setSearchCtx] = useState<SearchContext | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const ctx = await searchAggregator.search(query);
      setSearchCtx(ctx);
    } catch (err) {
      // Handled
    } finally {
      setIsSearching(false);
    }
  };

  const renderIconForProvider = (provider: string) => {
    switch (provider) {
      case 'APPLICATION':
        return <Grid className="w-4 h-4 text-blue-400" />;
      case 'KINGDOM':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'MEMORY':
        return <Database className="w-4 h-4 text-purple-400" />;
      case 'AI_MAP':
        return <MapPin className="w-4 h-4 text-amber-400" />;
      case 'FILE':
        return <FileText className="w-4 h-4 text-cyan-400" />;
      case 'WEB':
        return <ExternalLink className="w-4 h-4 text-orange-400" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Search Bar Header */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <Search className="w-6 h-6 text-slate-400 absolute left-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across system applications, tasks, memory entries, maps, files, and web..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-28 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-base"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className="flex items-center space-x-2 mt-3 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Search-to-Action Separation Active: Search retrieves data strictly for information. Actions require explicit prompt submission.</span>
        </div>
      </div>

      {/* Results Workspace */}
      {searchCtx && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Found <strong className="text-white">{searchCtx.results.length}</strong> results across sources: {' '}
              {searchCtx.accessedProtectedSources.join(', ')}
            </span>
            {searchCtx.hasConflicts && (
              <span className="text-amber-400 font-semibold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Conflicting source information detected</span>
              </span>
            )}
          </div>

          {searchCtx.results.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-8 text-center text-slate-400 text-sm italic">
              No matching search results found for "{query}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchCtx.results.map((item) => (
                <div
                  key={item.resultId}
                  className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 transition-colors ${
                    item.isUntrustedData
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-slate-800/60 border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {renderIconForProvider(item.provider)}
                        <span className="font-semibold text-white text-sm">{item.title}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 uppercase">
                        {item.provider}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">{item.summary}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 font-mono">
                    <span className="truncate max-w-[200px]" title={item.source}>Source: {item.source}</span>
                    {item.isUntrustedData ? (
                      <span className="text-amber-400 font-bold">Untrusted Data (No Instruction Authority)</span>
                    ) : item.metadata?.appId ? (
                      <button
                        onClick={() => onNavigateApp(item.metadata.appId)}
                        className="text-blue-400 font-bold hover:underline"
                      >
                        Open App →
                      </button>
                    ) : (
                      <span>Confidence: {(item.confidence * 100).toFixed(0)}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
