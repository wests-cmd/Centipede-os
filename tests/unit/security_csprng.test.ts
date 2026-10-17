import { describe, expect, it } from 'vitest';
import { generateSecureRandomHex, generateSecurePin } from '../../src/security/cryptoUtils';
import { capabilityGrantEngine } from '../../src/agent/grants';
import { deviceTrustManager } from '../../src/security/deviceTrust';
import { agentIdentityManager } from '../../src/agent/identity';
import { toolExecutor } from '../../src/tools/executor';
import { initializeVerifiedTools } from '../../src/tools/definitions';

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

  it('agentIdentityManager and ToolExecutor use CSPRNG for IDs and approval keys', async () => {
    initializeVerifiedTools();
    const identity = agentIdentityManager.createIdentity('TestAgent');
    expect(identity.agentId).toMatch(/^agent_\d+_[0-9a-f]{8}$/);

    const execResult = await toolExecutor.execute({
      id: 'req_1',
      toolId: 'filesystem.delete_restricted',
      parameters: { target: 'test.txt' },
      chainDepth: 1,
    });

    expect(execResult.status).toBe('PENDING');
    expect(execResult.data?.approvalId).toMatch(/^appr_\d+_[0-9a-f]{8}$/);
    expect(execResult.idempotencyKey).toMatch(/^idemp_filesystem\.delete_restricted_\d+_[0-9a-f]{8}$/);
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
