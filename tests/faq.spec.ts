import {expect, test} from '@playwright/test';

/**
 * FAQ route coverage (`/en/faq`, `/fa/faq`).
 *
 *  - Both locales render the correct lang/dir, localized heading, subtitle
 *    and back control pointing at the Profile screen;
 *  - the native disclosure list opens on click (answer becomes visible);
 *  - the Profile → Support → FAQ link lands on the FAQ page in both locales;
 *  - the app shell keeps the Profile nav item highlighted on /faq.
 */

const QUESTIONS = {
  en: [
    'What is Apex Home Fitness?',
    'How much does it cost?',
    'Do I need any equipment?',
    'I have an injury or a medical condition. Can I still train?',
    'Can I use the app offline?',
    'How do I change my language or contact support?',
  ],
  fa: [
    'اپکس فیتنس خانگی چیست؟',
    'هزینه استفاده چقدر است؟',
    'آیا به وسیله ورزشی نیاز دارم؟',
    'مصدومیت یا بیماری دارم؛ می‌توانم تمرین کنم؟',
    'می‌توانم آفلاین استفاده کنم؟',
    'چطور زبان را عوض کنم یا با پشتیبانی تماس بگیرم؟',
  ],
} as const;

test.describe('FAQ page', () => {
  test('/en/faq renders in English (LTR) with a back control to Profile', async ({
    page,
  }) => {
    await page.goto('/en/faq');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(
      page.getByRole('heading', {name: 'Frequently Asked Questions'}),
    ).toBeVisible();
    await expect(
      page.getByText('Quick answers to the most common questions about Apex Home Fitness.'),
    ).toBeVisible();

    // Pushed screen: a back control returns to the Profile route.
    await expect(page.getByRole('link', {name: 'Back'})).toHaveAttribute(
      'href',
      '/en/profile',
    );

    // All six questions render.
    for (const question of QUESTIONS.en) {
      await expect(page.getByText(question)).toBeVisible();
    }

    // Contact row links to the support mailbox.
    await expect(page.getByRole('link', {name: 'support@apexfit.app'})).toBeVisible();
    await expect(page.getByRole('link', {name: 'support@apexfit.app'})).toHaveAttribute(
      'href',
      'mailto:support@apexfit.app',
    );
  });

  test('/fa/faq renders in Persian (RTL) with a back control to Profile', async ({
    page,
  }) => {
    await page.goto('/fa/faq');

    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', {name: 'سوالات متداول'})).toBeVisible();

    await expect(page.getByRole('link', {name: 'بازگشت'})).toHaveAttribute(
      'href',
      '/fa/profile',
    );

    for (const question of QUESTIONS.fa) {
      await expect(page.getByText(question)).toBeVisible();
    }
  });

  test('opening a question reveals its answer (native disclosure)', async ({
    page,
  }) => {
    await page.goto('/en/faq');

    const first = page.getByText('What is Apex Home Fitness?');
    await expect(first).toBeVisible();
    // The answer starts hidden.
    await expect(
      page.getByText(/builds a personalized workout program/),
    ).not.toBeVisible();

    await page.locator('summary', {hasText: 'What is Apex Home Fitness?'}).click();

    await expect(
      page.getByText(/builds a personalized workout program/),
    ).toBeVisible();
    // The question row is now expanded (`open` attribute set).
    await expect(
      page.locator('details', {hasText: 'What is Apex Home Fitness?'}),
    ).toHaveAttribute('open', '');
  });

  test('Profile → Support → FAQ flow lands on the FAQ page in both locales', async ({
    page,
  }) => {
    await page.goto('/en/profile');
    await page.getByRole('link', {name: 'FAQ'}).click();
    await page.waitForURL('**/en/faq');
    await expect(
      page.getByRole('heading', {name: 'Frequently Asked Questions'}),
    ).toBeVisible();

    await page.goto('/fa/profile');
    await page.getByRole('link', {name: 'سوالات متداول'}).click();
    await page.waitForURL('**/fa/faq');
    await expect(page.getByRole('heading', {name: 'سوالات متداول'})).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('the app shell keeps the Profile nav item highlighted on /faq', async ({
    page,
  }) => {
    await page.goto('/en/faq');
    const nav = page
      .getByRole('complementary')
      .getByRole('navigation', {name: 'Main navigation'});
    await expect(nav.getByRole('link', {name: 'Profile'})).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
