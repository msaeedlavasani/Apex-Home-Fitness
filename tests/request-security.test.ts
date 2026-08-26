import assert from 'node:assert/strict';
import test from 'node:test';
import {InMemoryRateLimitStore} from '../src/lib/ai/rateLimitStore';
import {
  GENERATE_PROGRAM_INPUT_SCHEMA,
  acquireGenerationSlot,
  getClientIp,
  getRateLimitStore,
  hasHighRiskDisclosure,
  releaseGenerationSlot,
  resetRateLimitStoreForTesting,
  setRateLimitStoreForTesting,
} from '../src/lib/ai/requestSecurity';

/** Isolates every rate-limit test from shared/leftover counter state. */
function useFreshStore(): void {
  setRateLimitStoreForTesting(new InMemoryRateLimitStore());
}

/** A fixed UTC morning so `now + n * 61s` never crosses a UTC day boundary. */
const BASE_NOW = Date.UTC(2026, 7, 15, 10, 0, 0); // 2026-08-15T10:00:00Z

test('accepts a complete and normalized generation profile', () => {
  const result = GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({
    level: 'beginner',
    goal: 'strength',
    equipment: ['none'],
    limitations: [],
  });

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.limitationsDetails, '');
});

test('rejects unsafe or malformed generation profiles', () => {
  assert.equal(
    GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({
      level: 'expert',
      goal: 'strength',
      equipment: ['none', 'dumbbells'],
      limitations: [],
    }).success,
    false,
  );

  assert.equal(
    GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({
      level: 'beginner',
      goal: 'strength',
      equipment: ['none'],
      limitations: [],
      unexpected: 'value',
    }).success,
    false,
  );
});

test('accepts only an integer weekly training frequency from 2 through 6', () => {
  const base = {level: 'beginner', goal: 'strength', equipment: ['none'], limitations: []};
  assert.equal(GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({...base, trainingDaysPerWeek: 3}).success, true);
  assert.equal(GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({...base, trainingDaysPerWeek: 1}).success, false);
  assert.equal(GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({...base, trainingDaysPerWeek: 7}).success, false);
  assert.equal(GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({...base, trainingDaysPerWeek: 3.5}).success, false);
});

test('accepts a legacy single goal string and normalizes it to an array', () => {
  const result = GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({
    level: 'beginner',
    goal: 'strength',
    equipment: ['none'],
    limitations: [],
  });
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(result.data.goal, ['strength']);
});

test('accepts multiple goals and normalizes them to a canonical array', () => {
  const result = GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({
    level: 'beginner',
    goal: ['strength', 'fat_loss', 'flexibility'],
    equipment: ['none'],
    limitations: [],
  });
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(result.data.goal, ['strength', 'fat_loss', 'flexibility']);
});

test('rejects empty, duplicate or unknown goals', () => {
  const base = {
    level: 'beginner',
    equipment: ['none'],
    limitations: [],
  };

  // Empty array — at least one goal required.
  assert.equal(GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({...base, goal: []}).success, false);
  // Duplicate goals.
  assert.equal(
    GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({...base, goal: ['strength', 'strength']}).success,
    false,
  );
  // Unknown goal id.
  assert.equal(GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({...base, goal: 'marathon'}).success, false);
  assert.equal(
    GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({...base, goal: ['strength', 'marathon']}).success,
    false,
  );
  // Too many goals.
  assert.equal(
    GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({
      ...base,
      goal: ['strength', 'fat_loss', 'flexibility', 'functional_fitness', 'strength'],
    }).success,
    false,
  );
});

test('single-string and array forms of the same goals hash identically', () => {
  // The schema normalizes both forms to the same array, so the idempotency
  // request hash (computed over the normalized body) must match.
  const single = GENERATE_PROGRAM_INPUT_SCHEMA.parse({
    level: 'beginner',
    goal: 'strength',
    equipment: ['none'],
    limitations: [],
  });
  const multi = GENERATE_PROGRAM_INPUT_SCHEMA.parse({
    level: 'beginner',
    goal: ['strength'],
    equipment: ['none'],
    limitations: [],
  });
  assert.deepEqual(single, multi);
});

test('detects high-risk disclosures without exposing their contents', () => {
  assert.equal(hasHighRiskDisclosure('I have chest pain after a few steps.'), true);
  assert.equal(hasHighRiskDisclosure('گاهی بعد از تمرین تنگی نفس شدید دارم'), true);
  assert.equal(hasHighRiskDisclosure('No current limitations.'), false);
});

test('enforces per-user request rate and releases the concurrency slot', async () => {
  useFreshStore();
  const userId = `test-user-${Date.now()}-${Math.random()}`;
  const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  const now = Date.now();

  assert.equal(await acquireGenerationSlot(userId, ip, now), null);
  assert.equal(await acquireGenerationSlot(userId, `${ip}-second`, now), 'concurrent_request');
  // A rejected concurrent request must not release the active request's slot.
  await releaseGenerationSlot(userId);
  assert.equal(await acquireGenerationSlot(userId, `${ip}-third`, now), null);
  await releaseGenerationSlot(userId);
  assert.equal(await acquireGenerationSlot(userId, `${ip}-fourth`, now), 'user_rate_limit');
});

test('resets the per-user window after 60 seconds', async () => {
  useFreshStore();
  const userId = `window-user-${Date.now()}`;
  const ip = '203.0.113.10';

  assert.equal(await acquireGenerationSlot(userId, ip, BASE_NOW), null);
  await releaseGenerationSlot(userId);
  assert.equal(await acquireGenerationSlot(userId, ip, BASE_NOW + 1_000), null);
  await releaseGenerationSlot(userId);
  assert.equal(await acquireGenerationSlot(userId, ip, BASE_NOW + 2_000), null);
  await releaseGenerationSlot(userId);
  assert.equal(await acquireGenerationSlot(userId, ip, BASE_NOW + 3_000), 'user_rate_limit');

  // 61 s after the window started the fixed window resets.
  assert.equal(await acquireGenerationSlot(userId, ip, BASE_NOW + 61_000), null);
  await releaseGenerationSlot(userId);
});

test('enforces the per-IP window across different users', async () => {
  useFreshStore();
  const ip = '198.51.100.77';
  const now = Date.now();

  for (let i = 0; i < 5; i += 1) {
    assert.equal(await acquireGenerationSlot(`ip-test-user-${i}`, ip, now), null);
    await releaseGenerationSlot(`ip-test-user-${i}`);
  }
  assert.equal(await acquireGenerationSlot('ip-test-user-5', ip, now), 'ip_rate_limit');
});

test('enforces the daily per-user limit across window boundaries', async () => {
  useFreshStore();
  const userId = `daily-user-${Date.now()}`;
  const now = Date.now();

  // 10 accepted generations spread > 60 s apart (each within the same UTC day),
  // so only the daily counter can eventually reject.
  for (let i = 0; i < 10; i += 1) {
    assert.equal(await acquireGenerationSlot(userId, `198.51.100.${i + 1}`, BASE_NOW + i * 61_000), null);
    await releaseGenerationSlot(userId);
  }
  assert.equal(await acquireGenerationSlot(userId, '198.51.100.99', BASE_NOW + 10 * 61_000), 'daily_limit');
});

test('extracts the first forwarded client IP', () => {
  const request = new Request('https://example.test', {
    headers: {'x-forwarded-for': '203.0.113.4, 10.0.0.1'},
  });
  assert.equal(getClientIp(request), '203.0.113.4');
});

test('rebuilds the default store from env after test isolation', () => {
  setRateLimitStoreForTesting(new InMemoryRateLimitStore());
  resetRateLimitStoreForTesting();
  // No RATE_LIMIT_STORE in the test env → the default in-memory fallback.
  assert.ok(getRateLimitStore() instanceof InMemoryRateLimitStore);
});
