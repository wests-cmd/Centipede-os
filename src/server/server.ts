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

export class CentipedeServer {
  private isListening = false;
  private httpServer: any = null;
  private activePort = 3000;

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
            const buffers: Uint8Array[] = [];
            for await (const chunk of req) {
              buffers.push(chunk);
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
          res.writeHead(apiRes.status, { 'Content-Type': 'application/json' });
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
