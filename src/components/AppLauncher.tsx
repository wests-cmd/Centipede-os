import React from 'react';
import {
  Activity,
  BarChart3,
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
import { CentipedeWorldVisual, HomeVisual } from './CentipedeWorldVisual';
import type { ConnectionState } from '../types';

interface AppLauncherProps {
  onOpenApp: (appId: string) => void;
  activeAppId: string;
  pendingApprovalsCount: number;
  approvalsVerified?: boolean;
  homeVisual: HomeVisual;
  connectionState?: ConnectionState;
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
  approvalsVerified = false,
  homeVisual,
  connectionState = 'DISCONNECTED',
}) => {
  const apps = [
    { id: 'command', name: 'System Command Center', icon: BarChart3, description: 'Understand system health, performance, Kingdom work, alerts, updates, and what is not verified.' },
    { id: 'background', name: 'Background Work', icon: Cpu, description: 'Configure owner-approved recurring browser tasks in an isolated worker, never on the active desktop.' },
    { id: 'files', name: 'Local files', icon: Folder, description: 'Open the owner-protected local workspace.' },
    { id: 'search', name: 'Search', icon: Search, description: 'Look across Centipede tasks and saved information.' },
    { id: 'tasks', name: 'Tasks', icon: Activity, description: 'See work sent to the connected Kingdom service.' },
    { id: 'workspace', name: 'Workspace', icon: Grid, description: 'View connected services and saved routines.' },
    { id: 'ai', name: 'Centipede assistant', icon: Bot, description: 'Ask for help. Actions may need your approval.' },
    { id: 'agent_control', name: 'Agent controls', icon: Shield, description: 'Review connected agents and their access.' },
    { id: 'mobile', name: 'Mobile Companion', icon: Smartphone, description: 'Pair a phone browser with Centipede over a trusted local network.' },
    { id: 'security', name: 'Security & approvals', icon: Shield, description: 'Review requests before protected actions run.', badge: pendingApprovalsCount || undefined },
    { id: 'status', name: 'Kingdom connection', icon: Server, description: 'Check whether the optional Kingdom service is online.' },
    { id: 'memory', name: 'Saved information', icon: Brain, description: 'Review information stored by Centipede.' },
    { id: 'skills', name: 'Capabilities', icon: Cpu, description: 'See which abilities are available to Centipede.' },
    { id: 'maps', name: 'Network map', icon: Map, description: 'View connected Kingdom nodes.' },
    { id: 'terminal', name: 'Command line', icon: Terminal, description: 'Advanced system commands.' },
    { id: 'settings', name: 'Settings', icon: Sliders, description: 'Change connection and display settings.' },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-3 py-4 sm:px-6 sm:py-7">
      <section aria-labelledby="desktop-heading" className={`relative isolate overflow-hidden rounded-2xl ${homeVisual === 'centipede-art' ? 'flex min-h-[58vh] items-end sm:items-center' : 'h-[19rem] border border-cyan-950/70 bg-slate-950 shadow-2xl shadow-cyan-950/20 sm:h-[23rem]'}`}>
        {homeVisual !== 'centipede-art' && <>
          <CentipedeWorldVisual visual={homeVisual} quality="BALANCED" className="absolute inset-0" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/5" />
        </>}
        <div className={`relative z-10 flex max-w-xl flex-col items-start justify-center ${homeVisual === 'centipede-art' ? 'm-2 max-w-sm rounded-xl border border-slate-700 bg-slate-950/90 p-5 sm:m-4 sm:max-w-md sm:p-6' : 'h-full px-6 py-8 sm:px-10'}`}>
          <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
            <span className="h-px w-7 bg-cyan-300/80" /> CENTIPEDE OS
          </p>
          <h1 id="desktop-heading" className="max-w-lg text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Home
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-300 sm:text-base">
            Open your apps or ask Segmentor for help.
          </p>
          <button
            type="button"
            onClick={() => onOpenApp('ai')}
            className="pointer-events-auto mt-6 rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100 shadow-lg shadow-cyan-950/30 transition hover:border-cyan-200/70 hover:bg-cyan-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            Open Segmentor
          </button>
          <button type="button" onClick={() => onOpenApp('apps')} className="mt-2 rounded-lg border border-slate-600 bg-slate-950 px-4 py-2 text-sm text-white">Browse apps</button>
        </div>
        <div className="absolute bottom-4 right-4 z-10 hidden rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur sm:block">
          {homeVisual === 'centipede-art' ? 'Centipede Earth · signature wallpaper' : homeVisual === 'centipede-world' ? 'Centipede + World' : homeVisual.replace('-', ' ')}
        </div>
      </section>

      <section aria-labelledby="system-overview-heading" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-900/70 bg-slate-900/80 p-4">
        <div className="space-y-1">
          <h2 id="system-overview-heading" className="flex items-center gap-2 text-base font-semibold text-white"><BarChart3 aria-hidden="true" className="h-5 w-5 text-blue-300" />Your system at a glance</h2>
          <p className="text-xs text-slate-300">Kingdom: <strong>{connectionState}</strong> · Pending approvals: {connectionState === 'CONNECTED' && approvalsVerified ? pendingApprovalsCount : 'Not verified'}</p>
          <p className="text-xs text-slate-400">CPU, RAM, disk, devices, task truth and recovery checks are shown only when data is available.</p>
        </div>
        <button type="button" onClick={() => onOpenApp('command')}
          className="rounded-lg border border-blue-700 bg-blue-950/50 px-4 py-2 text-sm font-semibold text-blue-100 hover:border-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300">
          Open Command Center
        </button>
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
