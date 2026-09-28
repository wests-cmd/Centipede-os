import { apiRouter, ApiRequest } from './routes';

export class CentipedeServer {
  private isListening = false;

  public start(port = 3000): void {
    this.isListening = true;
    console.log(`Centipede OS API Server listening on port ${port}`);
  }

  public async dispatch(req: ApiRequest) {
    return apiRouter.handleRequest(req);
  }

  public stop(): void {
    this.isListening = false;
  }
}

export const centipedeServer = new CentipedeServer();
