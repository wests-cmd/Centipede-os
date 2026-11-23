import { spawnSync } from 'node:child_process';

/**
 * Release builds are allowed to generate *untracked* dist/, reports and archives.
 * They must not modify any tracked source, staged content or release policy.
 * Git errors fail closed; a missing repository cannot be treated as clean.
 */
export function isTrackedSourceDirty(cwd: string): boolean {
  const result = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=no'],
    { cwd, encoding: 'utf8', timeout: 15_000, windowsHide: true });
  if (result.error || result.status !== 0 || typeof result.stdout !== 'string') {
    throw new Error('Cannot verify tracked release source identity via Git.');
  }
  return result.stdout.trim().length > 0;
}
