import {expect, test} from '@playwright/test';

/**
 * E2E for the workout player route (`/[locale]/workout`) — the destination
 * of the dashboard's "Start workout" / "شروع تمرین" button.
 *
 * Regression guard: the button used to link to a route that did not exist,
 * so both locales rendered Next.js's 404 page instead of the player.
 */
test.describe('Workout route (Start workout button destination)', () => {
  test('GET /en/workout returns 200 and renders the player', async ({page}) => {
    const response = await page.request.get('/en/workout');
    expect(response.status()).toBe(200);

    await page.goto('/en/workout');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    // READY state: the phase badge and the Start control are visible.
    await expect(page.getByText('Ready', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Start'})).toBeVisible();

    // Not the 404 fallback page.
    await expect(
      page.getByText('This page could not be found'),
    ).toHaveCount(0);
  });

  test('GET /fa/workout returns 200 and renders the localized player (RTL)', async ({
    page,
  }) => {
    const response = await page.request.get('/fa/workout');
    expect(response.status()).toBe(200);

    await page.goto('/fa/workout');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // READY state, fully localized (آماده badge + شروع control).
    await expect(page.getByText('آماده', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'شروع'})).toBeVisible();
  });

  test('dashboard "Start workout" navigates to the workout player (en)', async ({
    page,
  }) => {
    await page.goto('/en/dashboard');
    await expect(page.getByText('Your weekly training plan')).toBeVisible();

    const start = page.getByRole('link', {name: 'Start workout'});
    if ((await start.count()) === 0) {
      // Today is a rest day → the button is hidden; pick Monday, a workout
      // day, from the weekly calendar.
      await page
        .getByRole('region', {name: 'Weekly calendar'})
        .getByRole('button')
        .first()
        .click();
    }
    await expect(start).toBeVisible();
    await start.click();

    await page.waitForURL('**/en/workout');
    await expect(page.getByRole('button', {name: 'Start'})).toBeVisible();
  });

  test('dashboard "شروع تمرین" navigates to the workout player (fa)', async ({
    page,
  }) => {
    await page.goto('/fa/dashboard');
    await expect(page.getByText('برنامه تمرینی هفتگی تو')).toBeVisible();

    const start = page.getByRole('link', {name: 'شروع تمرین'});
    if ((await start.count()) === 0) {
      await page
        .getByRole('region', {name: 'تقویم هفتگی'})
        .getByRole('button')
        .first()
        .click();
    }
    await expect(start).toBeVisible();
    await start.click();

    await page.waitForURL('**/fa/workout');
    await expect(page.getByRole('button', {name: 'شروع'})).toBeVisible();
  });

  test('player starts a session: Ready → Exercising with a live countdown', async ({
    page,
  }) => {
    await page.goto('/en/workout');

    // READY → EXERCISING when the user presses Start.
    await page.getByRole('button', {name: 'Start'}).click();
    await expect(page.getByText('Exercising', {exact: true})).toBeVisible();

    // The first exercise has a work duration → the timer counts down (m:ss).
    await expect(page.getByRole('timer')).toHaveText(/^\d+:\d{2}$/);
  });
});
