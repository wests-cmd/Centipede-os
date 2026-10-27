import { describe, expect, it } from 'vitest';
import { generateSecureRandomHex, generateSecurePin } from '../../src/security/cryptoUtils';
import { capabilityGrantEngine } from '../../src/agent/grants';
import { deviceTrustManager } from '../../src/security/deviceTrust';

describe('CSPRNG Token & Grant ID Security Invariants', () => {
  it('generateSecureRandomHex generates exact hex strings of specified byte length and uniqueness', () => {
    const hex16 = generateSecureRandomHex(16);
    const hex8 = generateSecureRandomHex(8);

    expect(hex16).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(hex8).toHaveLength(16); // 8 bytes = 16 hex chars
    expect(hex16).toMatch(/^[0-9a-f]{32}$/);
    expect(hex8).toMatch(/^[0-9a-f]{16}$/);

    // Verify randomness uniqueness across 100 iterations
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(generateSecureRandomHex(16));
    }
    expect(set.size).toBe(100);
  });

  it('generateSecurePin generates valid 6-digit PIN codes within range [100000, 999999]', () => {
    for (let i = 0; i < 50; i++) {
      const pin = generateSecurePin();
      expect(pin).toMatch(/^\d{6}$/);
      const num = parseInt(pin, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it('capabilityGrantEngine issues JIT capability grants with CSPRNG grant IDs', () => {
    const grant = capabilityGrantEngine.issueJustInTimeGrant(
      'agent_test',
      'filesystem.read',
      '/sandbox/test.txt'
    );

    expect(grant.grantId).toMatch(/^grant_\d+_[0-9a-f]{16}$/);

    const grant2 = capabilityGrantEngine.issueJustInTimeGrant(
      'agent_test',
      'filesystem.read',
      '/sandbox/test2.txt'
    );

    expect(grant.grantId).not.toBe(grant2.grantId);
  });

  it('deviceTrustManager uses CSPRNG for device IDs and pairing codes', () => {
    const pairing = deviceTrustManager.initiatePairing('Test Device', 'MOBILE_APP');

    expect(pairing.deviceId).toMatch(/^dev_\d+_[0-9a-f]{8}$/);
    expect(pairing.pairingCode).toMatch(/^\d{6}$/);
  });

  it('deviceTrustManager validateSessionToken rejects invalid tokens and unfulfilled trust states', () => {
    // 1. Rejects undefined, empty string, or non-string inputs
    expect(deviceTrustManager.validateSessionToken(undefined as any).valid).toBe(false);
    expect(deviceTrustManager.validateSessionToken('').valid).toBe(false);
    expect(deviceTrustManager.validateSessionToken('   ').valid).toBe(false);

    // 2. Pending device pairing must not pass session token validation
    const pendingPairing = deviceTrustManager.initiatePairing('Unconfirmed Device', 'MOBILE_APP');
    expect(deviceTrustManager.validateSessionToken(pendingPairing.deviceId).valid).toBe(false);

    // 3. Confirming pairing yields a valid session token for PAIRED_ACTIVE state
    const confirmResult = deviceTrustManager.confirmPairing(pendingPairing.pairingCode);
    expect(confirmResult.success).toBe(true);
    expect(confirmResult.sessionToken).toBeDefined();

    const validAuth = deviceTrustManager.validateSessionToken(confirmResult.sessionToken!);
    expect(validAuth.valid).toBe(true);
    expect(validAuth.device?.deviceId).toBe(pendingPairing.deviceId);

    // 4. Revoked device session token validation fails
    deviceTrustManager.revokeDevice(pendingPairing.deviceId);
    const revokedAuth = deviceTrustManager.validateSessionToken(confirmResult.sessionToken!);
    expect(revokedAuth.valid).toBe(false);
    expect(revokedAuth.error).toBeDefined();
  });

  it('fails closed if globalThis.crypto.getRandomValues is unavailable', () => {
    const originalCrypto = globalThis.crypto;
    try {
      // @ts-ignore
      delete globalThis.crypto;
      expect(() => generateSecureRandomHex(16)).toThrow(/CSPRNG_UNAVAILABLE/);
      expect(() => generateSecurePin()).toThrow(/CSPRNG_UNAVAILABLE/);
    } finally {
      // Restore crypto
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
        writable: true,
      });
    }
  });
});
