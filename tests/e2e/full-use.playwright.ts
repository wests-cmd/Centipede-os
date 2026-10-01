import { test, expect, type Page } from '@playwright/test';

async function completeClientSetup(page: Page) {
  await expect(page.getByRole('heading', { name: 'Welcome to Centipede' })).toBeVisible();
  for (let step = 0; step < 4; step += 1) {
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await page.getByPlaceholder('http://localhost:8000').fill('http://127.0.0.1:1');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Client Setup Complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Centipede Desktop App' }).click();
  await expect(page.locator('header')).toContainText('Centipede OS');
  await page.screenshot({ path: 'test-results/full-use-00_home.png' });
}

test('opens every Centipede desktop app surface and records a screenshot', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await completeClientSetup(page);

  const apps = [
    ['Centipede AI', 'Centipede AI Pipeline', '01_ai'],
    ['Agent Control Plane', 'Agent Control Plane & Security', '02_agent_control'],
    ['Digital Workspace', 'Universal Digital Workspace & Workflows', '03_workspace'],
    ['Mobile Companion', 'Mobile Companion', '04_mobile'],
    ['Kingdom Engine', 'Kingdom Runtime Status', '05_kingdom'],
    ['Memory Explorer', 'Memory Explorer', '06_memory'],
    ['Skill Manager', 'Skill Manager', '07_skills'],
    ['Swarm Maps', 'AI Swarm Maps', '08_maps'],
    ['Activity & Tasks', 'Activity & Tasks', '09_tasks'],
    ['Security & Approvals', 'Permissions & Approvals', '10_security'],
    ['Universal Search', 'Universal Search', '11_search'],
    ['File Explorer', 'File Explorer', '12_files'],
    ['Terminal CLI', 'Terminal CLI', '13_terminal'],
    ['Settings', 'System Settings', '14_settings'],
  ] as const;

  for (const [buttonName, windowTitle, screenshotName] of apps) {
    await page.getByRole('complementary').getByRole('button', { name: buttonName, exact: true }).click();
    await expect(page.getByRole('main').getByText(windowTitle, { exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/full-use-${screenshotName}.png` });
  }
});
