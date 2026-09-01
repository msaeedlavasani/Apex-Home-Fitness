import {execFileSync} from 'node:child_process';
import path from 'node:path';

import {expect, test} from '@playwright/test';

// Admin Console i18n/RTL acceptance (ADMIN-DS-05).
//
// The admin console resolves its locale from the `admin-locale` cookie
// (admin routes live outside the public `[locale]` segment), so the spec
// verifies: EN default unchanged, EN⇄FA switching, `html lang/dir` flip,
// the shared typography contract (fa → Vazirmatn, en → Inter via the
// self-hosted next/font variables), and persistence across reload and
// navigation. The admin credential is the same throwaway development-only
// account provisioned by admin-console.spec.ts (never a production secret).

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

test('admin login page: EN default, EN⇄FA switching, RTL + typography, persistence', async ({page}) => {
  const html = page.locator('html');

  // EN default unchanged (pre-DS-05 surface).
  await page.goto('/admin/login');
  await expect(html).toHaveAttribute('lang', 'en');
  await expect(html).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', {name: 'Administrator sign in'})).toBeVisible();

  // Inter leads the LTR stack (shared typography contract). next/font
  // exposes the family name lowercased ("inter").
  const ltrFont = (await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toLowerCase();
  expect(ltrFont).toContain('inter');

  // Switch to Persian → lang/dir flip, Vazirmatn applies via html[dir=rtl].
  // (Switcher aria-labels follow the CURRENT locale, like the public
  // LanguageSwitcher, so the target is "Switch to Persian" while in EN.)
  await page.getByRole('radio', {name: 'Switch to Persian'}).click();
  await expect(html).toHaveAttribute('lang', 'fa');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', {name: 'ورود مدیر'})).toBeVisible();
  await expect(page.getByLabel('رمز عبور')).toBeVisible();
  // Vazirmatn now LEADS the stack (globals.css `html[dir='rtl'] body`).
  const rtlFont = (await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toLowerCase();
  expect(rtlFont.startsWith('vazirmatn')).toBe(true);

  // Persistence: reload keeps the fa choice (server-rendered from cookie).
  await page.reload();
  await expect(html).toHaveAttribute('lang', 'fa');
  await expect(page.getByRole('heading', {name: 'ورود مدیر'})).toBeVisible();

  // Switch back to English (current locale is now fa).
  await page.getByRole('radio', {name: 'تغییر به انگلیسی'}).click();
  await expect(html).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {name: 'Administrator sign in'})).toBeVisible();
});

test('signed-in admin console renders Persian surfaces with localized nav', async ({page}) => {
  await page.goto('/admin/login');
  await page.fill('input[name=email]', ADMIN_EMAIL);
  await page.fill('input[name=password]', ADMIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL('**/admin/dashboard');

  // Switch to Persian from the protected header.
  await page.getByRole('radio', {name: 'Switch to Persian'}).click();
  await expect(page.getByRole('heading', {name: 'پنل مدیریت'})).toBeVisible();
  await expect(page.getByRole('navigation', {name: 'مدیریت'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'کاربران'})).toBeVisible();

  // RTL document with Persian headings and accessible table names.
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.goto('/admin/users');
  await expect(page.getByRole('heading', {name: 'کاربران'})).toBeVisible();
  await expect(page.getByRole('table', {name: 'کاربران ثبت‌شده'})).toBeVisible();

  // Persistence across navigation (cookie, not URL state).
  await page.goto('/admin/sessions');
  await expect(page.getByRole('heading', {name: 'حساب‌های مدیر'})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
});
