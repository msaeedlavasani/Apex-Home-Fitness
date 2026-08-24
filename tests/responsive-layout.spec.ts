import {expect, test, type Page} from '@playwright/test';

/**
 * Responsive / RTL shell geometry coverage (WebLayout + AppShell chrome).
 *
 * Runs at the two canonical viewports — 390×844 (mobile) and 1440×900
 * (desktop) — across both locales (en LTR / fa RTL) on the pages that own
 * the web chrome (dashboard, via AppShell → WebLayout) and the standalone
 * quiz route.
 *
 * What it pins down:
 *  1. No horizontal page overflow at either viewport, either locale.
 *  2. The mobile pill nav fits inside a 390px viewport (the last pill was
 *     previously clipped with no scroll affordance).
 *  3. Exactly ONE labelled navigation is visible at any viewport, and the
 *     desktop sidebar / mobile top bar navs carry distinct accessible
 *     labels (they both live in the DOM as responsive copies).
 *  4. RTL mirroring: the fixed sidebar hugs the inline-start edge (right in
 *     fa) and the content wrapper offsets on the opposite side.
 *  5. Touch targets ≥ 44px (pills, theme toggle, quiz navigation).
 *  6. Keyboard focus renders a visible ring (box-shadow) on web chrome and
 *     quiz controls.
 *  7. Quiz option text uses logical alignment (`text-align: start`), so the
 *     label mirrors in RTL.
 *  8. Screenshot smoke: every combination is captured to test-results and
 *     verified non-blank.
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
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

test.describe('Responsive shell — geometry', () => {
  for (const viewport of [
    {name: 'mobile-390x844', ...MOBILE},
    {name: 'desktop-1440x900', ...DESKTOP},
  ]) {
    for (const locale of ['en', 'fa'] as const) {
      for (const page of ['dashboard', 'quiz'] as const) {
        test(`no horizontal overflow — ${viewport.name} ${locale} ${page}`, async ({page: p}) => {
          await open(p, `/${locale}/${page}`, viewport);
          expect(await hasHorizontalOverflow(p)).toBe(false);
        });
      }
    }
  }

  test('mobile pill nav fits fully inside 390px — en and fa', async ({page}) => {
    await open(page, '/en/dashboard', MOBILE);
    const enPills = page.locator('header nav a');
    await expect(enPills).toHaveCount(4);
    for (const pill of await enPills.all()) {
      const box = await pill.boundingBox();
      expect(box, 'pill must be inside the viewport').not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(MOBILE.width + 1);
    }

    await open(page, '/fa/dashboard', MOBILE);
    const faPills = page.locator('header nav a');
    await expect(faPills).toHaveCount(4);
    for (const pill of await faPills.all()) {
      const box = await pill.boundingBox();
      expect(box).not.toBeNull();
      // RTL: pills start from the right edge; none may cross the left edge.
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(MOBILE.width + 1);
    }
  });

  test('exactly one labelled navigation is visible at each viewport', async ({page}) => {
    await open(page, '/en/dashboard', MOBILE);
    await expect(page.getByRole('navigation')).toHaveCount(1);
    await expect(
      page.getByRole('navigation', {name: 'Mobile navigation'}),
    ).toBeVisible();

    await open(page, '/en/dashboard', DESKTOP);
    await expect(page.getByRole('navigation')).toHaveCount(1);
    await expect(
      page.getByRole('navigation', {name: 'Main navigation'}),
    ).toBeVisible();

    // The two responsive copies share the same items but must never be
    // exposed together with identical labels (both are always in the DOM).
    const labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav')).map((n) => n.getAttribute('aria-label')),
    );
    expect(labels.length).toBe(2);
    expect(new Set(labels).size).toBe(2);
  });
});

test.describe('Responsive shell — RTL mirroring', () => {
  test('sidebar hugs the inline-start edge and content offsets opposite', async ({page}) => {
    // LTR (en): sidebar at the left edge; main content starts after it.
    await open(page, '/en/dashboard', DESKTOP);
    const enAside = await page.getByRole('complementary').boundingBox();
    expect(enAside).not.toBeNull();
    expect(enAside!.x).toBe(0);
    expect(enAside!.width).toBe(256);
    const enMain = await page.locator('main').boundingBox();
    expect(enMain).not.toBeNull();
    expect(enMain!.x).toBeGreaterThanOrEqual(256);

    // RTL (fa): sidebar at the right edge; content is pushed to the left.
    await open(page, '/fa/dashboard', DESKTOP);
    const faAside = await page.getByRole('complementary').boundingBox();
    expect(faAside).not.toBeNull();
    expect(Math.round(faAside!.x + faAside!.width)).toBe(DESKTOP.width);
    const faMain = await page.locator('main').boundingBox();
    expect(faMain).not.toBeNull();
    expect(faMain!.x + faMain!.width).toBeLessThanOrEqual(DESKTOP.width - 256 + 1);
  });

  test('quiz option text is logically aligned and mirrors in RTL', async ({page}) => {
    const measure = () =>
      page.evaluate(() => {
        const opt = document.querySelector('.quiz-option');
        const title = opt?.querySelector('.quiz-option__title');
        if (!opt || !title) return null;
        const range = document.createRange();
        range.selectNodeContents(title);
        const text = range.getBoundingClientRect();
        const card = opt.getBoundingClientRect();
        return {
          textAlign: getComputedStyle(opt).textAlign,
          textLeft: text.left,
          textRight: text.right,
          cardLeft: card.left,
          cardRight: card.right,
          padding: parseFloat(getComputedStyle(opt).paddingInlineStart),
        };
      });

    // LTR: the label's first glyph sits at the card's inline-start padding.
    await open(page, '/en/quiz', MOBILE);
    const en = await measure();
    expect(en).not.toBeNull();
    expect(en!.textAlign).toBe('start');
    expect(en!.textLeft).toBeGreaterThanOrEqual(en!.cardLeft + en!.padding - 2);
    expect(en!.textLeft).toBeLessThan(en!.cardLeft + en!.padding + 4);

    // RTL: the label hugs the card's inline-end (right) padding instead.
    await open(page, '/fa/quiz', MOBILE);
    const fa = await measure();
    expect(fa).not.toBeNull();
    expect(fa!.textAlign).toBe('start');
    expect(fa!.textRight).toBeLessThanOrEqual(fa!.cardRight - fa!.padding + 4);
    expect(fa!.textRight).toBeGreaterThanOrEqual(fa!.cardRight - fa!.padding - 4);
  });
});

test.describe('Responsive shell — touch targets', () => {
  test('mobile pill nav and theme toggle meet 44px touch targets', async ({page}) => {
    await open(page, '/en/dashboard', MOBILE);
    for (const pill of await page.locator('header nav a').all()) {
      const box = await pill.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    // The header also hosts the language switcher (role=radio buttons) — the
    // theme toggle is the only plain button with a title, so target it
    // explicitly instead of the ambiguous `header button`.
    const toggle = page.locator('header button[title]');
    await expect(toggle).toHaveCount(1);
    const toggleBox = await toggle.boundingBox();
    expect(toggleBox).not.toBeNull();
    expect(toggleBox!.width).toBeGreaterThanOrEqual(44);
    expect(toggleBox!.height).toBeGreaterThanOrEqual(44);
    // Language switcher options must meet the same touch-target floor.
    for (const langBtn of await page.locator('header button[role="radio"]').all()) {
      const langBox = await langBtn.boundingBox();
      expect(langBox).not.toBeNull();
      expect(langBox!.height).toBeGreaterThanOrEqual(44);
      expect(langBox!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('quiz navigation buttons meet 44px touch targets', async ({page}) => {
    await open(page, '/en/quiz', MOBILE);
    const next = await page.getByRole('button', {name: 'Next', exact: true}).boundingBox();
    expect(next).not.toBeNull();
    expect(next!.height).toBeGreaterThanOrEqual(44);

    await open(page, '/fa/quiz', MOBILE);
    const faNext = await page.getByRole('button', {name: 'بعدی', exact: true}).boundingBox();
    expect(faNext).not.toBeNull();
    expect(faNext!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Responsive shell — focus visibility', () => {
  test('keyboard focus renders a visible ring on web chrome links', async ({page}) => {
    await open(page, '/en/dashboard', MOBILE);
    await page.keyboard.press('Tab'); // brand link
    await page.keyboard.press('Tab'); // theme toggle
    await page.keyboard.press('Tab'); // first pill
    const ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return getComputedStyle(el as HTMLElement).boxShadow;
    });
    expect(ring).not.toBe('none');
    expect(ring).toContain('rgba');
  });

  test('keyboard focus renders a visible ring on quiz options', async ({page}) => {
    await open(page, '/en/quiz', MOBILE);
    await page.keyboard.press('Tab'); // first focusable = first option button
    const ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return {cls: el?.className ?? '', boxShadow: getComputedStyle(el as HTMLElement).boxShadow};
    });
    expect(ring.cls).toContain('quiz-option');
    expect(ring.boxShadow).not.toBe('none');
  });
});

test.describe('Responsive shell — screenshots', () => {
  const combos: {name: string; viewport: {width: number; height: number}; path: string}[] = [
    {name: 'mobile-en-dashboard', viewport: MOBILE, path: '/en/dashboard'},
    {name: 'mobile-fa-dashboard', viewport: MOBILE, path: '/fa/dashboard'},
    {name: 'desktop-en-dashboard', viewport: DESKTOP, path: '/en/dashboard'},
    {name: 'desktop-fa-dashboard', viewport: DESKTOP, path: '/fa/dashboard'},
    {name: 'mobile-en-quiz', viewport: MOBILE, path: '/en/quiz'},
    {name: 'mobile-fa-quiz', viewport: MOBILE, path: '/fa/quiz'},
    {name: 'desktop-en-quiz', viewport: DESKTOP, path: '/en/quiz'},
    {name: 'desktop-fa-quiz', viewport: DESKTOP, path: '/fa/quiz'},
  ];

  for (const {name, viewport, path} of combos) {
    test(`captures non-blank screenshot — ${name}`, async ({page}, testInfo) => {
      await open(page, path, viewport);
      const shot = await page.screenshot({
        path: testInfo.outputPath(`${name}.png`),
      });
      // A blank page compresses to a few KB; a real render is much larger.
      expect(shot.length).toBeGreaterThan(10_000);
    });
  }
});
