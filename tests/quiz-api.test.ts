import assert from 'node:assert/strict';
import {mock, test} from 'node:test';

import type {GenerateProgramInput} from '../src/lib/ai/requestSecurity';
import {
  QuizApiError,
  generateProgramApi,
  saveQuizResponseApi,
} from '../src/lib/quiz/quizApi';

/**
 * Quiz completion HTTP layer (Batch 14 / task 3) — deterministic error
 * classification (auth / retryable / permanent) and the IN_PROGRESS retry
 * loop for the idempotent generation call. No real network: `fetch` is
 * mocked per test.
 */

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  });
}

function answers(): Record<string, unknown> {
  return {
    theme: 'dark',
    level: 'beginner',
    goal: ['strength'],
    exerciseStyles: ['calisthenics'],
    equipment: ['dumbbells'],
    limitations: [],
    limitationsDetails: '',
    restDays: ['wednesday'],
  };
}

const GENERATION_INPUT: GenerateProgramInput = {
  level: 'beginner',
  goal: ['strength'],
  exerciseStyles: ['calisthenics'],
  equipment: ['dumbbells'],
  limitations: [],
  limitationsDetails: '',
  restDays: ['wednesday'],
};

test('save: 401 is classified as auth (session lost → sign-in gate)', async () => {
  mock.method(globalThis, 'fetch', () =>
    Promise.resolve(jsonResponse({error: 'Authentication required', code: 'UNAUTHENTICATED'}, 401)),
  );
  await assert.rejects(
    saveQuizResponseApi({answers: answers(), clientRequestId: 'quiz-api-0001'}),
    (err: unknown) => err instanceof QuizApiError && err.kind === 'auth' && err.status === 401,
  );
});

test('save: 429 is retryable (rate limit)', async () => {
  mock.method(globalThis, 'fetch', () =>
    Promise.resolve(jsonResponse({error: 'Too many requests', code: 'RATE_LIMITED'}, 429)),
  );
  await assert.rejects(
    saveQuizResponseApi({answers: answers(), clientRequestId: 'quiz-api-0002'}),
    (err: unknown) => err instanceof QuizApiError && err.kind === 'retryable',
  );
});

test('save: 409 CLIENT_REQUEST_ID_CONFLICT is permanent', async () => {
  mock.method(globalThis, 'fetch', () =>
    Promise.resolve(
      jsonResponse({error: 'key in use', code: 'CLIENT_REQUEST_ID_CONFLICT'}, 409),
    ),
  );
  await assert.rejects(
    saveQuizResponseApi({answers: answers(), clientRequestId: 'quiz-api-0003'}),
    (err: unknown) =>
      err instanceof QuizApiError &&
      err.kind === 'permanent' &&
      err.code === 'CLIENT_REQUEST_ID_CONFLICT',
  );
});

test('save: 503 AUTH_BACKEND_NOT_CONFIGURED is permanent (no point retrying)', async () => {
  mock.method(globalThis, 'fetch', () =>
    Promise.resolve(
      jsonResponse({error: 'Auth backend is not configured.', code: 'AUTH_BACKEND_NOT_CONFIGURED'}, 503),
    ),
  );
  await assert.rejects(
    saveQuizResponseApi({answers: answers(), clientRequestId: 'quiz-api-0004'}),
    (err: unknown) =>
      err instanceof QuizApiError &&
      err.kind === 'permanent' &&
      err.code === 'AUTH_BACKEND_NOT_CONFIGURED',
  );
});

test('save: network failures (TypeError) are retryable', async () => {
  mock.method(globalThis, 'fetch', () => Promise.reject(new TypeError('Failed to fetch')));
  await assert.rejects(
    saveQuizResponseApi({answers: answers(), clientRequestId: 'quiz-api-0005'}),
    (err: unknown) => err instanceof QuizApiError && err.kind === 'retryable',
  );
});

test('generate: 409 IDEMPOTENCY_IN_PROGRESS is retried with backoff, then the same request succeeds', async () => {
  let calls = 0;
  mock.method(globalThis, 'fetch', () => {
    calls += 1;
    if (calls === 1) {
      return Promise.resolve(
        jsonResponse({error: 'in progress', code: 'IDEMPOTENCY_IN_PROGRESS'}, 409),
      );
    }
    return Promise.resolve(
      jsonResponse({program: {id: 'prog-1', name: 'AI Program x', ownerId: null}, generated: {}}, 200),
    );
  });

  const result = await generateProgramApi(GENERATION_INPUT, 'quiz-api-0006', {
    inProgressBackoffMs: 1,
  });
  assert.equal(result.program.id, 'prog-1');
  assert.equal(calls, 2);
});

test('generate: repeated IN_PROGRESS beyond the budget surfaces as in_progress (the page maps it to retry)', async () => {
  mock.method(globalThis, 'fetch', () =>
    Promise.resolve(
      jsonResponse({error: 'still running', code: 'IDEMPOTENCY_IN_PROGRESS'}, 409),
    ),
  );
  await assert.rejects(
    generateProgramApi(GENERATION_INPUT, 'quiz-api-0007', {
      inProgressRetries: 2,
      inProgressBackoffMs: 1,
    }),
    (err: unknown) =>
      err instanceof QuizApiError &&
      err.kind === 'in_progress' &&
      err.status === 409,
  );
});

test('generate: AI credit exhaustion preserves the stable code for a clear user message', async () => {
  mock.method(globalThis, 'fetch', () =>
    Promise.resolve(
      jsonResponse({error: 'Program generation unavailable', code: 'AI_CREDITS_UNAVAILABLE'}, 503),
    ),
  );
  await assert.rejects(
    generateProgramApi(GENERATION_INPUT, 'quiz-api-0008'),
    (err: unknown) =>
      err instanceof QuizApiError &&
      err.kind === 'retryable' &&
      err.code === 'AI_CREDITS_UNAVAILABLE',
  );
});

test('generate: 401 is classified as auth', async () => {
  mock.method(globalThis, 'fetch', () =>
    Promise.resolve(jsonResponse({error: 'Authentication required'}, 401)),
  );
  await assert.rejects(
    generateProgramApi(GENERATION_INPUT, 'quiz-api-0008'),
    (err: unknown) => err instanceof QuizApiError && err.kind === 'auth',
  );
});
