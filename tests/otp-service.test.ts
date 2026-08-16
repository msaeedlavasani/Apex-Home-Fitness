/**
 * OTP service lifecycle tests against a REAL scratch SQLite database
 * (created in a temp dir via `prisma db push`), following the same pattern as
 * `tests/idempotency.test.ts`.
 *
 * The delivery seam (`sender`) is a recorder — it captures the plaintext code
 * so the tests can PROVE the database never stores it and that a replayed
 * request does not re-send SMS. The verification logic itself (scrypt hash,
 * expiry, single-use, attempt budget, cooldown, replay protection) is the
 * real implementation.
 *
 * No secrets, no real SMS, no Supabase. Runs offline.
 */
import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PrismaClient} from '@prisma/client';

import type {OtpSmsSender} from '../src/services/otpService';

const tmpDir = mkdtempSync(join(tmpdir(), 'otp-service-test-'));
const dbUrl = `file:${join(tmpDir, 'otp-service-test.db')}`;

// Must be set BEFORE any module that constructs a PrismaClient is imported.
process.env.DATABASE_URL = dbUrl;

let client: PrismaClient;
let otpService: typeof import('../src/services/otpService');

/** Captures (phone, code) pairs; the captured code is the "SMS the user read". */
function makeRecorder(): {sender: OtpSmsSender; sent: Array<{phone: string; code: string}>} {
  const sent: Array<{phone: string; code: string}> = [];
  return {
    sent,
    sender: {
      async send(phone, code) {
        sent.push({phone, code});
      },
    },
  };
}

before(async () => {
  const prismaCli = join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate'], {
    env: {...process.env, DATABASE_URL: dbUrl},
    stdio: 'pipe',
    timeout: 60_000,
  });

  otpService = await import('../src/services/otpService');
  client = new PrismaClient();
});

after(async () => {
  await client?.$disconnect();
  rmSync(tmpDir, {recursive: true, force: true});
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = Date.UTC(2026, 7, 16, 10, 0, 0); // 2026-08-16T10:00:00Z

/** Fast policy: 10 min TTL, 60 s cooldown, 3 attempts. */
const fastPolicy = {
  codeLength: 6,
  codeTtlMs: 600_000,
  resendCooldownMs: 60_000,
  maxAttempts: 3,
  requestPhoneWindowMs: 900_000,
  requestPhoneLimit: 5,
  requestIpWindowMs: 900_000,
  requestIpLimit: 10,
  verifyPhoneWindowMs: 900_000,
  verifyPhoneLimit: 5,
  verifyIpWindowMs: 900_000,
  verifyIpLimit: 10,
};

let phoneCounter = 0;
function freshPhone(): string {
  phoneCounter += 1;
  // +98 + 9 + 7 digits → 10 national digits, e.g. +989120000001
  return `+98912${String(1000000 + phoneCounter)}`;
}

async function storedRow(requestId: string) {
  return client.phoneOtp.findUnique({where: {requestId}});
}

/** Narrowing helper: asserts a row exists and returns it (TS-friendly). */
function must<T>(value: T | null, message: string): T {
  if (value === null) assert.fail(message);
  return value;
}

// ---------------------------------------------------------------------------
// Lifecycle: request → verify → single-use
// ---------------------------------------------------------------------------

test('full lifecycle: hashed storage, correct verify, replay rejected', async () => {
  const {sender, sent} = makeRecorder();
  const phone = freshPhone();

  const requested = await otpService.requestOtpCode(
    {phone},
    {policy: fastPolicy, sender, now: NOW},
  );
  assert.equal(requested.replayed, false);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].phone, phone);

  // The database stores ONLY a scrypt hash — never the plaintext code.
  const row = must(await storedRow(requested.requestId), 'challenge row must exist');
  assert.ok(!row.codeHash.includes(sent[0].code), 'plaintext code must not be stored');
  assert.match(row.codeHash, /^scrypt\$/);
  assert.equal(row.attempts, 0);
  assert.equal(row.consumedAt, null);

  // Verify with the delivered code succeeds and consumes the challenge.
  const verified = await otpService.verifyOtpCode(
    {phone, requestId: requested.requestId, code: sent[0].code},
    {policy: fastPolicy, now: NOW + 5_000, onVerified: async () => undefined},
  );
  assert.equal(verified.phone, phone);

  const consumed = must(await storedRow(requested.requestId), 'challenge row must exist');
  assert.ok(consumed.consumedAt !== null, 'challenge must be consumed after verify');

  // Replay: the same verify request can never succeed twice.
  await assert.rejects(
    otpService.verifyOtpCode(
      {phone, requestId: requested.requestId, code: sent[0].code},
      {policy: fastPolicy, now: NOW + 10_000},
    ),
    (error: unknown) => error instanceof Error && error.name === 'CodeAlreadyUsedError',
  );
});

test('wrong codes count attempts and exhaust the budget, locking the challenge', async () => {
  const {sender, sent} = makeRecorder();
  const phone = freshPhone();
  const {requestId} = await otpService.requestOtpCode(
    {phone},
    {policy: fastPolicy, sender, now: NOW},
  );
  const correctCode = sent[0].code;
  const wrongCode = correctCode === '000000' ? '000001' : '000000';

  // Attempts 1-3: wrong code → InvalidCodeError, attempts increment.
  for (let i = 1; i <= 3; i += 1) {
    await assert.rejects(
      otpService.verifyOtpCode(
        {phone, requestId, code: wrongCode},
        {policy: fastPolicy, now: NOW + i * 1_000},
      ),
      (error: unknown) => error instanceof Error && error.name === 'InvalidCodeError',
    );
    const row = must(await storedRow(requestId), 'challenge row must exist');
    assert.equal(row.attempts, i, `attempt ${i} must be counted before the hash check`);
  }

  // Attempt 4 exceeds the budget → the challenge locks (ATTEMPTS_EXHAUSTED).
  await assert.rejects(
    otpService.verifyOtpCode(
      {phone, requestId, code: wrongCode},
      {policy: fastPolicy, now: NOW + 4_000},
    ),
    (error: unknown) => error instanceof Error && error.name === 'AttemptsExhaustedError',
  );

  // Even the CORRECT code cannot unlock it; replay sees a consumed challenge.
  await assert.rejects(
    otpService.verifyOtpCode(
      {phone, requestId, code: correctCode},
      {policy: fastPolicy, now: NOW + 5_000},
    ),
    (error: unknown) => error instanceof Error && error.name === 'CodeAlreadyUsedError',
  );
});

test('expired challenges reject verification with CODE_EXPIRED', async () => {
  const {sender, sent} = makeRecorder();
  const phone = freshPhone();
  const {requestId} = await otpService.requestOtpCode(
    {phone},
    {policy: fastPolicy, sender, now: NOW},
  );
  await assert.rejects(
    otpService.verifyOtpCode(
      {phone, requestId, code: sent[0].code},
      {policy: fastPolicy, now: NOW + 600_001}, // past the 10 min TTL
    ),
    (error: unknown) => error instanceof Error && error.name === 'CodeExpiredError',
  );
});

test('verifying with a mismatched phone or malformed inputs fails safely', async () => {
  const {sender, sent} = makeRecorder();
  const phone = freshPhone();
  const {requestId} = await otpService.requestOtpCode(
    {phone},
    {policy: fastPolicy, sender, now: NOW},
  );

  await assert.rejects(
    otpService.verifyOtpCode(
      {phone: freshPhone(), requestId, code: sent[0].code},
      {policy: fastPolicy, now: NOW + 1_000},
    ),
    (error: unknown) => error instanceof Error && error.name === 'InvalidCodeError',
  );
  await assert.rejects(
    otpService.verifyOtpCode(
      {phone, requestId: 'nope', code: sent[0].code},
      {policy: fastPolicy, now: NOW + 1_000},
    ),
    (error: unknown) => error instanceof Error && error.name === 'InvalidRequestError',
  );
  await assert.rejects(
    otpService.requestOtpCode(
      {phone: 'not-a-phone'},
      {policy: fastPolicy, sender, now: NOW},
    ),
    (error: unknown) => error instanceof Error && error.name === 'InvalidPhoneError',
  );
});

// ---------------------------------------------------------------------------
// Replay protection + cooldown
// ---------------------------------------------------------------------------

test('replaying the same requestId returns the original challenge without a new SMS', async () => {
  const {sender, sent} = makeRecorder();
  const phone = freshPhone();
  const requestId = 'replay-key-0001';

  const first = await otpService.requestOtpCode(
    {phone, requestId},
    {policy: fastPolicy, sender, now: NOW},
  );
  assert.equal(first.replayed, false);
  assert.equal(sent.length, 1);

  // Network retry with the SAME key → replayed, no second send.
  const replay = await otpService.requestOtpCode(
    {phone, requestId},
    {policy: fastPolicy, sender, now: NOW + 2_000},
  );
  assert.equal(replay.replayed, true);
  assert.equal(sent.length, 1, 'no second SMS for a replayed requestId');
  assert.equal(replay.requestId, requestId);
  // Remaining lifetime at replay time: 600_000 ms TTL − 2_000 ms elapsed.
  assert.equal(replay.expiresInSeconds, 598);

  // The original code still verifies.
  const verified = await otpService.verifyOtpCode(
    {phone, requestId, code: sent[0].code},
    {policy: fastPolicy, now: NOW + 3_000, onVerified: async () => undefined},
  );
  assert.equal(verified.phone, phone);
});

test('a consumed requestId cannot be replayed after expiry/consumption', async () => {
  const {sender, sent} = makeRecorder();
  const phone = freshPhone();
  const requestId = 'replay-key-0002';

  await otpService.requestOtpCode({phone, requestId}, {policy: fastPolicy, sender, now: NOW});
  await otpService.verifyOtpCode(
    {phone, requestId, code: sent[0].code},
    {policy: fastPolicy, now: NOW + 1_000, onVerified: async () => undefined},
  );

  // Same key again → NOT a replay of the old (consumed) challenge; a fresh
  // challenge is issued and a new SMS is sent.
  const again = await otpService.requestOtpCode(
    {phone, requestId},
    {policy: fastPolicy, sender, now: NOW + 2_000},
  );
  assert.equal(again.replayed, false);
  assert.equal(sent.length, 2);
  assert.equal(sent[1].code.length, 6);
});

test('reusing a requestId for a different phone is rejected', async () => {
  const {sender} = makeRecorder();
  const requestId = 'replay-key-0003';
  await otpService.requestOtpCode(
    {phone: freshPhone(), requestId},
    {policy: fastPolicy, sender, now: NOW},
  );
  await assert.rejects(
    otpService.requestOtpCode(
      {phone: freshPhone(), requestId},
      {policy: fastPolicy, sender, now: NOW + 1_000},
    ),
    (error: unknown) => error instanceof Error && error.name === 'RequestIdConflictError',
  );
});

test('cooldown blocks a NEW challenge for the same phone, then replaces the old code', async () => {
  const {sender, sent} = makeRecorder();
  const phone = freshPhone();

  const first = await otpService.requestOtpCode(
    {phone},
    {policy: fastPolicy, sender, now: NOW},
  );
  assert.equal(sent.length, 1);

  // A different requestId while the first challenge is still young → cooldown.
  await assert.rejects(
    otpService.requestOtpCode(
      {phone},
      {policy: fastPolicy, sender, now: NOW + 10_000},
    ),
    (error: unknown) => error instanceof Error && error.name === 'CooldownActiveError',
  );
  assert.equal(sent.length, 1, 'cooldown must not send another SMS');

  // After the cooldown, a new request rotates the challenge: the new code
  // works, the old code is dead (its rows were invalidated).
  const second = await otpService.requestOtpCode(
    {phone},
    {policy: fastPolicy, sender, now: NOW + 60_001},
  );
  assert.equal(second.replayed, false);
  assert.equal(sent.length, 2);
  assert.notEqual(sent[1].code, sent[0].code);

  await assert.rejects(
    otpService.verifyOtpCode(
      {phone, requestId: first.requestId, code: sent[0].code},
      {policy: fastPolicy, now: NOW + 61_000},
    ),
    (error: unknown) => error instanceof Error && error.name === 'InvalidCodeError',
  );
  const verified = await otpService.verifyOtpCode(
    {phone, requestId: second.requestId, code: sent[1].code},
    {policy: fastPolicy, now: NOW + 61_001, onVerified: async () => undefined},
  );
  assert.equal(verified.phone, phone);
});

// ---------------------------------------------------------------------------
// Send failure and retention
// ---------------------------------------------------------------------------

test('a failed SMS send removes the challenge row and propagates the error', async () => {
  const phone = freshPhone();
  const failingSender: OtpSmsSender = {
    async send() {
      throw new Error('provider unreachable');
    },
  };
  await assert.rejects(
    otpService.requestOtpCode({phone}, {policy: fastPolicy, sender: failingSender, now: NOW}),
    /provider unreachable/,
  );
  const rows = await client.phoneOtp.count({where: {phone}});
  assert.equal(rows, 0, 'no orphaned challenge after a failed send');
});

test('cleanupExpiredOtps prunes expired and old consumed rows', async () => {
  const {sender} = makeRecorder();
  const phone = freshPhone();
  const {requestId} = await otpService.requestOtpCode(
    {phone},
    {policy: fastPolicy, sender, now: NOW},
  );
  // Force-expire the row, then sweep.
  await client.phoneOtp.update({
    where: {id: must(await storedRow(requestId), 'challenge row must exist').id},
    data: {expiresAt: new Date(NOW - 1)},
  });
  const swept = await otpService.cleanupExpiredOtps({now: NOW + 1_000});
  assert.equal(swept.deleted, 1);
  assert.equal(await storedRow(requestId), null);
});

// ---------------------------------------------------------------------------
// onVerified hook (session establishment seam)
// ---------------------------------------------------------------------------

test('onVerified runs after consumption; a throwing hook keeps the code consumed', async () => {
  const {sender, sent} = makeRecorder();
  const phone = freshPhone();
  const {requestId} = await otpService.requestOtpCode(
    {phone},
    {policy: fastPolicy, sender, now: NOW},
  );

  let hookCalls = 0;
  await assert.rejects(
    otpService.verifyOtpCode(
      {phone, requestId, code: sent[0].code},
      {
        policy: fastPolicy,
        now: NOW + 1_000,
        onVerified: async (ctx) => {
          hookCalls += 1;
          assert.equal(ctx.phone, phone);
          throw new Error('session provider not configured');
        },
      },
    ),
    /session provider not configured/,
  );

  assert.equal(hookCalls, 1, 'hook runs exactly once after consumption');
  const row = must(await storedRow(requestId), 'challenge row must exist');
  assert.ok(row.consumedAt !== null, 'challenge stays consumed when the hook fails');
  // Replay of the same code now fails — no second session attempt.
  await assert.rejects(
    otpService.verifyOtpCode(
      {phone, requestId, code: sent[0].code},
      {policy: fastPolicy, now: NOW + 2_000},
    ),
    (error: unknown) => error instanceof Error && error.name === 'CodeAlreadyUsedError',
  );
});
