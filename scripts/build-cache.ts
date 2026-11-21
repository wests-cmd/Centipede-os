import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The browser bundle is built once and reused when source inputs have not changed.
// This avoids running Vite on every desktop restart, especially on low-end CPUs.
const INPUTS = [
  'src', 'public', 'index.html', 'vite.config.ts', 'package.json',
  'bun.lock', 'tailwind.config.js', 'postcss.config.js', 'tsconfig.json',
];

function changedAfter(path: string, builtAt: number): boolean {
  const info = statSync(path);
  if (info.isFile()) return info.mtimeMs > builtAt;
  if (!info.isDirectory()) return false;
  return readdirSync(path, { withFileTypes: true }).some((entry) => {
    if (entry.isSymbolicLink()) return false;
    return changedAfter(join(path, entry.name), builtAt);
  });
}

export function shouldBuildDesktop(root: string): boolean {
  const index = join(root, 'dist', 'index.html');
  const assets = join(root, 'dist', 'assets');
  if (!existsSync(index) || !existsSync(assets)) return true;
  try {
    if (readdirSync(assets).length === 0) return true;
    const builtAt = statSync(index).mtimeMs;
    return INPUTS.some((input) => {
      const fullPath = join(root, input);
      return existsSync(fullPath) && changedAfter(fullPath, builtAt);
    });
  } catch {
    // When cache validity cannot be established, rebuild rather than serve stale files.
    return true;
  }
}
