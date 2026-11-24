import { describe, expect, it } from 'vitest';
import { listenerHosts } from '../../src/server/listenerPolicy';

describe('Centipede production bind policy', () => {
  it('never exposes a LAN listener by default', () => {
    expect(listenerHosts()).toEqual(['127.0.0.1']);
    expect(listenerHosts('')).toEqual(['127.0.0.1']);
    expect(listenerHosts('  ')).toEqual(['127.0.0.1']);
  });
  it('requires an explicit configuration for LAN/any-address listeners', () => {
    expect(listenerHosts('0.0.0.0')).toEqual(['0.0.0.0']);
    expect(listenerHosts('127.0.0.1,192.168.1.2')).toEqual(['127.0.0.1', '192.168.1.2']);
    expect(listenerHosts('127.0.0.1,127.0.0.1')).toEqual(['127.0.0.1']);
  });
  it('rejects malformed and overlong address lists', () => {
    for (const config of [',,,,', '127.0.0.1/anything', 'evil.com@host', '127.0.0.1,invalid host',
      'a'.repeat(254), Array.from({length:9}, (_,i) => '192.168.0.'+(i+1)).join(',')]) {
      expect(() => listenerHosts(config)).toThrow();
    }
  });
});
