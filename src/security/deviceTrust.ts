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
}

export class DeviceTrustManager {
  private devices: Map<string, TrustedDevice> = new Map();
  private pendingPairingCodes: Map<string, { deviceId: string; expiresAt: number; attempts: number }> = new Map();
  private static readonly MAX_PAIRING_ATTEMPTS = 5;

  // Cleanup expired pairing codes to prevent memory leakage
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [code, entry] of this.pendingPairingCodes.entries()) {
      if (entry.expiresAt <= now) {
        this.pendingPairingCodes.delete(code);
      }
    }
  }

  // CSPRNG helpers to prevent PRNG state prediction for PINs, tokens, and device IDs
  private getRandomHex(bytes: number): string {
    const buf = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  private generateSecurePin(): string {
    // Cryptographically secure 6-digit PIN generation (100000 - 999999)
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    const pinNum = 100000 + (buf[0] % 900000);
    return pinNum.toString();
  }

  public initiatePairing(deviceName: string, deviceType: DeviceType): { deviceId: string; pairingCode: string; qrData: string } {
    this.cleanupExpired();
    const deviceId = `dev_${Date.now()}_${this.getRandomHex(4)}`;
    const pairingCode = this.generateSecurePin();

    const device: TrustedDevice = {
      deviceId,
      deviceName,
      deviceType,
      trustState: 'PENDING_PAIRING',
      pairingCode,
      allowedCapabilities: deviceType === 'MOBILE_APP'
        ? ['task.submit', 'task.view', 'approval.view', 'approval.action', 'ingest.upload', 'status.view']
        : ['*'], // Desktop full UI access
    };

    this.devices.set(deviceId, device);
    this.pendingPairingCodes.set(pairingCode, { deviceId, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 }); // 5 min TTL

    return {
      deviceId,
      pairingCode,
      qrData: JSON.stringify({ deviceId, pairingCode, centipedeEndpoint: 'http://localhost:3000' }),
    };
  }

  public confirmPairing(pairingCode: string): { success: boolean; sessionToken?: string; error?: string } {
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
      return { success: false, error: 'Invalid or expired pairing code.' };
    }

    if (pending.expiresAt < Date.now()) {
      this.pendingPairingCodes.delete(pairingCode);
      return { success: false, error: 'Invalid or expired pairing code.' };
    }

    const device = this.devices.get(pending.deviceId);
    if (!device) {
      return { success: false, error: 'Device not found.' };
    }

    const sessionToken = `tok_${Date.now()}_${this.getRandomHex(8)}`;
    device.trustState = 'PAIRED_ACTIVE';
    device.sessionToken = sessionToken;
    device.pairedAt = Date.now();
    device.lastSeenAt = Date.now();

    this.pendingPairingCodes.delete(pairingCode);
    return { success: true, sessionToken };
  }

  public validateSessionToken(sessionToken: string): { valid: boolean; device?: TrustedDevice; error?: string } {
    const device = Array.from(this.devices.values()).find((d) => d.sessionToken === sessionToken);
    if (!device) {
      return { valid: false, error: 'Device not authenticated or session token invalid.' };
    }

    if (device.trustState === 'REVOKED') {
      return { valid: false, error: 'REVOKED_DEVICE: Device access has been revoked by system administrator.' };
    }

    device.lastSeenAt = Date.now();
    return { valid: true, device };
  }

  public revokeDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    device.trustState = 'REVOKED';
    device.sessionToken = undefined;
    return true;
  }

  public getPairedDevices(): TrustedDevice[] {
    return Array.from(this.devices.values()).filter((d) => d.trustState === 'PAIRED_ACTIVE' || d.trustState === 'REVOKED');
  }
}

export const deviceTrustManager = new DeviceTrustManager();
