import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {expect, test} from '@playwright/test';

// Admin Console V1 real-browser acceptance.
//
// The spec self-provisions a throwaway development admin into the running
// DATABASE_URL (the same DB the webServer dev server uses), so it is safe in
// CI (fresh ./ci.db), nightly full-E2E, and local dev. The admin is a fixed
// throwaway development-only credential defined here in the spec, never a
// production secret. Signed-in production acceptance uses the operator-held
// out-of-band credential; the unauthenticated boundary for every protected
// surface is verified both here and against production server responses.

const ADMIN_EMAIL = 'console.test@example.com';
const ADMIN_PASSWORD = 'tmp-console-test-password-2026';

const repoRoot = path.join(__dirname, '..');

// Provision the throwaway admin before any test runs. Runs a tiny tsx process
// so tsconfig path aliases inside the imported module resolve correctly, and
// inherits DATABASE_URL from the environment (dev server / CI share it).
function provisionTestAdmin(): void {
  const script = [
    "import('./src/lib/admin/provision.ts')",
    ".then((m) => m.provisionAdmin(",
    `  ${JSON.stringify(ADMIN_EMAIL)}, ${JSON.stringify(ADMIN_PASSWORD)},`,
    '))',
    ".then(() => process.exit(0))",
    ".catch((e) => { console.error(e); process.exit(1); });",
  ].join('\n');
  execFileSync('node', ['--import', 'tsx', '-e', script], {
    cwd: repoRoot,
    env: {...process.env},
    stdio: 'pipe',
  });
}

test.beforeAll(() => {
  provisionTestAdmin();
});

test('protected console surfaces require authentication', async ({request}) => {
  // The API request context follows redirects; an unauthenticated visitor must
  // end up on the admin login page (never on the protected surface itself).
  for (const p of ['/admin/dashboard', '/admin/users', '/admin/programs', '/admin/exercises', '/admin/operations', '/admin/sessions']) {
    const response = await request.get(p);
    expect(response.url().includes('/admin/login'), `${p} must redirect to login`).toBe(true);
  }
});

test('admin can sign in and browse every console surface', async ({page}) => {
  await page.goto('/admin/login');
  await page.fill('input[name=email]', ADMIN_EMAIL);
  await page.fill('input[name=password]', ADMIN_PASSWORD);
  await page.click('button[type=submit]');

  await page.waitForURL('**/admin/dashboard');
  await expect(page.getByRole('heading', {name: /Administration console/i})).toBeVisible();

  await page.goto('/admin/users');
  await expect(page.getByRole('heading', {name: /^Users$/})).toBeVisible();

  await page.goto('/admin/programs');
  await expect(page.getByRole('heading', {name: /Workout plans/})).toBeVisible();

  await page.goto('/admin/exercises');
  await expect(page.getByRole('heading', {name: /^Exercises$/})).toBeVisible();

  await page.goto('/admin/operations');
  await expect(page.getByRole('heading', {name: /^Operations$/})).toBeVisible();

  await page.goto('/admin/sessions');
  await expect(page.getByRole('heading', {name: 'Admin accounts'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Admin sessions'})).toBeVisible();
});

test('console must not render credential material', async ({page}) => {
  await page.goto('/admin/login');
  await page.fill('input[name=email]', ADMIN_EMAIL);
  await page.fill('input[name=password]', ADMIN_PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL('**/admin/dashboard');

  const body = (await page.textContent('body')) ?? '';
  expect(body).not.toContain(ADMIN_PASSWORD);
  expect(body).not.toMatch(/scrypt\$/);
});