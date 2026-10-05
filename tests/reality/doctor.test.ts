import { describe, expect, it } from 'vitest';
import { buildDoctorChecks, DoctorSnapshotInput } from '../../src/platform/doctor';

const connectedSnapshot: DoctorSnapshotInput = {
  networkOnline: true,
  kingdomConnection: 'CONNECTED',
  kingdomRuntime: {
    running: true,
    mode: 'adaptive',
    version: '1TAS',
    scheduler_running: true,
    tasks: { queued: 0, running: 1, completed: 3, failed: 0, cancelled: 0 },
  },
  kingdomCompatibility: 'COMPATIBLE',
  modelEndpointResponded: true,
};

describe('Centipede Doctor truth mapping', () => {
  it('passes only checks supported by live inputs and marks unsupported host checks unconfigured', () => {
    const checks = buildDoctorChecks(connectedSnapshot);
    const byId = Object.fromEntries(checks.map((check) => [check.id, check]));

    expect(byId['centipede-app'].status).toBe('PASS');
    expect(byId['kingdom-connection'].status).toBe('PASS');
    expect(byId['kingdom-runtime'].status).toBe('PASS');
    expect(byId['kingdom-compatibility'].status).toBe('PASS');
    expect(byId['model-endpoint'].detail).toContain('does not prove a model is installed');
    expect(byId['host-storage'].status).toBe('NOT CONFIGURED');
    expect(byId['updates'].status).toBe('NOT CONFIGURED');
    expect(byId['recovery'].status).toBe('NOT CONFIGURED');
  });

  it('does not report an offline Kingdom runtime as stopped or healthy', () => {
    const checks = buildDoctorChecks({
      ...connectedSnapshot,
      kingdomConnection: 'DISCONNECTED',
      kingdomRuntime: null,
      kingdomCompatibility: 'UNKNOWN',
      modelEndpointResponded: null,
      networkOnline: false,
    });
    const byId = Object.fromEntries(checks.map((check) => [check.id, check]));

    expect(byId['kingdom-connection'].status).toBe('WARNING');
    expect(byId['kingdom-runtime'].status).toBe('WARNING');
    expect(byId['kingdom-runtime'].summary).toContain('disconnected');
    expect(byId['kingdom-runtime'].summary).not.toContain('stopped');
    expect(byId['model-endpoint'].status).toBe('NOT CONFIGURED');
    expect(byId.network.status).toBe('WARNING');
  });

  it('fails the compatibility check for a known incompatible contract', () => {
    const checks = buildDoctorChecks({ ...connectedSnapshot, kingdomCompatibility: 'INCOMPATIBLE_PROTOCOL' });
    expect(checks.find((check) => check.id === 'kingdom-compatibility')?.status).toBe('FAIL');
  });

  it('flags rejected Kingdom authentication as a failure', () => {
    const checks = buildDoctorChecks({ ...connectedSnapshot, kingdomCompatibility: 'AUTHENTICATION_FAILED' });
    const compatibility = checks.find((check) => check.id === 'kingdom-compatibility');
    expect(compatibility?.status).toBe('FAIL');
    expect(compatibility?.summary).toContain('rejected');
  });
});
