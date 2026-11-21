import { describe, expect, it, vi } from 'vitest';
import { discoverLanAddress } from '../../src/server/networkDiscovery';
import type { networkInterfaces } from 'node:os';

describe('loopback-only Centipede server network discovery', () => {
  it('does not call networkInterfaces under systemd loopback-only confinement', () => {
    const forbidden = vi.fn(() => { throw new Error('AF_NETLINK forbidden by systemd'); });
    for (const host of ['127.0.0.1', 'localhost', '[::1]', '127.0.0.1,::1']) {
      expect(discoverLanAddress(host, forbidden)).toBeUndefined();
    }
    expect(forbidden).not.toHaveBeenCalled();
  });
  it('fails open for optional LAN address discovery but never for authorization', () => {
    const forbidden = vi.fn(() => { throw new Error('AF_NETLINK forbidden'); });
    expect(discoverLanAddress(undefined, forbidden)).toBeUndefined();
    expect(forbidden).toHaveBeenCalledTimes(1);
  });
  it('prefers private LAN address when discovery is explicitly permitted', () => {
    const addresses = () => ({ eth0: [
      { family: 'IPv4', address: '198.51.100.7', internal: false },
      { family: 'IPv4', address: '10.2.3.4', internal: false },
    ] }) as unknown as ReturnType<typeof networkInterfaces>;
    expect(discoverLanAddress(undefined, addresses)).toBe('10.2.3.4');
  });
});
