import { apiRouter, ApiRequest } from './routes';
import { isLocalAdminRequest } from './requestTrust';

let nodeHttp: any = null;
try {
  if (typeof window === 'undefined' && typeof process !== 'undefined') {
    const req = typeof require !== 'undefined' ? require : null;
    if (req) {
      nodeHttp = req('http');
    }
  }
} catch (_) {}

// Maximum allowed incoming HTTP request body size (1 MB) to prevent denial-of-service memory exhaustion
export const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

interface RateLimitRecord {
  startsAt: number;
  count: number;
}

export class CentipedeServer {
  private isListening = false;
  private httpServer: any = null;
  private activePort = 3000;
  private rateWindows: Map<string, RateLimitRecord> = new Map();

  // Bounded rate limit check for sensitive endpoints (/api/v1/mobile/pair/*)
  private checkRateLimit(remoteAddress: string, pathname: string): boolean {
    const isLimited = pathname === '/api/v1/mobile/pair/confirm' || pathname === '/api/v1/mobile/pair/initiate';
    if (!isLimited) return true;

    const now = Date.now();
    // Prune stale entries when map grows to prevent memory exhaustion DoS
    if (this.rateWindows.size > 200) {
      for (const [k, v] of this.rateWindows.entries()) {
        if (now - v.startsAt >= 60_000) this.rateWindows.delete(k);
      }
    }

    const key = `${remoteAddress || 'unknown'}:${pathname}`;
    const window = this.rateWindows.get(key);
    const max = pathname.endsWith('/confirm') ? 10 : 5;

    if (!window || now - window.startsAt >= 60_000) {
      this.rateWindows.set(key, { startsAt: now, count: 1 });
      return true;
    }
    if (window.count >= max) {
      return false;
    }
    window.count += 1;
    return true;
  }

  public start(port = 3000): void {
    this.activePort = port;
    this.isListening = true;

    if (nodeHttp && !this.httpServer) {
      try {
        this.httpServer = nodeHttp.createServer(async (req: any, res: any) => {
          if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
          }

          let body: any = undefined;
          if (req.method === 'POST' || req.method === 'PUT') {
            // Check Content-Length upfront if supplied as early rejection
            const contentLength = Number(req.headers?.['content-length'] || 0);
            if (contentLength > MAX_REQUEST_BODY_BYTES) {
              res.writeHead(413, { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' });
              res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE: Request body exceeds maximum allowed size.' }));
              req.destroy();
              return;
            }

            const buffers: Uint8Array[] = [];
            let totalBytes = 0;
            try {
              for await (const chunk of req) {
                totalBytes += chunk.byteLength || chunk.length || 0;
                if (totalBytes > MAX_REQUEST_BODY_BYTES) {
                  res.writeHead(413, { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' });
                  res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE: Request body exceeds maximum allowed size.' }));
                  req.destroy();
                  return;
                }
                buffers.push(chunk);
              }
            } catch {
              return;
            }

            const rawBody = Buffer.concat(buffers).toString('utf8');
            if (rawBody.trim()) {
              try {
                body = JSON.parse(rawBody);
              } catch (_) {
                body = rawBody;
              }
            }
          }

          const requestUrl = new URL(req.url || '/', 'http://localhost');

          // Enforce per-IP rate limiting on pairing routes to mitigate brute-force and DoS
          if (!this.checkRateLimit(req.socket?.remoteAddress, requestUrl.pathname)) {
            res.writeHead(429, {
              'Content-Type': 'application/json',
              'X-Content-Type-Options': 'nosniff',
              'Retry-After': '60',
            });
            res.end(JSON.stringify({ error: 'Too many pairing requests. Wait one minute and try again.' }));
            return;
          }

          const apiReq: ApiRequest = {
            path: requestUrl.pathname,
            method: req.method,
            headers: req.headers,
            body,
            query: requestUrl.search,
            isLocalAdmin: isLocalAdminRequest(
              req.socket?.remoteAddress,
              req.headers,
              req.socket?.encrypted ? 'https' : 'http',
            ),
          };

          const apiRes = await apiRouter.handleRequest(apiReq);
          res.writeHead(apiRes.status, { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' });
          if (apiRes.error) {
            res.end(JSON.stringify({ error: apiRes.error }));
          } else {
            res.end(JSON.stringify(apiRes.data));
          }
        });

        this.httpServer.listen(port, () => {
          console.log(`[CentipedeServer] Bound REAL HTTP Server listening on port ${port}`);
        });
      } catch (err: any) {
        console.warn(`[CentipedeServer] HTTP Socket binding notice: ${err.message}`);
      }
    } else {
      console.log(`[CentipedeServer] In-process router active for desktop shell (Port ${port})`);
    }
  }

  public getMode(): 'REAL_HTTP_SERVER' | 'IN_PROCESS_ROUTER' {
    return this.httpServer ? 'REAL_HTTP_SERVER' : 'IN_PROCESS_ROUTER';
  }

  public async dispatch(req: ApiRequest) {
    return apiRouter.handleRequest(req);
  }

  public resetRateLimits(): void {
    this.rateWindows.clear();
  }

  public stop(): void {
    this.isListening = false;
    if (this.httpServer) {
      try {
        this.httpServer.close();
      } catch (_) {}
      this.httpServer = null;
    }
  }
}

export const centipedeServer = new CentipedeServer();
