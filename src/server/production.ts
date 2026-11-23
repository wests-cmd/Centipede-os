import { join, normalize, resolve } from 'node:path';
import { discoverLanAddress } from './networkDiscovery';
import { apiRouter, ApiRequest } from './routes';
import { isLocalAdminRequest } from './requestTrust';
import { SelectedKnowledgeSources } from './selectedKnowledgeSources';
import { handleSelectedKnowledgeRequest } from './selectedKnowledgeRoutes';
import { serve, ServerOptions, staticFile } from './httpRuntime';

const root = process.cwd();
const webRoot = process.env.CENTIPEDE_WEB_ROOT ? resolve(process.env.CENTIPEDE_WEB_ROOT) : join(root, 'dist');
const port = Number(process.env.PORT || 3000);
const lanAddress = discoverLanAddress(process.env.HOST);
const hostnames = process.env.HOST
  ? process.env.HOST.split(',').map((host) => host.trim()).filter(Boolean)
  : ['127.0.0.1', ...(lanAddress ? [lanAddress] : [])];
const publicUrl = process.env.PUBLIC_URL || (lanAddress ? `http://${lanAddress}:${port}` : `http://localhost:${port}`);
const rateWindows = new Map<string, { startsAt: number; count: number }>();
const pruneRateWindows = (now: number) => {
  if (rateWindows.size > 200) {
    for (const [k, v] of rateWindows.entries()) {
      if (now - v.startsAt >= 60_000) rateWindows.delete(k);
    }
  }
};
let knowledgeSources: SelectedKnowledgeSources | undefined;
const selectedSources = () => knowledgeSources ??= new SelectedKnowledgeSources(
  process.env.CENTIPEDE_KNOWLEDGE_HOME || join(root, 'data', 'selected-knowledge'));

const serverOptions: ServerOptions = {
  port,
  // Restrict request size; pairing requests are tiny JSON documents.
  maxRequestBodySize: 1024 * 1024,
  async fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (!['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'].includes(request.method)) {
        return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { Allow: 'GET, POST, PUT, DELETE, OPTIONS' } });
      }
      if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
      let body: unknown;
      if (request.method === 'POST') {
        try { body = await request.json(); }
        catch { return Response.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
      }
      const apiRequest: ApiRequest = {
        path: url.pathname,
        method: request.method as ApiRequest['method'],
        headers: Object.fromEntries(request.headers.entries()),
        body,
        query: url.search,
        // Transport-verifiable fields: neither user JSON nor Host headers
        // may override the endpoint or claim encrypted TLS protection.
        serverPairingEndpoint: publicUrl,
        isSecureTransport: url.protocol === 'https:',
        isLocalAdmin: isLocalAdminRequest(
          server.requestIP(request)?.address,
          Object.fromEntries(request.headers.entries()),
          url.protocol === 'https:' ? 'https' : 'http',
        ),
      };
      const address = server.requestIP(request)?.address || 'unknown';
      const limitedRoute = url.pathname === '/api/v1/mobile/pair/confirm' || url.pathname === '/api/v1/mobile/pair/initiate';
      if (limitedRoute) {
        const key = `${address}:${url.pathname}`;
        const now = Date.now();
        pruneRateWindows(now);
        const window = rateWindows.get(key);
        const max = url.pathname.endsWith('/confirm') ? 10 : 5;
        if (!window || now - window.startsAt >= 60_000) rateWindows.set(key, { startsAt: now, count: 1 });
        else if (window.count >= max) return Response.json({ error: 'Too many pairing requests. Wait one minute and try again.' }, { status: 429, headers: { 'Retry-After': '60' } });
        else window.count += 1;
      }
      const result = handleSelectedKnowledgeRequest(apiRequest, selectedSources) || await apiRouter.handleRequest(apiRequest);
      return Response.json(result.error ? { error: result.error } : result.data, { status: result.status });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    let relativePath: string;
    try { relativePath = decodeURIComponent(url.pathname); }
    catch { return new Response('Bad request', { status: 400 }); }
    relativePath = relativePath.replace(/^\/+/, '');
    const safePath = normalize(relativePath || 'index.html');
    if (safePath.startsWith('..') || safePath.includes(':')) return new Response('Not found', { status: 404 });
    const head = request.method === 'HEAD';
    return await staticFile(join(webRoot, safePath), head)
      || await staticFile(join(webRoot, 'index.html'), head)
      || new Response('Centipede web build is missing. Run `bun run build` first.', { status: 503 });
  },
};
const servers = hostnames.map((hostname) => serve(serverOptions, hostname));

console.log(`[Centipede] Web app and pairing API listening at ${hostnames.map((hostname) => `http://${hostname}:${port}`).join(', ')}`);
console.log(`[Centipede] Phone address for this network: ${publicUrl}`);
console.log('[Centipede] Device administration requires a loopback peer and a localhost request origin.');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    for (const server of servers) server.stop(true);
    process.exit(0);
  });
}
