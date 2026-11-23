import type { ApiRequest, ApiResponse } from './routes';
import { isLocalOwnerActionAuthorized } from './kingdomAction';

const BASE = '/api/v1/harness';
const MAX_BYTES = 64 * 1024;

const ROUTES: Record<string, { method: 'GET' | 'POST'; workerPath: string }> = {
  [BASE + '/status']: { method: 'GET', workerPath: '/v1/status' },
  [BASE + '/control']: { method: 'POST', workerPath: '/v1/control' },
  [BASE + '/routines']: { method: 'POST', workerPath: '/v1/routines' },
  [BASE + '/routines/delete']: { method: 'POST', workerPath: '/v1/routines/delete' },
  [BASE + '/alerts/ack']: { method: 'POST', workerPath: '/v1/alerts/ack' },
};

/**
 * Fixed-route broker to the separate headless worker. There is NO arbitrary
 * URL proxy, browser automation endpoint, shell, host desktop input or remote
 * control bypass. The worker token is never returned to the client.
 */
export async function handleHarnessProxy(req: ApiRequest): Promise<ApiResponse | null> {
  if (req.path !== BASE && !req.path.startsWith(BASE + '/')) return null;
  const route = ROUTES[req.path];
  if (!route) return { status: 404, error: 'Unknown harness operation.' };
  if (req.method !== route.method) return { status: 405, error: 'Method is not permitted for this harness operation.' };
  if (!req.isLocalAdmin) return { status: 403, error: 'The isolated worker can only be controlled from the local Centipede desktop.' };
  if (route.method === 'POST' && !isLocalOwnerActionAuthorized(req))
    return { status: 401, error: 'Unlock a local owner action session before changing background work.' };

  const configured = process.env.CENTIPEDE_HARNESS_URL || '';
  const token = process.env.CENTIPEDE_HARNESS_TOKEN || '';
  // Deliberately NOT a general-purpose HTTP request target.
  const allowed = ['http://127.0.0.1:3011', 'http://[::1]:3011', 'http://centipede-harness:3011'];
  if (!allowed.includes(configured) || !/^[a-f0-9]{64}$/i.test(token)) {
    return { status: 503, error: 'The isolated worker has not been configured on this host.' };
  }

  let body: string | undefined;
  if (route.method === 'POST') {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
      return { status: 422, error: 'A bounded JSON object is required.' };
    body = JSON.stringify(req.body);
    if (Buffer.byteLength(body, 'utf8') > 4096)
      return { status: 413, error: 'Harness requests are limited to 4 KiB.' };
  }

  let response: Response;
  try {
    response = await fetch(configured + route.workerPath, {
      method: route.method,
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body } : {}),
      redirect: 'error',
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    return { status: 503, error: 'Background worker unavailable. It may be stopped or not installed.' };
  }

  if (Number(response.headers.get('content-length') || 0) > MAX_BYTES)
    return { status: 502, error: 'Worker response exceeded the permitted size.' };
  if (!response.body) return { status: 502, error: 'Worker returned no response.' };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        return { status: 502, error: 'Worker response exceeded the permitted size.' };
      }
      chunks.push(value);
    }
    const raw = Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return { status: 502, error: 'Worker response format was not valid.' };

    if (!response.ok) {
      if (response.status === 422 || response.status === 413 || response.status === 400)
        return { status: response.status, error: 'Worker rejected the requested action or routine policy.' };
      return { status: 502, error: 'The background worker refused the request.' };
    }
    if (req.path === BASE + '/status' && (parsed as { scope?: unknown }).scope !== 'isolated-headless-browser-only')
      return { status: 502, error: 'Worker identity was not verified.' };
    return { status: response.status, data: parsed };
  } catch {
    return { status: 502, error: 'Worker returned invalid or unreadable JSON.' };
  }
}
