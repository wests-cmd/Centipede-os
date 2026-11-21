import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const file = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('Debian live-image static web hardening and fallback', () => {
  it('preserves executable mode for systemd ExecStart Python readiness and repairs it in staged image', () => {
    const script = 'packaging/live-build/config/includes.chroot/usr/local/libexec/centipede-desktop-readiness.py';
    const staged = file('scripts/build-live-image.sh');
    const unit = file('packaging/live-build/config/includes.chroot/etc/systemd/system/centipede-desktop-readiness.service');
    const tracked = spawnSync('git', ['ls-files', '--stage', '--', script], { encoding: 'utf8', timeout: 10_000 });
    expect(tracked.status, String(tracked.stderr)).toBe(0);
    expect(tracked.stdout).toMatch(/^100755 /);
    expect(unit).toContain('ExecStart=/usr/local/libexec/centipede-desktop-readiness.py');
    expect(staged).toContain('chmod 0755 "$BUILD/config/includes.chroot/usr/local/libexec/centipede-desktop-readiness.py"');
    expect(staged).toContain('test -x "$BUILD/config/includes.chroot/usr/local/libexec/centipede-desktop-readiness.py"');
    const python = spawnSync(process.env.CENTIPEDE_E2E_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
      ['-m', 'py_compile', script], { encoding: 'utf8', timeout: 10_000 });
    expect(python.status, String(python.stderr)).toBe(0);
  });

  it('orders readiness after concrete services without cycling its target', () => {
    const unit = file('packaging/live-build/config/includes.chroot/etc/systemd/system/centipede-desktop-readiness.service');
    expect(unit).toContain('After=lightdm.service centipede-web.service');
    expect(unit).not.toContain('After=graphical.target');
    expect(unit).not.toContain('Wants=graphical.target');
  });
  it('does not run the local static server as root and confines it to loopback', () => {
    const unit = file('packaging/live-build/config/includes.chroot/etc/systemd/system/centipede-web.service');
    // The loopback-only service must start offline: waiting for an externally
    // reachable network can deadlock or delay QEMU and live USB first boot.
    expect(unit).toContain('After=network.target');
    expect(unit).not.toContain('network-online.target');
    expect(unit).toContain('User=centipede-web');
    expect(unit).toContain('Group=centipede-web');
    expect(unit).not.toContain('User=root');
    for (const flag of ['NoNewPrivileges=yes', 'PrivateDevices=yes', 'ProtectSystem=strict', 'ProtectHome=yes','CapabilityBoundingSet='])
      expect(unit).toContain(flag);
    expect(unit).toContain('Environment=HOST=127.0.0.1');
    expect(unit).toContain('ExecStart=/opt/centipede/bin/centipede-server');
    expect(unit).toContain('StateDirectoryMode=0700');
    expect(unit).not.toContain('http.server');
    expect(file('scripts/build-live-image.sh')).toContain('--target=bun-linux-x64-baseline');
    const readiness = file('packaging/live-build/config/includes.chroot/usr/local/libexec/centipede-desktop-readiness.py');
    expect(readiness).toContain('/api/v1/health');
    expect(readiness).toContain('CENTIPEDE_WEB_UNIT_DIAGNOSTIC');
    expect(readiness).toContain('ExecMainStatus');
    expect(readiness).not.toContain('show-environment');
  });
  it('creates the service account in live-build and sets application content owner', () => {
    const hook = file('packaging/live-build/config/hooks/normal/0150-centipede-security.hook.chroot');
    const build = file('scripts/build-live-image.sh');
    expect(hook).toContain('adduser --system');
    expect(hook).toContain('chown -R root:root /opt/centipede/web');
    expect(build).toContain('0150-centipede-security.hook.chroot');
  });
  it('keeps all installation and recovery shell scripts syntactically valid', () => {
    for (const path of [
      'packaging/live-build/config/hooks/normal/0150-centipede-security.hook.chroot',
      'packaging/live-build/config/includes.chroot/usr/local/bin/centipede-recovery',
      'packaging/live-build/config/includes.chroot/usr/local/bin/centipede-desktop',
    ]) {
      const result = spawnSync('sh', ['-n'], { input: file(path).replaceAll('\r\n', '\n'), timeout: 10_000 });
      expect(result.status, String(result.stderr)).toBe(0);
    }
    const build = spawnSync('bash', ['-n'], { input: file('scripts/build-live-image.sh').replaceAll('\r\n', '\n'), timeout: 10_000 });
    expect(build.status, String(build.stderr)).toBe(0);
  }, 45_000);
  it('provides a graphical service-failure fallback without destructive recovery steps', () => {
    const entry = file('packaging/live-build/config/includes.chroot/usr/local/bin/centipede-desktop');
    const fallback = file('packaging/live-build/config/includes.chroot/usr/local/bin/centipede-recovery');
    const build = file('scripts/build-live-image.sh');
    const packages = file('packaging/live-build/config/package-lists/centipede.list.chroot');
    expect(entry).toContain('exec /usr/local/bin/centipede-recovery');
    expect(fallback).toContain('Use regular desktop');
    expect(fallback).toContain('zenity --list');
    expect(packages).toContain('zenity');
    expect(build).toContain('centipede-recovery');
  });
});
