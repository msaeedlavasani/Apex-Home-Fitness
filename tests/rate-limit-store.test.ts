import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRateLimitStore,
  InMemoryRateLimitStore,
  RateLimitStore,
  RateLimitStoreError,
  RedisRestRateLimitStore,
} from '../src/lib/ai/rateLimitStore';
import {
  acquireGenerationSlot,
  releaseGenerationSlot,
  setRateLimitStoreForTesting,
} from '../src/lib/ai/requestSecurity';

// ---------------------------------------------------------------------------
// InMemoryRateLimitStore — window semantics
// ---------------------------------------------------------------------------

test('in-memory: enforces a fixed window and resets after windowMs', async () => {
  const store = new InMemoryRateLimitStore();
  const now = Date.UTC(2026, 7, 15, 10, 0, 0);

  const first = await store.incrementWindow('k', 60_000, 3, now);
  assert.deepEqual(first, {allowed: true, count: 1, resetAt: now + 60_000});

  const second = await store.incrementWindow('k', 60_000, 3, now + 1_000);
  assert.equal(second.allowed, true);
  assert.equal(second.count, 2);

  const third = await store.incrementWindow('k', 60_000, 3, now + 2_000);
  assert.equal(third.allowed, true);
  assert.equal(third.count, 3);

  const fourth = await store.incrementWindow('k', 60_000, 3, now + 3_000);
  assert.equal(fourth.allowed, false);
  assert.equal(fourth.count, 3);

  // Window starts over after 60 s (fixed window from the first increment).
  const reset = await store.incrementWindow('k', 60_000, 3, now + 61_000);
  assert.deepEqual(reset, {allowed: true, count: 1, resetAt: now + 61_000 + 60_000});
});

test('in-memory: concurrent increments never exceed the limit', async () => {
  const store = new InMemoryRateLimitStore();
  const now = Date.now();
  const LIMIT = 5;
  const CONCURRENT = 50;

  const results = await Promise.all(
    Array.from({length: CONCURRENT}, () => store.incrementWindow('burst', 60_000, LIMIT, now)),
  );

  const allowed = results.filter((r) => r.allowed);
  assert.equal(allowed.length, LIMIT);
  assert.deepEqual(
    allowed.map((r) => r.count).sort((a, b) => a - b),
    [1, 2, 3, 4, 5],
  );
  // Rejected attempts report the saturated counter, never a fresh window.
  assert.ok(results.every((r) => r.count >= 1 && r.count <= LIMIT));
});

test('in-memory: distinct keys are counted independently', async () => {
  const store = new InMemoryRateLimitStore();
  const now = Date.now();
  await store.incrementWindow('a', 60_000, 2, now);
  assert.equal((await store.incrementWindow('b', 60_000, 2, now)).allowed, true);
  assert.equal((await store.incrementWindow('a', 60_000, 2, now)).count, 2);
  assert.equal((await store.incrementWindow('a', 60_000, 2, now)).allowed, false);
});

// ---------------------------------------------------------------------------
// InMemoryRateLimitStore — lock / concurrency semantics
// ---------------------------------------------------------------------------

test('in-memory: lock is exclusive, token-protected and TTL-bound', async () => {
  const store = new InMemoryRateLimitStore();
  const now = Date.UTC(2026, 7, 15, 10, 0, 0);
  const TTL = 60_000;

  const token = await store.acquireLock('user-lock', TTL, now);
  assert.equal(typeof token, 'string');

  // A second acquire while held → null.
  assert.equal(await store.acquireLock('user-lock', TTL, now + 1_000), null);

  // Stale release with a wrong token must NOT unlock the current holder.
  await store.releaseLock('user-lock', 'not-the-token');
  assert.equal(await store.acquireLock('user-lock', TTL, now + 2_000), null);

  // Release with the real token unlocks.
  await store.releaseLock('user-lock', token as string);
  const newToken = await store.acquireLock('user-lock', TTL, now + 3_000);
  assert.equal(typeof newToken, 'string');

  // A release of the OLD token must not release the NEW holder's lock.
  await store.releaseLock('user-lock', token as string);
  assert.equal(await store.acquireLock('user-lock', TTL, now + 4_000), null);

  // After TTL expiry the lock can be acquired again without any release —
  // this mirrors a crashed instance being unblocked automatically.
  // (The second holder's lock, set at now+3s, expires at now+63s.)
  const expired = await store.acquireLock('user-lock', TTL, now + TTL + 10_000);
  assert.equal(typeof expired, 'string');
});

// ---------------------------------------------------------------------------
// Env-driven factory — explicit config, no secrets in local dev
// ---------------------------------------------------------------------------

test('factory: defaults to the in-memory fallback without any config', () => {
  assert.ok(createRateLimitStore({}) instanceof InMemoryRateLimitStore);
  assert.ok(createRateLimitStore({RATE_LIMIT_STORE: 'memory'}) instanceof InMemoryRateLimitStore);
  assert.ok(createRateLimitStore({RATE_LIMIT_STORE: '  MEMORY  '}) instanceof InMemoryRateLimitStore);
});

test('factory: redis requires explicit credentials or fails loudly', () => {
  assert.throws(
    () => createRateLimitStore({RATE_LIMIT_STORE: 'redis'}),
    (error: unknown) =>
      error instanceof RateLimitStoreError && error.message.includes('REDIS_REST_URL'),
  );
  assert.throws(
    () => createRateLimitStore({RATE_LIMIT_STORE: 'redis', REDIS_REST_URL: 'https://x.upstash.io'}),
    (error: unknown) =>
      error instanceof RateLimitStoreError && error.message.includes('REDIS_REST_TOKEN'),
  );
  const store = createRateLimitStore({
    RATE_LIMIT_STORE: 'redis',
    REDIS_REST_URL: 'https://x.upstash.io',
    REDIS_REST_TOKEN: 'placeholder-token',
  });
  assert.ok(store instanceof RedisRestRateLimitStore);
});

test('factory: unknown kinds are rejected explicitly', () => {
  assert.throws(
    () => createRateLimitStore({RATE_LIMIT_STORE: 'sqlite'}),
    (error: unknown) => error instanceof RateLimitStoreError && error.message.includes('sqlite'),
  );
});

// ---------------------------------------------------------------------------
// RedisRestRateLimitStore — command encoding & error handling (fake fetch)
// ---------------------------------------------------------------------------

type FetchHandler = (url: string, init: RequestInit) => Promise<unknown>;

/** Minimal fetch stand-in: returns a JSON Response for the pipelined body. */
function fakeFetch(handler: FetchHandler): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    const payload = await handler(url, init ?? {});
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  };
}

function redisStore(handler: FetchHandler): RedisRestRateLimitStore {
  return new RedisRestRateLimitStore({
    url: 'https://unit-test.upstash.io',
    token: 'placeholder-token',
    fetchImpl: fakeFetch(handler),
  });
}

test('redis: incrementWindow sends INCR + EXPIRE NX and maps the count', async () => {
  let seenUrl = '';
  let seenInit: RequestInit | undefined;
  const store = redisStore((url, init) => {
    seenUrl = url;
    seenInit = init;
    return Promise.resolve([2, 1]);
  });
  const now = Date.now();

  const result = await store.incrementWindow('ip:1.2.3.4', 60_000, 5, now);

  assert.equal(seenUrl, 'https://unit-test.upstash.io/pipeline');
  const headers = new Headers(seenInit?.headers);
  assert.equal(headers.get('Authorization'), 'Bearer placeholder-token');
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(String(seenInit?.body)), [
    ['INCR', 'ip:1.2.3.4'],
    ['EXPIRE', 'ip:1.2.3.4', '60', 'NX'],
  ]);
  assert.deepEqual(result, {allowed: true, count: 2, resetAt: now + 60_000});
});

test('redis: incrementWindow rejects when the count exceeds the limit', async () => {
  const store = redisStore(() => Promise.resolve([6, 1]));
  const result = await store.incrementWindow('user:u1', 60_000, 5, Date.now());
  assert.equal(result.allowed, false);
  assert.equal(result.count, 6);
});

test('redis: acquireLock uses SET NX PX and returns a token only on OK', async () => {
  let calls = 0;
  const store = redisStore((_url, init) => {
    const commands = JSON.parse(String(init?.body)) as string[][];
    assert.deepEqual(commands[0].slice(0, 3), ['SET', 'ai-generation:concurrent:u1', commands[0][2]]);
    assert.deepEqual(commands[0].slice(3), ['PX', '60000', 'NX']);
    calls += 1;
    // First SET wins (server-side NX); the second is denied by the server.
    // The pipeline endpoint returns one result per command.
    return Promise.resolve([calls === 1 ? 'OK' : null]);
  });
  const token = await store.acquireLock('ai-generation:concurrent:u1', 60_000);
  assert.equal(typeof token, 'string');
  assert.notEqual(token, '');

  const denied = await store.acquireLock('ai-generation:concurrent:u1', 60_000);
  assert.equal(denied, null);
});

test('redis: releaseLock sends the token-checked EVAL script', async () => {
  const store = redisStore((_url, init) => {
    const commands = JSON.parse(String(init?.body)) as string[][];
    assert.equal(commands[0][0], 'EVAL');
    assert.match(commands[0][1] as string, /redis\.call\('get', KEYS\[1\]\)/);
    assert.deepEqual(commands[0].slice(2), ['1', 'ai-generation:concurrent:u1', 'tok-123']);
    return Promise.resolve([1]);
  });
  await store.releaseLock('ai-generation:concurrent:u1', 'tok-123');
});

test('redis: HTTP failures and Redis errors surface as RateLimitStoreError', async () => {
  const httpError = new RedisRestRateLimitStore({
    url: 'https://unit-test.upstash.io',
    token: 'placeholder-token',
    fetchImpl: (async () => new Response('boom', {status: 503})) as typeof fetch,
  });
  await assert.rejects(
    () => httpError.incrementWindow('k', 60_000, 5),
    (error: unknown) => error instanceof RateLimitStoreError && error.message.includes('HTTP 503'),
  );

  const redisError = redisStore(() => Promise.resolve([{error: 'ERR unknown command'}]));
  await assert.rejects(
    () => redisError.incrementWindow('k', 60_000, 5),
    (error: unknown) => error instanceof RateLimitStoreError && error.message.includes('ERR unknown command'),
  );
});

// ---------------------------------------------------------------------------
// Race conditions through the security facade with a genuinely async store
// ---------------------------------------------------------------------------

/**
 * Wraps a store with real event-loop yielding before every operation so the
 * concurrent callers genuinely interleave instead of running synchronously
 * back-to-back.
 */
class DelayedStore implements RateLimitStore {
  constructor(private readonly inner: RateLimitStore) {}

  private async yield(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  async incrementWindow(key: string, windowMs: number, limit: number, now?: number) {
    await this.yield();
    return this.inner.incrementWindow(key, windowMs, limit, now);
  }

  async acquireLock(key: string, ttlMs: number, now?: number) {
    await this.yield();
    return this.inner.acquireLock(key, ttlMs, now);
  }

  async releaseLock(key: string, token: string) {
    await this.yield();
    return this.inner.releaseLock(key, token);
  }
}

test('race: concurrent acquires yield exactly one winner per user', async () => {
  const store = new DelayedStore(new InMemoryRateLimitStore());
  setRateLimitStoreForTesting(store);
  const userId = `race-user-${Date.now()}`;
  const now = Date.now();

  // 3 parallel attempts stay under the per-user window (3/60 s), so only the
  // concurrency lock can separate them — exactly one may proceed.
  const results = await Promise.all(
    Array.from({length: 3}, (_, i) => acquireGenerationSlot(userId, `198.51.100.${i + 1}`, now)),
  );

  assert.equal(results.filter((r) => r === null).length, 1, 'exactly one generation may start');
  assert.equal(results.filter((r) => r === 'concurrent_request').length, 2);
  assert.equal(results.filter((r) => r === 'user_rate_limit').length, 0);

  // All three attempts consumed the user window (3/60 s), so once the lock is
  // released the next attempt within the same window is rate-limited.
  await releaseGenerationSlot(userId);
  assert.equal(await acquireGenerationSlot(userId, '198.51.100.99', now), 'user_rate_limit');
});

test('race: parallel attempts still consume the user window atomically', async () => {
  const store = new DelayedStore(new InMemoryRateLimitStore());
  setRateLimitStoreForTesting(store);
  const userId = `race-window-user-${Date.now()}`;
  const now = Date.now();

  const results = await Promise.all(
    Array.from({length: 10}, (_, i) => acquireGenerationSlot(userId, `198.51.100.${i + 1}`, now)),
  );

  // The per-user window (3/60 s) saturates first: attempts 4–10 are rejected
  // before they even reach the concurrency lock.
  assert.equal(results.filter((r) => r === null).length, 1);
  assert.equal(results.filter((r) => r === 'concurrent_request').length, 2);
  assert.equal(results.filter((r) => r === 'user_rate_limit').length, 7);
  await releaseGenerationSlot(userId);
  assert.equal(await acquireGenerationSlot(userId, '203.0.113.50', now), 'user_rate_limit');
});

test('race: per-IP window holds under parallel requests from one IP', async () => {
  const store = new DelayedStore(new InMemoryRateLimitStore());
  setRateLimitStoreForTesting(store);
  const ip = '198.51.100.200';
  const now = Date.now();

  const results = await Promise.all(
    Array.from({length: 8}, (_, i) => acquireGenerationSlot(`ip-race-user-${i}`, ip, now)),
  );

  assert.equal(results.filter((r) => r === null).length, 5, 'IP limit is 5 per 60 s');
  assert.equal(results.filter((r) => r === 'ip_rate_limit').length, 3);
});
