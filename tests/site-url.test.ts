import {test} from 'node:test';
import assert from 'node:assert/strict';

import {DEFAULT_SITE_URL, resolveSiteUrl} from '../src/lib/siteUrl';

test('resolveSiteUrl falls back when the Docker build arg is empty', () => {
  assert.equal(resolveSiteUrl(''), DEFAULT_SITE_URL);
  assert.equal(resolveSiteUrl('   '), DEFAULT_SITE_URL);
});

test('resolveSiteUrl falls back when the configured URL is malformed', () => {
  assert.equal(resolveSiteUrl('not-a-url'), DEFAULT_SITE_URL);
});

test('resolveSiteUrl preserves a valid production origin', () => {
  assert.equal(
    resolveSiteUrl('https://apexhomefit.ir/path?ignored=true'),
    'https://apexhomefit.ir',
  );
});
