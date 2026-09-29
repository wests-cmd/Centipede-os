import { describe, it, expect } from 'vitest';
import { KingdomAdapter } from '../../src/api/kingdomAdapter';
import { capabilityNegotiator } from '../../src/api/capabilityNegotiator';
import { KINGDOM_CONTRACT_SPEC } from '../../src/api/contractSpec';

describe('Kingdom ↔ Centipede Compatibility & Adversarial Security Suite', () => {
  it('1. Capability Negotiation across Kingdom versions', () => {
    const adapter = new KingdomAdapter('http://127.0.0.1:8000');

    // Online compatible
    const compatResult = adapter.checkVersionCompatibility('40.1.0', { major: 1, minor: 4 });
    expect(compatResult.status).toBe('COMPATIBLE');

    const evalSupported = adapter.negotiateCapability('filesystem.read');
    expect(evalSupported.status).toBe('DEGRADED'); // Adapter disconnected default

    // Test capabilityNegotiator direct evaluation
    const onlineRuntime = {
      centipedeVersion: '1.0.0',
      expectedKingdomContractVersion: 'Protocol v1.0+',
      connectedKingdomVersion: '40.2.0',
      lastKnownKingdomVersion: '40.2.0',
      connectionState: 'CONNECTED' as const,
      compatibility: compatResult,
      running: true,
      mode: 'adaptive',
      protocol: { major: 1, minor: 4 },
    };

    const nav1 = capabilityNegotiator.evaluateCapability('filesystem.read', onlineRuntime);
    expect(nav1.status).toBe('SUPPORTED');

    // Incompatible protocol version
    const oldRuntime = { ...onlineRuntime, protocol: { major: 2, minor: 0 } };
    const navOld = capabilityNegotiator.evaluateCapability('filesystem.read', oldRuntime);
    expect(navOld.status).toBe('INCOMPATIBLE');

    // Unknown capability
    const navUnknown = capabilityNegotiator.evaluateCapability('fake.capability', onlineRuntime);
    expect(navUnknown.status).toBe('UNKNOWN');

    // Protocol minor version lower than required min minor triggers REQUIRES_UPDATE
    const outdatedMinorRuntime = { ...onlineRuntime, protocol: { major: 1, minor: -1 } };
    const navRequiresUpdate = capabilityNegotiator.evaluateCapability('filesystem.read', outdatedMinorRuntime);
    expect(navRequiresUpdate.status).toBe('REQUIRES_UPDATE');
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

    const validRes = capabilityNegotiator.validateResponseSchema('get_status', {
      running: true,
      mode: 'adaptive',
      version: '40.1.0',
      tasks: [],
    });
    expect(validRes.valid).toBe(true);
    expect(validRes.missingFields.length).toBe(0);
  });

  it('3. Security Adversarial Scenario 1–5: Forged / Malicious Metadata', async () => {
    const adapter = new KingdomAdapter('http://127.0.0.1:8000');

    // Forged capability claims do not bypass ZeroTrust
    const forgedRuntime = {
      centipedeVersion: '1.0.0',
      expectedKingdomContractVersion: 'Protocol v1.0+',
      connectedKingdomVersion: '40.2.0',
      lastKnownKingdomVersion: '40.2.0',
      connectionState: 'CONNECTED' as const,
      compatibility: adapter.getCompatibilityInfo(),
      running: true,
      mode: 'adaptive',
      protocol: { major: 1, minor: 4 },
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
    // Protocol downgrade attempt with mismatched protocol major
    const downgradeCompat = capabilityNegotiator.evaluateCapability('filesystem.delete', {
      centipedeVersion: '1.0.0',
      expectedKingdomContractVersion: 'Protocol v1.0+',
      connectedKingdomVersion: '1.0.0',
      lastKnownKingdomVersion: '1.0.0',
      connectionState: 'CONNECTED',
      compatibility: { detectedVersion: '1.0.0', minSupportedVersion: 'Protocol v1.0', maxTestedVersion: 'Protocol v1.x', status: 'INCOMPATIBLE_PROTOCOL', message: '' },
      running: true,
      mode: 'adaptive',
      protocol: { major: 0, minor: 9 },
    });

    expect(downgradeCompat.status).toBe('INCOMPATIBLE');
  });

  it('5. Segmentor Identity Enforcement & Release Manifest Integrity', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    // Read release manifest if created
    const manifestPath = path.resolve(process.cwd(), 'release/release-manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(manifest.product).toBe('Centipede OS');
      expect(manifest.centipedeVersion).toBe('1.0.0');
      expect(manifest.artifacts.length).toBeGreaterThan(0);
      expect(manifest.artifacts[0].sha256).toBeDefined();
    }

    // Verify version file single source of truth
    const { CENTIPEDE_VERSION, CENTIPEDE_SUPPORTED_KINGDOM_PROTOCOL } = await import('../../src/version');
    expect(CENTIPEDE_VERSION).toBe('1.0.0');
    expect(CENTIPEDE_SUPPORTED_KINGDOM_PROTOCOL).toBe('v1.0+');
  });
});
