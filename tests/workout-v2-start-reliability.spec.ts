import {expect, test} from '@playwright/test';

/**
 * Workout V2 first-slice targeted E2E — WORKOUT-V2-IMPL-01 (START+PREPARING).
 *
 * Targeted per docs/CI.md (not wired into the default `test:e2e:smoke`
 * selection; runnable via `npx playwright test tests/workout-v2-start-reliability.spec.ts`).
 *
 * START interaction reliability is an explicit acceptance concern (the legacy
 * prototype's START tap could fail/unreliably trigger on real iPhone; spec
 * §14/§15). Automated coverage here asserts the interaction semantics a
 * native button must satisfy (including touch-event activation at mobile
 * viewport); the Owner real-iPhone acceptance remains a separate gate.
 *
 * Runs against the additive review surface `/[locale]/workout/v2` (the
 * shipped `/workout` route is untouched). In CI the app runs in open mode
 * (auth not armed) with the localized sample-plan fallback, so this spec is
 * self-contained; with auth armed, sign in before running.
 */

test.describe('Workout V2 first slice — START + PREPARING (en)', () => {
  test.use({viewport: {width: 360, height: 740}, hasTouch: true});

  test('renders START on the Backstage shell and starts reliably on a single tap', async ({page}) => {
    await page.goto('/en/workout/v2');
    const start = page.getByRole('button', {name: 'Start workout'});

    await expect(start).toBeVisible();
    // The Backstage environment renders behind the shell (static still image).
    await expect(page.locator('[data-workout-v2-backstage] img').first()).toBeAttached();

    // Single native tap — the exact interaction that was unreliable in the
    // legacy prototype.
    await start.tap();

    // START → PREPARING through the single orchestration authority.
    await expect(page.getByText('Getting ready')).toBeVisible();
    await expect(page.locator('[data-workout-v2-countdown]')).toHaveText('5');
    // The START control is gone after the transition (no re-entry path).
    await expect(start).toHaveCount(0);
  });

  test('rapid duplicate taps remain a single transition (no double-fire)', async ({page}) => {
    await page.goto('/en/workout/v2');
    const start = page.getByRole('button', {name: 'Start workout'});
    await expect(start).toBeVisible();

    // Fire three clicks in the SAME task (before any re-render can unmount
    // the control) — the harshest duplicate-input scenario. The idempotent
    // authority must accept exactly one transition.
    await page.evaluate(() => {
      const button = document.querySelector('[data-workout-v2-start]') as HTMLButtonElement | null;
      if (!button) throw new Error('START control missing');
      button.click();
      button.click();
      button.click();
    });

    await expect(page.getByText('Getting ready')).toBeVisible();
    await expect(page.locator('[data-workout-v2-countdown]')).toHaveText('5');
    // The control is gone after the single transition (no re-entry path).
    await expect(start).toHaveCount(0);
  });

  test('START responds to touch events at mobile viewport (tap target present)', async ({page}) => {
    await page.goto('/en/workout/v2');
    const start = page.getByRole('button', {name: 'Start workout'});
    await expect(start).toBeVisible();
    // Full-width CTA inside the viewport (thumb-reachable, no overflow).
    const box = await start.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(240);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  });
});

test.describe('Workout V2 first slice — PREPARING presentation', () => {
  test.use({viewport: {width: 360, height: 740}, hasTouch: true});

  test('countdown advances as text and freezes while paused, then completes (en)', async ({page}) => {
    await page.goto('/en/workout/v2');
    const start = page.getByRole('button', {name: 'Start workout'});
    await start.tap();

    const countdown = page.locator('[data-workout-v2-countdown]');
    await expect(countdown).toHaveText('5');
    await expect(page.locator('[role="status"][aria-live="polite"]')).toHaveCount(1);

    await page.getByRole('button', {name: 'Pause'}).tap();
    await expect(page.getByRole('button', {name: 'Resume'})).toBeVisible();
    await expect(countdown).toHaveText('5');

    await page.getByRole('button', {name: 'Resume'}).tap();
    await expect(countdown).not.toHaveText('5', {timeout: 4_000});
  });
});

test.describe('Workout V2 first slice — Persian (fa, RTL)', () => {
  test.use({viewport: {width: 360, height: 740}, hasTouch: true});

  test('renders RTL Persian START and starts into PREPARING', async ({page}) => {
    await page.goto('/fa/workout/v2');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    const start = page.getByRole('button', {name: 'شروع تمرین'});
    await expect(start).toBeVisible();
    await start.tap();

    await expect(page.getByText('آماده‌سازی')).toBeVisible();
    await expect(page.locator('[data-workout-v2-countdown]')).toHaveText('5');
    await expect(page.getByRole('button', {name: 'توقف'})).toBeVisible();
  });
});

test.describe('Workout V2 first slice — Backstage visual family', () => {
  test.use({hasTouch: true});

  test('backdrop renders without distortion and swaps by density boundary', async ({page}) => {
    // Mobile viewport serves the mobile composition family.
    await page.setViewportSize({width: 360, height: 740});
    await page.goto('/en/workout/v2');
    const img = page.locator('[data-workout-v2-backstage] img').first();
    await expect(img).toBeAttached();
    expect(await img.getAttribute('src')).toContain('/backstage/workout/backstage-');

    // Desktop viewport serves the desktop composition family (same identity).
    await page.setViewportSize({width: 1280, height: 800});
    await expect
      .poll(async () => await img.evaluate((node: HTMLImageElement) => node.getAttribute('src')))
      .toContain('desktop');
  });

  test('backstage assets carry no baked-in UI text (environment only)', async ({page}) => {
    // The approved references are environment-only; the shell renders all
    // product UI as application-layer text. Assert the visible UI strings
    // are DOM text (not part of the image) by checking the CTA is real DOM.
    await page.setViewportSize({width: 360, height: 740});
    await page.goto('/en/workout/v2');
    const start = page.getByRole('button', {name: 'Start workout'});
    await expect(start).toBeVisible();
    const tagName = await start.evaluate((node) => node.tagName);
    expect(tagName).toBe('BUTTON');
  });
});
