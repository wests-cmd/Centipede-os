/** Explicit, exact local shell navigation only. No OS commands, model calls or side effects. */
const DESTINATIONS = {
  home: 'launcher', desktop: 'launcher', apps: 'apps', applications: 'apps', devices: 'mobile', files: 'files', 'file manager': 'files',
  settings: 'settings', tasks: 'tasks', 'background work': 'background',
  'command center': 'command', 'system status': 'command', memory: 'memory',
  skills: 'skills', search: 'search', 'mobile companion': 'mobile',
  approvals: 'security', 'kingdom status': 'status', segmentor: 'ai',
  'screen capture': 'perception', 'doctor': 'doctor',
} as const;
export type QuickDestination = typeof DESTINATIONS[keyof typeof DESTINATIONS];
export const SAFE_SHORTCUT_TARGETS = {
  launcher:'Home', apps:'Apps', files:'Files', tasks:'Tasks', mobile:'Devices',
  settings:'Settings', background:'Background work', command:'System health',
  search:'Search', memory:'Memory', skills:'Skills',
} as const;
export type ShortcutTarget = keyof typeof SAFE_SHORTCUT_TARGETS;
export type NavigationShortcut = { phrase:string; destination:ShortcutTarget };
export const normalizeShortcut = (value:string) => value.trim().toLowerCase().replace(/\s+/g,' ');
export function validShortcut(value:unknown): value is NavigationShortcut {
  if (!value || typeof value!=='object') return false;
  const row=value as Partial<NavigationShortcut>;
  return typeof row.phrase==='string' && row.phrase===normalizeShortcut(row.phrase) &&
    /^[a-z0-9][a-z0-9 -]{1,59}$/.test(row.phrase) &&
    !/^(open|show|go to|run|stop|cancel|delete|sudo|send|buy)( |$)/.test(row.phrase) &&
    typeof row.destination==='string' && Object.prototype.hasOwnProperty.call(SAFE_SHORTCUT_TARGETS,row.destination);
}
export type QuickRoute = { kind: 'navigate'; destination: QuickDestination } | { kind: 'draft'; text: string } | { kind: 'empty' };
export function routeQuickCommand(input: string, shortcuts:readonly NavigationShortcut[]=[]): QuickRoute {
  const text = input.trim();
  if (!text) return { kind: 'empty' };
  const normalized = text.toLowerCase().replace(/\s+/g, ' ');
  const match = /^(?:open|show|go to) (.+)$/.exec(normalized);
  const target = match?.[1];
  if (target && Object.prototype.hasOwnProperty.call(DESTINATIONS, target)) {
    return { kind: 'navigate', destination: DESTINATIONS[target as keyof typeof DESTINATIONS] };
  }
  const saved=shortcuts.find(row=>validShortcut(row) && row.phrase===normalized);
  if (saved) return {kind:'navigate',destination:saved.destination};
  // Unknown input is ONLY a draft. Never auto-send it or turn it into a command.
  return { kind: 'draft', text };
}
