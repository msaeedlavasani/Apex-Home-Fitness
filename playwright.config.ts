import {defineConfig, devices} from '@playwright/test';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * E2E configuration.
 *
 * `webServer` boots the Next.js dev server automatically (and reuses one
 * that is already running locally), so `npx playwright test` works against
 * the dev server out of the box.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', {open: 'never', outputFolder: 'playwright-report'}]]
    : [['list'], ['html', {open: 'never', outputFolder: 'playwright-report'}]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: `${BASE_URL}/en/dashboard`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
