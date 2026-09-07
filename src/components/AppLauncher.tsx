import React from 'react';
import { CentipedeOuroboros } from './CentipedeOuroboros';
import {
  Activity,
  Bot,
  Folder,
  Grid,
  Search,
  Shield,
  Sliders,
  Terminal,
  Server,
  Database,
  Brain,
  Map,
  Cpu,
} from 'lucide-react';

interface AppLauncherProps {
  onOpenApp: (appId: string) => void;
  activeAppId: string;
  pendingApprovalsCount: number;
}

export const AppLauncher: React.FC<AppLauncherProps> = ({
  onOpenApp,
  activeAppId,
  pendingApprovalsCount,
}) => {
  const apps = [
    {
      id: 'ai',
      name: 'Centipede AI',
      icon: Bot,
      color: 'bg-purple-600',
      description: 'Controlled Intent & Action Pipeline',
    },
    {
      id: 'status',
      name: 'Kingdom Status',
      icon: Server,
      color: 'bg-blue-600',
      description: 'Kingdom Engine Health & Control',
    },
    {
      id: 'memory',
      name: 'Memory Explorer',
      icon: Brain,
      color: 'bg-cyan-600',
      description: 'Knowledge Fact & Trust Hierarchy',
    },
    {
      id: 'skills',
      name: 'Skill Manager',
      icon: Cpu,
      color: 'bg-indigo-600',
      description: 'Versioned Skills & Capability Diffs',
    },
    {
      id: 'maps',
      name: 'AI Swarm Maps',
      icon: Map,
      color: 'bg-purple-700',
      description: 'Kingdom Topology & Graph Visualizer',
    },
    {
      id: 'tasks',
      name: 'Activity & Tasks',
      icon: Activity,
      color: 'bg-emerald-600',
      description: 'Task Execution & Task List',
    },
    {
      id: 'security',
      name: 'Permissions & Approvals',
      icon: Shield,
      color: 'bg-amber-600',
      description: 'ZeroTrust Security & Approvals',
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    {
      id: 'search',
      name: 'Universal Search',
      icon: Search,
      color: 'bg-blue-700',
      description: 'Search Tasks, Memory & Intelligence',
    },
    {
      id: 'files',
      name: 'File Manager',
      icon: Folder,
      color: 'bg-teal-600',
      description: 'Filesystem Foundation Explorer',
    },
    {
      id: 'terminal',
      name: 'Terminal Entry Point',
      icon: Terminal,
      color: 'bg-gray-700',
      description: 'Centipede OS Interactive CLI',
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Sliders,
      color: 'bg-slate-600',
      description: 'API Endpoint & Theme Config',
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Centipede Ouroboros Core Identity Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
        <CentipedeOuroboros size={220} />
      </div>

      <div className="flex items-center space-x-3">
        <Grid className="w-6 h-6 text-cyan-400" />
        <div>
          <h2 className="text-xl font-bold text-white">System Applications & Utilities</h2>
          <p className="text-slate-400 text-xs">Launch system environment views and tools</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {apps.map((app) => {
          const Icon = app.icon;
          const isActive = activeAppId === app.id;
          return (
            <button
              key={app.id}
              onClick={() => onOpenApp(app.id)}
              className={`relative flex flex-col items-start p-4 rounded-2xl border transition-all text-left group ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/80 hover:border-slate-600'
              }`}
            >
              {app.badge && (
                <span className="absolute top-3 right-3 bg-red-500 text-white font-bold text-xs px-2 py-0.5 rounded-full animate-pulse">
                  {app.badge}
                </span>
              )}
              <div className={`p-3 rounded-xl ${app.color} text-white mb-3 shadow-md group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-sm mb-1">{app.name}</h3>
              <p className="text-xs text-slate-400 leading-snug">{app.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
