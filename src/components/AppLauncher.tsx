import React from 'react';
import {
  Activity,
  AppWindow,
  AtSign,
  Bot,
  FileText,
  Folder,
  Grid,
  Headphones,
  Search,
  Server,
  Shield,
  Sliders,
  Smartphone,
  Terminal,
  Brain,
  Map,
  Cpu,
  Video,
} from 'lucide-react';

interface AppLauncherProps {
  onOpenApp: (appId: string) => void;
  activeAppId: string;
  pendingApprovalsCount: number;
}

const everydayApps = [
  {
    name: 'Web browser',
    detail: 'Chromium is already open',
    note: 'Use the browser you are in now to visit websites.',
    icon: AppWindow,
    tint: 'text-sky-300 bg-sky-400/10 border-sky-300/15',
  },
  {
    name: 'Documents & spreadsheets',
    detail: 'LibreOffice Writer and Calc',
    note: 'Create letters, homework, budgets, and spreadsheets.',
    icon: FileText,
    tint: 'text-blue-300 bg-blue-400/10 border-blue-300/15',
  },
  {
    name: 'Email & calendar',
    detail: 'Thunderbird',
    note: 'Add your existing email account to get started.',
    icon: AtSign,
    tint: 'text-orange-200 bg-orange-300/10 border-orange-200/15',
  },
  {
    name: 'Music & video',
    detail: 'VLC media player',
    note: 'Play common audio and video files.',
    icon: Video,
    tint: 'text-rose-200 bg-rose-300/10 border-rose-200/15',
  },
];

export const AppLauncher: React.FC<AppLauncherProps> = ({
  onOpenApp,
  activeAppId,
  pendingApprovalsCount,
}) => {
  const apps = [
    { id: 'files', name: 'Example files', icon: Folder, description: 'Browse the sample files included with this demo.' },
    { id: 'search', name: 'Search', icon: Search, description: 'Look across Centipede tasks and saved information.' },
    { id: 'tasks', name: 'Tasks', icon: Activity, description: 'See work sent to the connected Kingdom service.' },
    { id: 'workspace', name: 'Workspace', icon: Grid, description: 'View connected services and saved routines.' },
    { id: 'ai', name: 'Centipede assistant', icon: Bot, description: 'Ask for help. Actions may need your approval.' },
    { id: 'agent_control', name: 'Agent controls', icon: Shield, description: 'Review connected agents and their access.' },
    { id: 'mobile', name: 'Phone pairing demo', icon: Smartphone, description: 'Local demo only; it does not connect to a real phone.' },
    { id: 'security', name: 'Security & approvals', icon: Shield, description: 'Review requests before protected actions run.', badge: pendingApprovalsCount || undefined },
    { id: 'status', name: 'Kingdom connection', icon: Server, description: 'Check whether the optional Kingdom service is online.' },
    { id: 'memory', name: 'Saved information', icon: Brain, description: 'Review information stored by Centipede.' },
    { id: 'skills', name: 'Capabilities', icon: Cpu, description: 'See which abilities are available to Centipede.' },
    { id: 'maps', name: 'Network map', icon: Map, description: 'View connected Kingdom nodes.' },
    { id: 'terminal', name: 'Command line', icon: Terminal, description: 'Advanced system commands.' },
    { id: 'settings', name: 'Settings', icon: Sliders, description: 'Change connection and display settings.' },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-9 px-4 py-6 sm:px-6 sm:py-8">
      <section aria-labelledby="desktop-heading" className="border-b border-slate-800 pb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Centipede OS</p>
        <h1 id="desktop-heading" className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Your desktop</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Everyday apps come with the Debian desktop. Centipede tools are below when you need them.
        </p>
      </section>

      <section aria-labelledby="everyday-apps-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="everyday-apps-heading" className="text-lg font-semibold text-white">Everyday apps</h2>
            <p className="mt-1 text-sm text-slate-400">Included in the Debian desktop; no subscriptions required.</p>
          </div>
          <p className="text-xs text-slate-500">On Debian, open the Applications menu in the top panel.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {everydayApps.map((app) => {
            const Icon = app.icon;
            return (
              <article key={app.name} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition-colors hover:border-slate-700">
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg border ${app.tint}`}>
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold leading-5 text-white">{app.name}</h3>
                <p className="mt-1 text-xs font-medium text-slate-300">{app.detail}</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">{app.note}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="centipede-tools-heading">
        <div className="mb-4">
          <h2 id="centipede-tools-heading" className="text-lg font-semibold text-white">Centipede tools</h2>
          <p className="mt-1 text-sm text-slate-400">These tools use Kingdom for shared tasks and protected actions.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => {
            const Icon = app.icon;
            const isActive = activeAppId === app.id;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => onOpenApp(app.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex min-w-0 items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                  isActive
                    ? 'border-cyan-500/50 bg-cyan-950/30'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-cyan-200 group-hover:bg-slate-700">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-100">{app.name}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">{app.description}</span>
                </span>
                {app.badge && (
                  <span className="shrink-0 rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-200">
                    {app.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
        <Headphones aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p className="leading-6 text-slate-400">
          New to Centipede? Start with your browser or documents. Kingdom is an optional service for shared tasks; the everyday apps work on their own.
        </p>
      </aside>
    </div>
  );
};
