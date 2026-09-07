import { deviceTrustManager } from '../security/deviceTrust';
import { platformDetector } from '../platform/detector';
import { configManager } from '../config';

export interface ApiRequest {
  path: string;
  method: 'GET' | 'POST' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

export interface ApiResponse {
  status: number;
  data?: any;
  error?: string;
}

export class ApiRouter {
  public async handleRequest(req: ApiRequest): Promise<ApiResponse> {
    const sessionToken = req.headers?.['authorization']?.replace('Bearer ', '');

    // 1. Unauthenticated Public Endpoints
    if (req.path === '/api/v1/health') {
      const configVal = configManager.validateConfig();
      return {
        status: 200,
        data: {
          status: configVal.valid ? 'HEALTHY' : 'DEGRADED',
          version: '1.0.0',
          timestamp: Date.now(),
        },
      };
    }

    if (req.path === '/api/v1/runtime') {
      const runtimeInfo = await platformDetector.detectRuntimeInfo();
      return { status: 200, data: runtimeInfo };
    }

    if (req.path === '/api/v1/mobile/pair/initiate' && req.method === 'POST') {
      const name = req.body?.deviceName || 'Mobile Companion';
      const pairing = deviceTrustManager.initiatePairing(name, 'MOBILE_APP');
      return { status: 200, data: pairing };
    }

    if (req.path === '/api/v1/mobile/pair/confirm' && req.method === 'POST') {
      const result = deviceTrustManager.confirmPairing(req.body?.pairingCode || '');
      return result.success ? { status: 200, data: result } : { status: 401, error: result.error };
    }

    // 2. Session Authenticated Endpoints
    if (!sessionToken) {
      return { status: 401, error: 'UNAUTHORIZED: Missing session token.' };
    }

    const auth = deviceTrustManager.validateSessionToken(sessionToken);
    if (!auth.valid) {
      return { status: 403, error: auth.error };
    }

    if (req.path === '/api/v1/mobile/revoke' && req.method === 'POST') {
      const revoked = deviceTrustManager.revokeDevice(req.body?.deviceId || '');
      return { status: 200, data: { revoked } };
    }

    return { status: 404, error: 'Endpoint not found.' };
  }
}

export const apiRouter = new ApiRouter();
