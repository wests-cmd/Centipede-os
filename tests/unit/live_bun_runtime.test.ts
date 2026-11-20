import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const from = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('ISO real localhost API integration', () => {
  it('builds the same production Bun server instead of installing static-only Python', () => {
    const script = from('scripts/build-live-image.sh');
    const unit = from('packaging/live-build/config/includes.chroot/etc/systemd/system/centipede-web.service');
    expect(script).toContain('src/server/production.ts');
    expect(script).toContain('--compile');
    expect(script).toContain('--target=bun-linux-x64');
    expect(script).toContain('opt/centipede/web/dist');
    expect(unit).toContain('ExecStart=/usr/local/bin/centipede-server');
    expect(unit).not.toContain('http.server');
    expect(unit).toContain('User=centipede-web');
    expect(unit).toContain('Environment=HOST=127.0.0.1');
    expect(unit).toContain('StateDirectory=centipede');
    expect(unit).toContain('ProtectSystem=strict');
  });
  it('never embeds an owner credential and preserves a fail-closed setup path', () => {
    const unit = from('packaging/live-build/config/includes.chroot/etc/systemd/system/centipede-web.service');
    expect(unit).toContain('EnvironmentFile=-/etc/centipede/kingdom.env');
    expect(unit).not.toContain('KINGDOM_API_TOKEN=');
    expect(unit).not.toContain('Environment=KINGDOM_API_URL=');
  });
  it('requires the real API in its QEMU readiness marker and app-style window', () => {
    const readiness = from('packaging/live-build/config/includes.chroot/usr/local/libexec/centipede-desktop-readiness.py');
    const desktop = from('packaging/live-build/config/includes.chroot/usr/local/bin/centipede-desktop');
    expect(readiness).toContain('/api/v1/health');
    expect(readiness).toContain('last_api_ready');
    expect(desktop).toContain('--app=http://127.0.0.1:3000');
  });
});
