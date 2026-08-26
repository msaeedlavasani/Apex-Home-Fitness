import {expect, test, type Page} from '@playwright/test';

/**
 * Profile features E2E — the Batch 15 authenticated profile surface:
 *   1. the verified phone number shown in the profile's user-info section,
 *   2. avatar upload (file → compressed JPEG data URL → stored → shown),
 *   3. avatar removal (object/data-URL cleared, initials placeholder returns).
 *
 * Auth model: like `tests/auth-flow.spec.ts`, the SIGNED-IN journey requires a
 * real session backend and is gated on `E2E_REQUIRES_AUTH=1` (real Supabase +
 * SMS.ir / the §12 recording mock — see docs/OTP_LAUNCH_READINESS.md). The
 * dev/CI mock (`AUTH_OTP_MODE=mock`) deliberately NEVER mints sessions, so the
 * authenticated assertions cannot run against it; without the flag the journey
 * skips transparently and ordinary CI runs stay green.
 *
 * Always-runnable: a signed-out check pinning that the phone row and the
 * avatar controls are never exposed without a session.
 *
 * Run (requires real Supabase env + SMS delivery path):
 *
 *     E2E_REQUIRES_AUTH=1 npx playwright test --config=infra/config/playwright.config.ts tests/profile-features.spec.ts
 */

const fullAuthActive = process.env.E2E_REQUIRES_AUTH === '1';
const fullAuthSkip =
  'E2E_REQUIRES_AUTH=1 (real Supabase + SMS.ir) is required for the profile features spec';

const PHONE = '09123456789';
/** `formatPhoneNumber('+989123456789')` → the display form rendered in the UI. */
const PHONE_DISPLAY = '+98 912 345 6789';

/** 1×1 transparent PNG — decoded by the client into the 256px JPEG data URL. */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/** Full OTP journey: request → 6-digit code → verify → dashboard. */
async function signIn(page: Page) {
  await page.goto('/en/auth/login');
  await page.getByLabel('Mobile number').fill(PHONE);
  await page.getByRole('button', {name: 'Send code'}).click();
  await page.waitForURL('**/en/auth/verify');

  const inputs = page.getByRole('textbox');
  for (let i = 0; i < 6; i += 1) {
    await inputs.nth(i).fill('123456'[i]!);
  }
  await page.getByRole('button', {name: 'Verify & sign in'}).click();
  await page.waitForURL('**/en/dashboard');
}

test.describe('Profile — features are auth-gated (signed-out)', () => {
  test('the phone row and avatar controls never render without a session', async ({
    page,
  }) => {
    // With protection armed this redirects to login; without it the profile
    // renders its signed-out card. Either way the authenticated surface must
    // not exist.
    await page.goto('/en/profile');

    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByText('Phone number', {exact: true})).toHaveCount(0);
  });
});

test.describe('Profile — verified phone number (full-auth)', () => {
  test.skip(!fullAuthActive, fullAuthSkip);

  test('shows the phone used to sign in, formatted, in the user-info section', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto('/en/profile');

    const row = page.getByText('Phone number', {exact: true});
    await expect(row).toBeVisible();
    await expect(row.locator('..')).toContainText(PHONE_DISPLAY);
  });
});

test.describe('Profile — avatar upload & removal (full-auth)', () => {
  test.skip(!fullAuthActive, fullAuthSkip);

  test('upload shows the avatar, persists across reload, and removal restores the placeholder', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto('/en/profile');

    // Upload a tiny PNG through the hidden file input.
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({name: 'avatar.png', mimeType: 'image/png', buffer: PNG_1PX});

    // The avatar image replaces the initials placeholder. Its src is either a
    // legacy data URL (no Supabase storage configured) or a signed URL.
    const avatar = page.locator('img[alt="Profile photo"]');
    await expect(avatar).toBeVisible();
    const src = await avatar.getAttribute('src');
    expect(src, 'avatar <img> must carry a renderable src').toBeTruthy();
    expect(
      src!.startsWith('data:image/jpeg') || src!.startsWith('https://'),
      `unexpected avatar src prefix: ${src!.slice(0, 40)}`,
    ).toBe(true);

    // The stored avatar survives a full server render.
    await page.reload();
    await expect(page.locator('img[alt="Profile photo"]')).toBeVisible();

    // Removal clears it and restores the initials placeholder.
    await page.getByRole('button', {name: 'Remove photo'}).click();
    await expect(page.locator('img[alt="Profile photo"]')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('img[alt="Profile photo"]')).toHaveCount(0);
  });
});
