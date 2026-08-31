import assert from 'node:assert/strict';
import test from 'node:test';

import {hashAdminPassword, verifyAdminPassword} from '../src/lib/admin/password';
import {hashAdminSessionToken, normalizeAdminEmail, isSameOriginRequest} from '../src/lib/admin/auth';

test('admin passwords use a versioned salted scrypt format', async () => {
  const hash = await hashAdminPassword('correct horse battery staple');
  assert.match(hash, /^scrypt\$16384\$8\$1\$[^$]+\$[^$]+$/);
  assert.equal(await verifyAdminPassword('correct horse battery staple', hash), true);
  assert.equal(await verifyAdminPassword('wrong password', hash), false);
  const secondHash = await hashAdminPassword('correct horse battery staple');
  assert.notEqual(secondHash, hash, 'each password hash must use a fresh salt');
});

test('malformed and unsupported admin password hashes fail closed', async () => {
  assert.equal(await verifyAdminPassword('anything', 'plaintext-password'), false);
  assert.equal(await verifyAdminPassword('anything', 'bcrypt$10$not-the-v1-format'), false);
});

test('admin email normalization is bounded and case-insensitive', () => {
  assert.equal(normalizeAdminEmail('  ADMIN@Example.COM '), 'admin@example.com');
  assert.equal(normalizeAdminEmail('not-an-email'), null);
  assert.equal(normalizeAdminEmail(''), null);
  assert.equal(normalizeAdminEmail(42), null);
});

test('admin session tokens are stored by one-way digest only', () => {
  const token = 'opaque-token-value';
  const digest = hashAdminSessionToken(token);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.notEqual(digest, token);
  assert.equal(hashAdminSessionToken(token), digest);
});

test('admin mutation requests reject cross-origin browser headers', () => {
  assert.equal(
    isSameOriginRequest(new Request('https://example.test/api/admin/login', {headers: {origin: 'https://example.test'}})),
    true,
  );
  assert.equal(
    isSameOriginRequest(new Request('https://example.test/api/admin/login', {headers: {origin: 'https://evil.test'}})),
    false,
  );
  assert.equal(
    isSameOriginRequest(new Request('https://example.test/api/admin/login', {headers: {referer: 'https://evil.test/admin/login'}})),
    false,
  );
});

test('admin mutation requests accept the public site origin behind the proxy', () => {
  // The standalone container rebuilds request.url from HOSTNAME/PORT
  // (e.g. https://0.0.0.0:3000); the public site origin must still pass.
  const proxied = new Request('https://0.0.0.0:3000/api/admin/login');
  assert.equal(
    isSameOriginRequest(proxied, 'https://apexhomefit.ir'),
    true,
    'non-browser requests without origin/referer remain allowed',
  );
  assert.equal(
    isSameOriginRequest(
      new Request('https://0.0.0.0:3000/api/admin/login', {headers: {origin: 'https://apexhomefit.ir'}}),
      'https://apexhomefit.ir',
    ),
    true,
    'public site origin must be accepted when request.url is container-hosted',
  );
  assert.equal(
    isSameOriginRequest(
      new Request('https://0.0.0.0:3000/api/admin/login', {headers: {origin: 'https://www.apexhomefit.ir'}}),
      'https://apexhomefit.ir',
    ),
    true,
    'www variant of the public site origin must be accepted',
  );
  assert.equal(
    isSameOriginRequest(
      new Request('https://0.0.0.0:3000/api/admin/login', {headers: {origin: 'https://evil.test'}}),
      'https://apexhomefit.ir',
    ),
    false,
    'foreign origins must still be rejected',
  );
  assert.equal(
    isSameOriginRequest(
      new Request('https://0.0.0.0:3000/api/admin/login', {headers: {referer: 'https://apexhomefit.ir/admin/login'}}),
      'https://apexhomefit.ir',
    ),
    true,
    'public site referer must be accepted',
  );
});

test('admin mutation requests do not trust the default fallback site domain', () => {
  assert.equal(
    isSameOriginRequest(
      new Request('https://0.0.0.0:3000/api/admin/login', {headers: {origin: 'https://apexfit.app'}}),
      undefined,
    ),
    false,
    'without a configured site URL the container-hosted request origin is the only allowed origin',
  );
  assert.equal(
    isSameOriginRequest(
      new Request('https://0.0.0.0:3000/api/admin/login', {headers: {origin: 'https://malformed'}}),
      'https://apexhomefit.ir',
    ),
    false,
    'malformed browser origin is rejected',
  );
});

test('admin route boundary has no public registration endpoint', async () => {
  const {readdirSync, existsSync} = await import('node:fs');
  assert.equal(existsSync('src/app/api/admin/register'), false);
  assert.deepEqual(readdirSync('src/app/api/admin').sort(), ['login', 'logout']);
});
