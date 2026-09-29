import { test, expect, type Page } from '@playwright/test';

async function completeClientSetup(page: Page) {
  await expect(page.getByRole('heading', { name: 'Welcome to Centipede' })).toBeVisible();
  for (let step = 0; step < 5; step += 1) {
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Client Setup Complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Centipede Desktop App' }).click();
  await expect(page.locator('header')).toContainText('Centipede OS');
}

test.describe('Centipede desktop client and Kingdom integration', () => {
  test('boots offline and labels the file view as demonstration content', async ({ page }) => {
    await page.route('http://localhost:8000/**', (route) => route.abort());
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
    await completeClientSetup(page);

    await page.getByRole('button', { name: 'Kingdom Engine', exact: true }).click();
    await expect(page.getByText('Kingdom Runtime Status')).toBeVisible();
    await expect(page.locator('body')).toContainText('CONNECTED');
    await expect(page.locator('body')).toContainText(/Kingdom Versionv\d+\.\d+\.\d+/);
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
