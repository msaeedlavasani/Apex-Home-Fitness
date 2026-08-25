import {expect, test} from '@playwright/test';

/**
 * Core E2E flows for Apex Home Fitness.
 *
 * Runs against the Next.js dev server (see playwright.config.ts webServer).
 *
 * 1. Localization (EN ⇄ FA switching + RTL)
 * 2. Onboarding quiz completion (6 steps)
 * 3. Theme switching (dark / light / system + persistence)
 */

test.describe('Landing visual shell', () => {
  test('renders the primary action and workout preview in English', async ({page}) => {
    await page.goto('/en');

    await expect(page.getByRole('heading', {name: 'Build a plan that fits your life'})).toBeVisible();
    await expect(page.getByRole('link', {name: 'Start the quiz'})).toHaveAttribute('href', '/en/quiz');
    await expect(page.getByRole('heading', {name: 'Full body focus'})).toBeVisible();
    await expect(page.getByText('AI-built for you')).toBeVisible();
    await expect(page.getByText('Works offline')).toBeVisible();
  });

  test('keeps the landing composition localized and RTL in Persian', async ({page}) => {
    await page.goto('/fa');

    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', {name: 'برنامه‌ای بساز که با زندگی تو جور باشد'})).toBeVisible();
    await expect(page.getByRole('link', {name: 'شروع کوییز'})).toHaveAttribute('href', '/fa/quiz');
    await expect(page.getByRole('heading', {name: 'تمرکز روی تمام بدن'})).toBeVisible();
    await expect(page.getByText('ساخته‌شده با هوش مصنوعی برای تو')).toBeVisible();
  });
});

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
  test('completes all six steps, persists the draft and hands off to sign-in', async ({
    page,
  }) => {
    await page.goto('/en/quiz');
    await expect(
      page.getByRole('heading', {name: 'Build your training plan'}),
    ).toBeVisible();

    // --- Step 1: Visual style ---
    await expect(
      page.getByText('What visual style do you prefer?'),
    ).toBeVisible();

    // Validation: Next without a selection shows the required error.
    await page.getByRole('button', {name: 'Next', exact: true}).click();
    await expect(
      page.getByRole('alert').filter({hasText: 'Please select an option to continue.'}),
    ).toBeVisible();

    // Pick "Dark" — the theme is applied immediately.
    await page.getByRole('button', {name: /^Dark/}).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', {name: 'Next', exact: true}).click();

    // --- Step 2: Current level ---
    await expect(
      page.getByText('What is your current training level?'),
    ).toBeVisible();
    await page.getByRole('button', {name: /^Beginner/}).click();
    await page.getByRole('button', {name: 'Next', exact: true}).click();

    // --- Step 3: Goals (multi-select; at least one required) ---
    await expect(page.getByText('What are your goals?')).toBeVisible();
    await page.getByRole('checkbox', {name: /^Strength/}).check();
    await page.getByRole('checkbox', {name: /^Fat Loss/}).check();
    await expect(page.getByRole('checkbox', {name: /^Strength/})).toBeChecked();
    await expect(page.getByRole('checkbox', {name: /^Fat Loss/})).toBeChecked();
    await page.getByRole('button', {name: 'Next', exact: true}).click();

    // --- Step 4: Equipment ---
    await expect(
      page.getByText('What equipment do you have available?'),
    ).toBeVisible();
    await page.getByRole('checkbox', {name: 'Dumbbells'}).check();
    await page.getByRole('button', {name: 'Next', exact: true}).click();

    // --- Step 5: Limitations (optional) ---
    await expect(
      page.getByText('Do you have any injuries or limitations?'),
    ).toBeVisible();
    await page.getByRole('checkbox', {name: 'None — I am healthy'}).check();
    await page.getByRole('button', {name: 'Next', exact: true}).click();

    // --- Step 6: Rest days (1–3 required) ---
    await expect(page.getByText('Which weekdays are your rest days?')).toBeVisible();
    await page.getByRole('checkbox', {name: 'Wednesday'}).check();
    await page.getByRole('checkbox', {name: 'Sunday'}).check();
    await expect(page.getByRole('checkbox', {name: 'Wednesday'})).toBeChecked();
    await expect(page.getByRole('checkbox', {name: 'Sunday'})).toBeChecked();
    await page.getByRole('button', {name: 'See my plan'}).click();

    // Without a session the flow hands off to the OTP login step, carrying
    // the completed draft so the answers survive the verify round-trip.
    await page.waitForURL('**/en/auth/login**');

    const stored = await page.evaluate(() =>
      localStorage.getItem('apex:quiz:draft:v1'),
    );
    expect(stored).toBeTruthy();
    const draft = JSON.parse(stored!) as {
      status: string;
      answers: {level: string; goal: string[]; restDays: string[]};
    };
    expect(draft.status).toBe('completed');
    expect(draft.answers.level).toBe('beginner');
    expect(draft.answers.goal).toEqual(['strength', 'fat_loss']);
    expect(draft.answers.restDays).toEqual(['wednesday', 'sunday']);
  });

  test('goal step requires at least one goal and accepts multiple', async ({
    page,
  }) => {
    await page.goto('/en/quiz');

    // Step 1 — visual style.
    await page.getByRole('button', {name: /^Light/}).click();
    await page.getByRole('button', {name: 'Next', exact: true}).click();

    // Step 2 — current level.
    await page.getByRole('button', {name: /^Beginner/}).click();
    await page.getByRole('button', {name: 'Next', exact: true}).click();

    // Step 3 — goals: Next without a selection shows the goal-specific error
    // and the quiz stays on the step.
    await expect(page.getByText('What are your goals?')).toBeVisible();
    await page.getByRole('button', {name: 'Next', exact: true}).click();
    await expect(
      page
        .getByRole('alert')
        .filter({hasText: 'Please select at least one goal to continue.'}),
    ).toBeVisible();
    await expect(page.getByText('What are your goals?')).toBeVisible();

    // Selecting a single goal clears the error path…
    const strength = page.getByRole('checkbox', {name: /^Strength/});
    await strength.check();
    await expect(strength).toBeChecked();

    // …and a second goal is added to the selection (multi-select).
    const fatLoss = page.getByRole('checkbox', {name: /^Fat Loss/});
    await fatLoss.check();
    await expect(fatLoss).toBeChecked();
    await expect(strength).toBeChecked();

    // Un-checking the first goal keeps the second — still ≥ 1 selected.
    await strength.uncheck();
    await expect(strength).not.toBeChecked();
    await expect(fatLoss).toBeChecked();

    // Re-select Strength so the selection has two goals, then proceed.
    await strength.check();
    await page.getByRole('button', {name: 'Next', exact: true}).click();
    await expect(
      page.getByText('What equipment do you have available?'),
    ).toBeVisible();
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
