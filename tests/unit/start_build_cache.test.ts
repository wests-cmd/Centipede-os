import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { shouldBuildDesktop } from '../../scripts/build-cache';

const roots: string[] = [];
const makeRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'centipede-build-cache-'));
  roots.push(root);
  mkdirSync(join(root, 'src'));
  mkdirSync(join(root, 'dist', 'assets'), { recursive: true });
  writeFileSync(join(root, 'src', 'App.tsx'), 'initial source');
  writeFileSync(join(root, 'dist', 'index.html'), 'built page');
  writeFileSync(join(root, 'dist', 'assets', 'app.js'), 'built javascript');
  const before = new Date('2024-01-01T00:00:00Z');
  const after = new Date('2024-01-02T00:00:00Z');
  utimesSync(join(root, 'src', 'App.tsx'), before, before);
  utimesSync(join(root, 'dist', 'index.html'), after, after);
  return root;
};
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('desktop bundle cache', () => {
  test('reuses an up-to-date bundle', () => {
    expect(shouldBuildDesktop(makeRoot())).toBe(false);
  });
  test('rebuilds when a source file changes', () => {
    const root = makeRoot();
    const updated = new Date('2024-01-03T00:00:00Z');
    utimesSync(join(root, 'src', 'App.tsx'), updated, updated);
    expect(shouldBuildDesktop(root)).toBe(true);
  });
  test('rebuilds if a bundle asset is missing', () => {
    const root = makeRoot();
    rmSync(join(root, 'dist', 'assets', 'app.js'));
    expect(shouldBuildDesktop(root)).toBe(true);
  });
  test('rebuilds if a package manifest changes', () => {
    const root = makeRoot();
    writeFileSync(join(root, 'package.json'), '{}');
    expect(shouldBuildDesktop(root)).toBe(true);
  });
});
