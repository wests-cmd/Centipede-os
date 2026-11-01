/** Minimal Bun server surface used by the production adapter. */
declare const Bun: {
  serve(options: {
    hostname: string;
    port: number;
    maxRequestBodySize: number;
    fetch(request: Request, server: { port: number; requestIP(request: Request): { address: string } | null }): Response | Promise<Response>;
  }): { port: number; stop(force?: boolean): void };
  file(path: string): Blob & { exists(): Promise<boolean> };
};
