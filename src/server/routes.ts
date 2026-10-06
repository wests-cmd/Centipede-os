import { deviceTrustManager } from '../security/deviceTrust';
import { platformDetector } from '../platform/detector';
import { configManager } from '../config';
import { CENTIPEDE_VERSION } from '../version';
import { proxyKingdomRead } from './kingdomReadProxy';

export interface ApiRequest {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  query?: string;
  /** Set only by the HTTP adapter after checking the socket peer address. */
  isLocalAdmin?: boolean;
}

export interface ApiResponse {
  status: number;
  data?: any;
  error?: string;
}

export class ApiRouter {
  public async handleRequest(req: ApiRequest): Promise<ApiResponse> {
    try {
      const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'];
      const sessionToken = authHeader?.replace('Bearer ', '');

      // 1. Unauthenticated Public Endpoints
    if (req.path === '/api/v1/health') {
      const configVal = configManager.validateConfig();
      return {
        status: 200,
        data: {
          status: configVal.valid ? 'HEALTHY' : 'DEGRADED',
          version: CENTIPEDE_VERSION,
          timestamp: Date.now(),
        },
      };
    }

    if (req.path === '/api/v1/runtime') {
      const runtimeInfo = await platformDetector.detectRuntimeInfo();
      return { status: 200, data: runtimeInfo };
    }

    const kingdomRead = await proxyKingdomRead(req);
    if (kingdomRead) return kingdomRead;

    if (req.path === '/api/v1/mobile/pair/initiate' && req.method === 'POST') {
      if (!req.isLocalAdmin) {
        return { status: 403, error: 'FORBIDDEN: Pairing codes can only be created from the Centipede host.' };
      }
      const name = req.body?.deviceName || 'Mobile Companion';
      const pairing = deviceTrustManager.initiatePairing(name, 'MOBILE_APP', req.body?.endpoint);
      return { status: 200, data: pairing };
    }

    if (req.path === '/api/v1/mobile/pair/confirm' && req.method === 'POST') {
      const result = deviceTrustManager.confirmPairing(req.body?.pairingCode || '');
      return result.success ? { status: 200, data: result } : { status: 401, error: result.error };
    }

    // Device administration is available only through a loopback connection.
    // A LAN client can complete a short-lived pairing but cannot enumerate or
    // revoke other devices. Headers such as Host and Sec-Fetch-Site are not authority.
    if (req.isLocalAdmin && req.path === '/api/v1/mobile/devices' && req.method === 'GET') {
      const devices = deviceTrustManager.getPairedDevices().map(({ sessionToken: _token, pairingCode: _code, ...device }) => device);
      return { status: 200, data: { devices } };
    }
    if (req.isLocalAdmin && req.path === '/api/v1/mobile/revoke' && req.method === 'POST') {
      return { status: 200, data: { revoked: deviceTrustManager.revokeDevice(req.body?.deviceId || '') } };
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
      const targetDeviceId = req.body?.deviceId || auth.device?.deviceId || '';
      if (targetDeviceId !== auth.device?.deviceId) {
        return { status: 403, error: 'FORBIDDEN: A paired device can only revoke its own session.' };
      }
      const revoked = deviceTrustManager.revokeDevice(targetDeviceId);
      return { status: 200, data: { revoked } };
    }

    return { status: 404, error: 'Endpoint not found.' };
    } catch (err: any) {
      console.error('API Error:', err);
      // Fail securely: do not leak internal error message or stack trace to client
      return { status: 500, error: 'Internal Server Error.' };
    }
  }
}

export const apiRouter = new ApiRouter();
