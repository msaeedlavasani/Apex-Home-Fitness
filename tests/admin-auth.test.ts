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

test('admin route boundary has no public registration endpoint', async () => {
  const {readdirSync, existsSync} = await import('node:fs');
  assert.equal(existsSync('src/app/api/admin/register'), false);
  assert.deepEqual(readdirSync('src/app/api/admin').sort(), ['login', 'logout']);
});
