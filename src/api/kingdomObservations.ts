/** Optional metadata observations, never execution authority or proof of outcomes. */
export const OBSERVATION_READ_PATHS = ['/orchestration/activity', '/hierarchy', '/service-nodes/discovery'] as const;

export interface ObservationSummary {
  state: 'observed' | 'stale' | 'unavailable' | 'unsupported';
  count: number | null;
  observedAt: number | null;
  receivedAt: number | null;
  scope: string;
  truncated: boolean;
  stalePeers?: number;
  serviceCount?: number | null;
  serviceState?: ObservationSummary['state'];
}

export const unavailableObservation = (): ObservationSummary => ({
  state: 'unavailable', count: null, observedAt: null, receivedAt: null, scope: 'unknown', truncated: false,
});

function recent(value: unknown, now: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && now - value >= -5 && now - value <= 60;
}

export function observationIsCurrent(value: ObservationSummary, now = Date.now() / 1000): boolean {
  return value.state === 'observed' && value.receivedAt !== null && Number.isFinite(value.receivedAt)
    && now - value.receivedAt >= 0 && now - value.receivedAt <= 60;
}

/** Server projection drops every job label, prompt, node configuration and service name. */
export function summarizeObservation(path: string, raw: any, upstreamNow?: number, receivedAt = Date.now() / 1000): ObservationSummary {
  const unavailable = unavailableObservation();
  if (!raw || typeof raw !== 'object') return unavailable;
  if (path === '/orchestration/activity') {
    if (raw.state !== 'observed' || !Array.isArray(raw.jobs) || raw.jobs.length > 20) return unavailable;
    if (upstreamNow === undefined || !Number.isFinite(upstreamNow)) return unavailable;
    if (!recent(raw.observed_at, upstreamNow)) return { ...unavailable, state: 'stale' };
    return { state: 'observed', count: raw.jobs.length, observedAt: raw.observed_at, receivedAt,
      scope: 'local_recent_job_records', truncated: raw.truncated === true };
  }
  if (path === '/service-nodes/discovery') {
    const scope = ['user_services', 'windows_services', 'container', 'unknown'].includes(raw.scope) ? raw.scope : 'unknown';
    if (raw.state === 'unsupported') return { ...unavailable, state: 'unsupported', scope };
    if (raw.state !== 'observed' || !Array.isArray(raw.services) || raw.services.length > 128) return unavailable;
    if (upstreamNow === undefined || !Number.isFinite(upstreamNow)) return unavailable;
    if (!recent(raw.observed_at, upstreamNow)) return { ...unavailable, state: 'stale', scope };
    return { state: 'observed', count: raw.services.length, observedAt: raw.observed_at, receivedAt,
      scope, truncated: raw.truncated === true };
  }
  if (path === '/hierarchy') {
    const reports = raw.inventory?.reports;
    if (!Array.isArray(reports) || reports.length > 1000) return unavailable;
    let jobs = 0, services = 0, truncated = false, stale = 0, missing = false;
    let serviceState: ObservationSummary['state'] = 'observed';
    for (const report of reports) {
      // Kingdom's receiver evaluates heartbeat/receipt freshness in its own
      // clock domain. Executor timestamps cannot be compared to this host.
      if (!report || report.state !== 'current') { stale++; continue; }
      if (report.activity?.state !== 'observed' || !Array.isArray(report.activity.jobs)
          || report.activity.jobs.length > 20) missing = true;
      else jobs += report.activity.jobs.length;
      if (report.services?.state === 'unsupported' && serviceState === 'observed') serviceState = 'unsupported';
      else if (report.services?.state !== 'observed' || !Array.isArray(report.services.services)
          || report.services.services.length > 128) serviceState = 'unavailable';
      else services += report.services.services.length;
      truncated ||= report.activity?.truncated === true || report.services?.truncated === true;
    }
    if (stale || missing) return { ...unavailable, state: stale ? 'stale' : 'unavailable', stalePeers: stale };
    return { state: 'observed', count: jobs, serviceCount: serviceState === 'observed' ? services : null, serviceState, observedAt: null, receivedAt,
      scope: 'signed_peer_reports', truncated, stalePeers: 0 };
  }
  return unavailable;
}
