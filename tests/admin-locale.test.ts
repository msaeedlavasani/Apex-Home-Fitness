import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADMIN_LOCALE_COOKIE,
  adminContentDir,
  isAdminLocale,
  resolveAdminLocale,
} from '../src/lib/admin/locale';
import {formatAdminDate} from '../src/lib/admin/format';

test('admin locale: cookie name is the shared contract', () => {
  assert.equal(ADMIN_LOCALE_COOKIE, 'admin-locale');
});

test('admin locale: resolve falls back to en exactly like the pre-DS-05 default', () => {
  assert.equal(resolveAdminLocale(undefined), 'en');
  assert.equal(resolveAdminLocale(null), 'en');
  assert.equal(resolveAdminLocale(''), 'en');
  assert.equal(resolveAdminLocale('fr'), 'en');
  assert.equal(resolveAdminLocale('EN'), 'en'); // case-sensitive; invalid
});

test('admin locale: valid locales resolve through', () => {
  assert.equal(resolveAdminLocale('en'), 'en');
  assert.equal(resolveAdminLocale('fa'), 'fa');
  assert.equal(isAdminLocale('fa'), true);
  assert.equal(isAdminLocale('de'), false);
});

test('admin locale: direction matches the typography contract', () => {
  assert.equal(adminContentDir('en'), 'ltr');
  assert.equal(adminContentDir('fa'), 'rtl');
});

test('admin locale: english date keeps the en-GB short format', () => {
  const value = new Date(2026, 8, 1, 12, 0, 0); // 2026-09-01
  // Node's ICU renders the en-GB short month as "Sept" (SSR output); the
  // pre-DS-05 console already rendered this exact value.
  assert.equal(formatAdminDate(value, 'en'), '1 Sept 2026');
});

test('admin locale: persian date uses the fa-IR calendar with Persian digits', () => {
  const value = new Date(2026, 8, 1, 12, 0, 0); // 2026-09-01 → 10 شهریور ۱۴۰۵
  const formatted = formatAdminDate(value, 'fa');
  assert.ok(formatted.includes('شهریور'), `expected Persian month, got ${formatted}`);
  assert.match(formatted, /[۰-۹]/);
});
