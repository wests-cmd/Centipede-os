import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('real published preview links and installation limitations', () => {
  it('links exact RC9 assets without directing first-time users to older stable-labelled prototypes', () => {
    const text = read('README.md');
    const release = 'https://github.com/wests-cmd/Centipede-os/releases/download/v1.0.1-rc.9/';
    for (const asset of [
      'centipede-os-1.0.1-live-usb-x86_64.iso',
      'centipede-os-1.0.1-x86_64.iso',
      'centipede-docker-image-1.0.1.tar',
      'centipede-android-1.0.1-release.apk',
      'SHA256SUMS',
    ]) expect(text).toContain(release + asset);
    expect(text).toContain('does **not** contain the current `main` branch');
    expect(text).toContain('DOWNLOADS.md');
    expect(text).not.toContain('releases/latest/download/');
  });

  it('does not advertise the old published live preview as a permanent or phone-ready installer', () => {
    const matrix = read('docs/SHIP_REALITY_MATRIX.md');
    const guide = read('docs/INSTALLATION_GUIDE.md');
    const chooser = read('DOWNLOADS.md');
    expect(matrix).toContain('not a persistent installer');
    expect(guide).toContain('does not include a disk installer');
    expect(chooser).toContain('no verified graphical, persistent disk installer');
    expect(chooser).toContain('real phone pairing');
    expect(matrix).not.toContain('A stable GitHub Release has not been published');
  });
});
