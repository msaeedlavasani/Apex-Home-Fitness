import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GENERATE_PROGRAM_INPUT_SCHEMA,
  acquireGenerationSlot,
  getClientIp,
  hasHighRiskDisclosure,
  releaseGenerationSlot,
} from '../src/lib/ai/requestSecurity';

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

test('detects high-risk disclosures without exposing their contents', () => {
  assert.equal(hasHighRiskDisclosure('I have chest pain after a few steps.'), true);
  assert.equal(hasHighRiskDisclosure('گاهی بعد از تمرین تنگی نفس شدید دارم'), true);
  assert.equal(hasHighRiskDisclosure('No current limitations.'), false);
});

test('enforces per-user request rate and releases the concurrency slot', () => {
  const userId = `test-user-${Date.now()}-${Math.random()}`;
  const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  const now = Date.now();

  assert.equal(acquireGenerationSlot(userId, ip, now), null);
  assert.equal(acquireGenerationSlot(userId, `${ip}-second`, now), 'concurrent_request');
  // A rejected concurrent request must not release the active request's slot.
  releaseGenerationSlot(userId);
  assert.equal(acquireGenerationSlot(userId, `${ip}-third`, now), null);
  releaseGenerationSlot(userId);
  assert.equal(acquireGenerationSlot(userId, `${ip}-fourth`, now), 'user_rate_limit');
});

test('extracts the first forwarded client IP', () => {
  const request = new Request('https://example.test', {
    headers: {'x-forwarded-for': '203.0.113.4, 10.0.0.1'},
  });
  assert.equal(getClientIp(request), '203.0.113.4');
});
