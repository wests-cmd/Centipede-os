import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const files = {
  mark: 'packaging/live-build/config/includes.chroot/usr/share/backgrounds/centipede/centipede-mark.svg',
  wallpaper: 'packaging/live-build/config/includes.chroot/usr/share/backgrounds/centipede/centipede-workspace.svg',
  menu: 'packaging/live-build/config/includes.chroot/usr/share/backgrounds/centipede/centipede-menu.svg',
  splash: 'packaging/live-build/config/includes.chroot/usr/share/plymouth/themes/centipede/centipede-boot.svg',
};

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const render = async (source, output, width, height, omitBackground = false) => {
    const inputPath = resolve(root, source);
    const outputPath = resolve(root, output);
    await mkdir(dirname(outputPath), { recursive: true });
    await page.setViewportSize({ width, height });
    await page.goto(pathToFileURL(inputPath).href, { waitUntil: 'load' });
    await page.screenshot({ path: outputPath, omitBackground });
    console.log(`Rendered ${output}`);
  };

  await render(
    files.mark,
    'packaging/live-build/config/includes.chroot/etc/calamares/branding/centipede/centipede-logo.png',
    512,
    512,
    true,
  );
  await render(
    files.wallpaper,
    'packaging/live-build/config/includes.chroot/usr/share/backgrounds/centipede/centipede-workspace.png',
    1920,
    1080,
  );
  await render(
    files.menu,
    'packaging/live-build/config/includes.chroot/usr/share/backgrounds/centipede/centipede-menu.png',
    1280,
    720,
  );
  await render(
    files.splash,
    'packaging/live-build/config/includes.chroot/usr/share/plymouth/themes/centipede/centipede-boot.png',
    1280,
    720,
  );
} finally {
  await browser.close();
}
