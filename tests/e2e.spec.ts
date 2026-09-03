import { test, expect } from '@playwright/test';

test.describe('Centipede OS & Kingdom Integration E2E Verification', () => {
  test('Complete 11-Point Centipede OS System Verification', async ({ page }) => {
    // 1. Centipede OS starts & GUI loads
    console.log('1. Verifying Centipede OS starts and GUI loads...');
    await page.goto('http://localhost:3000');
    await page.waitForSelector('text=Centipede OS');
    await expect(page.locator('header')).toContainText('Centipede OS');
    await expect(page.locator('header')).toContainText('Foundation v1.0');

    // Screenshot initial UI
    await page.screenshot({ path: 'test-results/01_centipede_os_loaded.png' });

    // 2. Connects to Kingdom & detects Kingdom status
    console.log('2. Verifying Kingdom connection & status detection...');
    await page.click('button:has-text("Kingdom Status")');
    await expect(page.locator('h2')).toContainText('Kingdom Runtime Status');
    await expect(page.locator('body')).toContainText('online');

    // 3. Displays Kingdom information (Version, Knights)
    console.log('3. Verifying Kingdom information display (Version, Knights)...');
    await expect(page.locator('body')).toContainText('v40.1');
    await expect(page.locator('body')).toContainText('Active Knights & Swarm Nodes');

    // Screenshot status panel
    await page.screenshot({ path: 'test-results/02_kingdom_status_panel.png' });

    // 4. Submits a safe test task & receives task status
    console.log('4. Submitting a safe test task & checking task status...');
    await page.click('button:has-text("Tasks")');
    await page.fill('input[placeholder*="Enter a task prompt"]', 'Playwright safe automated verification task');
    await page.click('button:has-text("Submit Task")');

    await expect(page.locator('body')).toContainText('Task created successfully with ID:');
    await expect(page.locator('body')).toContainText('Playwright safe automated verification task');

    // Screenshot task manager
    await page.screenshot({ path: 'test-results/03_task_manager.png' });

    // 5. Centipede AI Pipeline & ZeroTrust Security non-bypass verification
    console.log('5. Verifying Centipede AI Pipeline & ZeroTrust Security enforcement...');
    await page.click('button:has-text("Centipede AI")');
    await page.fill('textarea', 'Delete system configuration files');
    await page.check('input[type="checkbox"]'); // Simulate privileged capability
    await page.click('button:has-text("Process AI Intent")');

    // Must show security restriction and pending approval creation!
    await expect(page.locator('body')).toContainText('Action Blocked by Kingdom Security', { timeout: 10000 });
    await expect(page.locator('body')).toContainText('Approval request created');

    // Screenshot AI security block
    await page.screenshot({ path: 'test-results/04_ai_security_blocked.png' });

    // 6. Permissions & Approval View (Approve / Deny actions)
    console.log('6. Verifying Permissions & Security Approvals view...');
    await page.click('button:has-text("Security")');
    await expect(page.locator('body')).toContainText('Pending Security Approvals');
    await expect(page.locator('body')).toContainText('filesystem.delete');

    // Approve the request
    await page.click('button:has-text("Approve")');
    await expect(page.locator('body')).toContainText('GRANTED');

    // Screenshot approvals view
    await page.screenshot({ path: 'test-results/05_security_approvals.png' });

    // 7. Universal Search & File Manager
    console.log('7. Verifying Universal Search & File Manager...');
    await page.click('button:has-text("Search")');
    await page.fill('input[placeholder*="Search tasks"]', 'Playwright');
    await page.click('button:has-text("Search")');
    await expect(page.locator('body')).toContainText('Matching Tasks');

    await page.click('button:has-text("Files")');
    await expect(page.locator('body')).toContainText('KINGDOM_INTEGRATION.md');

    // Screenshot file manager
    await page.screenshot({ path: 'test-results/06_file_manager.png' });

    console.log('--- ALL E2E PLAYWRIGHT VERIFICATIONS PASSED SUCCESSFULLY! ---');
  });
});
