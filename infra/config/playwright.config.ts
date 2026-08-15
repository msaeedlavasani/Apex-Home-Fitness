import {defineConfig, devices} from '@playwright/test';
import path from 'node:path';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

// Playwright resolves relative paths from the config file's directory
// (infra/config/), so anchor artifacts to the repo root — this matches
// .gitignore (/playwright-report/, /test-results/) and the CI upload paths.
const repoRoot = path.join(__dirname, '..', '..');

/**
 * E2E configuration.
 *
 * `webServer` boots the Next.js dev server automatically (and reuses one
 * that is already running locally), so `npx playwright test` works against
 * the dev server out of the box.
 *
 * CI deliberately boots the DEV server too: tests/offline-pwa.spec.ts pins
 * dev-mode behavior (the app must never register its service worker in
 * development). The production build is validated separately by the `build`
 * job in .github/workflows/ci.yml.
 */
export default defineConfig({
  testDir: path.join(repoRoot, 'tests'),
  testMatch: '**/*.spec.ts',
  outputDir: path.join(repoRoot, 'test-results'),
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ['list'],
    [
      'html',
      {open: 'never', outputFolder: path.join(repoRoot, 'playwright-report')},
    ],
  ],
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
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
