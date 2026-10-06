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
});
