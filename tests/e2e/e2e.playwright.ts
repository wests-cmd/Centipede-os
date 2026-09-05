import { test, expect } from '@playwright/test';

test.describe('Centipede OS & Kingdom Integration Contract Test Suite', () => {
  test('1. Standalone Offline Boot Verification', async ({ page }) => {
    console.log('Test 1: Verifying Centipede OS starts offline without crashing...');
    await page.goto('http://localhost:3000');
    await expect(page.locator('header')).toContainText('Centipede OS');

    await page.click('button:has-text("Files")');
    await expect(page.locator('body')).toContainText('KINGDOM_INTEGRATION.md');

    await page.screenshot({ path: 'test-results/01_offline_boot.png' });
  });

  test('2. Live API Contract & Security Approval Verification', async ({ page }) => {
    console.log('Test 2: Verifying live Kingdom contract & ZeroTrust security...');
    await page.goto('http://localhost:3000');

    // Kingdom status
    await page.click('button:has-text("Kingdom Status")');
    await expect(page.locator('h2')).toContainText('Kingdom Runtime Status');
    await expect(page.locator('body')).toContainText('CONNECTED');
    await expect(page.locator('body')).toContainText('v40.1');

    await page.screenshot({ path: 'test-results/02_status_panel.png' });

    // Task lifecycle
    await page.click('button:has-text("Tasks")');
    await page.fill('input[placeholder*="Enter prompt task"]', 'Contract verification task prompt');
    await page.click('button:has-text("Submit Task")');
    await expect(page.locator('body')).toContainText('Task created successfully');
    await expect(page.locator('body')).toContainText('Contract verification task prompt');

    await page.screenshot({ path: 'test-results/03_task_pipeline.png' });

    // ZeroTrust security approval workflow in Centipede AI
    await page.click('button:has-text("Centipede AI")');
    await page.fill('textarea', 'delete file /tmp/restricted_test_dir');
    await page.click('button:has-text("Process Prompt Pipeline")');

    await expect(page.locator('body')).toContainText('Action Blocked by Kingdom Security', { timeout: 10000 });
    await expect(page.locator('body')).toContainText('Approval request created');

    await page.screenshot({ path: 'test-results/04_security_blocked.png' });

    // Security view approve
    await page.click('button:has-text("Security")');
    await expect(page.locator('body')).toContainText('Pending Security Approvals');
    await expect(page.locator('body')).toContainText('filesystem.delete');
    await page.click('button:has-text("Approve")');
    await expect(page.locator('body')).toContainText('GRANTED');

    await page.screenshot({ path: 'test-results/05_approved.png' });

    console.log('--- ALL E2E CONTRACT VERIFICATION TESTS PASSED! ---');
  });
});
