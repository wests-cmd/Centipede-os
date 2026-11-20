import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('verified historical release links and status', () => {
  const root = process.cwd();
  const read = (p: string) => readFileSync(join(root, p), 'utf8');
  it('links the exact known five v1.0.0 assets and checksums, not non-existent mobile releases', () => {
    const text = read('README.md');
    for (const asset of [
      'centipede-os-1.0.0-live-usb-x86_64.iso', 'centipede-os-1.0.0-x86_64.iso',
      'centipede-os-1.0.0-x86_64.qcow2', 'centipede-docker-image-1.0.0.tar',
      'centipede-os-1.0.0-desktop-web-bundle.tar.gz', 'SHA256SUMS',
    ]) {
      expect(text).toContain(`https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.0/${asset}`);
    }
    expect(text).toContain('does **not** contain the current `main` branch');
  });
  it('does not call the published v1.0.0 live image a permanent OS installer', () => {
    const matrix = read('docs/SHIP_REALITY_MATRIX.md');
    const guide = read('docs/INSTALLATION_GUIDE.md');
    expect(matrix).toContain('not a persistent installer');
    expect(guide).toContain('does not include a disk installer');
    expect(matrix).not.toContain('A stable GitHub Release has not been published');
  });
});
