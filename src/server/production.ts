import { join, normalize } from 'node:path';
import { networkInterfaces } from 'node:os';
import { apiRouter, ApiRequest } from './routes';

const root = process.cwd();
const webRoot = join(root, 'dist');
const port = Number(process.env.PORT || 3000);
const isPrivateAddress = (address: string) => address.startsWith('10.') || address.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(address);
const interfaces = Object.values(networkInterfaces()).flat().filter((entry): entry is NonNullable<typeof entry> =>
  Boolean(entry && entry.family === 'IPv4' && !entry.internal));
const lanAddress = interfaces.find((entry) => isPrivateAddress(entry.address))?.address || interfaces.find((entry) => !entry.address.startsWith('169.254.'))?.address;
const hostnames = process.env.HOST
  ? process.env.HOST.split(',').map((host) => host.trim()).filter(Boolean)
  : ['127.0.0.1', ...(lanAddress ? [lanAddress] : [])];
const publicUrl = process.env.PUBLIC_URL || (lanAddress ? `http://${lanAddress}:${port}` : `http://localhost:${port}`);
const rateWindows = new Map<string, { startsAt: number; count: number }>();
const loopback = (address?: string | null) => address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
const hostnameFromHeader = (host: string) => host.startsWith('[') ? host.slice(1, host.indexOf(']')) : host.split(':')[0];

const serverOptions: Omit<Parameters<typeof Bun.serve>[0], 'hostname'> = {
  port,
  // Restrict request size; pairing requests are tiny JSON documents.
  maxRequestBodySize: 1024 * 1024,
  async fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (!['GET', 'POST', 'DELETE', 'OPTIONS'].includes(request.method)) {
        return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { Allow: 'GET, POST, DELETE, OPTIONS' } });
      }
      if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
      let body: unknown;
      if (request.method === 'POST') {
        try { body = await request.json(); }
        catch { return Response.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
      }
      if (url.pathname === '/api/v1/mobile/pair/initiate' && body && typeof body === 'object') {
        // Never trust a client-supplied endpoint; share the service's reachable address.
        const requestHost = request.headers.get('host') || '';
        const hostName = hostnameFromHeader(requestHost);
        const hostIsLoopback = ['localhost', '127.0.0.1', '::1'].includes(hostName);
        (body as Record<string, unknown>).endpoint = !hostIsLoopback && /^[a-zA-Z0-9.\-\[\]:]+$/.test(requestHost)
          ? `http://${requestHost}`
          : publicUrl;
      }
      const requestHost = request.headers.get('host') || '';
      const hostName = hostnameFromHeader(requestHost);
      const browserLocalhostRequest = ['localhost', '127.0.0.1', '::1'].includes(hostName)
        && request.headers.get('sec-fetch-site') === 'same-origin';
      const apiRequest: ApiRequest = {
        path: url.pathname,
        method: request.method as ApiRequest['method'],
        headers: Object.fromEntries(request.headers.entries()),
        body,
        isLocalAdmin: loopback(server.requestIP(request)?.address) || browserLocalhostRequest,
      };
      const address = server.requestIP(request)?.address || 'unknown';
      const limitedRoute = url.pathname === '/api/v1/mobile/pair/confirm' || url.pathname === '/api/v1/mobile/pair/initiate';
      if (limitedRoute) {
        const key = `${address}:${url.pathname}`;
        const now = Date.now();
        const window = rateWindows.get(key);
        const max = url.pathname.endsWith('/confirm') ? 10 : 5;
        if (!window || now - window.startsAt >= 60_000) rateWindows.set(key, { startsAt: now, count: 1 });
        else if (window.count >= max) return Response.json({ error: 'Too many pairing requests. Wait one minute and try again.' }, { status: 429, headers: { 'Retry-After': '60' } });
        else window.count += 1;
      }
      const result = await apiRouter.handleRequest(apiRequest);
      return Response.json(result.error ? { error: result.error } : result.data, { status: result.status });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    let relativePath: string;
    try { relativePath = decodeURIComponent(url.pathname); }
    catch { return new Response('Bad request', { status: 400 }); }
    relativePath = relativePath.replace(/^\/+/, '');
    const safePath = normalize(relativePath || 'index.html');
    if (safePath.startsWith('..') || safePath.includes(':')) return new Response('Not found', { status: 404 });
    let file = Bun.file(join(webRoot, safePath));
    if (!(await file.exists())) file = Bun.file(join(webRoot, 'index.html'));
    if (!(await file.exists())) return new Response('Centipede web build is missing. Run `bun run build` first.', { status: 503 });
    return new Response(request.method === 'HEAD' ? null : file);
  },
};
const servers = hostnames.map((hostname) => Bun.serve({ ...serverOptions, hostname }));

console.log(`[Centipede] Web app and pairing API listening at ${hostnames.map((hostname) => `http://${hostname}:${port}`).join(', ')}`);
console.log(`[Centipede] Phone address for this network: ${publicUrl}`);
console.log('[Centipede] Device administration is restricted to loopback connections.');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    for (const server of servers) server.stop(true);
    process.exit(0);
  });
}
