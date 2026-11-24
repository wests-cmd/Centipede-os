import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { ApiRequest, ApiResponse } from './routes';
import { trustedKingdomBase } from './kingdomUpstream';

const PREFIX = '/api/v1/kingdom/actions';
const SESSION_MS = 15 * 60_000;
const WINDOW_MS = 60_000;
const MAX_RESPONSE_BYTES = 256 * 1024;
const sessions = new Map<string, { expiresAt: number; ownerCredential: string; upstream: string }>();
let failureWindowStart = 0;
let failedUnlocks = 0;

// The session bookkeeping key is generated independently of the owner's code.
// Never use a fast unsalted password hash to compare or retain owner credentials.
const sessionKey = randomBytes(32);
const digest = (value: string) => createHmac('sha256', sessionKey).update(value).digest('hex');
function equalSecrets(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  // Input length is public to this local-only endpoint; matching-length
  // credentials are compared in constant time without hashing the password.
  return left.length === right.length && timingSafeEqual(left, right);
}
function header(req: ApiRequest, name: string): string {
  const entry = Object.entries(req.headers || {}).find(([key]) => key.toLowerCase() === name);
  return typeof entry?.[1] === 'string' ? entry[1] : '';
}
function upstreamConfig(): { base: URL; token: string } | null {
  const token = process.env.KINGDOM_API_TOKEN || '';
  const url = process.env.KINGDOM_API_URL || '';
  if (token.length < 32 || !url) return null;
  const base = trustedKingdomBase(url);
  return base ? { base, token } : null;
}
function validSession(req: ApiRequest, token: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const hash = digest(token);
  const session = sessions.get(hash);
  if (!session) return false;
  const config = upstreamConfig();
  if (session.expiresAt <= Date.now() || !config || session.upstream !== config.base.href ||
      !equalSecrets(session.ownerCredential, config.token)) {
    sessions.delete(hash);
    return false;
  }
  return true;
}
async function forwardTaskAction(
  config: { base: URL; token: string },
  path: string,
  payload?: object,
  expectedTaskId?: string,
): Promise<ApiResponse> {
  const endpoint = new URL(config.base.toString());
  endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, '')}${path}`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'X-Kingdom-Request': '1',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload || {}),
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { status: 502, error: 'Kingdom action outcome unknown after a connection failure. Check the Tasks screen before retrying.' };
  }
  if (!response.ok) {
    if (response.status === 401) return { status: 502, error: 'Kingdom rejected the configured server-side credentials.' };
    if (response.status === 403) return { status: 403, error: 'Kingdom denied this owner-authorized operation.' };
    if (response.status === 400 || response.status === 422) return { status: 422, error: 'Kingdom rejected the task request.' };
    return { status: 502, error: `Kingdom task request failed with HTTP ${response.status}.` };
  }
  const size = Number(response.headers.get('content-length') || 0);
  if (size > MAX_RESPONSE_BYTES) return { status: 502, error: 'Kingdom response exceeded the configured limit.' };
  if (!response.body) return { status: 502, error: 'Kingdom did not confirm the operation.' };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return { status: 502, error: 'Kingdom response exceeded the configured limit.' };
      }
      chunks.push(value);
    }
    const combined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
    const item: unknown = JSON.parse(new TextDecoder().decode(combined));
    if (!item || typeof item !== 'object' ||
      !('id' in item) || typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(item.id) ||
      !('status' in item) || typeof item.status !== 'string' ||
      !['queued', 'running', 'completed', 'failed', 'cancelled', 'unknown'].includes(item.status) ||
      (expectedTaskId !== undefined && item.id !== expectedTaskId)) {
      return { status: 502, error: 'Kingdom did not return a valid task ID and status; submission outcome is unknown.' };
    }
    return { status: 200, data: item };
  } catch {
    return { status: 502, error: 'Kingdom returned an invalid task confirmation; inspect Tasks before retrying.' };
  }
}

/**
 * Fixed-surface local-only owner action bridge. Never include this path in the GET proxy.
 * The caller cannot supply an upstream URL, actor, capability, or arbitrary endpoint.
 */
export async function handleKingdomAction(req: ApiRequest): Promise<ApiResponse | null> {
  if (!req.path.startsWith(`${PREFIX}/`)) return null;
  if (req.method !== 'POST') return { status: 405, error: 'Only explicit POST owner actions are supported.' };
  if (!req.isLocalAdmin) return { status: 403, error: 'Kingdom actions require an owner session on the Centipede host.' };
  if (header(req, 'x-centipede-owner-intent') !== '1') {
    return { status: 403, error: 'Missing explicit owner action intent header.' };
  }
  const config = upstreamConfig();
  if (!config) return { status: 503, error: 'A secure Kingdom owner connection has not been configured on this host.' };
  const token = header(req, 'x-centipede-action-session');
  if (req.path === `${PREFIX}/unlock`) {
    const now = Date.now();
    if (now - failureWindowStart >= WINDOW_MS) { failureWindowStart = now; failedUnlocks = 0; }
    if (failedUnlocks >= 5) return { status: 429, error: 'Too many owner unlock attempts. Try again later.' };
    const code = req.body?.ownerCode;
    if (typeof code !== 'string' || code.length < 32 || code.length > 512 || !equalSecrets(code, config.token)) {
      failedUnlocks++;
      return { status: 401, error: 'Invalid Kingdom owner access code.' };
    }
    const newSession = randomBytes(32).toString('hex');
    for (const [hash, state] of sessions) if (state.expiresAt <= now) sessions.delete(hash);
    if (sessions.size >= 32) return { status: 429, error: 'Too many active owner sessions. Lock a session before retrying.' };
    const expiresAt = now + SESSION_MS;
    // The configured credential is already in this server process environment.
    // Keep this session-bound snapshot in memory only, so rotation revokes the
    // session without applying a fast password hash to the owner's access code.
    sessions.set(digest(newSession), { expiresAt, ownerCredential: config.token, upstream: config.base.href });
    return { status: 200, data: { sessionToken: newSession, expiresAt } };
  }
  if (!validSession(req, token)) return { status: 401, error: 'Owner session missing or expired. Unlock again on this computer.' };
  if (req.path === `${PREFIX}/lock`) {
    sessions.delete(digest(token));
    return { status: 200, data: { locked: true } };
  }
  if (req.path === `${PREFIX}/tasks`) {
    const prompt = req.body?.prompt;
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 50_000) {
      return { status: 422, error: 'Task prompt must be 1–50,000 characters.' };
    }
    return forwardTaskAction(config, '/tasks', { prompt: prompt.trim(), metadata: { client: 'centipede_os_owner_ui' } });
  }
  const cancel = req.path.match(/^\/api\/v1\/kingdom\/actions\/tasks\/([A-Za-z0-9_-]{1,128})\/cancel$/);
  if (cancel) return forwardTaskAction(config, `/tasks/${cancel[1]}/cancel`, undefined, cancel[1]);
  return { status: 404, error: 'This owner action is not supported.' };
}

/** Isolated test helper; does not expose or create a privileged route. */
export function resetOwnerActionSessionsForTests(): void {
  sessions.clear();
  failedUnlocks = 0;
  failureWindowStart = 0;
}

/** The same short-lived local owner session protects the separate Files broker. */
export function isLocalOwnerActionAuthorized(req: ApiRequest): boolean {
  const explicit = Object.entries(req.headers || {}).find(([k]) => k.toLowerCase() === 'x-centipede-owner-intent')?.[1];
  if (!req.isLocalAdmin || explicit !== '1') return false;
  const token = Object.entries(req.headers || {}).find(([k]) => k.toLowerCase() === 'x-centipede-action-session')?.[1];
  return typeof token === 'string' && validSession(req, token);
}
