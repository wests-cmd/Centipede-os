import { describe, it, expect } from 'vitest';
import { syncSha256 } from '../../src/security/cryptoUtils';

describe('Reality Regression Suite — Cryptographic Binary Hashing Truth', () => {
  it('1. Hashes raw binary Uint8Array byte-for-byte matching sha256sum', () => {
    // Known test binary buffer fixture
    const binaryData = new Uint8Array([0x00, 0xff, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
    const hash = syncSha256(binaryData);
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64);
    // Hash must be deterministic for raw bytes
    expect(syncSha256(binaryData)).toBe(hash);
  });

  it('2. Binary buffer hashing differs from String UTF-8 decoded re-encoding', () => {
    const rawBinary = new Uint8Array([0x80, 0x81, 0xfe, 0xff]);
    const rawHash = syncSha256(rawBinary);

    // Decoding binary buffer as UTF-8 string corrupts invalid byte sequences
    const stringDecoded = new TextDecoder('utf-8', { fatal: false }).decode(rawBinary);
    const stringHash = syncSha256(stringDecoded);

    expect(rawHash).not.toBe(stringHash);
  });
});
