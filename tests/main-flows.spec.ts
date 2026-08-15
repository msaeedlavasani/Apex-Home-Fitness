import {expect, test} from '@playwright/test';

/**
 * Core E2E flows for Apex Home Fitness.
 *
 * Runs against the Next.js dev server (see playwright.config.ts webServer).
 *
 * 1. Localization (EN ⇄ FA switching + RTL)
 * 2. Onboarding quiz completion (5 steps)
 * 3. Theme switching (dark / light / system + persistence)
 */

test.describe('Localization (EN / FA switching)', () => {
  test('dashboard renders in English (LTR) and switches to Persian (RTL)', async ({
    page,
  }) => {
    // --- English ---
    await page.goto('/en/dashboard');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByText('Your weekly training plan')).toBeVisible();
    await expect(page.getByText('Weekly calendar')).toBeVisible();

    // --- Switch to Persian via the /fa locale URL ---
    await page.goto('/fa/dashboard');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByText('برنامه تمرینی هفتگی تو')).toBeVisible();
    await expect(page.getByText('تقویم هفتگی')).toBeVisible();

    // --- And back to English ---
    await page.goto('/en/dashboard');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByText('Your weekly training plan')).toBeVisible();
  });

  test('quiz page follows the active locale', async ({page}) => {
    await page.goto('/en/quiz');
    await expect(
      page.getByRole('heading', {name: 'Build your training plan'}),
    ).toBeVisible();

    await page.goto('/fa/quiz');
    await expect(
      page.getByRole('heading', {name: 'برنامه تمرینی خودت رو بساز'}),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('Onboarding quiz', () => {
  test('completes all five steps and lands on the dashboard', async ({page}) => {
    await page.goto('/en/quiz');
    await expect(
      page.getByRole('heading', {name: 'Build your training plan'}),
    ).toBeVisible();

    // --- Step 1: Visual style ---
    await expect(
      page.getByText('What visual style do you prefer?'),
    ).toBeVisible();

    // Validation: Next without a selection shows the required error.
    await page.getByRole('button', {name: 'Next'}).click();
    await expect(page.getByRole('alert')).toContainText(
      'Please select an option to continue.',
    );

    // Pick "Dark" — the theme is applied immediately.
    await page.getByRole('button', {name: /^Dark/}).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', {name: 'Next'}).click();

    // --- Step 2: Current level ---
    await expect(
      page.getByText('What is your current training level?'),
    ).toBeVisible();
    await page.getByRole('button', {name: /^Beginner/}).click();
    await page.getByRole('button', {name: 'Next'}).click();

    // --- Step 3: Goal ---
    await expect(page.getByText('What is your main goal?')).toBeVisible();
    await page.getByRole('button', {name: /^Strength/}).click();
    await page.getByRole('button', {name: 'Next'}).click();

    // --- Step 4: Equipment ---
    await expect(
      page.getByText('What equipment do you have available?'),
    ).toBeVisible();
    await page.getByRole('checkbox', {name: 'Dumbbells'}).check();
    await page.getByRole('button', {name: 'Next'}).click();

    // --- Step 5: Limitations (optional) ---
    await expect(
      page.getByText('Do you have any injuries or limitations?'),
    ).toBeVisible();
    await page.getByRole('checkbox', {name: 'None — I am healthy'}).check();
    await page.getByRole('button', {name: 'See my plan'}).click();

    // Submission routes to the dashboard.
    await page.waitForURL('**/en/dashboard');
    await expect(page.getByText('Your weekly training plan')).toBeVisible();
  });
});

test.describe('Theme switching', () => {
  test('persisted "dark" theme applies the dark class', async ({page}) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto('/en/dashboard');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  });

  test('persisted "light" theme removes the dark class', async ({page}) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto('/en/dashboard');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  });

  test('"system" theme follows the OS color scheme', async ({page}) => {
    await page.emulateMedia({colorScheme: 'dark'});
    await page.addInitScript(() => localStorage.setItem('theme', 'system'));
    await page.goto('/en/dashboard');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.emulateMedia({colorScheme: 'light'});
    await page.reload();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('selection persists to localStorage and survives reload', async ({
    page,
  }) => {
    await page.goto('/en/quiz');

    // Step 1 lets the user switch the app theme directly.
    await page.getByRole('button', {name: /^Dark/}).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    const stored = await page.evaluate(() => localStorage.getItem('theme'));
    expect(stored).toBe('dark');

    // Reload — the theme must be restored from localStorage before paint.
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
