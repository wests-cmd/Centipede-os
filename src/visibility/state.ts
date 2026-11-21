/** Shared presentation contract: one catalog, no duplicate execution/approval authority. */
import type {
  ApprovalRequest, AuditLogEntry, ConnectionState, KingdomSkillItem, ModelHealth,
  SecurityNode, SecurityStatus, SystemEvent, TaskItem,
} from '../types';

export type DetailState = 'observed' | 'attention' | 'unverified' | 'unavailable';
export type VisibilityMode = 'everyday' | 'advanced' | 'owner';

export interface HostTelemetry {
  scope: 'local-centipede-server-kernel-view';
  observedAt: number;
  staleAfterMs: number;
  platform: string;
  logicalCpus: number;
  cpuUsagePercent: number | null;
  memory: { totalMiB: number; freeMiB: number; availableMiB: number | null } | null;
  serverProcessRssMiB: number;
  serviceVolume: { totalMiB: number; availableMiB: number } | null;
  osUptimeSeconds: number;
  limitations: string;
}

export interface VisibilitySnapshot {
  connection: ConnectionState;
  host: HostTelemetry | null;
  hostError: string | null;
  tasks: TaskItem[] | null;
  approvals: ApprovalRequest[] | null;
  nodes: SecurityNode[] | null;
  models: ModelHealth | null;
  skills: KingdomSkillItem[] | null;
  security: SecurityStatus | null;
  events: SystemEvent[] | null;
  audit: AuditLogEntry[] | null;
  browserOnline: boolean | null;
}

export interface VisibilityCard {
  id: string;
  title: string;
  value: string;
  description: string;
  source: string;
  state: DetailState;
  navigate: string;
  action: string;
}

export function telemetryIsFresh(host: HostTelemetry | null, now = Date.now()): boolean {
  return !!host && Number.isFinite(host.observedAt) && host.observedAt <= now + 1000 &&
    Number.isFinite(host.staleAfterMs) && host.staleAfterMs > 0 &&
    now - host.observedAt <= host.staleAfterMs;
}

const measured = (value: string, description: string, source: string,
  navigate: string, action: string): Omit<VisibilityCard,'id'|'title'> =>
  ({ value, description, source, navigate, action, state: 'observed' });

const unverified = (description: string, navigate: string, action: string):
  Omit<VisibilityCard,'id'|'title'> =>
  ({ value: 'Not verified', description, source: 'No authoritative receipt available', navigate, action, state: 'unverified' });

export function buildVisibilityCards(snapshot: VisibilitySnapshot, version: string, now = Date.now()): VisibilityCard[] {
  const fresh = telemetryIsFresh(snapshot.host, now);
  const online = snapshot.connection === 'CONNECTED';
  const host = fresh ? snapshot.host : null;
  const mem = host?.memory;
  const cpu = host?.cpuUsagePercent;
  const available = mem?.availableMiB;
  const alerts = deriveVisibilityAlerts(snapshot, now);
  const add = (id: string, title: string, value: Omit<VisibilityCard,'id'|'title'>): VisibilityCard =>
    ({ id, title, ...value });
  return [
    add('system','Computer',
      host ? measured('Local service reachable',
        'Linux/host metrics sampled. This does not prove all operating-system services are healthy.',
        'Same-origin local server telemetry', 'doctor', 'Open diagnostics')
      : unverified('Host telemetry is unavailable, not authorized, or stale. ' + (snapshot.hostError || ''),
        'doctor', 'Run diagnostics')),
    add('performance','CPU & memory',
      host && mem
        ? measured(`${cpu === null ? 'CPU warming up' : cpu + '% CPU'} · ${available === null ? 'Available RAM unknown' : available + ' MiB available'}`,
          `Kernel reports ${mem.totalMiB} MiB total; server process ${host.serverProcessRssMiB} MiB RSS. Not total desktop RSS.`,
          'Host kernel sample · age-limited', 'command', 'See performance history')
        : unverified('No current complete host CPU/RAM sample. Remote phones cannot read local privileged telemetry.',
          'command','View performance')),
    add('segmentor','Segmentor',
      online ? measured('Kingdom connected', 'Task submission still requires explicit owner authorization. No task completion is implied.',
        'Kingdom connection observation', 'ai','Open Segmentor')
        : { ...unverified('Remote execution is unavailable until an authorized Kingdom connection is established.', 'ai','Open Segmentor'),
          value:'Waiting for Kingdom', state:'attention' }),
    add('kingdom','Kingdom',
      online ? measured('Connected', 'Connected does not guarantee compatible permissions, workers or a verified task result.',
        'Kingdom connection state', 'status','Inspect connection')
        : { ...unverified('Remote tasks cannot be verified while the connection is ' + snapshot.connection.toLowerCase().replaceAll('_',' ') + '.',
          'status','Check connection'), value:snapshot.connection, state:'attention' }),
    add('tasks','Tasks',
      online && snapshot.tasks
        ? measured(`${snapshot.tasks.length} reported`, `${snapshot.tasks.filter(t => t.status === 'running').length} running; statuses are Kingdom reports, not proof of verified work.`,
          'Kingdom task list (canonical IDs)', 'tasks','Open task timeline')
        : unverified('Task list not loaded from Kingdom; historical tasks must not be assumed completed.',
          'tasks','Inspect tasks')),
    add('devices','Connected computers',
      online && snapshot.nodes
        ? measured(`${snapshot.nodes.length} registered`, `${snapshot.nodes.filter(n=>n.active).length} marked active by Kingdom. Registration is not proof of reachability or trust.`,
          'Kingdom security/permissions', 'agent_control','Inspect devices')
        : unverified('Cannot confirm registered/active/verified workers from Kingdom.',
          'agent_control','Inspect connected computers')),
    add('agents','Agents & models',
      online && snapshot.models
        ? measured('Model report received', `Kingdom model endpoint reports: ${String(snapshot.models.status).slice(0,70)}. No local inference benchmark is implied.`,
          'Kingdom model endpoint', 'ai','Inspect models')
        : unverified('No current model or worker performance evidence.', 'ai','Inspect models')),
    add('security','Security & approvals',
      online && snapshot.security && snapshot.approvals
        ? measured(`${snapshot.approvals.length} pending approvals`,
          `Kingdom reports policy mode: ${String(snapshot.security.mode).slice(0,60)}. This does not certify the host as secure.`,
          'Kingdom security endpoints', 'security','Review approvals')
        : unverified('Authoritative security status or approval list is missing.', 'security','Review security')),
    add('files','Files & storage',
      host?.serviceVolume
        ? measured(`${host.serviceVolume.availableMiB} MiB on service volume`,
          'Only the filesystem containing the Centipede server was sampled. File actions still require owner authorization.',
          'Server filesystem statfs · local scope', 'files','Open Files')
        : unverified('No reliable storage figure; file actions require an independent owner-locked broker.',
          'files','Open Files')),
    add('network','Network',
      snapshot.browserOnline === null
        ? unverified('Browser connectivity has not been checked.', 'status','Check connectivity')
        : measured(snapshot.browserOnline ? 'Browser says online' : 'Browser says offline',
          'The browser online hint is not an internet reachability test. Kingdom status is separate.',
          'Browser network hint', 'status','Diagnose connection')),
    add('updates','Updates',
      { ...unverified(`Running Centipede browser app v${version}. Installed Debian, Docker, Kingdom, and signed rollback state were not checked.`,
        'settings','Review updates'), value:`Web app v${version}` }),
    add('backups','Backups & recovery',
      unverified('No verified backup, restore test, signed host update or interrupted-update rollback receipt available.',
        'doctor','Review recovery checks')),
    add('skills','Skills & apps',
      online && snapshot.skills
        ? measured(`${snapshot.skills.length} Kingdom skills reported`, 'Listing does not prove a skill is safe to execute, approved, or installed on this computer.',
          'Kingdom skills endpoint', 'skills','Inspect skills')
        : unverified('Installed host applications and Kingdom skill inventory are not yet both measured.', 'skills','View skills')),
    add('notifications','Attention inbox',
      { ...measured(`${alerts.length} current item${alerts.length === 1 ? '' : 's'}`,
          'Derived from current observations only; not a durable security or incident log.',
          'Read-only observed state', 'command','Review attention'), state:alerts.length ? 'attention':'observed' }),
    add('history','System history',
      online && snapshot.events
        ? measured(`${snapshot.events.length} recent events`, 'Event records came from Kingdom; no device-wide audit completeness is claimed.',
          'Kingdom /events', 'tasks','Inspect task history')
        : unverified('No authoritative cross-system event history is currently available.',
          'tasks','View activity')),
    add('privacy','Privacy & permissions',
      unverified('Camera, screen, microphone, cloud sharing and host permission grants were not inspected by this dashboard.',
        'perception','Review permissions')),
  ];
}

export interface VisibilityAlert {
  id: string;
  level: 'warning' | 'critical' | 'info';
  title: string;
  explanation: string;
  whatHappened: string;
  whatCentipedeDid: string;
  next: string;
  navigate: string;
}

export function deriveVisibilityAlerts(snapshot: VisibilitySnapshot, now = Date.now()): VisibilityAlert[] {
  const result: VisibilityAlert[] = [];
  if (snapshot.connection !== 'CONNECTED') {
    result.push({
      id: 'kingdom-offline', level: 'warning', title: 'Kingdom is not connected',
      explanation: 'Remote tasks cannot be submitted or verified until connectivity and authorization return.',
      whatHappened: `Current Kingdom connection state: ${snapshot.connection}.`,
      whatCentipedeDid: 'Command Center withheld success claims and remote task counts.',
      next: 'Check Kingdom address, credentials and the host network; use the connection diagnostics.',
      navigate:'status',
    });
  }
  if (!telemetryIsFresh(snapshot.host, now)) {
    result.push({
      id:'host-unmeasured',level:'info',title:'Host performance is not measured',
      explanation:'The current browser cannot confirm CPU, RAM or disk status.',
      whatHappened: snapshot.hostError || 'The host did not provide a current authorized telemetry sample.',
      whatCentipedeDid:'Showed unknown instead of inventing hardware values.',
      next:'Open Command Center locally on the Centipede host and check the API service.',
      navigate:'doctor',
    });
  } else if (snapshot.host?.memory?.availableMiB !== null && snapshot.host?.memory?.availableMiB !== undefined &&
             snapshot.host.memory.availableMiB < 512) {
    result.push({
      id:'low-memory',level:'warning',title:'Host kernel reports low available memory',
      explanation:'Less than 512 MiB available memory may affect responsiveness; other containers/host services may be included.',
      whatHappened:`MemAvailable is ${snapshot.host.memory.availableMiB} MiB.`,
      whatCentipedeDid:'Displayed a diagnostic warning only; no processes were stopped.',
      next:'Close optional heavy workloads and inspect the actual host memory usage.',
      navigate:'command',
    });
  }
  if (snapshot.connection === 'CONNECTED' && snapshot.approvals && snapshot.approvals.length) {
    result.push({
      id:'pending-approvals',level:'info',title:`${snapshot.approvals.length} Kingdom approval request(s) waiting`,
      explanation:'Human review is required before protected work is allowed.',
      whatHappened:'Kingdom reported pending authorization requests.',
      whatCentipedeDid:'Did not automatically approve any request.',
      next:'Open Security & Approvals and evaluate each request.',
      navigate:'security',
    });
  }
  return result;
}
