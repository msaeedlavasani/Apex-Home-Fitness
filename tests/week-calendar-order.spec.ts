import {expect, test} from '@playwright/test';

/**
 * E2E coverage for the dashboard weekly-calendar column order:
 *  - `en` keeps the existing convention: Monday → Sunday;
 *  - `fa` starts on Saturday (شنبه) and runs شنبه → جمعه.
 *
 * Day buttons are asserted in DOM order, which is the logical column order
 * of the grid (under RTL the same DOM order is laid out right-to-left).
 * Selection state (exactly one `aria-pressed` day, on today's column) and
 * the completion summary (sessions-done progress) are checked for both
 * locales.
 */

// Known reference date: Saturday 2026-08-15 (local time). Used only to
// derive stable weekday names via the same Intl formatting the app uses.
const REFERENCE_SATURDAY = new Date(2026, 7, 15);

/** Long weekday names (Mon/Sat-start) as Intl renders them for `locale`. */
function expectedWeekdayNames(locale: string, firstDay: number): string[] {
  const names: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(REFERENCE_SATURDAY);
    day.setDate(REFERENCE_SATURDAY.getDate() + ((firstDay + i - 6 + 7) % 7));
    names.push(new Intl.DateTimeFormat(locale, {weekday: 'long'}).format(day));
  }
  return names;
}

function calendarRegion(page: import('@playwright/test').Page, fa: boolean) {
  return page.getByRole('region', {
    name: fa ? 'تقویم هفتگی' : 'Weekly calendar',
  });
}

test.describe('Dashboard weekly calendar — column order', () => {
  test('en keeps Monday → Sunday columns (existing convention)', async ({
    page,
  }) => {
    await page.goto('/en/dashboard');

    const days = calendarRegion(page, false).getByRole('button');
    await expect(days).toHaveCount(7);

    const names = expectedWeekdayNames('en', 1); // Monday-start
    for (let i = 0; i < 7; i++) {
      await expect(days.nth(i)).toHaveAttribute(
        'aria-label',
        new RegExp(names[i]),
      );
    }
    await expect(days.first()).toHaveAttribute('aria-label', /Monday/);
    await expect(days.last()).toHaveAttribute('aria-label', /Sunday/);
  });

  test('fa orders columns Saturday (شنبه) → Friday (جمعه)', async ({page}) => {
    await page.goto('/fa/dashboard');

    const days = calendarRegion(page, true).getByRole('button');
    await expect(days).toHaveCount(7);

    const names = expectedWeekdayNames('fa', 6); // Saturday-start
    for (let i = 0; i < 7; i++) {
      await expect(days.nth(i)).toHaveAttribute(
        'aria-label',
        new RegExp(names[i]),
      );
    }
    await expect(days.first()).toHaveAttribute('aria-label', /شنبه/);
    await expect(days.last()).toHaveAttribute('aria-label', /جمعه/);
  });

  test('selection lands on today in both locales', async ({page}) => {
    const today = new Date();

    for (const [path, fa, firstDay, regionName] of [
      ['en', false, 1, 'Weekly calendar'],
      ['fa', true, 6, 'تقویم هفتگی'],
    ] as const) {
      await page.goto(`/${path}/dashboard`);
      const region = page.getByRole('region', {name: regionName});
      const days = region.getByRole('button');
      await expect(days).toHaveCount(7);

      // Exactly one day is selected, and it is today's column.
      await expect(region.locator('button[aria-pressed="true"]')).toHaveCount(1);
      const todayColumn = (today.getDay() - firstDay + 7) % 7;
      await expect(days.nth(todayColumn)).toHaveAttribute('aria-pressed', 'true');
      await expect(
        days.nth(todayColumn),
      ).toHaveAttribute(
        'aria-label',
        new RegExp(
          new Intl.DateTimeFormat(path, {weekday: 'long'}).format(today),
        ),
      );

      // Clicking another column moves the selection (and keeps exactly one).
      const other = (todayColumn + 1) % 7;
      await days.nth(other).click();
      await expect(days.nth(other)).toHaveAttribute('aria-pressed', 'true');
      await expect(region.locator('button[aria-pressed="true"]')).toHaveCount(1);
    }
  });

  test('completion summary stays consistent across locales', async ({page}) => {
    // Mirror of the dashboard's WEEK_PLAN (Monday → Sunday):
    // [workout, workout, rest, workout, workout, rest, workout].
    const planWorkouts = [true, true, false, true, true, false, true];
    const mondayIndex = (new Date().getDay() + 6) % 7;
    const done = planWorkouts.slice(0, mondayIndex).filter(Boolean).length;

    // English: exact progress string.
    await page.goto('/en/dashboard');
    await expect(
      page.getByText(`${done} of 5 sessions done this week`),
    ).toBeVisible();

    // Persian: same count, localized template (interpolated numbers render
    // as ASCII digits via intl-messageformat).
    await page.goto('/fa/dashboard');
    await expect(
      page.getByText('جلسه این هفته انجام شد'),
    ).toBeVisible();
    await expect(
      page.getByText(`${done} از 5 جلسه این هفته انجام شد`),
    ).toBeVisible();
  });
});
