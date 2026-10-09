import type { ApiRequest, ApiResponse } from './routes';

const PREFIX = '/api/v1/kingdom';
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const STATIC_READS = new Set([
  '/status', '/mode', '/knights', '/models', '/events', '/tasks', '/memory', '/maps',
  '/security/status', '/security/policies', '/security/permissions',
  '/security/approvals', '/security/audit',
]);

function isAllowedReadPath(path: string): boolean {
  if (STATIC_READS.has(path)) return true;
  return /^\/(?:tasks|maps)\/[A-Za-z0-9_-]{1,128}$/.test(path);
}

/**
 * Proxies only read-only Kingdom contract endpoints through the Centipede server.
 * The API token stays server-side and the proxy is limited to verified local-admin requests.
 */
export async function proxyKingdomRead(req: ApiRequest): Promise<ApiResponse | null> {
  if (!req.path.startsWith(`${PREFIX}/`)) return null;
  if (req.method !== 'GET') return { status: 405, error: 'Only read-only Kingdom requests are available through this endpoint.' };
  if (!req.isLocalAdmin) return { status: 403, error: 'Kingdom status access is available only from the Centipede host.' };

  const path = req.path.slice(PREFIX.length);
  if (!isAllowedReadPath(path)) return { status: 404, error: 'Kingdom read endpoint is not available through this proxy.' };

  const baseUrl = process.env.KINGDOM_API_URL || '';
  const token = process.env.KINGDOM_API_TOKEN || '';
  if (!baseUrl || !token) {
    return { status: 503, error: 'Kingdom connection is not configured on the Centipede server.' };
  }

  let endpoint: URL;
  try {
    const base = new URL(baseUrl);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
      return { status: 503, error: 'Kingdom server configuration is invalid.' };
    }
    base.pathname = `${base.pathname.replace(/\/+$/, '')}${path}`;
    base.search = req.query || '';
    endpoint = base;
  } catch {
    return { status: 503, error: 'Kingdom server configuration is invalid.' };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
      return { status: 502, error: 'Kingdom response exceeded the allowed size.' };
    }
    if (!response.body) return { status: 502, error: 'Kingdom returned an empty response stream.' };
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return { status: 502, error: 'Kingdom response exceeded the allowed size.' };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const body = new TextDecoder().decode(bytes);
    if (!response.ok) {
      if (response.status === 401) return { status: 502, error: 'Kingdom authentication failed. Check server-side credentials.' };
      if (response.status === 403) return { status: 403, error: 'Kingdom denied this read request.' };
      if (response.status === 404) return { status: 404, error: 'Kingdom does not provide this endpoint.' };
      return { status: 502, error: `Kingdom returned HTTP ${response.status}.` };
    }

    try {
      return { status: 200, data: JSON.parse(body) };
    } catch {
      return { status: 502, error: 'Kingdom returned an invalid JSON response.' };
    }
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    return { status: isTimeout ? 504 : 502, error: isTimeout ? 'Kingdom read request timed out.' : 'Kingdom server is unavailable.' };
  }
}
