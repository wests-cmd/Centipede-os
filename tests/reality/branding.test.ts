import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('Centipede product branding', () => {
  it('uses Centipede identity in visible everyday desktop guidance', () => {
    const launcher = readFileSync(join(root, 'src/components/AppLauncher.tsx'), 'utf8');
    expect(launcher).toContain('Included with Centipede OS');
    expect(launcher).toContain('On Centipede OS, open the Applications menu');
    expect(launcher).not.toMatch(/\bDebian\b/i);
  });

  it('starts with the calm classic home screen and keeps illustrated scenes optional', () => {
    const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
    const launcher = readFileSync(join(root, 'src/components/AppLauncher.tsx'), 'utf8');
    expect(app).toContain("'classic'");
    expect(launcher).toContain('Your desktop, ready.');
    expect(launcher).toContain("homeVisual !== 'classic'");
  });

  it('uses branded first-boot identity and a non-cyclic desktop-ready gate', () => {
    const lightdm = readFileSync(join(root, 'packaging/live-build/config/includes.chroot/etc/lightdm/lightdm.conf.d/99-centipede.conf'), 'utf8');
    const readiness = readFileSync(join(root, 'packaging/live-build/config/includes.chroot/etc/systemd/system/centipede-desktop-readiness.service'), 'utf8');
    const bootMenu = readFileSync(join(root, 'packaging/live-build/config/hooks/normal/0300-centipede-boot-menu.hook.binary'), 'utf8');
    expect(lightdm).toContain('autologin-user=centipede');
    expect(readiness).toContain('After=centipede-web.service');
    expect(readiness).toContain('WantedBy=multi-user.target');
    expect(readiness).not.toContain('After=graphical.target');
    const readinessProbe = readFileSync(join(root, 'packaging/live-build/config/includes.chroot/usr/local/libexec/centipede-desktop-readiness.py'), 'utf8');
    expect(readinessProbe).toContain('def report_serial(message):');
    expect(readinessProbe).toContain('account={identity}');
    expect(readinessProbe).toContain('launcher={launcher_detail');
    expect(bootMenu).toContain('MENU TITLE Centipede OS');
    expect(bootMenu).toContain('UI vesamenu.c32');
    expect(bootMenu).toContain('distro gfxboot splash');
  });

  it('sets the live account identity and starts the desktop from the user profile', () => {
    const liveConfig = readFileSync(join(root, 'packaging/live-build/config/includes.chroot/etc/live/config.conf.d/centipede.conf'), 'utf8');
    const userAutostart = readFileSync(join(root, 'packaging/live-build/config/includes.chroot/etc/skel/.config/autostart/centipede-desktop.desktop'), 'utf8');
    expect(liveConfig).toContain('LIVE_USER_FULLNAME="Centipede OS"');
    expect(liveConfig).toContain('LIVE_USERNAME="centipede"');
    expect(userAutostart).toContain('Exec=/usr/local/bin/centipede-desktop');
  });
});
