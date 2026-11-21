import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { isTrackedSourceDirty } from '../../scripts/releaseSourceIntegrity';

function git(cwd: string, ...args: string[]): void {
  const done = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, timeout: 10000 });
  expect(done.status, done.stderr).toBe(0);
}

describe('stable release provenance ignores only generated outputs, not tracked mutations', () => {
  it('rejects a missing or invalid Git checkout instead of claiming it clean', () => {
    const empty = mkdtempSync(join(tmpdir(), 'centipede-repo-'));
    try { expect(() => isTrackedSourceDirty(empty)).toThrow('Cannot verify'); }
    finally { rmSync(empty, { recursive: true, force: true }); }
  });
  it('accepts generated dist and release files but detects tracked edits or staged tampering', () => {
    const root = mkdtempSync(join(tmpdir(), 'centipede-repo-'));
    try {
      git(root, 'init');
      writeFileSync(join(root, 'README.md'), 'clean source\n');
      git(root, 'add', 'README.md');
      git(root, '-c', 'user.name=Release Test', '-c', 'user.email=ci@example.invalid',
        'commit', '-m', 'fixture baseline');
      expect(isTrackedSourceDirty(root)).toBe(false);
      mkdirSync(join(root, 'dist'));
      mkdirSync(join(root, 'release'));
      writeFileSync(join(root, 'dist', 'index.html'), 'build output');
      writeFileSync(join(root, 'release', 'artifact.tar.gz'), 'build output');
      expect(isTrackedSourceDirty(root)).toBe(false);
      writeFileSync(join(root, 'README.md'), 'modified source\n');
      expect(isTrackedSourceDirty(root)).toBe(true);
      git(root, 'add', 'README.md');
      expect(isTrackedSourceDirty(root)).toBe(true);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it('stops standalone tag-triggered platform jobs from bypassing the release gate', () => {
    const workflow = readFileSync(join(process.cwd(), '.github/workflows/platform-builds.yml'), 'utf8');
    const dispatch = workflow.split('\npermissions:', 1)[0];
    expect(dispatch).toContain('workflow_call:');
    expect(dispatch).toContain('workflow_dispatch:');
    expect(dispatch).toContain("'codex/**'");
    expect(dispatch).not.toMatch(/^\s+tags:\s*$/m);
    const release = readFileSync(join(process.cwd(), '.github/workflows/release.yml'), 'utf8');
    expect(release).toContain('needs: release-gate');
  });
});
