import { test, expect } from '@playwright/test';

test('local GIF persists, really pauses, honors reduced motion, and rejects executable backgrounds', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('centipede_first_run_completed', 'true'));
  await page.goto('/');
  await expect(page.getByAltText('Illuminated metallic centipede curled around Earth')).toBeVisible();
  await expect.poll(() => page.getByAltText('Illuminated metallic centipede curled around Earth').evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 1000)).toBe(true);
  await page.getByRole('complementary').getByRole('button', { name: 'Settings', exact: true }).click();
  const picker = page.locator('input[type=file]');
  // A real tiny GIF, decoded by the browser and stored by the normal file picker handler.
  await picker.setInputFiles({ name: 'local-test.gif', mimeType: 'image/gif', buffer: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64') });
  await expect(page.getByRole('status').filter({ hasText: 'Saved local-test.gif' })).toBeVisible();
  await page.getByRole('complementary').getByRole('button', { name: 'Home / Desktop', exact: true }).click();
  const image = page.getByAltText('local-test.gif');
  await expect(image).toBeVisible();
  const stillUrl = await image.getAttribute('src');
  await page.getByRole('button', { name: 'Play background', exact: true }).click();
  await expect(image).not.toHaveAttribute('src', stillUrl!);
  await page.getByRole('button', { name: 'Pause background', exact: true }).click();
  await expect(image).toHaveAttribute('src', stillUrl!);
  await page.reload();
  await expect(page.getByAltText('local-test.gif')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play background', exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Reduced motion: still preview' })).toBeDisabled();
  await page.screenshot({ path: 'test-results/home-media-reduced-motion.png' });
  await page.getByRole('complementary').getByRole('button', { name: 'Settings', exact: true }).click();
  await picker.setInputFiles({ name: 'danger.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>window.bad=true</script></svg>') });
  await expect(page.getByRole('status').filter({ hasText: 'SVG and web pages are not accepted' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove custom background', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Removed the saved custom background' })).toBeVisible();
  await page.getByRole('complementary').getByRole('button', { name: 'Home / Desktop', exact: true }).click();
  await expect(page.getByAltText('Illuminated metallic centipede curled around Earth')).toBeVisible();
  await page.getByAltText('Illuminated metallic centipede curled around Earth').evaluate((element: HTMLImageElement) => element.decode());
  await expect.poll(() => page.getByAltText('Illuminated metallic centipede curled around Earth').evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 1000 && element.getBoundingClientRect().width > 500)).toBe(true);
  await page.screenshot({ path: 'test-results/home-media-signature-art.png' });
});

test('real video releases the old decoder on pause, offscreen and Home unmount', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('centipede_first_run_completed', 'true'));
  await page.goto('/');
  await page.getByRole('complementary').getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles('tests/fixtures/local-background.webm');
  await expect(page.getByRole('status').filter({ hasText: 'Saved local-background.webm' })).toBeVisible();
  await page.getByRole('complementary').getByRole('button', { name: 'Home / Desktop', exact: true }).click();
  const start = async () => {
    await page.getByRole('button', { name: 'Play background', exact: true }).click();
    await expect.poll(() => page.locator('video').evaluate((element: HTMLVideoElement) => element.readyState >= 2 && !element.paused && element.videoWidth === 16)).toBe(true);
    return page.locator('video').elementHandle();
  };
  const paused = await start();
  await page.getByRole('button', { name: 'Pause background', exact: true }).click();
  await expect.poll(() => paused!.evaluate((element: HTMLVideoElement) => element.paused && !element.getAttribute('src') && element.readyState === HTMLMediaElement.HAVE_NOTHING)).toBe(true);
  const scrolled = await start();
  await page.getByText('Everyday apps', { exact: true }).scrollIntoViewIfNeeded();
  await page.getByText('Centipede tools', { exact: true }).scrollIntoViewIfNeeded();
  await expect.poll(() => scrolled!.evaluate((element: HTMLVideoElement) => element.paused && !element.getAttribute('src') && element.readyState === HTMLMediaElement.HAVE_NOTHING)).toBe(true);
  await page.getByRole('complementary').getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('complementary').getByRole('button', { name: 'Home / Desktop', exact: true }).click();
  const detached = await start();
  await page.getByRole('complementary').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect.poll(() => detached!.evaluate((element: HTMLVideoElement) => !element.isConnected && element.paused && !element.getAttribute('src') && element.readyState === HTMLMediaElement.HAVE_NOTHING)).toBe(true);
});
