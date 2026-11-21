import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

describe('release reality lint keeps truthful disclosure without hiding simulated execution', () => {
  const lint = (source: string) => {
    const root = mkdtempSync(join(tmpdir(), 'centipede-reality-'));
    try {
      mkdirSync(join(root, 'src')); mkdirSync(join(root, 'scripts'));
      writeFileSync(join(root, 'src', 'example.ts'), source);
      return spawnSync(process.execPath, [join(process.cwd(), 'scripts/lint-reality.ts')], { cwd: root, encoding: 'utf8' });
    } finally { rmSync(root, { recursive: true, force: true }); }
  };
  it('accepts documentation comments and explicitly reviewed truthful local-demo labels', () => {
    expect(lint('/** This panel is not a fake executor. */\nconst label = "LOCAL DEMO"; // REALITY-LINT-ALLOW: reason = "Truthful local-only disclosure"').status).toBe(0);
  });
  it('rejects a simulated success even with an unrelated trailing comment', () => {
    expect(lint('const result = "fake success"; // ordinary comment').status).toBe(1);
  });
});
