import type { ApiRequest, ApiResponse } from './routes';
import { KnowledgeSourceError, SelectedKnowledgeSources } from './selectedKnowledgeSources';

/** Native adapter only: isLocalAdmin must come from requestTrust, never JSON/headers. */
export function handleSelectedKnowledgeRequest(req: ApiRequest, service: () => SelectedKnowledgeSources): ApiResponse | null {
  if (!req.path.startsWith('/api/v1/knowledge/')) return null;
  if (req.isLocalAdmin !== true) return { status: 403, error: 'Local administration required.' };
  const exact = (keys: string[]) => req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    && Object.keys(req.body).length === keys.length && keys.every(k => Object.hasOwn(req.body, k));
  try {
    if (req.path === '/api/v1/knowledge/sources' && req.method === 'GET')
      return { status: 200, data: { sources: service().list() } };
    if (req.method !== 'POST') return { status: 405, error: 'Method not allowed.' };
    if (req.path === '/api/v1/knowledge/sources') {
      if (!exact(['root', 'label'])) return { status: 400, error: 'Choose a source folder and label.' };
      return { status: 201, data: service().add(req.body.root, req.body.label) };
    }
    if (req.path === '/api/v1/knowledge/revoke') {
      if (!exact(['id']) || typeof req.body.id !== 'string') return { status: 400, error: 'Choose a source.' };
      return { status: 200, data: service().revoke(req.body.id) };
    }
    if (req.path === '/api/v1/knowledge/scan') {
      if (!exact(['id', 'paths']) || typeof req.body.id !== 'string') return { status: 400, error: 'Choose a source and explicit text paths.' };
      return { status: 200, data: service().scan(req.body.id, req.body.paths) };
    }
    if (req.path === '/api/v1/knowledge/extract') {
      if (!exact(['id', 'path']) || typeof req.body.id !== 'string') return { status: 400, error: 'Choose a source and text path.' };
      return { status: 200, data: service().extract(req.body.id, req.body.path) };
    }
    return { status: 404, error: 'Endpoint not found.' };
  } catch (error) {
    if (error instanceof KnowledgeSourceError) {
      return { status: error.code === 'ACCESS_REVOKED' ? 403 : error.code === 'NOT_FOUND' ? 404
        : ['CONFLICT', 'SOURCE_CHANGED', 'CHECKPOINT_UNAVAILABLE'].includes(error.code) ? 409 : 400,
      error: error.code };
    }
    // Do not log selected filenames, content or platform exception paths.
    return { status: 409, error: 'Source unavailable or changed; review its selection.' };
  }
}
