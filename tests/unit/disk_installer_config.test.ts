import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('guided disk installer release configuration', () => {
  const settings = read('packaging/live-build/config/includes.chroot/etc/calamares/settings.conf');
  const partition = read('packaging/live-build/config/includes.chroot/etc/calamares/modules/partition.conf');
  const launcher = read('packaging/live-build/config/includes.chroot/usr/local/bin/centipede-installer');
  const rootHelper = read('packaging/live-build/config/includes.chroot/usr/local/libexec/centipede-installer-root');
  const polkit = read('packaging/live-build/config/includes.chroot/etc/polkit-1/rules.d/50-centipede-installer.rules');

  it('requires an explicit partition choice and a final install confirmation', () => {
    expect(settings).toMatch(/prompt-install:\s*true/);
    expect(settings).toMatch(/branding:\s*centipede/);
    expect(partition).toMatch(/initialPartitioningChoice:\s*none/);
    expect(partition).toMatch(/initialSwapChoice:\s*none/);
  });

  it('protects all live boot media and fails closed before opening Calamares', () => {
    expect(rootHelper).toMatch(/findmnt .*\/run\/live\/medium/);
    expect(rootHelper).toMatch(/SOURCE_TYPE/);
    expect(rootHelper).toMatch(/blockdev --setro/);
    expect(rootHelper).toMatch(/blockdev --getro/);
    expect(rootHelper).toMatch(/exec \/usr\/bin\/calamares/);
    expect(rootHelper.indexOf('blockdev --getro')).toBeLessThan(rootHelper.indexOf('exec /usr/bin/calamares'));
    expect(launcher).toMatch(/pkexec env DISPLAY=/);
    expect(polkit).toContain('action.lookup("program") === "/usr/local/libexec/centipede-installer-root"');
    expect(polkit).toContain('subject.user === "centipede"');
  });

  it('sets an honest disk and memory minimum and documents unfinished recovery work', () => {
    const welcome = read('packaging/live-build/config/includes.chroot/etc/calamares/modules/welcome.conf');
    const guide = read('docs/DISK_INSTALLATION_GUIDE.md');
    expect(welcome).toMatch(/requiredStorage:\s*32/);
    expect(welcome).toMatch(/requiredRam:\s*2\.0/);
    expect(guide).toMatch(/Automatic recovery from an interrupted installation is not yet available/);
    expect(guide).toMatch(/update rollback are not included yet/);
  });
});
