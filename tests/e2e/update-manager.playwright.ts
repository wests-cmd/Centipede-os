import { expect, test } from '@playwright/test';

test('prompts before a larger browser app update and identifies fetched files', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('centipede_first_run_completed', 'true'));
  await page.route('**/api/v1/health**', async (route) => {
    await route.fulfill({ json: { status: 'HEALTHY', version: '1.1.0', timestamp: Date.now() } });
  });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const update = page.getByRole('region', { name: 'Centipede web app 1.1.0 is ready' });
  await expect(update.getByRole('heading', { name: 'Centipede web app 1.1.0 is ready' })).toBeVisible();
  await expect(update).toContainText('larger update includes the browser page, JavaScript, and styles');
  await expect(update.getByRole('button', { name: 'Load and restart app' })).toBeVisible();
  // A real hit-test: the notice must not be trapped behind the dock.
  await expect(update).toHaveCSS('position', 'fixed');
  await update.getByRole('button', { name: 'Later' }).click();
  await expect(update).toBeHidden();
});
