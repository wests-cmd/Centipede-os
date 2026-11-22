import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';

interface Peer { requestIP(request: Request): { address: string } | null }
export interface ServerOptions {
  port: number;
  maxRequestBodySize: number;
  fetch(request: Request, server: Peer): Promise<Response>;
}

/** Transport adapter only: the production router remains the single authority boundary. */
export function serve(options: ServerOptions, hostname: string) {
  if (typeof Bun !== 'undefined') return Bun.serve({ ...options, hostname });
  const server = createServer(async (incoming, outgoing) => {
    try {
      const chunks: Buffer[] = [];
      let bytes = 0;
      if (Number(incoming.headers['content-length']) > options.maxRequestBodySize) {
        outgoing.writeHead(413).end(); incoming.resume(); return;
      }
      for await (const chunk of incoming) {
        bytes += chunk.length;
        if (bytes > options.maxRequestBodySize) {
          outgoing.writeHead(413).end(); incoming.resume(); return;
        }
        chunks.push(chunk);
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
      if (!incoming.url?.startsWith('/')) { outgoing.writeHead(400).end(); return; }
      const method = incoming.method || 'GET';
      const request = new Request(`http://${incoming.headers.host || 'localhost'}${incoming.url}`, {
        method, headers, ...(bytes ? { body: Buffer.concat(chunks) } : {}),
      });
      const response = await options.fetch(request, {
        requestIP: () => incoming.socket.remoteAddress ? { address: incoming.socket.remoteAddress } : null,
      });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      outgoing.end(method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
    } catch {
      if (!outgoing.headersSent) outgoing.writeHead(400);
      outgoing.end();
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.listen(options.port, hostname);
  return { stop(force: boolean) { if (force) server.closeAllConnections(); server.close(); } };
}

const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

export async function staticFile(path: string, head: boolean): Promise<Response | null> {
  try {
    if (!(await stat(path)).isFile()) return null;
    return new Response(head ? null : await readFile(path), {
      headers: { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code || '')) return null;
    throw error;
  }
}
