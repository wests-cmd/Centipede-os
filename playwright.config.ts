import { defineConfig, devices } from '@playwright/test';

const e2ePort = Number(process.env.CENTIPEDE_E2E_PORT || 3000);
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;
const kingdomPort = Number(process.env.CENTIPEDE_E2E_KINGDOM_PORT || 8100);
const kingdomBaseUrl = `http://127.0.0.1:${kingdomPort}`;
const pythonCommand = process.env.CENTIPEDE_E2E_PYTHON || 'python3';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.playwright.ts',
  timeout: 30000,
  use: {
    baseURL: e2eBaseUrl,
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${e2ePort}`,
      url: e2eBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `${pythonCommand} tests/fixtures/kingdom-contract-fixture.py`,
      url: `${kingdomBaseUrl}/status`,
      env: { HOST: '127.0.0.1', PORT: String(kingdomPort) },
      reuseExistingServer: false,
      timeout: 15_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
