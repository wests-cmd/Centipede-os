import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.CENTIPEDE_USAGE_PORT || 3210);

export default defineConfig({
  testDir: './tests/benchmark',
  testMatch: '*.playwright.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'bun run src/server/production.ts',
    env: { HOST: '127.0.0.1', PORT: String(port) },
    url: `http://127.0.0.1:${port}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 45_000,
  },
  projects: [{
    name: 'chromium-usage',
    use: { ...devices['Desktop Chrome'] },
  }],
});
