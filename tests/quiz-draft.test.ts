import assert from 'node:assert/strict';
import test from 'node:test';

import {
  QUIZ_DRAFT_STORAGE_KEY,
  QUIZ_DRAFT_TTL_MS,
  createCompletionId,
  createQuizDraft,
  findForbiddenDraftKeys,
  isQuizDraftExpired,
  loadQuizDraft,
  removeQuizDraft,
  saveQuizDraft,
  type QuizDraftRecord,
  type QuizDraftStorage,
} from '../src/lib/quiz/quizDraft';

/**
 * Quiz draft store (Batch 14 / task 3) — expiry, no-secret guarantee,
 * storage adapter and refresh/OTP-resume persistence.
 */

function answers(overrides: Record<string, unknown> = {}) {
  return {
    theme: 'dark',
    level: 'beginner',
    goal: ['strength', 'fat_loss'],
    equipment: ['dumbbells'],
    limitations: [],
    limitationsDetails: '',
    restDays: ['wednesday', 'sunday'],
    ...overrides,
  };
}

/** In-memory localStorage stand-in. */
function memoryStorage(seed: Record<string, string> = {}): QuizDraftStorage & {
  data: Record<string, string>;
} {
  const data = {...seed};
  return {
    data,
    getItem(key) {
      return key in data ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = value;
    },
    removeItem(key) {
      delete data[key];
    },
  };
}

const VALID_ANSWER_KEYS = Object.keys(answers());

test('draft round-trip: save → load returns the exact same record', () => {
  const storage = memoryStorage();
  const draft = createQuizDraft({answers: answers(), status: 'in_progress'});
  saveQuizDraft(draft, storage);

  const loaded = loadQuizDraft(storage);
  assert.ok(loaded);
  assert.deepEqual(loaded, draft);
  assert.equal(loaded!.status, 'in_progress');
});

test('draft expiry: expired drafts are dropped on load (and removed)', () => {
  const storage = memoryStorage();
  const now = 1_000_000;
  const draft = createQuizDraft({answers: answers(), status: 'in_progress', now});
  saveQuizDraft(draft, storage);

  assert.equal(isQuizDraftExpired(draft, now), false);
  assert.equal(isQuizDraftExpired(draft, now + QUIZ_DRAFT_TTL_MS + 1), true);

  // Loading just after expiry returns null and cleans the storage up.
  assert.equal(loadQuizDraft(storage), null);
  assert.equal(storage.getItem(QUIZ_DRAFT_STORAGE_KEY), null);
});

test('no secret: drafts carrying secret-like keys are refused', () => {
  const storage = memoryStorage();

  assert.deepEqual(findForbiddenDraftKeys(answers()), []);
  assert.deepEqual(
    findForbiddenDraftKeys(answers({otp: '123456'})),
    ['otp'],
  );
  assert.deepEqual(
    findForbiddenDraftKeys(answers({verificationCode: '123456'})),
    ['code'],
  );
  assert.deepEqual(
    findForbiddenDraftKeys(answers({password: 'hunter2', token: 'abc'})),
    ['password', 'token'],
  );

  const bad = createQuizDraft({
    answers: answers({otpCode: '123456'}),
    status: 'completed',
  });
  assert.throws(() => saveQuizDraft(bad, storage), TypeError);
  // Nothing was written — the storage stays clean.
  assert.equal(storage.getItem(QUIZ_DRAFT_STORAGE_KEY), null);
});

test('corrupt / malformed stored data loads as null and is removed', () => {
  const storage = memoryStorage({[QUIZ_DRAFT_STORAGE_KEY]: '{not json'});
  assert.equal(loadQuizDraft(storage), null);
  assert.equal(storage.getItem(QUIZ_DRAFT_STORAGE_KEY), null);
});

test('structurally invalid drafts (wrong version / missing fields) are rejected', () => {
  const cases: unknown[] = [
    {version: 2, completionId: 'abc-123', answers: {}, status: 'in_progress'},
    {version: 1, answers: {}, status: 'in_progress'},
    {version: 1, completionId: 'abc', answers: {}, status: 'in_progress'},
    {version: 1, completionId: 'a'.repeat(16), answers: null, status: 'in_progress'},
    {version: 1, completionId: 'a'.repeat(16), answers: {}, status: 'unknown'},
  ];
  for (const value of cases) {
    const storage = memoryStorage({
      [QUIZ_DRAFT_STORAGE_KEY]: JSON.stringify(value),
    });
    assert.equal(loadQuizDraft(storage), null, `expected null for ${JSON.stringify(value)}`);
    assert.equal(storage.getItem(QUIZ_DRAFT_STORAGE_KEY), null);
  }
});

test('completionId is stable across autosaves and resume (idempotency anchor)', () => {
  const draft = createQuizDraft({answers: answers(), status: 'in_progress'});
  const resumed: QuizDraftRecord = {
    ...draft,
    answers: answers({level: 'advanced'}),
    status: 'completed',
    updatedAt: draft.updatedAt + 1000,
  };
  assert.equal(resumed.completionId, draft.completionId);
  assert.equal(resumed.quizResponseId, null);
  assert.equal(resumed.programId, null);
});

test('completionId values are URL-safe and long enough for Idempotency-Key use', () => {
  for (let i = 0; i < 20; i += 1) {
    const id = createCompletionId();
    assert.match(id, /^[A-Za-z0-9_-]{8,64}$/);
  }
});

test('removeQuizDraft clears the record', () => {
  const storage = memoryStorage();
  saveQuizDraft(
    createQuizDraft({answers: answers(), status: 'completed'}),
    storage,
  );
  assert.ok(storage.getItem(QUIZ_DRAFT_STORAGE_KEY));
  removeQuizDraft(storage);
  assert.equal(storage.getItem(QUIZ_DRAFT_STORAGE_KEY), null);
});

test('storage failures degrade gracefully (private mode / quota)', () => {
  const throwing: QuizDraftStorage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    },
    removeItem() {
      throw new Error('blocked');
    },
  };
  // Load/save/clear never throw.
  assert.equal(loadQuizDraft(throwing), null);
  saveQuizDraft(
    createQuizDraft({answers: answers(), status: 'in_progress'}),
    throwing,
  );
  removeQuizDraft(throwing);
});

test('draft JSON never contains answer keys outside the quiz payload', () => {
  const draft = createQuizDraft({answers: answers(), status: 'completed'});
  const raw = JSON.stringify(draft);
  assert.ok(raw.includes(VALID_ANSWER_KEYS[0]));
  assert.ok(!raw.includes('otp'));
  assert.ok(!raw.includes('secret'));
  assert.ok(!raw.includes('password'));
});
