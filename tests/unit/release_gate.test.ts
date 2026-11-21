import { describe, expect, it } from 'vitest';
import { classifyReleaseRef, requireReleaseEligibility, type Attestation } from '../../src/platform/releaseGate';
import attestation from '../../release/ga-attestation.json';

const sha = 'a'.repeat(40);
const pass: Attestation = {
  approved: true, version: '1.0.1', commit: sha,
  approvedBy: 'owner-review', evidenceUrl: 'https://github.com/wests-cmd/Centipede-os/issues/150#issuecomment-12345',
};
describe('release channel must never mislabel a preview as certified stable', () => {
  it('accepts only the exact package version or an explicit numbered release candidate', () => {
    expect(classifyReleaseRef('refs/tags/v1.0.1-rc.10', '1.0.1')).toMatchObject({
      channel: 'candidate', tag: 'v1.0.1-rc.10', tagged: true,
    });
    expect(classifyReleaseRef('refs/tags/v1.0.1', '1.0.1').channel).toBe('stable');
    expect(classifyReleaseRef('refs/heads/main', '1.0.1').tagged).toBe(false);
    for (const bad of ['refs/tags/v1.0.0', 'refs/tags/v1.0.1-rc.0',
      'refs/tags/v1.0.1-rc.01', 'refs/tags/v1.0.1-pre', 'refs/tags/v1.0.1-security',
      'refs/tags/v1.0.1.1', 'refs/tags/v1.0.1-rc.2/hijack']) {
      expect(() => classifyReleaseRef(bad, '1.0.1')).toThrow();
    }
  });
  it('blocks stable tags without exact-current-commit GA evidence AND human repository opt-in', () => {
    const ref = 'refs/tags/v1.0.1';
    for (const [file, flag, commit] of [
      [{ ...pass, approved: false }, true, sha], [pass, false, sha], [pass, true, 'b'.repeat(40)],
      [{ ...pass, evidenceUrl: 'https://example.com/approval' }, true, sha],
      [{ ...pass, approvedBy: '' }, true, sha],
    ] as const) expect(() => requireReleaseEligibility(ref, '1.0.1', commit, file, flag)).toThrow();
    expect(requireReleaseEligibility(ref, '1.0.1', sha, pass, true).channel).toBe('stable');
  });
  it('permits numbered previews without pretending they are GA, and forbids publishing branches', () => {
    expect(requireReleaseEligibility('refs/tags/v1.0.1-rc.3', '1.0.1', sha, attestation, false).channel).toBe('candidate');
    expect(() => requireReleaseEligibility('refs/heads/main', '1.0.1', sha, pass, true)).toThrow();
  });
});
