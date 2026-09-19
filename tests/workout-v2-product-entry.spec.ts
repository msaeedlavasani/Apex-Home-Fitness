import {expect, test} from '@playwright/test';

test.describe('Workout V2 normal product entry', () => {
  test.use({viewport: {width: 390, height: 844}, hasTouch: true});

  test('normal localized workout route launches the V2 shell without a review-route dependency', async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      // Open-mode browser coverage has no authenticated Supabase session; the
      // route deliberately falls back to the local plan while the protected
      // Program API reports its pre-existing auth failure. Authenticated CI
      // coverage exercises the real Program response separately.
      if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text());
    });
    page.on('response', (response) => {
      if (response.status() >= 500 && !response.url().includes('/api/program/current')) {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/en/workout');
    await expect(page.locator('[data-workout-v2-surface]')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Start Workout', exact: true})).toBeVisible();
    await expect(page.locator('[data-workout-v2-shell]')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Exit workout', exact: true})).toBeVisible();
    expect(errors).toEqual([]);
  });
});
