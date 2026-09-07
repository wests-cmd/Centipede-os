import React, { useEffect, useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { Map, Share2, Database, Download } from 'lucide-react';

interface MapsAppProps {
  adapter: KingdomAdapter;
}

export const MapsApp: React.FC<MapsAppProps> = ({ adapter }) => {
  const [maps, setMaps] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchMaps = async () => {
    setLoading(true);
    try {
      const list = await adapter.get_maps().catch(() => ['swarm_topology', 'capability_graph']);
      setMaps(list);
      if (list.length > 0 && !selectedMap) {
        handleSelectMap(list[0]);
      }
    } catch (e) {
      setMaps(['swarm_topology', 'capability_graph']);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMap = async (name: string) => {
    setSelectedMap(name);
    try {
      const data = await adapter.get_map(name).catch(() => ({
        name,
        nodes: [{ id: 'node1', label: 'Planner' }, { id: 'node2', label: 'Coder' }],
        edges: [{ from: 'node1', to: 'node2' }],
      }));
      setMapData(data);
    } catch (e) {
      setMapData(null);
    }
  };

  useEffect(() => {
    fetchMaps();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
            <Map className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Swarm Map Visualizer</h2>
            <p className="text-xs text-slate-400">Kingdom Swarm & Capability Topology Graphs</p>
          </div>
        </div>

        <button
          onClick={fetchMaps}
          className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors border border-slate-700"
        >
          Refresh Maps
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Maps Sidebar List */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Available Maps</div>
          {maps.map((name) => (
            <button
              key={name}
              onClick={() => handleSelectMap(name)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedMap === name
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Map Graph Display */}
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white capitalize">{selectedMap || 'Select a map'}</h3>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full uppercase font-bold">
              Topology
            </span>
          </div>

          {mapData ? (
            <pre className="bg-slate-950 border border-slate-800 text-xs text-slate-300 p-4 rounded-xl overflow-x-auto font-mono">
              {JSON.stringify(mapData, null, 2)}
            </pre>
          ) : (
            <div className="text-slate-500 text-xs italic text-center py-12">No map data loaded.</div>
          )}
        </div>
      </div>
    </div>
  );
};
