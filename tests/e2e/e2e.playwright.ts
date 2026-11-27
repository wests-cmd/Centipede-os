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
  test('pairs a second mobile-sized client through the shared HTTP service', async ({ browser }) => {
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
        androidLike.getByRole('button', { name: 'Devices', exact: true }).click(),
        iosLike.getByRole('button', { name: 'Devices', exact: true }).click(),
      ]);

      await expect(androidLike.getByText(/Connect a phone browser to this Centipede service/i)).toBeVisible();
      await expect(iosLike.getByText(/Native Android and iOS apps are not included yet/i)).toBeVisible();
      const initialHeading = androidLike.getByRole('heading', { name: /^Trusted Paired Devices/ });
      const initialCount = Number((await initialHeading.textContent())?.match(/\((\d+)\)/)?.[1]);
      await expect(iosLike.getByRole('heading', { name: `Trusted Paired Devices (${initialCount})` })).toBeVisible();
      await androidLike.screenshot({ path: 'test-results/15_mobile-shared-service-disclosure.png' });

      await androidLike.getByRole('button', { name: 'Create Pairing Code' }).click();
      const pin = (await androidLike.locator('.font-mono.font-bold.text-cyan-300').textContent())?.trim();
      expect(pin).toMatch(/^\d{6}$/);
      // The desktop also has an accessible Kingdom connection-status button.
      // Pairing must target the exact 'Connect' action rather than a partial name.
      await expect(iosLike.getByRole('button', { name: 'Inspect Kingdom connection status' })).toHaveCount(1);
      await iosLike.getByLabel('Pairing code').fill(pin!);
      await iosLike.getByRole('button', { name: 'Connect', exact: true }).click();
      await expect(iosLike.getByText('This phone is paired with the Centipede service.')).toBeVisible();
      await androidLike.getByRole('button', { name: 'Refresh paired devices' }).click();
      await expect(androidLike.getByRole('heading', { name: `Trusted Paired Devices (${initialCount + 1})` })).toBeVisible();
      expect(await iosLike.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      expect(await androidLike.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      await iosLike.screenshot({ path: 'test-results/06_mobile-pair_phone-browser.png', fullPage: true });
      await androidLike.screenshot({ path: 'test-results/07_mobile-paired-device-list.png', fullPage: true });

      await iosLike.getByLabel('Pairing code').fill(pin!);
      await iosLike.getByRole('button', { name: 'Connect', exact: true }).click();
      await expect(iosLike.locator('body')).toContainText('Invalid or expired pairing code.');
      await androidLike.getByRole('button', { name: 'Revoke' }).click();
      await expect(androidLike.locator('body')).toContainText('REVOKED');
    } finally {
      await Promise.allSettled([androidLikeContext.close(), iosLikeContext.close()]);
    }
  });

  test('boots offline and keeps real Files owner-locked', async ({ page }) => {
    await page.goto('/');
    await completeClientSetup(page);

    await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button', { name: 'Files', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Centipede Files — Local Workspace' })).toBeVisible();
    await expect(page.getByText(/Files are locked/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create file (no overwrite)' })).toBeDisabled();
    await page.screenshot({ path: 'test-results/01_offline_boot.png' });
  });

  test('connects to Kingdom but blocks task actions until the owner unlocks this host', async ({ page }) => {
    await page.goto('/');
    await completeClientSetup(page, kingdomTestUrl);

    await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button', {name:'Apps',exact:true}).click();
    await page.getByRole('region',{name:'Application directory'}).getByRole('button', { name: 'Kingdom Engine', exact: true }).click();
    await expect(page.getByText('Kingdom Runtime Status')).toBeVisible();
    await expect(page.locator('body')).toContainText('CONNECTED');
    await expect(page.locator('body')).toContainText('Kingdom Versionv1TAS');
    await page.screenshot({ path: 'test-results/02_status_panel.png' });

    await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button', { name: 'Tasks', exact: true }).click();
    await expect(page.getByLabel(/Unlock real Kingdom task actions/)).toBeVisible();
    await page.getByPlaceholder('Enter prompt task for Kingdom processing...').fill('Contract verification task prompt');
    await expect(page.getByRole('button', { name: 'Submit Task' })).toBeDisabled();
    await expect(page.getByText(/Task changes require an explicitly unlocked owner session/)).toBeVisible();
    await page.screenshot({ path: 'test-results/03_task_owner_locked.png' });

    await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button', { name: 'Segmentor', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Segmentor — Kingdom Tasks' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit real Kingdom task' })).toBeDisabled();
    await expect(page.getByText(/This screen does not simulate task completion/)).toBeVisible();
    await page.screenshot({ path: 'test-results/04_segmentor_owner_locked.png' });

    await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button', {name:'Apps',exact:true}).click();
    await page.getByRole('region',{name:'Application directory'}).getByRole('button', { name: 'Security & Approvals', exact: true }).click();
    await expect(page.locator('body')).toContainText('Pending Security Approvals');
    await page.screenshot({ path: 'test-results/05_approval_read_only.png' });
  });
});

