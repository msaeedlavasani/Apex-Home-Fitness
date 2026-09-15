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
    await expect(page.getByRole('button', {name: /workout music/i})).toBeVisible();
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
    await expect(dialog).toContainText('Squat');
    await expect(dialog).toContainText('10');

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

  test('language control swaps EN ↔ FA on the review route', async ({page}) => {
    await page.goto('/en/workout/v2');
    await expect(page.getByRole('radio', {name: 'Switch to Persian'})).toBeVisible();
    await page.getByRole('radio', {name: 'Switch to Persian'}).click();
    await page.waitForURL('**/fa/workout/v2');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('button', {name: 'شروع تمرین', exact: true})).toBeVisible();

    await page.getByRole('radio', {name: 'تغییر به انگلیسی'}).click();
    await page.waitForURL('**/en/workout/v2');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('button', {name: 'Start Workout', exact: true})).toBeVisible();
  });

  test('theme control cycles light → dark → system without changing geometry', async ({page}) => {
    await page.emulateMedia({colorScheme: 'light'});
    await page.goto('/en/workout/v2');
    const shell = page.locator('[data-workout-v2-shell]');
    const start = page.getByRole('button', {name: 'Start Workout', exact: true});
    const before = await start.boundingBox();
    expect(before).not.toBeNull();

    const theme = page.getByRole('button', {name: 'Light', exact: true});
    await theme.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.getByRole('button', {name: 'Dark', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Dark', exact: true}).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', {name: 'System', exact: true}).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    const after = await start.boundingBox();
    expect(after).not.toBeNull();
    expect(after!.x).toBeCloseTo(before!.x, 0);
    expect(after!.y).toBeCloseTo(before!.y, 0);
    expect(after!.width).toBeCloseTo(before!.width, 0);
    expect(after!.height).toBeCloseTo(before!.height, 0);
    await expect(shell).toBeVisible();
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
    await page.getByRole('button', {name: 'شروع تمرین', exact: true}).tap();
    await expect(page.getByText('آماده شو', {exact: true})).toBeVisible();
    await expect(page.locator('[data-workout-v2-countdown]')).toHaveText('5');
    await expect(page.getByRole('button', {name: 'بیشتر', exact: true})).toBeVisible();
  });
});
