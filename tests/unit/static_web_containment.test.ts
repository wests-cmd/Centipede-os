import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { staticFile } from '../../src/server/httpRuntime';

describe('Centipede static web root containment', () => {
  it('serves legitimate assets from the intended web root and supports HEAD', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'centipede-assets-'));
    try {
      const webRoot = join(fixture, 'dist');
      await mkdir(webRoot);
      await writeFile(join(webRoot, 'index.html'), '<title>Centipede</title>');
      const response = await staticFile(join(webRoot, 'index.html'), false, webRoot);
      expect(response?.status).toBe(200);
      expect(await response?.text()).toContain('Centipede');
      const head = await staticFile(join(webRoot, 'index.html'), true, webRoot);
      expect(head?.status).toBe(200);
      expect(await head?.text()).toBe('');
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });

  it('refuses an asset accessed through a symlink pointing outside web root', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'centipede-assets-'));
    try {
      const webRoot = join(fixture, 'dist');
      const privateData = join(fixture, 'private');
      await mkdir(webRoot);
      await mkdir(privateData);
      await writeFile(join(privateData, 'secret.txt'), 'not a public asset');
      await symlink(privateData, join(webRoot, 'linked-folder'), process.platform === 'win32' ? 'junction' : 'dir');
      expect(await staticFile(join(webRoot, 'linked-folder', 'secret.txt'), false, webRoot)).toBeNull();
      expect(await staticFile(join(webRoot, 'linked-folder', 'secret.txt'), true, webRoot)).toBeNull();
      expect(await staticFile(join(webRoot, 'absent.txt'), false, webRoot)).toBeNull();
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });
});
