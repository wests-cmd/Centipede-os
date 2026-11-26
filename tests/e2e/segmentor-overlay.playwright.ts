import { test, expect } from '@playwright/test';
test('quick assistant opens local app, drafts complex work without dispatch, and returns to wallpaper', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('centipede_first_run_completed','true'));
  let submissions = 0;
  await page.route('**/api/**', async route => {
    if (route.request().method() === 'POST' && /\/tasks(?:\?|$)/.test(route.request().url())) submissions++;
    await route.continue();
  });
  await page.goto('/');
  const wallpaper = page.getByTestId('signature-desktop-wallpaper');
  await expect(wallpaper).toBeVisible();
  await page.getByRole('button',{name:'Open Segmentor quick assistant'}).click();
  const panel = page.getByRole('region',{name:'Segmentor quick assistant'});
  await expect(panel).toBeVisible();
  await panel.getByLabel('What do you need?').fill('open settings');
  await panel.getByRole('button',{name:'Continue'}).click();
  await expect(page.getByRole('main').getByText('System Settings',{exact:true}).first()).toBeVisible();
  await page.keyboard.press('Control+Alt+Space');
  await expect(panel.getByLabel('What do you need?')).toBeFocused();
  await panel.getByLabel('What do you need?').fill('Research the project');
  await panel.getByRole('button',{name:'Continue'}).click();
  await expect(page.getByLabel('What should Kingdom work on?')).toHaveValue('Research the project');
  expect(submissions).toBe(0);
  await page.getByRole('complementary').getByRole('button',{name:'Home / Desktop',exact:true}).click();
  await expect(wallpaper).toBeVisible();
});
