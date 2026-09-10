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

function generateSecureRandomHex(bytes = 16): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    const array = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 10);
}

function generateSecurePin(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    const pin = (array[0] % 900000) + 100000;
    return pin.toString();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class DeviceTrustManager {
  private devices: Map<string, TrustedDevice> = new Map();
  private pendingPairingCodes: Map<string, { deviceId: string; expiresAt: number }> = new Map();

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
    this.pendingPairingCodes.set(pairingCode, { deviceId, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 min TTL

    return {
      deviceId,
      pairingCode,
      qrData: JSON.stringify({ deviceId, pairingCode, centipedeEndpoint: 'http://localhost:3000' }),
    };
  }

  public confirmPairing(pairingCode: string): { success: boolean; sessionToken?: string; error?: string } {
    const pending = this.pendingPairingCodes.get(pairingCode);
    if (!pending || pending.expiresAt < Date.now()) {
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
