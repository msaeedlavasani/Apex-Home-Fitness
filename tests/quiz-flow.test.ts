import assert from 'node:assert/strict';
import test from 'node:test';

import {
  QUIZ_ANSWERS_SCHEMA,
  buildGenerationInput,
  normalizeQuizAnswers,
  quizAuthHandoffUrl,
  quizGenerationIdempotencyKey,
} from '../src/lib/quiz/quizFlow';
import {GENERATE_PROGRAM_INPUT_SCHEMA} from '../src/lib/ai/requestSecurity';

/**
 * Quiz flow helpers (Batch 14 / task 3) — answer normalization, the
 * generate-program input mapping (theme excluded, restDays always present),
 * the stable generation idempotency key and the OTP hand-off URL.
 */

const VALID_ANSWERS = {
  theme: 'dark',
  level: 'beginner',
  goal: ['strength', 'fat_loss'],
  equipment: ['dumbbells', 'bench'],
  limitations: ['none'],
  limitationsDetails: '',
  restDays: ['wednesday', 'sunday'],
};

test('normalizeQuizAnswers accepts a canonical quiz payload', () => {
  const parsed = normalizeQuizAnswers(VALID_ANSWERS);
  assert.equal(parsed.level, 'beginner');
  assert.deepEqual(parsed.goal, ['strength', 'fat_loss']);
  assert.equal(parsed.limitationsDetails, '');
});

test('legacy single-string goal is normalized to an array', () => {
  const parsed = normalizeQuizAnswers({...VALID_ANSWERS, goal: 'strength'});
  assert.deepEqual(parsed.goal, ['strength']);
});

test('invalid payloads are rejected (missing level / empty goal / bad equipment)', () => {
  const missingLevel = {...VALID_ANSWERS};
  delete (missingLevel as Record<string, unknown>).level;
  assert.equal(QUIZ_ANSWERS_SCHEMA.safeParse(missingLevel).success, false);

  assert.equal(
    QUIZ_ANSWERS_SCHEMA.safeParse({...VALID_ANSWERS, goal: []}).success,
    false,
  );
  assert.equal(
    QUIZ_ANSWERS_SCHEMA.safeParse({...VALID_ANSWERS, equipment: []}).success,
    false,
  );
  assert.equal(
    QUIZ_ANSWERS_SCHEMA.safeParse({...VALID_ANSWERS, equipment: ['none', 'dumbbells']}).success,
    false,
  );
  assert.equal(
    QUIZ_ANSWERS_SCHEMA.safeParse({...VALID_ANSWERS, restDays: []}).success,
    false,
  );
});

test('unknown keys are rejected (strict schema — payload drift fails loudly)', () => {
  assert.equal(
    QUIZ_ANSWERS_SCHEMA.safeParse({...VALID_ANSWERS, surprise: true}).success,
    false,
  );
});

test('buildGenerationInput maps answers onto the strict generate-program input', () => {
  const input = buildGenerationInput(normalizeQuizAnswers(VALID_ANSWERS));

  // The visual theme is UI-only and must never reach generation.
  assert.equal('theme' in input, false);
  assert.deepEqual(Object.keys(input).sort(), [
    'equipment',
    'goal',
    'level',
    'limitations',
    'limitationsDetails',
    'restDays',
  ]);

  // The mapped payload satisfies the server schema verbatim.
  assert.equal(GENERATE_PROGRAM_INPUT_SCHEMA.safeParse(input).success, true);
  assert.equal(input.level, 'beginner');
  assert.deepEqual(input.goal, ['strength', 'fat_loss']);
  assert.deepEqual(input.restDays, ['wednesday', 'sunday']);
});

test('generation idempotency key is stable per completion and matches the header contract', () => {
  const key = quizGenerationIdempotencyKey('9c0f1f2e-3d4a-4b5c-8d6e-7f8a9b0c1d2e');
  assert.equal(key, 'quiz-9c0f1f2e-3d4a-4b5c-8d6e-7f8a9b0c1d2e');
  // Same completion → same key (this is what makes retries replayable).
  assert.equal(
    quizGenerationIdempotencyKey('9c0f1f2e-3d4a-4b5c-8d6e-7f8a9b0c1d2e'),
    key,
  );
  // The key satisfies the server's Idempotency-Key format contract.
  assert.match(key, /^[A-Za-z0-9_-]{8,64}$/);
  assert.equal(key.length, 5 + 36);
});

test('generation idempotency key rejects invalid completion ids', () => {
  // Even with the `quiz-` prefix these stay outside the 8-64 URL-safe format.
  assert.throws(() => quizGenerationIdempotencyKey('ab'), /Invalid quiz completion id/);
  assert.throws(() => quizGenerationIdempotencyKey('has space'), /Invalid quiz completion id/);
  assert.throws(() => quizGenerationIdempotencyKey(''), /Invalid quiz completion id/);
});

test('hand-off URL points at the canonical auth login with the quiz as next target', () => {
  assert.equal(
    quizAuthHandoffUrl('en'),
    '/en/auth/login?next=%2Fen%2Fquiz',
  );
  assert.equal(
    quizAuthHandoffUrl('fa'),
    '/fa/auth/login?next=%2Ffa%2Fquiz',
  );
});
