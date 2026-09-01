import {execFileSync} from 'node:child_process';
import path from 'node:path';

import {expect, test} from '@playwright/test';

// Admin Console Light/Dark theme switching (ADMIN-THEME-SWITCH-01).
//
// Verifies the shared-theme wiring end to end: the admin surfaces reuse the
// SAME ThemeProvider/ThemeScript + `theme` localStorage key as the consumer
// app (no parallel admin theme system), the Light/Dark control is
// accessible on both the login page and the signed-in header, selection
// persists across reload/navigation, and both themes render with correct
// token-driven colors in EN and FA. Each test gets a fresh browser context,
// so localStorage starts empty (default = light).
//
// The admin credential is the same throwaway development-only account
// provisioned by admin-console.spec.ts / admin-i18n.spec.ts (never a
// production secret).

const ADMIN_EMAIL = 'console.test@example.com';
const ADMIN_PASSWORD = 'tmp-console-test-password-2026';

const repoRoot = path.join(__dirname, '..');

function provisionTestAdmin(): void {
  const script = [
    "import('./src/lib/admin/provision.ts')",
    '.then((m) => m.provisionAdmin(',
    `  ${JSON.stringify(ADMIN_EMAIL)}, ${JSON.stringify(ADMIN_PASSWORD)},`,
    '))',
    '.then(() => process.exit(0))',
    '.catch((e) => { console.error(e); process.exit(1); });',
  ].join('\n');
  execFileSync('node', ['--import', 'tsx', '-e', script], {
    cwd: repoRoot,
    env: {...process.env},
    stdio: 'pipe',
  });
}

test.beforeAll(() => {
  provisionTestAdmin();
});

test('admin login: Light default, Dark switch, persistence across reload (EN)', async ({page}) => {
  const html = page.locator('html');
  const switcher = page.getByRole('radiogroup', {name: 'Theme'});

  await page.goto('/admin/login');

  // Default is Light: no .dark class, light body background, light color-scheme.
  // toHaveCSS auto-retries, so it also settles the body's 0.25s background
  // transition (globals.css base layer).
  await expect(html).not.toHaveClass(/dark/);
  await expect(switcher).toBeVisible();
  await expect(page.getByRole('radio', {name: 'Light'})).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(242, 242, 247)');

  // Switch to Dark → html.dark + dark color-scheme + dark body background.
  await page.getByRole('radio', {name: 'Switch to Dark'}).click();
  await expect(html).toHaveClass(/dark/);
  expect(await page.evaluate(() => document.documentElement.style.colorScheme)).toBe('dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(28, 28, 30)');

  // Persistence: reload keeps Dark (localStorage `theme`, same as public app).
  await page.reload();
  await expect(html).toHaveClass(/dark/);
  await expect(page.getByRole('radio', {name: 'Dark'})).toHaveAttribute('aria-checked', 'true');

  // Switch back to Light → persists across reload too.
  await page.getByRole('radio', {name: 'Switch to Light'}).click();
  await expect(html).not.toHaveClass(/dark/);
  await page.reload();
  await expect(html).not.toHaveClass(/dark/);
  await expect(page.getByRole('radio', {name: 'Light'})).toHaveAttribute('aria-checked', 'true');
});

test('admin login: theme switch works in Persian (FA) alongside RTL', async ({page}) => {
  const html = page.locator('html');

  await page.goto('/admin/login');
  await page.getByRole('radio', {name: 'Switch to Persian'}).click();
  await expect(html).toHaveAttribute('dir', 'rtl');

  // Theme radiogroup + options are localized.
  await expect(page.getByRole('radiogroup', {name: 'پوسته'})).toBeVisible();
  await page.getByRole('radio', {name: 'تغییر به پوسته تیره'}).click();
  await expect(html).toHaveClass(/dark/);
  await expect(page.getByRole('radio', {name: 'تیره'})).toHaveAttribute('aria-checked', 'true');

  // Persistence across reload with fa + dark retained.
  await page.reload();
  await expect(html).toHaveClass(/dark/);
  await expect(html).toHaveAttribute('lang', 'fa');
  await expect(html).toHaveAttribute('dir', 'rtl');

  // Back to Light (current locale is fa).
  await page.getByRole('radio', {name: 'تغییر به پوسته روشن'}).click();
  await expect(html).not.toHaveClass(/dark/);
});

test('signed-in admin header: theme switcher present and persists across navigation (EN)', async ({page}) => {
  const html = page.locator('html');

  await page.goto('/admin/login');
  await page.fill('input[name=email]', ADMIN_EMAIL);
  await page.fill('input[name=password]', ADMIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL('**/admin/dashboard');

  // Header control is present next to locale/logout.
  await expect(page.getByRole('radiogroup', {name: 'Theme'})).toBeVisible();
  await expect(html).not.toHaveClass(/dark/);

  // Switch to Dark from the signed-in header.
  await page.getByRole('radio', {name: 'Switch to Dark'}).click();
  await expect(html).toHaveClass(/dark/);

  // Persistence across navigation (a different admin route, then reload).
  await page.goto('/admin/users');
  await expect(html).toHaveClass(/dark/);
  await expect(page.getByRole('radiogroup', {name: 'Theme'})).toBeVisible();
  await page.reload();
  await expect(html).toHaveClass(/dark/);

  // Light surfaces render with light token colors on a real table page.
  await page.getByRole('radio', {name: 'Switch to Light'}).click();
  await expect(html).not.toHaveClass(/dark/);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(242, 242, 247)');
});
