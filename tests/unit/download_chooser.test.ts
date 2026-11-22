import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const catalog = JSON.parse(read('release/published-preview.json')) as {
  schemaVersion: number;
  releaseTag: string;
  releasePublishedAt: string;
  releaseChannel: string;
  assets: Record<string, { fileName: string; sizeBytes: number; type: string }>;
};
const targets = JSON.parse(read('release/targets.json')) as {
  targets: Record<string, { status: string; artifact: string; architecture: string }>;
};

const downloadUrl = (name: string) =>
  `https://github.com/wests-cmd/Centipede-os/releases/download/${catalog.releaseTag}/${name}`;

describe('beginner download chooser truth contract', () => {
  it('pins a genuinely published preview release rather than falsely claiming current-main binaries', () => {
    expect(catalog.releaseTag).toMatch(/^v\d+\.\d+\.\d+-rc\.\d+$/);
    expect(catalog.releaseChannel).toBe('PREVIEW');
    expect(Date.parse(catalog.releasePublishedAt)).toBeGreaterThan(0);
    expect(catalog.schemaVersion).toBe(1);
    const readme = read('README.md');
    const guide = read('DOWNLOADS.md');
    expect(readme).toContain('does **not** contain the current `main` branch');
    expect(guide).toContain('built **before** the latest `main` updates');
    expect(readme).not.toContain('releases/latest/download/');
    expect(guide).not.toContain('releases/latest/download/');
  });

  it('maps all six real downloadable files to their published RC9 URLs in the full chooser', () => {
    const guide = read('DOWNLOADS.md');
    expect(Object.keys(catalog.assets).sort()).toEqual(
      ['android', 'checksums', 'desktop', 'docker', 'iso', 'live-usb', 'vm'].sort(),
    );
    for (const asset of Object.values(catalog.assets)) {
      expect(asset.sizeBytes).toBeGreaterThan(100);
      expect(guide).toContain(downloadUrl(asset.fileName));
    }
    for (const key of ['live-usb', 'iso', 'docker', 'android', 'checksums']) {
      expect(read('README.md')).toContain(downloadUrl(catalog.assets[key].fileName));
    }
  });

  it('only links assets named by the pinned published preview inventory', () => {
    const allowed = new Set(Object.values(catalog.assets).map(asset => asset.fileName));
    const pages = ['README.md', 'DOWNLOADS.md', 'docs/INSTALLATION_GUIDE.md'];
    for (const path of pages) {
      const source = read(path);
      const links = [...source.matchAll(
        /https:\/\/github\.com\/wests-cmd\/Centipede-os\/releases\/download\/(v[^/\s)]+)\/([^\s)]+?)(?=[\s)])/g,
      )];
      for (const link of links) {
        expect(link[1]).toBe(catalog.releaseTag);
        expect(allowed.has(link[2])).toBe(true);
      }
    }
  });

  it('does not advertise blocked devices or a developer bundle as a completed installer', () => {
    const guide = read('DOWNLOADS.md');
    expect(targets.targets.android.status).toBe('BLOCKED');
    expect(targets.targets.ios.status).toBe('BLOCKED');
    expect(targets.targets['live-usb'].architecture).toBe('x86_64');
    expect(targets.targets.docker.architecture).toBe('linux/amd64');
    expect(guide).toContain('**Not supported.**');
    expect(guide).toContain('**Not published.**');
    expect(guide).toContain('Publisher certificate continuity');
    expect(guide).toContain('**not** a double-click Windows');
    expect(guide).toContain('No separate installer exists for each profile');
    expect(guide).toContain('Writing it **erases the selected USB');
    expect(guide).toContain('Source code (zip/tar.gz)');
  });

  it('guides the first-time user directly from README and the install guide', () => {
    expect(read('README.md')).toContain('[OPEN THE SIMPLE DOWNLOAD CHOOSER — FILES, SIZES & INSTRUCTIONS](DOWNLOADS.md)');
    expect(read('docs/README.md')).toContain('(../DOWNLOADS.md)');
    expect(read('docs/INSTALLATION_GUIDE.md')).toContain('(../DOWNLOADS.md)');
    expect(read('DOWNLOADS.md')).toContain('**1. Live USB');
    expect(read('DOWNLOADS.md')).toContain('**2. Virtual machine boot ISO');
    expect(read('README.md')).toContain('**Not yet available**');
  });
});
