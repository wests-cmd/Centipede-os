import { generateSecureRandomHex, generateSecurePin } from './cryptoUtils';

export type DeviceType = 'DESKTOP' | 'MOBILE_APP' | 'WEB_CLIENT';
export type DeviceTrustState = 'UNPAIRED' | 'PENDING_PAIRING' | 'PAIRED_ACTIVE' | 'REVOKED';

export interface TrustedDevice {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  trustState: DeviceTrustState;
  pairingCode?: string;
  sessionToken?: string;
  allowedCapabilities: string[];
  pairedAt?: number;
  lastSeenAt?: number;
  sessionExpiresAt?: number;
}

export interface PairingConfirmationResult {
  success: boolean;
  sessionToken?: string;
  deviceId?: string;
  error?: string;
}

export class DeviceTrustManager {
  public static readonly MAX_PAIRING_ATTEMPTS = 5;
  public static readonly SESSION_TTL_MS = 24 * 60 * 60 * 1000;
  public static readonly MAX_PENDING_CODES = 64;
  private devices: Map<string, TrustedDevice> = new Map();
  private pendingPairingCodes: Map<string, { deviceId: string; expiresAt: number; attempts: number }> = new Map();
  private sessionTokenIndex: Map<string, TrustedDevice> = new Map();
  private lastCleanupMs = 0;

  private cleanupExpired(): void {
    const now = Date.now();
    if (now - this.lastCleanupMs < 10000 && this.pendingPairingCodes.size < 20) return;
    this.lastCleanupMs = now;

    for (const [code, pending] of this.pendingPairingCodes.entries()) {
      if (pending.expiresAt < now || pending.attempts > DeviceTrustManager.MAX_PAIRING_ATTEMPTS) {
        this.pendingPairingCodes.delete(code);
        const device = this.devices.get(pending.deviceId);
        if (device?.trustState === 'PENDING_PAIRING') this.devices.delete(pending.deviceId);
      }
    }
  }

  public initiatePairing(deviceName: string, deviceType: DeviceType, endpoint = 'http://localhost:3000'): { deviceId: string; pairingCode: string; qrData: string } {
    this.cleanupExpired();
    if (typeof deviceName !== 'string' || !deviceName.trim() || deviceName.length > 80 ||
        /[\\x00-\\x1f\\x7f]/.test(deviceName)) throw new Error('Invalid device name.');
    if (this.pendingPairingCodes.size >= DeviceTrustManager.MAX_PENDING_CODES)
      throw new Error('Too many outstanding pairing requests.');
    const deviceId = `dev_${Date.now()}_${generateSecureRandomHex(16)}`;
    let pairingCode = '';
    for (let attempt = 0; attempt < 16; attempt++) {
      const candidate = generateSecurePin();
      if (!this.pendingPairingCodes.has(candidate)) { pairingCode = candidate; break; }
    }
    if (!pairingCode) throw new Error('No available unique pairing code.');

    const device: TrustedDevice = {
      deviceId,
      deviceName: deviceName.trim(),
      deviceType,
      trustState: 'PENDING_PAIRING',
      pairingCode,
      // Pairing is only identity enrollment; it does NOT grant Kingdom task,
      // approval, upload or device administration permissions. No phone-side
      // privileged capability is implemented/verified yet.
      allowedCapabilities: ['status.view'],
    };

    this.devices.set(deviceId, device);
    this.pendingPairingCodes.set(pairingCode, { deviceId, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 }); // 5 min TTL

    return {
      deviceId,
      pairingCode,
      qrData: JSON.stringify({ deviceId, pairingCode, centipedeEndpoint: endpoint }),
    };
  }

  public confirmPairing(pairingCode: string): PairingConfirmationResult {
    this.cleanupExpired();

    if (!pairingCode || typeof pairingCode !== 'string' || !/^\d{6}$/.test(pairingCode)) {
      return { success: false, error: 'Invalid pairing code format.' };
    }

    const pending = this.pendingPairingCodes.get(pairingCode);
    if (!pending) {
      return { success: false, error: 'Invalid or expired pairing code.' };
    }

    pending.attempts += 1;
    if (pending.attempts > DeviceTrustManager.MAX_PAIRING_ATTEMPTS) {
      this.pendingPairingCodes.delete(pairingCode);
      const device = this.devices.get(pending.deviceId);
      if (device && device.trustState === 'PENDING_PAIRING') {
        this.devices.delete(pending.deviceId);
      }
      return { success: false, error: 'Invalid or expired pairing code.' };
    }

    if (pending.expiresAt < Date.now()) {
      this.pendingPairingCodes.delete(pairingCode);
      const device = this.devices.get(pending.deviceId);
      if (device && device.trustState === 'PENDING_PAIRING') {
        this.devices.delete(pending.deviceId);
      }
      return { success: false, error: 'Invalid or expired pairing code.' };
    }

    const device = this.devices.get(pending.deviceId);
    if (!device) {
      return { success: false, error: 'Device not found.' };
    }

    const sessionToken = `tok_${generateSecureRandomHex(32)}`;
    device.trustState = 'PAIRED_ACTIVE';
    device.sessionToken = sessionToken;
    device.pairedAt = Date.now();
    device.lastSeenAt = Date.now();
    device.sessionExpiresAt = Date.now() + DeviceTrustManager.SESSION_TTL_MS;

    this.sessionTokenIndex.set(sessionToken, device);
    this.pendingPairingCodes.delete(pairingCode);
    return { success: true, sessionToken, deviceId: device.deviceId };
  }

  public validateSessionToken(sessionToken: string): { valid: boolean; device?: TrustedDevice; error?: string } {
    if (!sessionToken || typeof sessionToken !== 'string' || sessionToken.trim() === '') {
      return { valid: false, error: 'Device not authenticated or session token invalid.' };
    }

    const device = this.sessionTokenIndex.get(sessionToken) || Array.from(this.devices.values()).find((d) => d.sessionToken === sessionToken);
    if (device && device.trustState === 'PAIRED_ACTIVE' &&
        (!device.sessionExpiresAt || Date.now() >= device.sessionExpiresAt)) {
      this.revokeDevice(device.deviceId);
      return { valid: false, error: 'DEVICE_SESSION_EXPIRED: Pair the device again.' };
    }
    if (!device || device.trustState !== 'PAIRED_ACTIVE' || device.sessionToken !== sessionToken) {
      if (device && device.trustState === 'REVOKED') {
        return { valid: false, error: 'REVOKED_DEVICE: Device access has been revoked by system administrator.' };
      }
      return { valid: false, error: 'Device not authenticated or session token invalid.' };
    }

    device.lastSeenAt = Date.now();
    return { valid: true, device };
  }

  public revokeDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    if (device.sessionToken) {
      this.sessionTokenIndex.delete(device.sessionToken);
    }
    device.trustState = 'REVOKED';
    device.sessionToken = undefined;
    device.sessionExpiresAt = undefined;
    return true;
  }

  public getPairedDevices(): TrustedDevice[] {
    this.cleanupExpired();
    return Array.from(this.devices.values()).filter((d) => d.trustState === 'PAIRED_ACTIVE' || d.trustState === 'REVOKED');
  }
}

export const deviceTrustManager = new DeviceTrustManager();
