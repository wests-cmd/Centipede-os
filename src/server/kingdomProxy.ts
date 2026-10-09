import type { ApiRequest, ApiResponse } from './routes';

const PREFIX = '/api/v1/kingdom';
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MAX_TASK_PROMPT_CHARS = 220_000;
const MAX_TASK_METADATA_BYTES = 32 * 1024;
const STATIC_READS = new Set([
  '/status', '/mode', '/knights', '/models', '/events', '/tasks', '/memory', '/maps',
  '/security/status', '/security/policies', '/security/permissions',
  '/security/approvals', '/security/audit',
]);

function isAllowedReadPath(path: string): boolean {
  if (STATIC_READS.has(path)) return true;
  return /^\/(?:tasks|maps)\/[A-Za-z0-9_-]{1,128}$/.test(path);
}

function kingdomConfiguration(): { baseUrl: string; token: string } | null {
  const baseUrl = process.env.KINGDOM_API_URL || '';
  const token = process.env.KINGDOM_API_TOKEN || '';
  if (!baseUrl || !token) return null;
  return { baseUrl, token };
}

function buildKingdomEndpoint(baseUrl: string, path: string, query = ''): URL | null {
  try {
    const base = new URL(baseUrl);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) return null;
    base.pathname = `${base.pathname.replace(/\/+$/, '')}${path}`;
    base.search = query;
    return base;
  } catch {
    return null;
  }
}

async function forwardKingdomRequest(endpoint: URL, token: string, method: 'GET' | 'POST', body?: Record<string, unknown>, timeoutMs = 10_000): Promise<ApiResponse> {
  try {
    const response = await fetch(endpoint, {
      method,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    });
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_RESPONSE_BYTES) return { status: 502, error: 'Kingdom response exceeded the allowed size.' };
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
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let data: unknown;
    try { data = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { return { status: 502, error: 'Kingdom returned an invalid JSON response.' }; }
    if (!response.ok) {
      if (response.status === 401) return { status: 502, error: 'Kingdom authentication failed. Check server-side credentials.' };
      if (response.status === 403) return { status: 403, error: 'Kingdom denied this task request.' };
      if (response.status === 404) return { status: 404, error: 'Kingdom does not provide this task operation.' };
      return { status: 502, error: `Kingdom returned HTTP ${response.status}.` };
    }
    return { status: 200, data };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'TimeoutError';
    return { status: isTimeout ? 504 : 502, error: isTimeout ? 'Kingdom task request timed out.' : 'Kingdom server is unavailable.' };
  }
}

/** Forwards only an explicitly submitted or cancelled task from the local Centipede host. */
export async function proxyKingdomTask(req: ApiRequest): Promise<ApiResponse | null> {
  if (!req.path.startsWith(`${PREFIX}/tasks`)) return null;
  if (req.method !== 'POST') return null;
  if (!req.isLocalAdmin) return { status: 403, error: 'Kingdom task submission is available only from the Centipede host.' };

  const isSubmit = req.path === `${PREFIX}/tasks` && req.method === 'POST';
  const cancelMatch = req.path.match(/^\/api\/v1\/kingdom\/tasks\/([A-Za-z0-9_-]{1,128})\/cancel$/);
  const isCancel = Boolean(cancelMatch && req.method === 'POST');
  if (!isSubmit && !isCancel) return { status: 405, error: 'Only task submission and cancellation are available through this endpoint.' };

  const config = kingdomConfiguration();
  if (!config) return { status: 503, error: 'Kingdom connection is not configured on the Centipede server.' };
  const path = isSubmit ? '/tasks' : `/tasks/${cancelMatch![1]}/cancel`;
  const endpoint = buildKingdomEndpoint(config.baseUrl, path);
  if (!endpoint) return { status: 503, error: 'Kingdom server configuration is invalid.' };

  if (isCancel) return forwardKingdomRequest(endpoint, config.token, 'POST', {}, 20_000);

  const prompt = req.body?.prompt;
  const metadata = req.body?.metadata ?? {};
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_TASK_PROMPT_CHARS ||
      !metadata || typeof metadata !== 'object' || Array.isArray(metadata) ||
      new TextEncoder().encode(JSON.stringify(metadata)).byteLength > MAX_TASK_METADATA_BYTES) {
    return { status: 400, error: 'The task request is empty or exceeds the safe text and metadata limits.' };
  }
  const attachments = metadata.attachments;
  if (attachments !== undefined && (!Array.isArray(attachments) || attachments.length > 8 || attachments.some((item: any) =>
    !item || typeof item.fileName !== 'string' || item.fileName.length > 255 ||
    typeof item.sizeBytes !== 'number' || item.sizeBytes < 0 || item.sizeBytes > 20 * 1024 * 1024 ||
    typeof item.trust !== 'string' || item.trust !== 'UNTRUSTED_EXTERNAL_DATA' ||
    (item.sha256 !== undefined && (typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(item.sha256))) ||
    (item.mimeType !== undefined && (typeof item.mimeType !== 'string' || item.mimeType.length > 128)) ||
    (item.kind !== undefined && !['text', 'pdf', 'zip', 'word', 'spreadsheet', 'presentation', 'image'].includes(item.kind)) ||
    (item.note !== undefined && (typeof item.note !== 'string' || item.note.length > 500))))) {
    return { status: 400, error: 'Attachment provenance is invalid or exceeds the task limits.' };
  }
  const sanitizedMetadata = {
    client: typeof metadata.client === 'string' ? metadata.client.slice(0, 80) : 'centipede_os',
    contextCompression: typeof metadata.contextCompression === 'string' ? metadata.contextCompression.slice(0, 80) : 'none',
    attachments: (attachments || []).map((item: any) => ({
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      ...(item.sha256 ? { sha256: item.sha256 } : {}),
      kind: item.kind,
      note: item.note,
      trust: item.trust,
    })),
  };
  return forwardKingdomRequest(endpoint, config.token, 'POST', { prompt, metadata: sanitizedMetadata }, 60_000);
}

/** Read-only Kingdom data and narrowly allowlisted, local-admin task actions. */
export async function proxyKingdomRead(req: ApiRequest): Promise<ApiResponse | null> {
  if (!req.path.startsWith(`${PREFIX}/`)) return null;
  if (req.method !== 'GET') return { status: 405, error: 'Only read-only Kingdom requests are available through this endpoint.' };
  if (!req.isLocalAdmin) return { status: 403, error: 'Kingdom status access is available only from the Centipede host.' };

  const path = req.path.slice(PREFIX.length);
  if (!isAllowedReadPath(path)) return { status: 404, error: 'Kingdom read endpoint is not available through this proxy.' };

  const config = kingdomConfiguration();
  if (!config) {
    return { status: 503, error: 'Kingdom connection is not configured on the Centipede server.' };
  }

  const endpoint = buildKingdomEndpoint(config.baseUrl, path, req.query || '');
  if (!endpoint) return { status: 503, error: 'Kingdom server configuration is invalid.' };

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${config.token}` },
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
