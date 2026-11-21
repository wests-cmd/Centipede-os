import { expect, test, type Page } from '@playwright/test';

async function startDesktop(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name:'Welcome to Centipede' })).toBeVisible();
  for (let step=0;step<4;step++) await page.getByRole('button',{name:'Continue'}).click();
  await page.getByPlaceholder('http://localhost:8000').fill('http://127.0.0.1:1');
  await page.getByRole('button',{name:'Continue'}).click();
  await page.getByRole('button',{name:'Open Centipede Desktop App'}).click();
  await expect(page.locator('header')).toContainText('Centipede OS');
}

test('Command Center exposes real measurements and all 16 areas without invented host health', async ({ page }) => {
  await startDesktop(page);
  await page.getByRole('button',{name:'Open Command Center'}).click();
  await expect(page.getByRole('heading',{name:'System Command Center'})).toBeVisible();
  const telemetry = await page.request.get('/api/v1/visibility/host');
  expect(telemetry.status()).toBe(200);
  expect((await telemetry.json()).scope).toBe('local-centipede-server-kernel-view');
  await page.screenshot({path:'test-results/system-command-everyday.png'});
  await expect(page.getByText('Needs your attention')).toBeVisible();
  await expect(page.getByText('Waiting for Kingdom')).toBeVisible();
  await expect(page.locator('section[aria-labelledby="overview-tiles-heading"] article')).toHaveCount(6);
  await page.getByRole('tab',{name:'Advanced'}).click();
  await expect(page.locator('section[aria-labelledby="overview-tiles-heading"] article')).toHaveCount(16);
  await expect(page.getByText('Backups & recovery')).toBeVisible();
  await expect(page.getByText('Privacy & permissions')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Real task and observation timeline'})).toBeVisible();
  await page.screenshot({path:'test-results/system-command-advanced.png'});
  await page.getByRole('tab',{name:'Owner'}).click();
  await expect(page.getByRole('heading',{name:'Owner visibility'})).toBeVisible();
  await expect(page.getByText('Owner actions are locked.',{exact:false})).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Immutable Security Audit Trail');
  await page.screenshot({path:'test-results/system-command-owner-locked.png'});
  await page.getByRole('tab',{name:'Everyday'}).click();
  await page.getByRole('button',{name:/Open diagnostics|Run diagnostics/}).click();
  await expect(page.getByRole('heading',{name:'Centipede Doctor'})).toBeVisible();
});

test('mobile-sized browser can navigate to an honest, readable Command Center', async ({ browser }) => {
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true});
  const page = await context.newPage();
  try {
    await startDesktop(page);
    await page.getByRole('button',{name:'Open Command Center'}).click();
    await expect(page.getByRole('heading',{name:'System Command Center'})).toBeVisible();
    await expect(page.getByText('No successful overview refresh yet').or(page.getByText('Last refreshed:',{exact:false}))).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({path:'test-results/system-command-mobile.png'});
  } finally { await context.close(); }
});
