import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import test from 'node:test';

// Security invariant: the console service never selects credential or secret
// columns, and the console surface never exposes them.
test('admin console service projects safe columns only (no hashes/tokens)', () => {
  const source = readFileSync('src/lib/admin/console.ts', 'utf8');

  // Never query credential/secret fields anywhere in the console service.
  assert.doesNotMatch(source, /\bpasswordHash\b/);
  assert.doesNotMatch(source, /\btokenHash\b/);
  assert.doesNotMatch(source, /\bcodeHash\b/);

  // Every findMany carries an explicit `select:` (no select-all / `findMany()`).
  const findMany = source.match(/\.findMany\(/g) ?? [];
  assert.ok(findMany.length >= 4, 'console service must contain read queries');
  for (const match of source.matchAll(/\.findMany\((\{[\s\S]*?\})\)/g)) {
    assert.match(match[1], /select:\s*\{/, 'each findMany must project explicit safe fields');
  }
});

test('admin console surface never renders credential material', () => {
  const pages = [
    'src/app/admin/(protected)/dashboard/page.tsx',
    'src/app/admin/(protected)/users/page.tsx',
    'src/app/admin/(protected)/programs/page.tsx',
    'src/app/admin/(protected)/exercises/page.tsx',
    'src/app/admin/(protected)/operations/page.tsx',
    'src/app/admin/(protected)/sessions/page.tsx',
  ];
  for (const page of pages) {
    assert.equal(existsSync(page), true, `${page} must exist`);
    const source = readFileSync(page, 'utf8');
    // No rendering of the credential/secret fields themselves nor of a raw
    // password/token value from a data row.
    assert.doesNotMatch(source, /\bpasswordHash\b/);
    assert.doesNotMatch(source, /\btokenHash\b/);
    assert.doesNotMatch(source, /\bcodeHash\b/);
    assert.doesNotMatch(source, /\{\s*[a-zA-Z]+\.password\b/);
    assert.doesNotMatch(source, /\{\s*[a-zA-Z]+\.token\b/i);
  }
});

test('admin console pages all require admin authorization server-side', () => {
  const pages = [
    'src/app/admin/(protected)/dashboard/page.tsx',
    'src/app/admin/(protected)/users/page.tsx',
    'src/app/admin/(protected)/programs/page.tsx',
    'src/app/admin/(protected)/exercises/page.tsx',
    'src/app/admin/(protected)/operations/page.tsx',
    'src/app/admin/(protected)/sessions/page.tsx',
  ];
  for (const page of pages) {
    const source = readFileSync(page, 'utf8');
    assert.match(source, /requireAdmin\(\)/, `${page} must call requireAdmin()`);
  }
});

test('admin console adds no new public API or registration endpoints', () => {
  // The admin API boundary stays exactly login+logout (no register, no
  // console mutation API). The console is read-only via server components.
  assert.deepEqual(readdirSync('src/app/api/admin').sort(), ['login', 'logout']);
  assert.equal(existsSync('src/app/api/admin/register'), false);
});

test('admin nav targets only existing protected surface routes', () => {
  const nav = readFileSync('src/components/admin/AdminNav.tsx', 'utf8');
  // The nav declares each route as `href: '/admin/<slug>'` in NAV_ITEMS.
  const hrefs = (nav.matchAll(/href:\s*'(\/admin\/[^']+)'/g) ? [...nav.matchAll(/href:\s*'(\/admin\/[^']+)'/g)] : [])
    .map((m) => m[1]);
  for (const href of hrefs) {
    const relative = href.replace('/admin', '') || '/dashboard';
    const path = `src/app/admin/(protected)${relative}/page.tsx`;
    assert.equal(existsSync(path), true, `AdminNav href ${href} must map to existing surface page ${path}`);
  }
  assert.equal(hrefs.length >= 6, true, 'AdminNav must expose all six console surfaces');
});