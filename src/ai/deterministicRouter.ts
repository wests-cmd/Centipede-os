/** Explicit, exact local shell navigation only. No OS commands, model calls or side effects. */
const DESTINATIONS = {
  home: 'launcher', desktop: 'launcher', files: 'files', 'file manager': 'files',
  settings: 'settings', tasks: 'tasks', 'background work': 'background',
  'command center': 'command', 'system status': 'command', memory: 'memory',
  skills: 'skills', search: 'search', 'mobile companion': 'mobile',
  approvals: 'security', 'kingdom status': 'status', segmentor: 'ai',
  'screen capture': 'perception', 'doctor': 'doctor',
} as const;
export type QuickDestination = typeof DESTINATIONS[keyof typeof DESTINATIONS];
export type QuickRoute = { kind: 'navigate'; destination: QuickDestination } | { kind: 'draft'; text: string } | { kind: 'empty' };
export function routeQuickCommand(input: string): QuickRoute {
  const text = input.trim();
  if (!text) return { kind: 'empty' };
  const normalized = text.toLowerCase().replace(/\s+/g, ' ');
  const match = /^(?:open|show|go to) (.+)$/.exec(normalized);
  const target = match?.[1];
  if (target && Object.prototype.hasOwnProperty.call(DESTINATIONS, target)) {
    return { kind: 'navigate', destination: DESTINATIONS[target as keyof typeof DESTINATIONS] };
  }
  // Unknown input is ONLY a draft. Never auto-send it or turn it into a command.
  return { kind: 'draft', text };
}
