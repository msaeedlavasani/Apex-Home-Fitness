import {expect, test, type Locator, type Page} from '@playwright/test';

/**
 * Keyboard / focus coverage.
 *
 * Everything here is keyboard-only (Tab + Enter/Space), deterministic, and
 * needs no external network:
 *  - dashboard weekly calendar: focus, activation state, focus retention;
 *  - theme toggle in the web sidebar: Enter/Space cycling + persistence;
 *  - the onboarding quiz end-to-end with the keyboard only;
 *  - quiz validation announced to assistive tech;
 *  - exercise library: search field, clear button, category radios and the
 *    focused player modal (Escape to close).
 */

/** Press Tab repeatedly until `target` owns the focus (browser tab order). */
async function tabTo(page: Page, target: Locator, maxTabs = 30): Promise<void> {
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

/** Never touch the demo media hosts — tests stay fully offline. */
async function blockExternalMedia(context: import('@playwright/test').BrowserContext) {
  await context.route('https://test-streams.mux.dev/**', (route) => route.abort());
  await context.route('https://commondatastorage.googleapis.com/**', (route) =>
    route.abort(),
  );
}

test.describe('Dashboard weekly calendar — keyboard', () => {
  test('day buttons are focusable and switch the plan with Enter/Space', async ({
    page,
  }) => {
    await page.goto('/en/dashboard');
    const calendar = page.getByRole('region', {name: 'Weekly calendar'});
    const days = calendar.getByRole('button');
    await expect(days).toHaveCount(7);

    // Exactly one day is selected (aria-pressed) at any time.
    await expect(calendar.locator('button[aria-pressed="true"]')).toHaveCount(1);

    // Monday (index 0) is a workout day — select it with Enter.
    const monday = days.nth(0);
    await tabTo(page, monday);
    await monday.press('Enter');
    await expect(monday).toHaveAttribute('aria-pressed', 'true');
    await expect(calendar.locator('button[aria-pressed="true"]')).toHaveCount(1);
    await expect(page.getByText('Full Body HIIT')).toBeVisible();
    // Focus stays on the activated control.
    await expect(monday).toBeFocused();

    // Wednesday (index 2) is a rest day — select it with Space.
    const wednesday = days.nth(2);
    await tabTo(page, wednesday);
    await wednesday.press('Space');
    await expect(wednesday).toHaveAttribute('aria-pressed', 'true');
    await expect(calendar.locator('button[aria-pressed="true"]')).toHaveCount(1);
    await expect(page.getByText('Rest day')).toBeVisible();
    await expect(wednesday).toBeFocused();
  });
});

test.describe('Theme toggle — keyboard', () => {
  test('cycles light → dark → system with Enter and Space and persists', async ({
    page,
  }) => {
    // Pin the OS preference so "system" resolves deterministically.
    await page.emulateMedia({colorScheme: 'light'});
    await page.goto('/en/dashboard');

    // The ThemeToggle exists in both the sidebar footer and the mobile top
    // bar — scope to the desktop sidebar (role=complementary).
    const sidebarToggle = () =>
      page.getByRole('complementary').getByRole('button');
    const byLabel = (name: string) =>
      page.getByRole('complementary').getByRole('button', {name});

    // Fresh context: theme defaults to "system" → next is "Light".
    await tabTo(page, byLabel('Light'));
    await expect(byLabel('Light')).toBeFocused();

    // Enter → light.
    await byLabel('Light').press('Enter');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');

    // Space → dark.
    await byLabel('Dark').press('Space');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

    // Enter → system (resolves to light via emulated OS preference).
    await byLabel('System').press('Enter');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('system');

    // Focus never leaves the toggle across the whole cycle.
    await expect(byLabel('Light')).toBeFocused();
    await expect(sidebarToggle()).toHaveCount(1);
  });
});

test.describe('Onboarding quiz — keyboard', () => {
  test('completes all six steps with the keyboard only', async ({page}) => {
    await page.goto('/en/quiz');

    // Step 1 — visual style. OptionCards expose "title + description" as
    // their accessible name (e.g. "Light Bright interface — great for
    // daytime"), so anchor the match to the start of the name.
    const light = page.getByRole('button', {name: /^Light/});
    await tabTo(page, light);
    await light.press('Enter');
    await expect(light).toHaveAttribute('aria-pressed', 'true');

    await tabTo(page, page.getByRole('button', {name: 'Next'}));
    await page.getByRole('button', {name: 'Next'}).press('Enter');
    await expect(page.getByText('What is your current training level?')).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');

    // Step 2 — level.
    const beginner = page.getByRole('button', {name: /^Beginner/});
    await tabTo(page, beginner);
    await beginner.press('Enter');

    await tabTo(page, page.getByRole('button', {name: 'Next'}));
    await page.getByRole('button', {name: 'Next'}).press('Enter');
    await expect(page.getByText('What are your goals?')).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');

    // Step 3 — goals (multi-select native checkboxes, toggled with Space).
    const strength = page.getByRole('checkbox', {name: /^Strength/});
    const flexibility = page.getByRole('checkbox', {name: /^Flexibility/});
    await tabTo(page, strength);
    await strength.press('Space');
    await expect(strength).toBeChecked();

    await tabTo(page, flexibility);
    await flexibility.press('Space');
    await expect(flexibility).toBeChecked();
    await expect(strength).toBeChecked();

    await tabTo(page, page.getByRole('button', {name: 'Next'}));
    await page.getByRole('button', {name: 'Next'}).press('Enter');
    await expect(
      page.getByText('What equipment do you have available?'),
    ).toBeVisible();

    // Step 4 — equipment (native checkbox, toggled with Space).
    const dumbbells = page.getByRole('checkbox', {name: 'Dumbbells'});
    await tabTo(page, dumbbells);
    await dumbbells.press('Space');
    await expect(dumbbells).toBeChecked();

    await tabTo(page, page.getByRole('button', {name: 'Next'}));
    await page.getByRole('button', {name: 'Next'}).press('Enter');
    await expect(
      page.getByText('Do you have any injuries or limitations?'),
    ).toBeVisible();

    // Step 5 — limitations (optional; pick "None").
    const none = page.getByRole('checkbox', {name: 'None — I am healthy'});
    await tabTo(page, none);
    await none.press('Space');
    await expect(none).toBeChecked();

    await tabTo(page, page.getByRole('button', {name: 'Next'}));
    await page.getByRole('button', {name: 'Next'}).press('Enter');
    await expect(page.getByText('Which weekdays are your rest days?')).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '6');

    // Step 6 — rest days (1–3 required; pick two weekdays with Space).
    const wednesday = page.getByRole('checkbox', {name: 'Wednesday'});
    await tabTo(page, wednesday);
    await wednesday.press('Space');
    await expect(wednesday).toBeChecked();

    const sunday = page.getByRole('checkbox', {name: 'Sunday'});
    await tabTo(page, sunday);
    await sunday.press('Space');
    await expect(sunday).toBeChecked();

    const finish = page.getByRole('button', {name: 'See my plan'});
    await tabTo(page, finish);
    await finish.press('Enter');

    // Without a session the completed quiz hands off to the OTP login step
    // (the draft is persisted so the answers survive the round-trip).
    await page.waitForURL('**/en/auth/login**');
    const stored = await page.evaluate(() =>
      localStorage.getItem('apex:quiz:draft:v1'),
    );
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).status).toBe('completed');
  });

  test('missing selection is announced via role=alert when Next is activated', async ({
    page,
  }) => {
    await page.goto('/en/quiz');

    const next = page.getByRole('button', {name: 'Next'});
    await tabTo(page, next);
    await next.press('Enter');

    // The quiz error is a role=alert paragraph — filter out Next.js's own
    // route announcer (also role=alert, but always empty).
    await expect(
      page.getByRole('alert').filter({hasText: 'Please select an option to continue.'}),
    ).toBeVisible();
    // The quiz stays on step 1 and focus remains on Next.
    await expect(page.getByRole('radiogroup')).toBeVisible();
    await expect(next).toBeFocused();
  });
});

test.describe('Exercise library — keyboard', () => {
  test.beforeEach(async ({context}) => {
    await blockExternalMedia(context);
  });

  test('search, clear and category filters are keyboard-operable', async ({
    page,
  }) => {
    await page.goto('/en/library');

    // Search field (aria-label) — type to filter.
    const search = page.getByRole('textbox', {name: 'Search exercises'});
    await tabTo(page, search);
    await search.type('plank');
    await expect(page.getByRole('status')).toContainText('1 exercise');
    await expect(page.getByRole('button', {name: 'Play Plank Hold'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Play Air Squats'})).toHaveCount(0);

    // Clear button — Enter resets the query.
    const clear = page.getByRole('button', {name: 'Clear search'});
    await tabTo(page, clear);
    await clear.press('Enter');
    await expect(search).toHaveValue('');
    await expect(page.getByRole('status')).toContainText('10 exercises');

    // Category radios — Enter on "Yoga" filters the grid.
    const yoga = page.getByRole('radio', {name: 'Yoga'});
    await tabTo(page, yoga);
    await yoga.press('Enter');
    await expect(yoga).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('radio', {name: 'All'})).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(page.getByRole('status')).toContainText('1 exercise');
    await expect(
      page.getByRole('button', {name: 'Play Gentle Yoga Flow'}),
    ).toBeVisible();
  });

  test('focused player modal opens via keyboard and closes with Escape', async ({
    page,
  }) => {
    await page.goto('/en/library');

    const card = page.getByRole('button', {name: 'Play Air Squats'});
    await tabTo(page, card);
    await card.press('Enter');

    const dialog = page.getByRole('dialog', {name: 'Air Squats'});
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog.getByRole('button', {name: 'Close'})).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
