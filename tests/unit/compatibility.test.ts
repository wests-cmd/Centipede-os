import { describe, it, expect } from 'vitest';
import { kingdomCapabilityNegotiator } from '../../src/api/capabilityNegotiator';
import { KingdomAdapter } from '../../src/api/kingdomAdapter';

describe('Kingdom Capability Negotiator & Dynamic Contract Suite', () => {
  it('Negotiates capability status for compatible Kingdom v40.1.0', () => {
    const result = kingdomCapabilityNegotiator.negotiateCapability('40.1.0', 'security.authorize');
    expect(result.status).toBe('SUPPORTED');
  });

  it('Negotiates capability status for incompatible major version Kingdom v39.0.0', () => {
    const result = kingdomCapabilityNegotiator.negotiateCapability('39.0.0', 'security.authorize');
    expect(result.status).toBe('INCOMPATIBLE');
    expect(result.requiresKingdomUpdate).toBe(true);
  });

  it('Evaluates contract drift for degraded status payload', () => {
    const report = kingdomCapabilityNegotiator.evaluateContractDrift('40.1.0', { status: 'DEGRADED' });
    expect(report.overallStatus).toBe('DEGRADED');
    expect(report.schemaDriftDetected).toBe(true);
  });

  it('Fails closed in KingdomAdapter when major version is incompatible', () => {
    const adapter = new KingdomAdapter('http://127.0.0.1:8000');
    const compat = adapter.checkVersionCompatibility('39.0.0');
    expect(compat.status).toBe('UNSUPPORTED');
    expect(adapter.getConnectionState()).toBe('VERSION_INCOMPATIBLE');
  });
});
