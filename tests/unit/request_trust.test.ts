import { describe, expect, it } from 'vitest';
import { isLoopbackPeerAddress } from '../../src/server/requestTrust';

describe('local administration peer identity', () => {
  it('accepts IPv4 and IPv6 loopback peers, including mapped loopback addresses', () => {
    expect(isLoopbackPeerAddress('127.0.0.1')).toBe(true);
    expect(isLoopbackPeerAddress('127.42.5.9')).toBe(true);
    expect(isLoopbackPeerAddress('::1')).toBe(true);
    expect(isLoopbackPeerAddress('::ffff:127.0.0.1')).toBe(true);
  });

  it('rejects LAN, public, malformed, and missing peer addresses', () => {
    expect(isLoopbackPeerAddress('192.168.1.4')).toBe(false);
    expect(isLoopbackPeerAddress('10.0.0.4')).toBe(false);
    expect(isLoopbackPeerAddress('::ffff:192.168.1.4')).toBe(false);
    expect(isLoopbackPeerAddress('localhost')).toBe(false);
    expect(isLoopbackPeerAddress('127.999.0.1')).toBe(false);
    expect(isLoopbackPeerAddress(null)).toBe(false);
    expect(isLoopbackPeerAddress(undefined)).toBe(false);
  });
});
