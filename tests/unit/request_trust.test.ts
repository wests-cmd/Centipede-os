import { describe, expect, it } from 'vitest';
import { isLocalAdminRequest, isLoopbackPeerAddress } from '../../src/server/requestTrust';

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

  it('requires a loopback peer and a localhost host while rejecting cross-origin browser requests', () => {
    expect(isLocalAdminRequest('127.0.0.1', { host: 'localhost:3000' })).toBe(true);
    expect(isLocalAdminRequest('::1', { host: '[::1]:3000', origin: 'http://[::1]:3000', 'sec-fetch-site': 'same-origin' })).toBe(true);
    expect(isLocalAdminRequest('192.168.1.9', { host: 'localhost:3000', origin: 'http://localhost:3000' })).toBe(false);
    expect(isLocalAdminRequest('127.0.0.1', { host: 'attacker.example', origin: 'http://attacker.example', 'sec-fetch-site': 'same-origin' })).toBe(false);
    expect(isLocalAdminRequest('127.0.0.1', { host: 'localhost:3000', origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' })).toBe(false);
    expect(isLocalAdminRequest('127.0.0.1', { host: 'localhost:3000', 'sec-fetch-site': 'cross-site' })).toBe(false);
    expect(isLocalAdminRequest('127.0.0.1', { host: 'localhost:3000/path' })).toBe(false);
  });
});
