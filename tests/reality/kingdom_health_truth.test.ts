import { describe, it, expect } from 'vitest';
import { KingdomAdapter } from '../../src/api/kingdomAdapter';

describe('Reality Regression Suite — Kingdom Health Truth', () => {
  it('1. Kingdom reports DISCONNECTED when backend server is offline', async () => {
    // Unreachable port
    const offlineAdapter = new KingdomAdapter('http://localhost:59999');
    try {
      await offlineAdapter.get_status();
    } catch (err: any) {
      expect(err.code).toBe('KINGDOM_OFFLINE');
    }
    expect(offlineAdapter.getConnectionState()).toBe('DISCONNECTED');
  });

  it('2. Refuses to fake CONNECTED state when offline', () => {
    const offlineAdapter = new KingdomAdapter('http://localhost:59999');
    expect(offlineAdapter.getConnectionState()).not.toBe('CONNECTED');
  });
});
