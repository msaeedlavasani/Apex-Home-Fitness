import {expect, test, type Page} from '@playwright/test';

/**
 * Profile shell integration coverage (ProfileView inside AppShell).
 *
 * Profile used to be a standalone route; it now renders inside the platform
 * shell, which owns the navigation chrome (desktop sidebar / mobile pill nav)
 * and an accessible Back control. This spec pins the contract:
 *  1. Desktop: the sidebar marks Profile active (`aria-current="page"`) and
 *     the Back control navigates to the dashboard.
 *  2. Mobile: the pill nav marks Profile active and the Back control keeps a
 *     ≥ 44px touch target.
 *  3. No horizontal overflow at either canonical viewport, either locale.
 *  4. RTL (fa): Back is localized ("بازگشت"), the chevron mirrors
 *     (rtl:rotate-180), and the sidebar hugs the inline-start edge.
 *  5. Keyboard: the Back control is tab-reachable, shows a visible focus
 *     ring, and activates with Enter.
 *
 * Deterministic, no external network; runs at the canonical viewports used by
 * responsive-layout.spec.ts (390×844 mobile, 1440×900 desktop).
 */

const MOBILE = {width: 390, height: 844};
const DESKTOP = {width: 1440, height: 900};

/** Navigate with an explicit viewport; resolves when the page is settled. */
async function open(page: Page, path: string, viewport: {width: number; height: number}) {
  await page.setViewportSize(viewport);
  await page.goto(path, {waitUntil: 'networkidle'});
  await page.waitForTimeout(250);
}

/** Horizontal overflow of the document vs the viewport. */
function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

/** Press Tab repeatedly until `target` owns the focus (browser tab order). */
async function tabTo(page: Page, target: import('@playwright/test').Locator, maxTabs = 30) {
  for (let i = 0; i < maxTabs; i++) {
    const focused = await target.evaluate((el) => el === document.activeElement);
    if (focused) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(
    `Focus never reached target after ${maxTabs} Tabs: ${await target.evaluate(
      (el) => (el as HTMLElement).outerHTML.slice(0, 160),
    )}`,
  );
}

test.describe('Profile — shell integration', () => {
  test('desktop: sidebar marks Profile active and Back returns to the dashboard', async ({
    page,
  }) => {
    await open(page, '/en/profile', DESKTOP);

    // The desktop sidebar (md+) shows the nav with Profile as the current page.
    const sidebar = page.getByRole('complementary');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole('link', {name: 'Profile'})).toHaveAttribute(
      'aria-current',
      'page',
    );

    // Back control is present, localized, and navigates to the dashboard.
    const back = page.getByRole('link', {name: 'Back'});
    await expect(back).toBeVisible();
    await back.click();
    await page.waitForURL('**/en/dashboard');
    await expect(
      page.getByRole('complementary').getByRole('link', {name: 'Home', exact: true}),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('mobile: pill nav marks Profile active and Back meets the 44px touch target', async ({
    page,
  }) => {
    await open(page, '/en/profile', MOBILE);

    // Mobile-first top nav: the pill nav (header) owns the active state.
    const header = page.locator('header');
    await expect(header.getByRole('link', {name: 'Profile'})).toHaveAttribute(
      'aria-current',
      'page',
    );

    // Back control: visible and ≥ 44px tall for touch.
    const back = page.getByRole('link', {name: 'Back'});
    await expect(back).toBeVisible();
    const box = await back.boundingBox();
    expect(box, 'back control must have a bounding box').not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await back.click();
    await page.waitForURL('**/en/dashboard');
  });

  test('no horizontal overflow at either viewport, both locales', async ({page}) => {
    for (const viewport of [MOBILE, DESKTOP]) {
      for (const locale of ['en', 'fa'] as const) {
        await open(page, `/${locale}/profile`, viewport);
        expect(await hasHorizontalOverflow(page)).toBe(false);
      }
    }
  });
});

test.describe('Profile — RTL (fa)', () => {
  test('Back and nav are localized and the sidebar mirrors to the inline-start edge', async ({
    page,
  }) => {
    await open(page, '/fa/profile', DESKTOP);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // Localized Back control.
    const back = page.getByRole('link', {name: 'بازگشت'});
    await expect(back).toBeVisible();
    // The chevron mirrors via the logical rtl:rotate-180 utility.
    await expect(back.locator('svg')).toHaveClass(/rtl:rotate-180/);

    // Sidebar: Persian labels, Profile active, hugging the right (start) edge.
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByRole('link', {name: 'پروفایل'})).toHaveAttribute(
      'aria-current',
      'page',
    );
    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.x + box!.width)).toBe(DESKTOP.width);
  });

  test('mobile: Persian Back control is visible and ≥ 44px', async ({page}) => {
    await open(page, '/fa/profile', MOBILE);
    const back = page.getByRole('link', {name: 'بازگشت'});
    await expect(back).toBeVisible();
    const box = await back.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await expect(back.locator('svg')).toHaveClass(/rtl:rotate-180/);
  });
});

test.describe('Profile — keyboard', () => {
  test('Back control is tab-reachable, shows a focus ring, and activates with Enter', async ({
    page,
  }) => {
    await open(page, '/en/profile', DESKTOP);

    const back = page.getByRole('link', {name: 'Back'});
    await tabTo(page, back);
    await expect(back).toBeFocused();

    // Keyboard focus must render a visible ring (focus-visible ring token).
    const ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return getComputedStyle(el as HTMLElement).boxShadow;
    });
    expect(ring).not.toBe('none');
    expect(ring).toContain('rgba');

    await back.press('Enter');
    await page.waitForURL('**/en/dashboard');
  });
});
