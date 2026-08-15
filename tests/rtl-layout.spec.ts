import {expect, test} from '@playwright/test';

/**
 * RTL (Persian / fa) layout coverage.
 *
 * Covers every locale-bearing page that main-flows.spec.ts does not already
 * visit, plus the RTL guarantees the app promises:
 *  - `<html lang="fa" dir="rtl">` (and en → ltr) on every page;
 *  - the desktop sidebar (`aside` → role=complementary) and the mobile
 *    header both expose a labelled navigation with the same, locale-aware
 *    item order and an `aria-current="page"` active state;
 *  - the chrome markup uses logical (start/end) + responsive classes
 *    (`start-0`, `md:flex`, `md:hidden`) so the UI mirrors in RTL.
 *
 * NOTE on geometry: the responsive utilities (`md:hidden`, `md:flex`,
 * `start-0`, …) are emitted by Tailwind only when the postcss pipeline is
 * wired to infra/config/tailwind.config.js. Until that wiring lands, tests
 * assert the markup contract (class-level) instead of pixel geometry — the
 * assertions stay valid once the CSS is connected.
 *
 * Note on matching: accessible-name matching is substring-based, so the fa
 * titles below intentionally avoid ZWNJ-only differences (e.g. 'کتابخانه'
 * instead of the full 'کتابخانه تمرین‌ها').
 */

const FA_PAGES: {path: string; title: string; hasAppShell: boolean}[] = [
  {path: 'history', title: 'تاریخچه', hasAppShell: true},
  {path: 'analytics', title: 'آمار', hasAppShell: true},
  {path: 'profile', title: 'پروفایل', hasAppShell: false}, // ProfileView has no AppShell nav
  {path: 'library', title: 'کتابخانه', hasAppShell: true},
  {path: 'challenges', title: 'چالش', hasAppShell: true},
];

test.describe('RTL — Persian pages', () => {
  for (const {path, title, hasAppShell} of FA_PAGES) {
    test(`/${path} renders in Persian with dir=rtl`, async ({page}) => {
      await page.goto(`/fa/${path}`);

      await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.getByRole('heading', {name: title})).toBeVisible();

      if (hasAppShell) {
        // Persian chrome: the main navigation label + a known nav item
        // (scoped to the desktop sidebar so the test is unambiguous).
        await expect(
          page.getByRole('complementary').getByRole('navigation', {
            name: 'ناوبری اصلی',
          }),
        ).toBeVisible();
        await expect(
          page.getByRole('complementary').getByRole('link', {name: 'خانه'}),
        ).toBeVisible();
      }
    });
  }

  test('/en pages render with dir=ltr', async ({page}) => {
    for (const {path} of FA_PAGES) {
      await page.goto(`/en/${path}`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    }
  });

  test('quiz page is RTL in Persian with localized controls', async ({page}) => {
    await page.goto('/fa/quiz');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(
      page.getByRole('heading', {name: 'برنامه تمرینی خودت رو بساز'}),
    ).toBeVisible();
    await expect(page.getByRole('radiogroup')).toBeVisible();
    await expect(page.getByRole('button', {name: 'بعدی'})).toBeVisible();
  });
});

test.describe('RTL — chrome markup contract', () => {
  test('desktop sidebar is anchored with logical start + responsive classes', async ({
    page,
  }) => {
    await page.goto('/en/dashboard');
    const aside = page.locator('aside');
    await expect(aside).toBeVisible();
    // start-0 → the sidebar hugs the inline-start edge (left in LTR, right
    // in RTL); md:flex → only rendered on desktop.
    await expect(aside).toHaveClass(/start-0/);
    await expect(aside).toHaveClass(/md:flex/);
    await expect(aside).toHaveClass(/hidden/);
  });

  test('mobile top bar is RTL-aware and only shown below the md breakpoint', async ({
    page,
  }) => {
    await page.goto('/fa/dashboard');
    const header = page.locator('header');
    await expect(header).toBeVisible();
    // The compact brand mark + pill nav mirror the sidebar content; the
    // header itself is md:hidden (desktop-only sidebar wins above 768px).
    await expect(header).toHaveClass(/md:hidden/);
    await expect(
      header.getByRole('navigation', {name: 'ناوبری اصلی'}),
    ).toBeVisible();
    await expect(header.getByRole('link', {name: 'خانه'})).toBeVisible();
  });

  test('nav order and active state stay consistent in both directions', async ({
    page,
  }) => {
    await page.goto('/en/history');
    const nav = page
      .getByRole('complementary')
      .getByRole('navigation', {name: 'Main navigation'});

    // Same order in LTR: Home, History, Analytics, Profile.
    const enLabels = ['Home', 'History', 'Analytics', 'Profile'];
    for (let i = 0; i < enLabels.length; i++) {
      await expect(nav.getByRole('link').nth(i)).toHaveText(enLabels[i]);
    }
    await expect(nav.getByRole('link', {name: 'History'})).toHaveAttribute(
      'aria-current',
      'page',
    );

    await page.goto('/fa/history');
    const faNav = page
      .getByRole('complementary')
      .getByRole('navigation', {name: 'ناوبری اصلی'});
    const faLabels = ['خانه', 'تاریخچه', 'آمار', 'پروفایل'];
    for (let i = 0; i < faLabels.length; i++) {
      await expect(faNav.getByRole('link').nth(i)).toHaveText(faLabels[i]);
    }
    await expect(faNav.getByRole('link', {name: 'تاریخچه'})).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
