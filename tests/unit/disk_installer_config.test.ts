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
    expect(launcher).toMatch(/pkexec \/usr\/local\/libexec\/centipede-installer-root/);
    expect(launcher).not.toMatch(/pkexec env /);
    expect(polkit).toContain('action.id === "org.centipede.installer"');
    expect(polkit).toContain('subject.user === "centipede"');
    const policy = read('packaging/live-build/config/includes.chroot/usr/share/polkit-1/actions/org.centipede.installer.policy');
    expect(policy).toContain('<action id="org.centipede.installer">');
    expect(policy).toContain('/usr/local/libexec/centipede-installer-root</annotate>');
    expect(policy).toContain('org.freedesktop.policykit.exec.allow_gui');
  });

  it('sets an honest disk and memory minimum and documents unfinished recovery work', () => {
    const welcome = read('packaging/live-build/config/includes.chroot/etc/calamares/modules/welcome.conf');
    const guide = read('docs/DISK_INSTALLATION_GUIDE.md');
    expect(welcome).toMatch(/requiredStorage:\s*32/);
    expect(welcome).toMatch(/requiredRam:\s*2\.0/);
    expect(guide).toMatch(/Automatic recovery from an interrupted installation is not yet available/);
    expect(guide).toMatch(/update rollback are not included yet/);
  });

  it('requires a rendered Centipede page and rejects blank white boot captures', () => {
    const readiness = read('packaging/live-build/config/includes.chroot/usr/local/libexec/centipede-desktop-readiness.py');
    const screenshotCheck = read('scripts/validate-qemu-desktop-screenshot.py');
    const screenshotCapture = read('scripts/qemu-capture-rendered-desktop.py');
    expect(readiness).toContain('os.O_NONBLOCK');
    expect(readiness).toContain('CENTIPEDE_DESKTOP_CHECK_STARTED');
    expect(readiness).toContain('CENTIPEDE_DESKTOP_CHECK_WAITING');
    expect(readiness).toContain('CENTIPEDE_DESKTOP_READY');
    expect(readiness).toContain('CENTIPEDE_ASSET_CHECK_FAILED');
    expect(readiness).toContain('def desktop_browser_window_visible(uid):');
    expect(readiness).toContain('"xwininfo", "-root", "-tree"');
    expect(read('packaging/live-build/config/package-lists/centipede.list.chroot')).toContain('x11-utils');
    expect(screenshotCheck).toContain('near_white_ratio > 0.70');
    expect(screenshotCheck).toContain('visible_ratio < 0.10');
    expect(screenshotCheck).toContain('pathological pixel alternation');
    expect(screenshotCapture).toContain('QEMU desktop did not paint');
    expect(read('scripts/qemu-boot-smoke.sh')).toContain('qemu-capture-rendered-desktop.py');
    expect(read('.github/workflows/platform-builds.yml')).toContain('import socket, subprocess, sys, time');
    const installerBranding = read('packaging/live-build/config/hooks/normal/0400-centipede-installer-branding.hook.chroot');
    expect(installerBranding).toContain('Name=Install Centipede OS');
    expect(installerBranding).toContain('install-debian.desktop');
    expect(installerBranding).toContain('centipede-installer.desktop');
  });
});

describe('Centipede OS visual identity', () => {
  const config = 'packaging/live-build/config';

  it('includes custom artwork for each public boot and desktop surface', () => {
    const artwork = [
      'includes.chroot/usr/share/backgrounds/centipede/centipede-mark.svg',
      'includes.chroot/usr/share/backgrounds/centipede/centipede-workspace.svg',
      'includes.chroot/usr/share/backgrounds/centipede/centipede-workspace.png',
      'includes.chroot/usr/share/backgrounds/centipede/centipede-earth.png',
      'includes.chroot/usr/share/backgrounds/centipede/centipede-menu.svg',
      'includes.chroot/usr/share/backgrounds/centipede/centipede-menu.png',
      'includes.chroot/usr/share/plymouth/themes/centipede/centipede.plymouth',
      'includes.chroot/usr/share/plymouth/themes/centipede/centipede.script',
      'includes.chroot/usr/share/plymouth/themes/centipede/centipede-boot.svg',
      'includes.chroot/usr/share/plymouth/themes/centipede/centipede-boot.png',
      'includes.chroot/etc/calamares/branding/centipede/centipede-logo.png',
      'includes.chroot/usr/share/icons/hicolor/scalable/apps/centipede.svg',
    ];
    for (const asset of artwork) expect(readFileSync(join(root, config, asset)).byteLength).toBeGreaterThan(0);
  });

  it('configures the user workspace, login screen, boot identity, and installer with the Centipede brand', () => {
    const desktop = read(`${config}/includes.chroot/etc/skel/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml`);
    const greeter = read(`${config}/includes.chroot/etc/lightdm/lightdm-gtk-greeter.conf.d/50-centipede.conf`);
    const osIdentity = read(`${config}/hooks/normal/0200-centipede-identity.hook.chroot`);
    const bootMenu = read(`${config}/hooks/normal/0300-centipede-boot-menu.hook.binary`);
    const installerBrand = read(`${config}/includes.chroot/etc/calamares/branding/centipede/branding.desc`);
    const packageList = read(`${config}/package-lists/centipede.list.chroot`);
    const wallpaper = read(`${config}/includes.chroot/usr/share/backgrounds/centipede/centipede-workspace.svg`);
    const menuArtwork = read(`${config}/includes.chroot/usr/share/backgrounds/centipede/centipede-menu.svg`);
    const bootSplash = read(`${config}/includes.chroot/usr/share/plymouth/themes/centipede/centipede-boot.svg`);

    expect(desktop).toContain('/usr/share/backgrounds/centipede/centipede-workspace.png');
    expect(greeter).toContain('background=/usr/share/backgrounds/centipede/centipede-workspace.png');
    expect(greeter).toContain('logo=/usr/share/icons/hicolor/scalable/apps/centipede.svg');
    expect(osIdentity).toContain('GRUB_DISTRIBUTOR="Centipede OS"');
    expect(osIdentity).toContain('GRUB_BACKGROUND="/usr/share/backgrounds/centipede/centipede-menu.png"');
    expect(osIdentity).toContain('plymouth-set-default-theme centipede');
    expect(bootMenu).toContain('background_image $prefix/centipede-menu.png');
    expect(bootMenu).toContain('MENU BACKGROUND centipede-menu.png');
    expect(bootMenu).toContain('"Start Centipede OS"');
    expect(wallpaper).toContain('centipede-earth.png');
    expect(menuArtwork).toContain('centipede-earth.png');
    expect(bootSplash).toContain('centipede-earth.png');
    expect(bootMenu).toContain('splash800x600.png');
    expect(bootMenu).toContain('stdmenu.cfg');
    expect(installerBrand).toContain('productName: Centipede OS');
    expect(packageList).toContain('plymouth-themes');
  });
});

