import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const APP_PAGES = [
  ['Segmentor', 'Segmentor — Kingdom Tasks'],
  ['Agent Control Plane', 'Agent Control Plane & Security'],
  ['Digital Workspace', 'Universal Digital Workspace & Workflows'],
  ['Mobile Companion', 'Mobile Companion'],
  ['Kingdom Engine', 'Kingdom Runtime Status'],
  ['Memory Explorer', 'Memory Explorer'],
  ['Skill Manager', 'Skill Manager'],
  ['Swarm Maps', 'AI Swarm Maps'],
  ['Activity & Tasks', 'Activity & Tasks'],
  ['Security & Approvals', 'Permissions & Approvals'],
  ['Universal Search', 'Universal Search'],
  ['File Explorer', 'File Explorer'],
  ['Terminal CLI', 'Terminal CLI'],
  ['Settings', 'System Settings'],
] as const;

const stats = (values: number[]) => {
  if (!values.length) throw new Error('Benchmark cannot report empty timing samples');
  const sorted = [...values].sort((a, b) => a - b);
  const pick = (fraction: number) => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
  return {
    count: sorted.length,
    minMs: Number(sorted[0].toFixed(1)),
    p50Ms: Number(pick(0.5).toFixed(1)),
    p95Ms: Number(pick(0.95).toFixed(1)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(1)),
  };
};

test('production browser user journey: first run, all apps, offline security, and mobile layout', async ({ browser, page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const coldStart = performance.now();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Welcome to Centipede' })).toBeVisible({ timeout: 20_000 });
  const coldWizardVisibleMs = performance.now() - coldStart;
  const navigation = await page.evaluate(() => {
    const entry = performance.getEntries().find((item) => String(item.entryType) === 'navigation') as PerformanceNavigationTiming | undefined;
    return {
      domContentLoadedMs: entry?.domContentLoadedEventEnd ?? null,
      loadEventMs: entry?.loadEventEnd ?? null,
    };
  });
  const setupStart = performance.now();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByPlaceholder('http://localhost:8000').fill('http://127.0.0.1:1');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Client Setup Complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Centipede Desktop App' }).click();
  await expect(page.locator('header')).toContainText('Centipede OS');
  const automatedSetupMs = performance.now() - setupStart;

  // This deployment intentionally has no Kingdom owner key or real remote worker.
  // Check visible fail-closed states instead of simulating successful execution.
  const firstOpen: { app: string; milliseconds: number }[] = [];
  const warmOpen: { app: string; milliseconds: number }[] = [];
  for (let pass = 0; pass < 2; pass++) {
    for (const [appName, title] of APP_PAGES) {
      const start = performance.now();
      await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Apps',exact:true}).click();
      await page.getByRole('region',{name:'Application directory'}).getByRole('button',{name:appName,exact:true}).click();
      await expect(page.getByRole('main').getByText(title, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
      if (appName === 'Segmentor') {
        await expect(page.getByRole('button', { name: 'Submit real Kingdom task' })).toBeDisabled();
      }
      const sample = { app: appName, milliseconds: Number((performance.now() - start).toFixed(1)) };
      (pass === 0 ? firstOpen : warmOpen).push(sample);
    }
  }

  const chrome = await page.context().newCDPSession(page);
  await chrome.send('Performance.enable');
  const perfMetrics = (await chrome.send('Performance.getMetrics')).metrics as { name: string; value: number }[];
  const rendererMetrics = Object.fromEntries(perfMetrics.map(item => [item.name, item.value]));
  const resources = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return {
      fetchedResources: resources.length,
      observedTransferBytes: resources.reduce((sum, x) => sum + (x.transferSize || 0), 0),
    };
  });
  const reloadStart = performance.now();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('header')).toContainText('Centipede OS');
  const warmReloadMs = performance.now() - reloadStart;

  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const phone = await phoneContext.newPage();
  phone.on('pageerror', error => errors.push(error.message));
  try {
    await phone.addInitScript(() => localStorage.setItem('centipede_first_run_completed', 'true'));
    const mobileStart = performance.now();
    await phone.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(phone.locator('header')).toContainText('Centipede OS');
    const mobileStartMs = performance.now() - mobileStart;
    const viewportOverflow = await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(viewportOverflow).toBe(false);
    const report = {
      schema: 1,
      benchmark: 'built Centipede web client and Bun API served on loopback, automated real Chromium user interactions',
      gitSha: process.env.GITHUB_SHA ?? 'local-unverified',
      capturedAtUTC: new Date().toISOString(),
      runner: { platform: process.platform, architecture: process.arch },
      firstRun: {
        coldWizardVisibleMs: Number(coldWizardVisibleMs.toFixed(1)),
        automatedSetupMs: Number(automatedSetupMs.toFixed(1)),
        navigation,
      },
      appOpening: {
        firstOpen,
        firstOpenStats: stats(firstOpen.map(x => x.milliseconds)),
        warmOpen,
        warmOpenStats: stats(warmOpen.map(x => x.milliseconds)),
      },
      warmReloadMs: Number(warmReloadMs.toFixed(1)),
      renderer: {
        usedJSHeapMiB: typeof rendererMetrics.JSHeapUsedSize === 'number' ? Number((rendererMetrics.JSHeapUsedSize / (1024 ** 2)).toFixed(2)) : null,
        totalJSHeapMiB: typeof rendererMetrics.JSHeapTotalSize === 'number' ? Number((rendererMetrics.JSHeapTotalSize / (1024 ** 2)).toFixed(2)) : null,
      },
      resources,
      mobileViewport: {
        width: 390,
        height: 844,
        coldStartMs: Number(mobileStartMs.toFixed(1)),
        horizontalOverflow: viewportOverflow,
      },
      javascriptExceptions: errors,
      protectedKingdomTaskSubmission: 'disabled-without-owner-authorization',
      status: 'passed',
      limitations: [
        'GitHub hosted virtual runner, not the low-end Laptop 2/DT1 physical hardware',
        'Mock-free UI interaction with Kingdom offline; no real remote Kingdom task executed',
        'Chromium JavaScript heap excludes other browser processes, OS and Kingdom memory',
        'No actual local LLM model, camera, microphone, signed phone app or disk installer benchmark',
      ],
    };
    await mkdir('benchmark-results', { recursive: true });
    await writeFile('benchmark-results/browser.json', JSON.stringify(report, null, 2) + '\n', 'utf-8');
    console.log('BENCHMARK_BROWSER ' + JSON.stringify({
      firstRun: report.firstRun,
      coldApps: report.appOpening.firstOpenStats,
      warmApps: report.appOpening.warmOpenStats,
      warmReloadMs: report.warmReloadMs,
      renderer: report.renderer,
      mobileViewport: report.mobileViewport,
      errors: report.javascriptExceptions.length,
    }));
  } finally {
    await phoneContext.close();
    await chrome.detach();
  }
  expect(errors).toEqual([]);
});
