import { test, expect, type Page } from '@playwright/test';

const kingdomTestUrl = `http://127.0.0.1:${process.env.CENTIPEDE_E2E_KINGDOM_PORT || 8100}`;

async function completeClientSetup(page: Page, kingdomUrl = 'http://127.0.0.1:1') {
  await expect(page.getByRole('heading', { name: 'Welcome to Centipede' })).toBeVisible();
  for (let step = 0; step < 4; step += 1) {
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await page.getByPlaceholder('http://localhost:8000').fill(kingdomUrl);
  await page.getByRole('button', { name: 'Continue' }).click();
  if (kingdomUrl !== 'http://127.0.0.1:1') {
    await expect(page.locator('body')).toContainText('Kingdom Connection:CONNECTED', { timeout: 10000 });
  }
  await expect(page.getByRole('heading', { name: 'Client Setup Complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Centipede Desktop App' }).click();
  await expect(page.locator('header')).toContainText('Centipede OS');
}

test.describe('Centipede desktop client and Kingdom integration', () => {
  test('shows that companion pairing is local to each client instead of shared across two clients', async ({ browser }) => {
    test.setTimeout(60000);
    const androidLikeContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const iosLikeContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const androidLike = await androidLikeContext.newPage();
    const iosLike = await iosLikeContext.newPage();

    try {
      await androidLike.goto('/');
      await completeClientSetup(androidLike);
      await iosLike.goto('/');
      await completeClientSetup(iosLike);
      await Promise.all([
        androidLike.locator('nav').evaluate((dock) => { dock.scrollLeft = dock.scrollWidth; }),
        iosLike.locator('nav').evaluate((dock) => { dock.scrollLeft = dock.scrollWidth; }),
      ]);
      await Promise.all([
        androidLike.getByRole('button', { name: 'Mobile', exact: true }).click(),
        iosLike.getByRole('button', { name: 'Mobile', exact: true }).click(),
      ]);

      await expect(androidLike.getByText(/simulates pairing locally/i)).toBeVisible();
      await expect(iosLike.getByText(/does not connect a remote phone/i)).toBeVisible();
      await expect(androidLike.getByRole('heading', { name: 'Trusted Paired Devices (0)' })).toBeVisible();
      await expect(iosLike.getByRole('heading', { name: 'Trusted Paired Devices (0)' })).toBeVisible();

      await androidLike.getByRole('button', { name: 'Pair New Companion' }).click();
      const pin = (await androidLike.locator('.font-mono.font-bold.text-cyan-300').textContent())?.trim();
      expect(pin).toMatch(/^\d{6}$/);
      await androidLike.getByPlaceholder(pin!).fill(pin!);
      await androidLike.getByRole('button', { name: 'Confirm', exact: true }).click();
      await expect(androidLike.getByRole('heading', { name: 'Trusted Paired Devices (1)' })).toBeVisible();
      await androidLike.screenshot({ path: 'test-results/06_mobile-pair_android-browser.png' });

      // The second mobile-sized client remains unpaired: current native shells do not share
      // pairing state through the server API. Keep this explicit until the feature is wired.
      await expect(iosLike.getByRole('heading', { name: 'Trusted Paired Devices (0)' })).toBeVisible();

      await iosLike.getByRole('button', { name: 'Pair New Companion' }).click();
      const iosPin = (await iosLike.locator('.font-mono.font-bold.text-cyan-300').textContent())?.trim();
      expect(iosPin).toMatch(/^\d{6}$/);
      await iosLike.getByPlaceholder(iosPin!).fill(iosPin!);
      await iosLike.getByRole('button', { name: 'Confirm', exact: true }).click();
      await expect(iosLike.getByRole('heading', { name: 'Trusted Paired Devices (1)' })).toBeVisible();
      await expect(androidLike.getByRole('heading', { name: 'Trusted Paired Devices (1)' })).toBeVisible();
      await iosLike.screenshot({ path: 'test-results/07_mobile-pair_ios-browser.png' });
    } finally {
      await Promise.allSettled([androidLikeContext.close(), iosLikeContext.close()]);
    }
  });

  test('boots offline and labels the file view as demonstration content', async ({ page }) => {
    await page.goto('/');
    await completeClientSetup(page);

    await page.getByRole('button', { name: 'File Explorer' }).click();
    await expect(page.getByRole('heading', { name: 'Sample File Viewer' })).toBeVisible();
    await expect(page.getByText('This view does not read files from your device.')).toBeVisible();
    await expect(page.getByText('# Kingdom Integration Guide')).toBeVisible();
    await page.screenshot({ path: 'test-results/01_offline_boot.png' });
  });

  test('connects to Kingdom, submits a task, and exercises the approval surface', async ({ page }) => {
    await page.goto('/');
    await completeClientSetup(page, kingdomTestUrl);

    await page.getByRole('button', { name: 'Kingdom Engine', exact: true }).click();
    await expect(page.getByText('Kingdom Runtime Status')).toBeVisible();
    await expect(page.locator('body')).toContainText('CONNECTED');
    await expect(page.locator('body')).toContainText('Kingdom Versionv1TAS');
    await page.screenshot({ path: 'test-results/02_status_panel.png' });

    await page.getByRole('button', { name: 'Activity & Tasks' }).click();
    await page.getByPlaceholder('Enter prompt task for Kingdom processing...').fill('Contract verification task prompt');
    await page.getByRole('button', { name: 'Submit Task' }).click();
    await expect(page.locator('body')).toContainText('Contract verification task prompt');
    await page.screenshot({ path: 'test-results/03_task_pipeline.png' });

    await page.getByRole('button', { name: 'Centipede AI' }).click();
    await page.getByPlaceholder(/delete file/).fill('delete file /tmp/restricted_test_dir');
    await page.getByRole('button', { name: 'Process Prompt Pipeline' }).click();
    await expect(page.locator('body')).toContainText(/Approval request created|APPROVAL_REQUIRED/, { timeout: 10000 });
    await page.screenshot({ path: 'test-results/04_security_review.png' });

    await page.getByRole('button', { name: 'Security & Approvals' }).click();
    await expect(page.locator('body')).toContainText('Pending Security Approvals');
    await expect(page.locator('body')).toContainText('filesystem.delete');
    await page.screenshot({ path: 'test-results/05_pending_approval.png' });
  });
});

