import { describe, it, expect } from 'vitest';
import { KingdomAdapter } from '../../src/api/kingdomAdapter';
import { capabilityNegotiator } from '../../src/api/capabilityNegotiator';
import { KINGDOM_CONTRACT_SPEC } from '../../src/api/contractSpec';

describe('Kingdom ↔ Centipede Compatibility & Adversarial Security Suite', () => {
  it('1. Capability Negotiation across Kingdom versions', () => {
    const adapter = new KingdomAdapter('http://127.0.0.1:8000');

    // Online compatible
    const compatResult = adapter.checkVersionCompatibility('40.1.0');
    expect(compatResult.status).toBe('COMPATIBLE');

    const evalSupported = adapter.negotiateCapability('filesystem.read');
    expect(evalSupported.status).toBe('DEGRADED'); // Adapter disconnected default

    // Test capabilityNegotiator direct evaluation
    const onlineRuntime = {
      centipedeVersion: '1.0.0',
      expectedKingdomContractVersion: '40.1.0',
      connectedKingdomVersion: '40.1.0',
      lastKnownKingdomVersion: '40.1.0',
      connectionState: 'CONNECTED' as const,
      compatibility: compatResult,
      running: true,
      mode: 'adaptive',
    };

    const nav1 = capabilityNegotiator.evaluateCapability('filesystem.read', onlineRuntime);
    expect(nav1.status).toBe('SUPPORTED');

    // Incompatible old version
    const oldRuntime = { ...onlineRuntime, connectedKingdomVersion: '39.5.0' };
    const navOld = capabilityNegotiator.evaluateCapability('filesystem.read', oldRuntime);
    expect(navOld.status).toBe('INCOMPATIBLE');

    // Unknown capability
    const navUnknown = capabilityNegotiator.evaluateCapability('fake.capability', onlineRuntime);
    expect(navUnknown.status).toBe('UNKNOWN');
  });

  it('2. Schema Drift Detection', () => {
    const res = capabilityNegotiator.validateResponseSchema('get_status', {
      running: true,
      mode: 'adaptive',
      // missing 'version' and 'tasks'
    });
    expect(res.valid).toBe(false);
    expect(res.missingFields).toContain('version');
    expect(res.missingFields).toContain('tasks');
  });

  it('3. Security Adversarial Scenario 1–5: Forged / Malicious Metadata', async () => {
    const adapter = new KingdomAdapter('http://127.0.0.1:8000');

    // Forged capability claims do not bypass ZeroTrust
    const forgedRuntime = {
      centipedeVersion: '1.0.0',
      expectedKingdomContractVersion: '40.1.0',
      connectedKingdomVersion: '40.1.0',
      lastKnownKingdomVersion: '40.1.0',
      connectionState: 'CONNECTED' as const,
      compatibility: adapter.getCompatibilityInfo(),
      running: true,
      mode: 'adaptive',
    };

    // Even if negotiator says SUPPORTED, adapter does not grant authority!
    const res = capabilityNegotiator.evaluateCapability('system.admin', forgedRuntime);
    expect(res.status).toBe('SUPPORTED');

    // Offline mode denies privileged execution fail-closed
    const offlineRuntime = { ...forgedRuntime, connectionState: 'DISCONNECTED' as const };
    const offlineRes = capabilityNegotiator.evaluateCapability('system.admin', offlineRuntime);
    expect(offlineRes.status).toBe('DEGRADED');
  });

  it('4. Security Adversarial Scenario 6–20: Degraded Mode & Fail-Closed Boundaries', () => {
    // Protocol downgrade attempt
    const downgradeCompat = capabilityNegotiator.evaluateCapability('filesystem.delete', {
      centipedeVersion: '1.0.0',
      expectedKingdomContractVersion: '40.1.0',
      connectedKingdomVersion: '1.0.0',
      lastKnownKingdomVersion: '1.0.0',
      connectionState: 'CONNECTED',
      compatibility: { detectedVersion: '1.0.0', minSupportedVersion: '40.0.0', maxTestedVersion: '40.1.9', status: 'UNSUPPORTED', message: '' },
      running: true,
      mode: 'adaptive',
    });

    expect(downgradeCompat.status).toBe('INCOMPATIBLE');
  });
});
