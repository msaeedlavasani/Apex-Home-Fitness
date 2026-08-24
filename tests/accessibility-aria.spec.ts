import {expect, test, type Page} from '@playwright/test';

/**
 * ARIA / accessibility coverage (browser-level).
 *
 * Asserts the semantic contracts the app exposes to assistive technology:
 * labelled regions, toggle state, live regions, progress semantics, radio
 * groups, dialog modality, and the blanket guarantee that every interactive
 * element has an accessible name. All deterministic, no external network.
 */

/**
 * Blanket check: every interactive element inside <main> (button / link /
 * input / select / textarea / role=button|link) must resolve to a non-empty
 * accessible name — otherwise screen-reader users get "unlabeled control".
 * Scoped to <main> because the app chrome (sidebar/top bar) is owned by
 * platform layouts; the content area is what every page owns.
 */
async function expectAllInteractiveNamed(page: Page): Promise<void> {
  const unnamed = await page.evaluate(() => {
    const root = document.querySelector('main');
    if (!root) return ['no <main> found'];
    const bad: string[] = [];
    root
      .querySelectorAll<HTMLElement>(
        'button, a, input, select, textarea, [role="button"], [role="link"]',
      )
      .forEach((el) => {
        const input = el as HTMLInputElement;
        if (input.type === 'hidden') return;

        const labelledBy = el.getAttribute('aria-labelledby');
        const labelledByText = labelledBy
          ? labelledBy
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent ?? '')
              .join(' ')
              .trim()
          : '';

        const name =
          el.getAttribute('aria-label')?.trim() ||
          labelledByText ||
          el.getAttribute('title')?.trim() ||
          el.getAttribute('alt')?.trim() ||
          el.getAttribute('placeholder')?.trim() ||
          el.textContent?.trim() ||
          el.closest('label')?.textContent?.trim() ||
          '';
        if (!name) {
          bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
        }
      });
    return bad;
  });

  expect(unnamed, `unnamed interactive elements: ${unnamed.join(', ')}`).toEqual([]);
}

test.describe('Dashboard — ARIA', () => {
  test('exposes labelled regions, day-toggle state and a labelled nav', async ({
    page,
  }) => {
    await page.goto('/en/dashboard');

    // Labelled regions (section + aria-label → region role).
    await expect(page.getByRole('region', {name: 'Weekly calendar'})).toBeVisible();
    await expect(page.getByRole('region', {name: "Today's workout"})).toBeVisible();

    // Day buttons expose their pressed state; exactly one is pressed.
    const days = page
      .getByRole('region', {name: 'Weekly calendar'})
      .getByRole('button');
    await expect(days).toHaveCount(7);
    await expect(
      page
        .getByRole('region', {name: 'Weekly calendar'})
        .locator('button[aria-pressed="true"]'),
    ).toHaveCount(1);

    // Navigation is labelled and the active section is announced. The app
    // renders two labelled navs (desktop sidebar + mobile top bar) — scope
    // to the desktop sidebar (role=complementary) for an unambiguous check.
    const nav = page
      .getByRole('complementary')
      .getByRole('navigation', {name: 'Main navigation'});
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', {name: 'Home'})).toHaveAttribute(
      'aria-current',
      'page',
    );

    // Decorative icons inside the main content are hidden from AT.
    await expect(page.locator('main svg:not([aria-hidden="true"])')).toHaveCount(0);

    await expectAllInteractiveNamed(page);
  });
});

test.describe('Onboarding quiz — ARIA', () => {
  test('exposes progress, option, note and error semantics', async ({page}) => {
    await page.goto('/en/quiz');

    // Progress bar: 1 of 6 on the first step.
    const progress = page.getByRole('progressbar');
    await expect(progress).toHaveAttribute('aria-valuemin', '0');
    await expect(progress).toHaveAttribute('aria-valuemax', '6');
    await expect(progress).toHaveAttribute('aria-valuenow', '1');

    // Single-choice step is a labelled radiogroup of toggle buttons.
    // OptionCard names include the hint text (e.g. "Dark Easy on the eyes
    // in low light"), so anchor matches to the start of the name.
    const themeGroup = page.getByRole('radiogroup', {
      name: 'What visual style do you prefer?',
    });
    await expect(themeGroup.getByRole('button')).toHaveCount(3);
    await expect(themeGroup.getByRole('button', {name: /^Dark/})).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    // Medical disclaimer is exposed as a labelled note.
    await expect(page.getByRole('note', {name: 'Safety first'})).toBeVisible();

    // Validation surfaces through role=alert (filter out Next.js's route
    // announcer, which also uses role=alert but stays empty).
    await page.getByRole('button', {name: 'Next', exact: true}).click();
    await expect(
      page.getByRole('alert').filter({hasText: 'Please select an option to continue.'}),
    ).toBeVisible();

    // Selecting an option flips aria-pressed.
    await page.getByRole('button', {name: /^Dark/}).click();
    await expect(page.getByRole('button', {name: /^Dark/})).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Progress advances when moving on.
    await page.getByRole('button', {name: 'Next', exact: true}).click();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');

    await expectAllInteractiveNamed(page);
  });

  test('equipment checkboxes are named and "None" is mutually exclusive', async ({
    page,
  }) => {
    await page.goto('/en/quiz');

    // Navigate to the equipment step (step 4) using buttons.
    await page.getByRole('button', {name: 'Dark'}).click();
    await page.getByRole('button', {name: 'Next', exact: true}).click();
    await page.getByRole('button', {name: 'Beginner'}).click();
    await page.getByRole('button', {name: 'Next', exact: true}).click();
    // Goal step is a multi-select — check one goal to continue.
    await page.getByRole('checkbox', {name: /^Strength/}).check();
    await page.getByRole('button', {name: 'Next', exact: true}).click();

    // Checkboxes are reachable by their (label-derived) accessible names.
    const none = page.getByRole('checkbox', {name: 'None — bodyweight only'});
    const dumbbells = page.getByRole('checkbox', {name: 'Dumbbells'});

    await none.check();
    await expect(none).toBeChecked();

    // "None" is exclusive — picking a real option clears it.
    await dumbbells.check();
    await expect(none).not.toBeChecked();
    await expect(dumbbells).toBeChecked();

    await expectAllInteractiveNamed(page);
  });
});

test.describe('Exercise library — ARIA', () => {
  test.beforeEach(async ({context}) => {
    await context.route('https://test-streams.mux.dev/**', (route) => route.abort());
    await context.route('https://commondatastorage.googleapis.com/**', (route) =>
      route.abort(),
    );
  });

  test('search, results and category filter expose labelled controls', async ({
    page,
  }) => {
    await page.goto('/en/library');

    const search = page.getByRole('textbox', {name: 'Search exercises'});
    await expect(search).toBeVisible();
    await expect(search).toHaveAttribute('placeholder', 'Search exercises');

    // Results count is a live region (role=status).
    const status = page.getByRole('status');
    await expect(status).toContainText('10 exercises');

    // Category filter is a labelled radiogroup; "All" is selected.
    const group = page.getByRole('radiogroup', {name: 'Category'});
    await expect(group.getByRole('radio')).toHaveCount(5);
    for (const label of ['All', 'Strength', 'Cardio', 'Mobility', 'Yoga']) {
      await expect(group.getByRole('radio', {name: label})).toBeVisible();
    }
    await expect(group.getByRole('radio', {name: 'All'})).toHaveAttribute(
      'aria-checked',
      'true',
    );

    // Exercise cards are buttons with "Play <name>" labels.
    await expect(page.getByRole('button', {name: 'Play Air Squats'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Play Plank Hold'})).toBeVisible();

    // Typing filters and updates the live region + shows the clear control.
    await search.type('squat');
    await expect(status).toContainText('1 exercise');
    await expect(page.getByRole('button', {name: 'Clear search'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Play Air Squats'})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Play Plank Hold'})).toHaveCount(0);

    await expectAllInteractiveNamed(page);
  });

  test('player modal is a labelled aria-modal dialog', async ({page}) => {
    await page.goto('/en/library');

    await page.getByRole('button', {name: 'Play Air Squats'}).click();

    const dialog = page.getByRole('dialog', {name: 'Air Squats'});
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog.getByRole('button', {name: 'Close'})).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

test.describe('Profile — ARIA', () => {
  test('preferences expose labelled radio groups with checked state', async ({
    page,
  }) => {
    await page.goto('/en/profile');

    await expect(page.getByRole('heading', {name: 'Profile'})).toBeVisible();
    // Signed out (no env/secrets in tests) — the fallback is still named.
    await expect(page.getByRole('heading', {name: 'Not signed in'})).toBeVisible();

    // Grouped sections are labelled regions.
    await expect(page.getByRole('region', {name: 'Preferences'})).toBeVisible();
    await expect(page.getByRole('region', {name: 'Support'})).toBeVisible();

    // Language segmented control.
    const language = page.getByRole('radiogroup', {name: 'Language'});
    await expect(language.getByRole('radio', {name: 'English'})).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(language.getByRole('radio', {name: 'فارسی'})).toHaveAttribute(
      'aria-checked',
      'false',
    );

    // Appearance segmented control — defaults to System.
    const appearance = page.getByRole('radiogroup', {name: 'Appearance'});
    await expect(appearance.getByRole('radio', {name: 'System'})).toHaveAttribute(
      'aria-checked',
      'true',
    );

    // Selecting Dark flips the group and applies the theme.
    await appearance.getByRole('radio', {name: 'Dark'}).click();
    await expect(appearance.getByRole('radio', {name: 'Dark'})).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(appearance.getByRole('radio', {name: 'System'})).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

    // Support links are named.
    await expect(page.getByRole('link', {name: 'Contact us'})).toBeVisible();
    await expect(page.getByRole('link', {name: 'FAQ'})).toBeVisible();

    await expectAllInteractiveNamed(page);
  });
});
