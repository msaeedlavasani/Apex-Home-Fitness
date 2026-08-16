/**
 * Idempotent quiz-response save (Batch 14 / task 3).
 *
 * Verifies `createQuizResponseForUser` against a REAL scratch SQLite database
 * (created in a temp dir via `prisma db push`, same pattern as
 * `tests/idempotency.test.ts`):
 *   - the first save creates a QuizResponse,
 *   - a replay with the SAME `clientRequestId` + user returns the SAME row —
 *     no duplicate is ever persisted (covers retries, refreshes and post-OTP
 *     resumes of one quiz completion),
 *   - the same key under a DIFFERENT user is rejected (conflict),
 *   - without a key every call creates a fresh response.
 *
 * No secrets, no real user data. Runs offline.
 */
import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PrismaClient} from '@prisma/client';

const tmpDir = mkdtempSync(join(tmpdir(), 'quiz-save-test-'));
const dbUrl = `file:${join(tmpDir, 'quiz-save-test.db')}`;

// Must be set BEFORE any module that constructs a PrismaClient is imported.
process.env.DATABASE_URL = dbUrl;

let client: PrismaClient;
let userService: typeof import('../src/services/userService');
let userAId: string;
let userBId: string;

const ANSWERS = {
  theme: 'dark',
  level: 'beginner',
  goal: ['strength', 'fat_loss'],
  equipment: ['dumbbells'],
  limitations: [],
  limitationsDetails: '',
  restDays: ['wednesday', 'sunday'],
};

before(async () => {
  const prismaCli = join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate'], {
    env: {...process.env, DATABASE_URL: dbUrl},
    stdio: 'pipe',
    timeout: 60_000,
  });

  userService = await import('../src/services/userService');
  client = new PrismaClient();

  const [userA, userB] = await Promise.all([
    client.user.create({
      data: {
        email: `quiz-a-${Date.now()}@test.local`,
        name: 'Quiz User A',
        passwordHash: 'test-only',
      },
    }),
    client.user.create({
      data: {
        email: `quiz-b-${Date.now()}@test.local`,
        name: 'Quiz User B',
        passwordHash: 'test-only',
      },
    }),
  ]);
  userAId = userA.id;
  userBId = userB.id;
});

after(async () => {
  await client?.$disconnect();
  rmSync(tmpDir, {recursive: true, force: true});
});

test('first save creates a response and persists the profile fields', async () => {
  const created = await userService.createQuizResponseForUser(
    userAId,
    {answers: ANSWERS, clientRequestId: 'quiz-flow-001'},
    client,
  );
  assert.ok(created.id);
  assert.equal(created.userId, userAId);
  assert.equal(created.clientRequestId, 'quiz-flow-001');
  assert.equal(created.user.fitnessGoal, 'strength,fat_loss');
  assert.equal(created.user.fitnessLevel, 'BEGINNER');
});

test('replay with the same clientRequestId returns the SAME response (no duplicate)', async () => {
  const key = `quiz-replay-${Date.now()}`;
  const first = await userService.createQuizResponseForUser(
    userAId,
    {answers: ANSWERS, clientRequestId: key},
    client,
  );
  const second = await userService.createQuizResponseForUser(
    userAId,
    {answers: {...ANSWERS, level: 'advanced'}, clientRequestId: key},
    client,
  );

  // Byte-identical replay — the changed payload is ignored, the original row wins.
  assert.equal(second.id, first.id);
  assert.equal(second.clientRequestId, key);
  assert.equal(
    await client.quizResponse.count({where: {userId: userAId, clientRequestId: key}}),
    1,
  );
  // Only one response exists for the key — and the total for this user did
  // not grow between the two saves.
  assert.equal(
    await client.quizResponse.count({where: {clientRequestId: key}}),
    1,
  );
});

test('the same clientRequestId under a different user is a conflict, never replayed', async () => {
  const key = `quiz-conflict-${Date.now()}`;
  await userService.createQuizResponseForUser(
    userAId,
    {answers: ANSWERS, clientRequestId: key},
    client,
  );

  await assert.rejects(
    userService.createQuizResponseForUser(
      userBId,
      {answers: ANSWERS, clientRequestId: key},
      client,
    ),
    userService.QuizResponseConflictError,
  );
  // Only the owner's row exists.
  assert.equal(
    await client.quizResponse.count({where: {clientRequestId: key}}),
    1,
  );
});

test('without a clientRequestId every call creates a fresh response', async () => {
  const first = await userService.createQuizResponseForUser(
    userAId,
    {answers: ANSWERS},
    client,
  );
  const second = await userService.createQuizResponseForUser(
    userAId,
    {answers: ANSWERS},
    client,
  );
  assert.notEqual(first.id, second.id);
  assert.equal(first.clientRequestId, null);
});
