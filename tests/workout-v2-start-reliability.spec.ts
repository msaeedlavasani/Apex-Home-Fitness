import {expect, test, type Page} from '@playwright/test';

/**
 * Targeted browser coverage for WORKOUT-V2-IMPL-01. The review surface is
 * additive (`/[locale]/workout/v2`); production `/workout` is intentionally
 * outside this suite and remains untouched.
 */

async function startPreparing(page: Page) {
  const start = page.getByRole('button', {name: 'Start Workout', exact: true});
  await expect(start).toBeVisible();
  await start.tap();
  await expect(page.getByText('Prepare', {exact: true})).toBeVisible();
  await expect(page.locator('[data-workout-v2-countdown]')).toHaveText('5');
  return start;
}

test.describe('Workout V2 first slice — START + PREPARING', () => {
  test.use({viewport: {width: 360, height: 740}, hasTouch: true});

  test('renders START on the Backstage shell and starts reliably on a single tap', async ({page}) => {
    await page.goto('/en/workout/v2');
    const start = await startPreparing(page);

    await expect(page.locator('[data-workout-v2-backstage] img').first()).toBeAttached();
    await expect(start).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'More', exact: true})).toBeVisible();
    // §16 compact visible label: the short localized "Sound" label — the
    // muted/unmuted state lives in the icon + aria-pressed, not the text.
    await expect(page.getByRole('button', {name: 'Sound', exact: true})).toBeVisible();
  });

  test('rapid duplicate taps remain a single transition (no double-fire)', async ({page}) => {
    await page.goto('/en/workout/v2');
    const start = page.getByRole('button', {name: 'Start Workout', exact: true});
    await expect(start).toBeVisible();

    await start.evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });

    await expect(page.getByText('Prepare', {exact: true})).toBeVisible();
    await expect(page.locator('[data-workout-v2-countdown]')).toHaveText('5');
    await expect(page.getByRole('button', {name: 'Start Workout', exact: true})).toHaveCount(0);
  });

  test('START responds to touch events at mobile viewport (tap target present)', async ({page}) => {
    await page.goto('/en/workout/v2');
    const start = page.getByRole('button', {name: 'Start Workout', exact: true});
    await expect(start).toBeVisible();
    const box = await start.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(240);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  });

  test('More opens real exercise details and pauses/resumes the same countdown', async ({page}) => {
    await page.goto('/en/workout/v2');
    await startPreparing(page);

    const countdown = page.locator('[data-workout-v2-countdown]');
    await page.getByRole('button', {name: 'More', exact: true}).tap();
    const dialog = page.getByRole('dialog', {name: 'Exercise Details'});
    await expect(dialog).toBeVisible();
    // Details are resolved from the route-adapted prescription; do not pin
    // the localized sample-plan fixture's exercise name or target.
    await expect(dialog.locator('dd').first()).not.toHaveText('');
    await expect(dialog.locator('dd').nth(1)).toHaveText(/\d+ × (\d+|\d+s)/);

    await page.waitForTimeout(1_500);
    await expect(countdown).toHaveText('5');

    await dialog.getByRole('button', {name: 'Close', exact: true}).click();
    await expect(dialog).toHaveCount(0);
    await expect(countdown).toHaveText('5');
    await expect(countdown).not.toHaveText('5', {timeout: 4_000});
  });
});

test.describe('Workout V2 first slice — locale and theme controls', () => {
  test.use({viewport: {width: 390, height: 844}, hasTouch: true});

  test('language control swaps EN ↔ FA with ONE tap (two-state owner control)', async ({page}) => {
    await page.goto('/en/workout/v2');
    await expect(page.getByRole('button', {name: 'Switch to Persian'})).toBeVisible();
    await page.getByRole('button', {name: 'Switch to Persian'}).tap();
    await page.waitForURL('**/fa/workout/v2');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('button', {name: 'شروع تمرین', exact: true})).toBeVisible();

    await page.getByRole('button', {name: 'تغییر به انگلیسی'}).tap();
    await page.waitForURL('**/en/workout/v2');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('button', {name: 'Start Workout', exact: true})).toBeVisible();
  });

  test('theme control is TWO-STATE Dark ⇄ Light; SYSTEM is never offered', async ({page}) => {
    await page.emulateMedia({colorScheme: 'light'});
    // Deterministic initial state: persisted 'dark' (via the canonical
    // storage key) — independent of the emulated OS preference.
    await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    await page.goto('/en/workout/v2');
    const shell = page.locator('[data-workout-v2-shell]');
    const start = page.getByRole('button', {name: 'Start Workout', exact: true});
    // Let the 240ms stage entrance animation finish so geometry is stable
    // before measuring (mid-animation boxes render with fractional scale).
    await expect(start).toBeVisible();
    await page.waitForTimeout(400);
    const before = await start.boundingBox();
    expect(before).not.toBeNull();

    // The Workout V2 control exposes only Dark/Light (never System). The
    // label is the ACTION (target theme): from resolved dark, tapping
    // announces and performs "Light".
    await expect(page.getByRole('button', {name: 'System', exact: true})).toHaveCount(0);
    await page.getByRole('button', {name: 'Light', exact: true}).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.getByRole('button', {name: 'Dark', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Dark', exact: true}).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Geometry invariance: theme transformation never moves the composition.
    await page.waitForTimeout(150);
    const after = await start.boundingBox();
    expect(after).not.toBeNull();
    expect(after!.x).toBeCloseTo(before!.x, 0);
    expect(after!.y).toBeCloseTo(before!.y, 0);
    expect(after!.width).toBeCloseTo(before!.width, 0);
    expect(after!.height).toBeCloseTo(before!.height, 0);
    await expect(shell).toBeVisible();
  });

  test('Exit control navigates to the locale dashboard (real semantics, no dead X)', async ({page}) => {
    await page.goto('/en/workout/v2');
    await page.getByRole('button', {name: 'Exit workout'}).tap();
    await page.waitForURL('**/en/dashboard');
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('START composition has no horizontal overflow and a viewport-connected CTA', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en/workout/v2');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const box = await page.getByRole('button', {name: 'Start Workout', exact: true}).boundingBox();
    expect(box).not.toBeNull();
    // CTA is part of the hero composition: visible within the initial viewport
    // (not pushed below it) and NOT fixed/absolute to the viewport.
    expect(box!.y).toBeLessThan(844);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    const position = await page
      .getByRole('button', {name: 'Start Workout', exact: true})
      .evaluate((button) => getComputedStyle(button.closest('[data-workout-v2-start-stage]') as Element).position);
    expect(position).toBe('relative');
  });
});

test.describe('Workout V2 first slice — Backstage family and RTL', () => {
  test.use({hasTouch: true});

  test('backdrop uses mobile and desktop purpose-built assets without distortion', async ({page}) => {
    await page.setViewportSize({width: 360, height: 740});
    await page.goto('/en/workout/v2');
    const img = page.locator('[data-workout-v2-backstage] img').first();
    await expect(img).toBeAttached();
    expect(await img.getAttribute('src')).toContain('backstage-');
    expect(await img.getAttribute('src')).toContain('mobile');
    await expect(img).toHaveClass(/object-cover/);

    await page.setViewportSize({width: 1280, height: 800});
    await expect.poll(async () => await img.getAttribute('src')).toContain('desktop');
  });

  test('Persian START and PREPARING preserve RTL semantics', async ({page}) => {
    await page.setViewportSize({width: 360, height: 740});
    await page.goto('/fa/workout/v2');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('button', {name: 'شروع تمرین', exact: true})).toBeVisible();
    const faOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(faOverflow).toBeLessThanOrEqual(0);
    await page.getByRole('button', {name: 'شروع تمرین', exact: true}).tap();
    await expect(page.getByText('آماده شو', {exact: true})).toBeVisible();
    await expect(page.locator('[data-workout-v2-countdown]')).toHaveText('5');
    await expect(page.getByRole('button', {name: 'بیشتر', exact: true})).toBeVisible();
  });

  test('PREPARING presents the corrected reference content without deletion', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/en/workout/v2');
    await startPreparing(page);

    // Prescription/equipment context pill restored (§11) — resolved data.
    await expect(page.locator('[data-workout-v2-prescription-pill]')).toBeVisible();
    // THREE guidance rows (§13) — content never deleted to fit.
    const items = page.locator('[data-workout-v2-readiness-item]');
    await expect(items).toHaveCount(3);
    await expect(page.getByText('No equipment')).toBeVisible();
    // Countdown stack stays inside the dial (§12) — no overflow in any axis.
    const geometry = await page.evaluate(() => {
      const dial = document.querySelector('[data-workout-v2-countdown-dial]')!.getBoundingClientRect();
      const number = document.querySelector('[data-workout-v2-countdown]')!.getBoundingClientRect();
      const unit = [...document.querySelectorAll('[data-workout-v2-countdown-dial] span')]
        .map((span) => span.getBoundingClientRect())
        .find((box) => box.height > 0 && box.width < dial.width * 0.8 && box.top > number.bottom - 2)!;
      const inset = 8; // half of the 6px stroke + margin
      return {
        numberInside:
          number.left >= dial.left + inset &&
          number.right <= dial.right - inset &&
          number.top >= dial.top + inset &&
          number.bottom <= dial.bottom - inset,
        unitInside:
          unit.left >= dial.left + inset &&
          unit.right <= dial.right - inset &&
          unit.top >= dial.top + inset &&
          unit.bottom <= dial.bottom - inset,
      };
    });
    expect(geometry.numberInside).toBe(true);
    expect(geometry.unitInside).toBe(true);
    // Compact Sound/More labels (§16).
    await expect(page.getByRole('button', {name: 'Sound', exact: true})).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Workout V2 — EXERCISE_INTRO state (owner polish delta §C)', () => {
  test.use({viewport: {width: 390, height: 844}, hasTouch: true});

  async function reachIntro(page: Page) {
    await page.goto('/en/workout/v2');
    const start = page.getByRole('button', {name: 'Start Workout', exact: true});
    await expect(start).toBeVisible();
    await start.tap();
    await expect(page.getByText('Prepare', {exact: true})).toBeVisible();
    // The user CANNOT skip the countdown: completion enters INTRO, never SET1.
    await page.getByRole('button', {name: 'Start Set 1', exact: true}).waitFor({state: 'attached', timeout: 15_000});
    await expect(page.locator('[data-workout-v2-intro-stage]')).toBeVisible();
  }

  test('PREPARING countdown completion enters INTRO (never SET1 directly)', async ({page}) => {
    await reachIntro(page);
    await expect(page.locator('[data-workout-v2-preparing-stage]')).toHaveCount(0);
  });

  test('INTRO presents resolved Squat identity, equipment, Mentor and cues', async ({page}) => {
    await reachIntro(page);
    await expect(page.locator('[data-workout-v2-intro-exercise]')).toHaveText(/Squat|اسکات/);
    await expect(page.locator('[data-workout-v2-intro-equipment]')).toHaveText(/Bodyweight/);
    await expect(page.locator('[data-workout-v2-mentor]')).toBeAttached();
    const cues = page.locator('[data-workout-v2-intro-cues] li');
    await expect(cues).toHaveCount(3);
    await expect(page.getByText('Keep your chest up')).toBeVisible();
  });

  test('INTRO CTA crosses the SET1 boundary exactly once (user-controlled, no timeout)', async ({page}) => {
    await reachIntro(page);
    const cta = page.getByRole('button', {name: 'Start Set 1', exact: true});
    // Real Mentor readiness gates the primary action.
    await expect(cta).toBeEnabled({timeout: 20_000});
    await cta.tap();
    await expect(page.locator('[data-workout-v2-workset-stage]')).toBeVisible();
    await expect(page.locator('[data-workout-v2-intro-stage]')).toHaveCount(0);
  });

  test('INTRO holds no extra controls: exactly ONE button (primary progression)', async ({page}) => {
    await reachIntro(page);
    // The shell header (language/theme/exit) is a shared overlay; the INTRO
    // stage itself contributes exactly one interactive control.
    const stageButtons = page.locator('[data-workout-v2-intro-stage] button');
    await expect(stageButtons).toHaveCount(1);
  });

  test('INTRO has no horizontal overflow at mobile and desktop', async ({page}) => {
    await reachIntro(page);
    const overflowMobile = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflowMobile).toBeLessThanOrEqual(0);
    await page.setViewportSize({width: 1440, height: 900});
    await page.waitForTimeout(600);
    const overflowDesktop = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflowDesktop).toBeLessThanOrEqual(0);
  });

  test('INTRO renders Persian identity + cues under RTL', async ({page}) => {
    await page.goto('/fa/workout/v2');
    const start = page.getByRole('button', {name: 'شروع تمرین', exact: true});
    await expect(start).toBeVisible();
    await start.tap();
    await page.getByRole('button', {name: 'شروع ست اول', exact: true}).waitFor({state: 'attached', timeout: 15_000});
    await expect(page.locator('[data-workout-v2-intro-exercise]')).toHaveText('اسکات');
    await expect(page.locator('[data-workout-v2-intro-cues] li')).toHaveCount(3);
    await expect(page.getByText('سینه بالا')).toBeVisible();
  });
});

test.describe('Workout V2 — desktop Light shell contrast (owner polish delta §B)', () => {
  test('desktop Light applies the contrast scrim without geometry changes; dark/mobile untouched', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    // Deterministic LIGHT initial state (canonical storage key).
    await page.addInitScript(() => window.localStorage.setItem('theme', 'light'));
    await page.goto('/en/workout/v2');
    const shell = page.locator('[data-workout-v2-shell]');
    const controls = page.locator('[data-workout-v2-top-controls]');

    // Light desktop: the shell carries the theme marker and the scrim
    // pseudo-element exists (content rendered on ::before).
    await expect(shell).toHaveAttribute('data-workout-theme', 'light');
    const lightScrim = await shell.evaluate(
      (element) => getComputedStyle(element, '::before').backgroundImage,
    );
    expect(lightScrim).toContain('linear-gradient');
    // Controls gain the sturdier light surface (≥ the old translucent base).
    const control = controls.locator('button').first();
    const lightSurface = await control.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(lightSurface).toContain('rgba(255, 255, 255');

    // Dark: no scrim, base tokens (no geometry/position shift either).
    await page.evaluate(() => window.localStorage.setItem('theme', 'dark'));
    await page.reload();
    await expect(shell).toHaveAttribute('data-workout-theme', 'dark');
    const darkScrim = await shell.evaluate(
      (element) => getComputedStyle(element, '::before').backgroundImage,
    );
    expect(darkScrim).toBe('none');
    const darkControl = controls.locator('button').first();
    const darkBox = await darkControl.boundingBox();
    expect(darkBox).not.toBeNull();

    // Mobile Light: the scrim must NOT activate below the sm breakpoint.
    await page.evaluate(() => window.localStorage.setItem('theme', 'light'));
    await page.setViewportSize({width: 390, height: 844});
    await page.reload();
    const mobileScrim = await shell.evaluate(
      (element) => getComputedStyle(element, '::before').backgroundImage,
    );
    expect(mobileScrim).toBe('none');
    // Control geometry identical between themes at the same viewport.
    const mobileLightBox = await controls.locator('button').first().boundingBox();
    expect(mobileLightBox!.x).toBeCloseTo(darkBox!.x, 0);
    expect(mobileLightBox!.width).toBeCloseTo(darkBox!.width, 0);
  });
});
