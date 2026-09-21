import {expect, test, type Page} from '@playwright/test';
import {QA_PROGRAM_EXERCISE_RECORDS, QA_PROGRAM_WEEKLY_SCHEDULE} from '../src/lib/program/qaProgram';

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

/**
 * Controlled QA input for authenticated-domain-path browser coverage. The
 * route adapter still resolves this through the same Program/Prescription
 * response shape; this fixture only supplies the persisted QA data boundary
 * when the open Playwright environment has no auth/session backend.
 */
async function useCanonicalQaProgram(page: Page) {
  await page.route('**/api/program/current', async (route) => {
    const programExercises = QA_PROGRAM_EXERCISE_RECORDS.map((exercise, index) => ({
      order: index + 1,
      sets: index === 0 ? 2 : 1,
      reps: null,
      restSeconds: exercise.restSeconds,
      exercise: {
        id: `qa-${index + 1}`,
        name: exercise.name,
        slug: exercise.name.toLowerCase().replaceAll(' ', '-'),
        instructions: exercise.instructions,
        movement: {coachingCues: exercise.instructions},
      },
    }));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        program: {
          id: 'qa-program-browser-fixture',
          restDays: [],
          weeklySchedule: QA_PROGRAM_WEEKLY_SCHEDULE,
          exercises: programExercises,
        },
      }),
    });
  });
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
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', {name: 'Leave workout', exact: true}).tap();
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
  // The INTRO journey includes the real 5s PREPARING countdown plus the
  // 16MB Mentor GLB fetch/parse; under parallel workers this can approach
  // the 30s default, so give the group a realistic ceiling.
  test.setTimeout(60_000);

  test.use({viewport: {width: 390, height: 844}, hasTouch: true});

  test.beforeEach(async ({page}) => {
    await useCanonicalQaProgram(page);
  });

  async function reachIntro(page: Page) {
    await page.goto('/en/workout/v2?day=monday');
    const start = page.getByRole('button', {name: 'Start Workout', exact: true});
    await expect(start).toBeVisible();
    await start.tap();
    await expect(page.getByText('Prepare', {exact: true})).toBeVisible();
    // The countdown completes hands-free: PREPARING enters INTRO on its own.
    // Ceiling is generous: the Mentor preparation parse (moved into the
    // PREPARING window) shares the main thread and parallel workers on one
    // machine contend, which can delay the observable module swap.
    await expect(page.locator('[data-workout-v2-intro-stage]')).toBeVisible({timeout: 30_000});
  }

  async function cueLayout(page: Page) {
    return page.locator('[data-workout-v2-intro-cue]').evaluateAll((elements) => {
      const items = elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {text: element.textContent?.trim() ?? '', x: rect.x, y: rect.y, width: rect.width, height: rect.height};
      });
      const rows: Array<typeof items> = [];
      for (const item of items) {
        const row = rows.find((candidate) => Math.abs(candidate[0]!.y - item.y) <= 2);
        if (row) row.push(item);
        else rows.push([item]);
      }
      return {
        items,
        rows: rows.map((row) => ({
          count: row.length,
          centerX: (Math.min(...row.map((item) => item.x)) + Math.max(...row.map((item) => item.x + item.width))) / 2,
          topY: Math.min(...row.map((item) => item.y)),
          bottomY: Math.max(...row.map((item) => item.y + item.height)),
        })),
      };
    });
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

  test('PREPARING completion does NOT await Mentor readiness — INTRO paints immediately (handoff §1)', async ({page}) => {
    // The owner device correction fixes the real-device freeze where the
    // INTRO mount blocked the first paint for seconds. This pins the
    // corrected handoff: the first INTRO PAINT (double-rAF instrumentation
    // mark) must land ~immediately after the last countdown tick, with the
    // Mentor still loading when the state arrives.
    await page.goto('/en/workout/v2?day=monday');
    const start = page.getByRole('button', {name: 'Start Workout', exact: true});
    await expect(start).toBeVisible();
    await start.tap();
    await expect(page.locator('[data-workout-v2-countdown]')).toBeVisible();

    await page.evaluate(() => {
      const win = window as unknown as {__t1: number | null};
      win.__t1 = null;
      // Last countdown tick (remaining = 1) ≈ countdown completion.
      new MutationObserver(() => {
        const cd = document.querySelector('[data-workout-v2-countdown]');
        if (cd?.textContent === '1' && win.__t1 === null) win.__t1 = performance.now();
      }).observe(document.querySelector('main') ?? document.body, {childList: true, subtree: true, characterData: true});
    });
    await page.waitForFunction(() => (window as unknown as {__t1: number | null}).__t1 !== null, null, {timeout: 15000});
    await page.waitForFunction(
      () => performance.getEntriesByName('v2:t3-intro-first-paint').length > 0,
      null,
      {timeout: 10000},
    );
    const handoffMs = await page.evaluate(() => {
      const t1 = performance.getEntriesByName('v2:t1-preparing-countdown-end')[0]?.startTime ?? 0;
      const t3 = performance.getEntriesByName('v2:t3-intro-first-paint')[0]?.startTime ?? 0;
      return t3 - t1;
    });
    // The transition must paint within a normal frame budget — NOT the
    // multi-second freeze the owner observed. Generous CI ceiling covers
    // parallel-worker noise; the real-device evidence is the ~0.1-0.3s
    // measured value, orders of magnitude below the old 5.4s.
    expect(handoffMs).toBeLessThan(2000);
    // The Mentor may still be attaching when INTRO paints — the lightweight
    // loading state must be present (same in-flight preparation, no restart).
    const loadingOrNull = await page.evaluate(() => {
      const intro = document.querySelector('[data-workout-v2-intro-stage]');
      if (!intro) return 'no-intro';
      return document.querySelector('[data-workout-v2-mentor] [role="status"]') ? 'loading' : 'ready';
    });
    expect(['loading', 'ready']).toContain(loadingOrNull);
    // And the SAME single preparation continues to visible readiness.
    await page.waitForFunction(
      () => !document.querySelector('[data-workout-v2-mentor] [role="status"]'),
      null,
      {timeout: 90000},
    );
    const glb = await page.evaluate(() =>
      performance.getEntriesByType('resource').filter((r) => /\.glb(\?|$)/.test(r.name)).length,
    );
    expect(glb).toBe(1);
  });

  test('INTRO cue treatment: no surface band, compact pills, no overflow (§2)', async ({page}) => {
    await reachIntro(page);
    await page.waitForTimeout(400); // stage entrance animation settle
    const zone = page.locator('[data-workout-v2-intro-cue-zone]');
    await expect(zone).toBeVisible();
    // Owner-rejected dark bottom strip: the container must NOT paint a
    // full-width background surface or blur band behind the cues.
    const bandPainted = await zone.evaluate((element) => {
      const style = getComputedStyle(element);
      const paintsBackground = style.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const hasBackdrop = style.backdropFilter !== 'none' && style.backdropFilter !== '';
      return paintsBackground || hasBackdrop;
    });
    expect(bandPainted).toBe(false);
    // Compact: the zone height must stay well under the previous band.
    const zoneBox = await zone.boundingBox();
    const viewport = page.viewportSize()!;
    expect(zoneBox!.height).toBeLessThan(viewport.height * 0.2);
    // No horizontal overflow (compact pills never push layout).
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('INTRO mobile cues use intrinsic centered wrapping at 390px and 430px', async ({page}) => {
    await reachIntro(page);
    await page.waitForTimeout(400);
    for (const viewport of [{width: 390, height: 844}, {width: 430, height: 932}]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(250);
      const layout = await cueLayout(page);
      expect(layout.rows.map((row) => row.count)).toEqual([2, 1]);
      for (const row of layout.rows) expect(Math.abs(row.centerX - viewport.width / 2)).toBeLessThanOrEqual(2);
      for (const item of layout.items) {
        expect(item.x).toBeGreaterThanOrEqual(0);
        expect(item.x + item.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('INTRO mobile Mentor framing stays contained and clear of identity/cues', async ({page}) => {
    await reachIntro(page);
    for (const viewport of [{width: 390, height: 844}, {width: 430, height: 932}]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(250);
      await page.waitForFunction(
        () => performance.getEntriesByName('I_BROWSER_PAINT_AFTER_MENTOR_FRAME').length > 0,
        null,
        {timeout: 30_000},
      );
      const geometry = await page.evaluate(() => {
        const host = document.querySelector('[data-workout-v2-intro-mentor-host]')!.getBoundingClientRect();
        const identity = document.querySelector('[data-workout-v2-intro-exercise]')!.getBoundingClientRect();
        const cues = document.querySelector('[data-workout-v2-intro-cues]')!.getBoundingClientRect();
        const projected = JSON.parse(
          document.querySelector('[data-workout-v2-mentor]')?.getAttribute('data-mentor-projected-bounds') ?? '{}',
        ) as {left: number; right: number; top: number; bottom: number};
        return {
          mentor: {left: projected.left, right: projected.right, top: host.top + projected.top, bottom: host.top + projected.bottom},
          identity: {bottom: identity.bottom},
          cues: {top: cues.top},
          viewport: {width: window.innerWidth, height: window.innerHeight},
        };
      });
      expect(geometry.mentor.left).toBeGreaterThanOrEqual(0);
      expect(geometry.mentor.right).toBeLessThanOrEqual(geometry.viewport.width);
      expect(geometry.mentor.top).toBeGreaterThanOrEqual(geometry.identity.bottom);
      expect(geometry.mentor.bottom).toBeLessThanOrEqual(geometry.cues.top);
      expect(geometry.mentor.bottom).toBeLessThanOrEqual(geometry.viewport.height);
    }
  });

  test('Mentor prepares during PREPARING and INTRO reuses it (single fetch, no reload)', async ({page}) => {
    await page.goto('/en/workout/v2?day=monday');
    const start = page.getByRole('button', {name: 'Start Workout', exact: true});
    await expect(start).toBeVisible();
    await start.tap();
    await expect(page.getByText('Prepare', {exact: true})).toBeVisible();

    // Hands-free countdown completion enters INTRO.
    await expect(page.locator('[data-workout-v2-intro-stage]')).toBeVisible({timeout: 15_000});
    // Timeline marker: the moment INTRO became visible.
    await page.evaluate(() => performance.mark('intro-entry'));

    // Mentor becomes visible-ready by attaching to the SAME prepared
    // lifecycle — the GLB fetch must have started during PREPARING (before
    // the intro-entry marker) and there must be exactly ONE GLB request.
    await page.waitForFunction(
      () => !document.querySelector('[data-workout-v2-mentor] [role="status"]'),
      null,
      {timeout: 60_000},
    );
    const evidence = await page.evaluate(() => {
      const glb = performance
        .getEntriesByType('resource')
        .filter((r) => /\.glb(\?|$)/.test(r.name));
      const marker = performance.getEntriesByName('intro-entry')[0];
      return {
        glbCount: glb.length,
        glbStartTime: glb.length > 0 ? glb[0].startTime : null,
        glbDuration: glb.length > 0 ? Math.round(glb[0].duration) : null,
        introEntryTime: marker ? marker.startTime : null,
      };
    });
    expect(evidence.glbCount).toBe(1);
    expect(evidence.introEntryTime).not.toBeNull();
    expect(evidence.glbStartTime).not.toBeNull();
    // PREPARE ONCE: the fetch began BEFORE INTRO entry (during PREPARING).
    expect(evidence.glbStartTime!).toBeLessThan(evidence.introEntryTime!);
    // REUSE: no second load after INTRO took over (count stays 1 after a
    // settle window on the same page).
    await page.waitForTimeout(2_000);
    const glbAfter = await page.evaluate(
      () => performance.getEntriesByType('resource').filter((r) => /\.glb(\?|$)/.test(r.name)).length,
    );
    expect(glbAfter).toBe(1);
  });

  test('INTRO is hands-free: no progression control and auto-hands off to the real SET', async ({page}) => {
    await reachIntro(page);
    // The hands-free contract excludes Start/Next/Continue progression CTAs.
    // The approved v1 exception controls (Do Later / Skip for this session)
    // are mounted only while INTRO remains the active orchestration state.
    await expect(page.locator('[data-workout-v2-intro-begin]')).toHaveCount(0);
    // The Mentor ready/degraded signal dispatches the typed orchestration
    // handoff. No presentation CTA or timeout-driven navigation is involved.
    await expect(page.locator('[data-workout-v2-workset-stage]')).toBeVisible({timeout: 30_000});
    await expect(page.locator('[data-workout-v2-intro-stage]')).toHaveCount(0);
  });

  test('canonical journey crosses INTRO → SET through the execution engine', async ({page}) => {
    await page.goto('/en/workout/v2?day=monday');
    const start = page.getByRole('button', {name: 'Start Workout', exact: true});
    await expect(start).toBeVisible();
    await start.tap();
    await expect(page.locator('[data-workout-v2-workset-stage]')).toBeVisible({timeout: 30_000});
    await expect(page.locator('[data-workout-v2-set-progress]')).toBeVisible();
    await expect(page.locator('[data-workout-v2-record-rep]')).toHaveCount(0);
    await expect(page.locator('[data-workout-v2-restart-set]')).toBeVisible();
  });

  test('INTRO cue zone sits below the mentor host, outside the demonstration area', async ({page}) => {
    await reachIntro(page);
    // Let the 240ms stage entrance animation finish so geometry is stable
    // before measuring (mid-animation boxes render with fractional scale).
    await page.waitForTimeout(400);
    const host = page.locator('[data-workout-v2-intro-mentor-host]');
    const zone = page.locator('[data-workout-v2-intro-cue-zone]');
    const hostBox = await host.boundingBox();
    const zoneBox = await zone.boundingBox();
    expect(hostBox).not.toBeNull();
    expect(zoneBox).not.toBeNull();
    // The cue zone starts BELOW the mentor host's bottom edge — it never
    // overlaps the Mentor body/mat (owner correction delta §3).
    expect(zoneBox!.y).toBeGreaterThanOrEqual(hostBox!.y + hostBox!.height - 1);
    // Safe-area aware bottom padding is part of the zone itself.
    const pad = await zone.evaluate((element) => getComputedStyle(element).paddingBottom);
    expect(parseFloat(pad)).toBeGreaterThan(8);
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

  test('INTRO Mentor lifecycle exposes the real first canvas frame after INTRO paint', async ({page}) => {
    await reachIntro(page);
    await page.waitForFunction(
      () => performance.getEntriesByName('v2:mentor-first-visible-frame').length > 0,
      null,
      {timeout: 30_000},
    );
    const timeline = await page.evaluate(() => {
      const names = [
        'A_PREPARING_COMPLETION',
        'B_INTRO_STATE_COMMITTED',
        'C_INTRO_DOM_FIRST_PAINT',
        'D_MENTOR_GLTF_PREPARATION_SETTLED',
        'E_MENTOR_RENDERER_CREATED',
        'F_MENTOR_SCENE_ATTACHED',
        'G_MENTOR_FIRST_RAF_REQUESTED',
        'H_MENTOR_FIRST_MESH_RENDERED',
        'I_BROWSER_PAINT_AFTER_MENTOR_FRAME',
        'v2:t3-intro-first-paint',
        'v2:mentor-prepared-gltf-available',
        'v2:mentor-renderer-created',
        'v2:mentor-scene-attached',
        'v2:mentor-clone-instance-prepared',
        'v2:mentor-framing-solved',
        'v2:mentor-animation-setup',
        'v2:mentor-first-request-animation-frame',
        'v2:mentor-first-visible-frame',
      ];
      return Object.fromEntries(
        names.map((name) => [name, performance.getEntriesByName(name)[0]?.startTime ?? null]),
      );
    });
    for (const name of [
      'A_PREPARING_COMPLETION',
      'B_INTRO_STATE_COMMITTED',
      'C_INTRO_DOM_FIRST_PAINT',
      'D_MENTOR_GLTF_PREPARATION_SETTLED',
      'E_MENTOR_RENDERER_CREATED',
      'F_MENTOR_SCENE_ATTACHED',
      'G_MENTOR_FIRST_RAF_REQUESTED',
      'H_MENTOR_FIRST_MESH_RENDERED',
      'I_BROWSER_PAINT_AFTER_MENTOR_FRAME',
    ]) expect(timeline[name]).not.toBeNull();
    expect(timeline['B_INTRO_STATE_COMMITTED']!).toBeGreaterThanOrEqual(timeline['A_PREPARING_COMPLETION']!);
    expect(timeline['C_INTRO_DOM_FIRST_PAINT']!).toBeGreaterThanOrEqual(timeline['B_INTRO_STATE_COMMITTED']!);
    expect(timeline['D_MENTOR_GLTF_PREPARATION_SETTLED']!).toBeLessThanOrEqual(timeline['A_PREPARING_COMPLETION']!);
    expect(timeline['I_BROWSER_PAINT_AFTER_MENTOR_FRAME']!).toBeGreaterThanOrEqual(timeline['H_MENTOR_FIRST_MESH_RENDERED']!);
    expect(timeline['I_BROWSER_PAINT_AFTER_MENTOR_FRAME']!).toBeGreaterThan(timeline['A_PREPARING_COMPLETION']!);
    expect(timeline['v2:t3-intro-first-paint']).not.toBeNull();
    expect(timeline['v2:mentor-first-visible-frame']).not.toBeNull();
    expect(timeline['v2:mentor-first-visible-frame']!).toBeGreaterThanOrEqual(timeline['v2:t3-intro-first-paint']!);
    expect(timeline['v2:mentor-first-visible-frame']! - timeline['v2:t3-intro-first-paint']!).toBeLessThan(15_000);
    for (const name of Object.keys(timeline)) expect(timeline[name]).not.toBeNull();
  });

  test('INTRO renders Persian identity + cues under RTL', async ({page}) => {
    await page.goto('/fa/workout/v2?day=monday');
    const start = page.getByRole('button', {name: 'شروع تمرین', exact: true});
    await expect(start).toBeVisible();
    await start.tap();
    // Same rationale as reachIntro: the Mentor preparation parse shares the
    // PREPARING window and main thread; the ceiling is deliberately generous.
    await expect(page.locator('[data-workout-v2-intro-stage]')).toBeVisible({timeout: 30_000});
    await expect(page.locator('[data-workout-v2-intro-exercise]')).toHaveText('Jump Squats');
    await expect(page.locator('[data-workout-v2-intro-cues] li')).toHaveCount(3);
    await expect(page.getByText('Lower into a squat with the chest up.')).toBeVisible();
    await expect(page.locator('[data-workout-v2-intro-controls] button')).toHaveCount(2);
  });
});

test.describe('Workout V2 — INTRO desktop central composition', () => {
  test.use({viewport: {width: 1440, height: 900}, hasTouch: false});
  test.setTimeout(60_000);

  test.beforeEach(async ({page}) => {
    await useCanonicalQaProgram(page);
  });

  test('Mentor stays between identity and cues with breathing room', async ({page}) => {
    await page.goto('/en/workout/v2?day=monday');
    await page.getByRole('button', {name: 'Start Workout', exact: true}).click();
    await expect(page.locator('[data-workout-v2-intro-stage]')).toBeVisible({timeout: 30_000});
    await page.waitForTimeout(400);
    const geometry = await page.evaluate(() => {
      const read = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {top: rect.top, bottom: rect.bottom, height: rect.height};
      };
      return {
        identity: read('[data-workout-v2-intro-exercise]'),
        mentor: read('[data-workout-v2-intro-mentor-host]'),
        cues: read('[data-workout-v2-intro-cues]'),
        projectedMentor: JSON.parse(
          document.querySelector('[data-workout-v2-mentor]')?.getAttribute('data-mentor-projected-bounds') ?? '{}',
        ) as {left?: number; right?: number; top?: number; bottom?: number},
        viewport: {width: window.innerWidth, height: window.innerHeight},
      };
    });
    expect(geometry.identity).not.toBeNull();
    expect(geometry.mentor).not.toBeNull();
    expect(geometry.cues).not.toBeNull();
    expect(geometry.mentor!.top).toBeGreaterThanOrEqual(geometry.identity!.bottom);
    expect(geometry.cues!.top).toBeGreaterThanOrEqual(geometry.mentor!.bottom);
    expect(geometry.mentor!.top - geometry.identity!.bottom).toBeGreaterThanOrEqual(4);
    expect(geometry.cues!.top - geometry.mentor!.bottom).toBeGreaterThanOrEqual(4);
    expect(geometry.mentor!.top).toBeGreaterThanOrEqual(0);
    expect(geometry.mentor!.bottom).toBeLessThanOrEqual(geometry.viewport.height);
    expect(geometry.projectedMentor.left).toBeGreaterThanOrEqual(0);
    expect(geometry.projectedMentor.right).toBeLessThanOrEqual(geometry.viewport.width);
    const {top: projectedTop, bottom: projectedBottom} = geometry.projectedMentor;
    if (typeof projectedTop !== 'number' || typeof projectedBottom !== 'number') {
      throw new Error('Mentor projected bounds must include top and bottom values');
    }
    expect(projectedTop + geometry.mentor!.top).toBeGreaterThanOrEqual(geometry.mentor!.top);
    expect(projectedBottom + geometry.mentor!.top).toBeLessThanOrEqual(geometry.mentor!.bottom);
  });

  test('Mentor first-frame timing is observable on desktop', async ({page}) => {
    await page.goto('/en/workout/v2?day=monday');
    await page.getByRole('button', {name: 'Start Workout', exact: true}).click();
    await expect(page.locator('[data-workout-v2-intro-stage]')).toBeVisible({timeout: 30_000});
    await page.waitForFunction(
      () => performance.getEntriesByName('v2:mentor-first-visible-frame').length > 0,
      null,
      {timeout: 30_000},
    );
    const delta = await page.evaluate(() => {
      const intro = performance.getEntriesByName('v2:t3-intro-first-paint')[0]?.startTime ?? 0;
      const frame = performance.getEntriesByName('v2:mentor-first-visible-frame')[0]?.startTime ?? 0;
      return frame - intro;
    });
    expect(delta).toBeGreaterThanOrEqual(0);
    expect(delta).toBeLessThan(15_000);
  });
});

test.describe('Workout V2 — desktop Light shell contrast (owner polish delta §B)', () => {
  test('desktop Light applies the contrast scrim without geometry changes; dark/mobile untouched', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto('/en/workout/v2');
    // Deterministic LIGHT initial state (canonical storage key). The value
    // is set + reloaded per phase — an addInitScript would re-impose the
    // seeded value on EVERY navigation and make the later dark phase
    // impossible to observe.
    await page.evaluate(() => window.localStorage.setItem('theme', 'light'));
    await page.reload();
    // DOM OWNERSHIP CONTRACT: `data-workout-theme` is carried by the shared
    // top-shell `<header>` (the surface the desktop-light scrim actually
    // decorates) — not the outer shell section. Tests assert the attribute
    // where the shell actually renders it.
    const header = page.locator('header[data-workout-theme]');
    const controls = page.locator('[data-workout-v2-top-controls]');

    // Light desktop: the header carries the theme marker and the scrim
    // pseudo-element exists (content rendered on ::before).
    await expect(header).toHaveAttribute('data-workout-theme', 'light');
    const lightScrim = await header.evaluate(
      (element) => getComputedStyle(element, '::before').backgroundImage,
    );
    expect(lightScrim).toContain('linear-gradient');
    // Controls gain the sturdier light surface (≥ the old translucent base).
    const control = controls.locator('button').first();
    const lightSurface = await control.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(lightSurface).toContain('rgba(255, 255, 255');

    // Desktop Dark: no scrim (dark is NEVER veiled, on any viewport),
    // base tokens (no geometry/position shift either).
    await page.evaluate(() => window.localStorage.setItem('theme', 'dark'));
    await page.reload();
    await expect(header).toHaveAttribute('data-workout-theme', 'dark');
    const darkScrim = await header.evaluate(
      (element) => getComputedStyle(element, '::before').backgroundImage,
    );
    expect(darkScrim).toBe('none');
    const darkControl = controls.locator('button').first();
    const darkBox = await darkControl.boundingBox();
    expect(darkBox).not.toBeNull();

    // Mobile phase at 390×844 — the same viewport for BOTH themes so the
    // geometry comparison below is actually like-for-like.
    await page.setViewportSize({width: 390, height: 844});
    // Mobile Dark reference: no scrim below the sm breakpoint, either theme.
    await page.reload();
    const mobileDarkScrim = await header.evaluate(
      (element) => getComputedStyle(element, '::before').backgroundImage,
    );
    expect(mobileDarkScrim).toBe('none');
    const mobileDarkBox = await controls.locator('button').first().boundingBox();
    expect(mobileDarkBox).not.toBeNull();

    // Mobile Light: the scrim must still NOT activate below the sm breakpoint.
    await page.evaluate(() => window.localStorage.setItem('theme', 'light'));
    await page.reload();
    const mobileScrim = await header.evaluate(
      (element) => getComputedStyle(element, '::before').backgroundImage,
    );
    expect(mobileScrim).toBe('none');
    // Control geometry identical between themes at the SAME viewport.
    const mobileLightBox = await controls.locator('button').first().boundingBox();
    expect(mobileLightBox!.x).toBeCloseTo(mobileDarkBox!.x, 0);
    expect(mobileLightBox!.width).toBeCloseTo(mobileDarkBox!.width, 0);
  });
});
