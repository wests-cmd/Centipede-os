import { describe, expect, it } from 'vitest';
import { appVersionAtLeast, classifyAppUpdate } from '../../src/platform/appUpdate';

describe('app update policy', () => {
  it('automatically classifies a forward patch in the same release line as small', () => {
    expect(classifyAppUpdate('1.0.0', '1.0.1')).toBe('small');
  });

  it('requires approval for a minor or major change', () => {
    expect(classifyAppUpdate('1.0.9', '1.1.0')).toBe('large');
    expect(classifyAppUpdate('1.9.9', '2.0.0')).toBe('large');
  });

  it('ignores equal, downgraded, malformed, and unsafe integer versions', () => {
    for (const version of ['1.0.0', '0.9.9', '1.0', 'v1.0.1', '999999999999999999999.0.0']) {
      expect(classifyAppUpdate('1.0.0', version)).toBeNull();
    }
  });

  it('compares successful refresh versions without accepting malformed values', () => {
    expect(appVersionAtLeast('1.0.2', '1.0.1')).toBe(true);
    expect(appVersionAtLeast('1.0.0', '1.0.1')).toBe(false);
    expect(appVersionAtLeast('v1.0.1', '1.0.1')).toBe(false);
  });
});
