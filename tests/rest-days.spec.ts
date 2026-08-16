import {expect, test, type Page} from '@playwright/test';

/**
 * E2E coverage for the quiz's rest-days step (step 6):
 *
 * 1. min bound — finishing without a rest day shows the bilingual error;
 * 2. max bound — the selection caps at 3 and unchecked options disable;
 * 3. option display order — en keeps Monday → Sunday (canonical), fa renders
 *    the Persian week Saturday (شنبه) → Friday (جمعه) — display only, the
 *    stored weekday ids stay canonical ISO ids;
 * 4. Persian — the step is fully localized (labels + RTL page).
 */

/** Walks steps 1–5 (theme, level, goals, equipment, limitations-skip). */
async function navigateToRestDaysStep(page: Page, {locale = 'en'}: {locale?: 'en' | 'fa'} = {}) {
  const isFa = locale === 'fa';
  const next = page.getByRole('button', {name: isFa ? 'بعدی' : 'Next'});

  await page.goto(`/${locale}/quiz`);
  // Step 1 — visual style.
  await page.getByRole('button', {name: isFa ? /^روشن/ : /^Light/}).click();
  await next.click();
  // Step 2 — level.
  await page.getByRole('button', {name: isFa ? /^مبتدی/ : /^Beginner/}).click();
  await next.click();
  // Step 3 — goals.
  await page.getByRole('checkbox', {name: isFa ? /^قدرت/ : /^Strength/}).check();
  await next.click();
  // Step 4 — equipment.
  await page.getByRole('checkbox', {name: isFa ? 'دمبل' : 'Dumbbells'}).check();
  await next.click();
  // Step 5 — limitations (optional, skip).
  await next.click();
}

test.describe('Rest days step', () => {
  test('requires at least one rest day before finishing', async ({page}) => {
    await navigateToRestDaysStep(page);

    await expect(page.getByText('Which weekdays are your rest days?')).toBeVisible();
    await page.getByRole('button', {name: 'See my plan'}).click();

    // The error is announced and the quiz stays on the step.
    await expect(
      page
        .getByRole('alert')
        .filter({hasText: 'Please pick 1–3 rest days to continue.'}),
    ).toBeVisible();
    await expect(page.getByText('Which weekdays are your rest days?')).toBeVisible();
  });

  test('caps the selection at 3 rest days and frees slots on uncheck', async ({
    page,
  }) => {
    await navigateToRestDaysStep(page);

    const monday = page.getByRole('checkbox', {name: 'Monday'});
    const tuesday = page.getByRole('checkbox', {name: 'Tuesday'});
    const wednesday = page.getByRole('checkbox', {name: 'Wednesday'});
    const thursday = page.getByRole('checkbox', {name: 'Thursday'});

    await monday.check();
    await tuesday.check();
    await wednesday.check();
    // The counter is the live region; the cap hint is a second status —
    // scope the counter by its class to stay unambiguous.
    await expect(page.locator('.quiz-restdays__counter')).toContainText(
      '3 of 3 rest days selected',
    );
    await expect(
      page.getByText('You can select at most 3 rest days. Uncheck one to pick another.'),
    ).toBeVisible();

    // The 4th (unchecked) option locks once the cap is reached…
    await expect(thursday).toBeDisabled();
    // …but selected options stay enabled so the user can uncheck.
    await expect(monday).toBeEnabled();

    // Unchecking one restores the free slot.
    await tuesday.uncheck();
    await expect(thursday).toBeEnabled();
    await expect(page.locator('.quiz-restdays__counter')).toContainText(
      '2 of 3 rest days selected',
    );
  });

  test('en keeps the canonical Monday → Sunday option order', async ({page}) => {
    await navigateToRestDaysStep(page);

    await expect(page.locator('.quiz-step__options--checkboxes input')).toHaveCount(7);
    await expect(page.locator('.quiz-step__options--checkboxes .quiz-check__label')).toHaveText([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
  });

  test('fa orders options Saturday (شنبه) → Friday (جمعه) — display only', async ({
    page,
  }) => {
    await navigateToRestDaysStep(page, {locale: 'fa'});

    await expect(page.locator('.quiz-step__options--checkboxes input')).toHaveCount(7);
    // Persian week: شنبه first, جمعه last; the ids behind these options stay
    // canonical ISO ids (asserted in the unit + server contract tests).
    await expect(page.locator('.quiz-step__options--checkboxes .quiz-check__label')).toHaveText([
      'شنبه',
      'یکشنبه',
      'دوشنبه',
      'سه‌شنبه',
      'چهارشنبه',
      'پنجشنبه',
      'جمعه',
    ]);

    // Selection still works across the reordered options and the counter
    // reflects it.
    await page.getByRole('checkbox', {name: 'جمعه', exact: true}).check();
    await page.getByRole('checkbox', {name: 'شنبه', exact: true}).check();
    await expect(page.locator('.quiz-restdays__counter')).toContainText(
      '2 از 3 روز استراحت انتخاب شده',
    );
  });

  test('rest days step is fully localized in Persian (RTL)', async ({page}) => {
    await navigateToRestDaysStep(page, {locale: 'fa'});

    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByText('کدام روزهای هفته روز استراحت تو هستند؟')).toBeVisible();

    // Persian day names share the شنبه suffix — use exact name matching.
    await page.getByRole('checkbox', {name: 'چهارشنبه', exact: true}).check();
    await page.getByRole('checkbox', {name: 'شنبه', exact: true}).check();
    await expect(page.locator('.quiz-restdays__counter')).toContainText(
      '2 از 3 روز استراحت انتخاب شده',
    );

    await page.getByRole('button', {name: 'مشاهده برنامه من'}).click();
    await page.waitForURL('**/fa/dashboard');
  });
});
