import React from 'react';
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
      color: 'bg-indigo-600',
      description: 'Search Tasks, Memory & Intelligence',
    },
    {
      id: 'files',
      name: 'File Manager',
      icon: Folder,
      color: 'bg-cyan-600',
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <Grid className="w-8 h-8 text-blue-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Application Launcher</h2>
          <p className="text-slate-400 text-sm">Select a system application or utility</p>
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
              className={`relative flex flex-col items-start p-4 rounded-xl border transition-all text-left group ${
                isActive
                  ? 'bg-blue-900/30 border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800/60 border-slate-700 hover:bg-slate-700/60 hover:border-slate-500'
              }`}
            >
              {app.badge && (
                <span className="absolute top-3 right-3 bg-red-500 text-white font-bold text-xs px-2 py-0.5 rounded-full animate-pulse">
                  {app.badge}
                </span>
              )}
              <div className={`p-3 rounded-lg ${app.color} text-white mb-3 shadow-md group-hover:scale-105 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-white text-base mb-1">{app.name}</h3>
              <p className="text-xs text-slate-400 leading-snug">{app.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
