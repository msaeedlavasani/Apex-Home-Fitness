import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HISTORY_QUERY_TIMEOUT_MS,
  PERSIST_MAX_WAIT_MS,
  PERSIST_TIMEOUT_MS,
  PERSIST_TRANSACTION_TIMEOUT_MS,
  TIMEOUT_CODES,
  TimeoutError,
  timeoutErrorMessage,
  withTimeout,
} from '../src/lib/timeout';

const tick = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

test('withTimeout resolves with the source value when it settles in time', async () => {
  const value = await withTimeout(tick(5).then(() => 'ok'), 200);
  assert.equal(value, 'ok');
});

test('withTimeout rejects with a coded TimeoutError when the source is slow', async () => {
  const slow = tick(150).then(() => 'too late');
  const wrapped = withTimeout(slow, 10, {
    message: 'Program persistence timed out',
    code: TIMEOUT_CODES.PERSISTENCE,
  });

  await assert.rejects(wrapped, (error: unknown) => {
    assert.ok(error instanceof TimeoutError, 'expected TimeoutError');
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'TimeoutError');
    assert.equal(error.code, TIMEOUT_CODES.PERSISTENCE);
    assert.match(error.message, /timed out/);
    return true;
  });
});

test('a late rejection of the source after the timeout is swallowed', async () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => {
    unhandled.push(reason);
  };
  process.on('unhandledRejection', onUnhandled);
  try {
    let fail!: (error: Error) => void;
    const source = new Promise<never>((_, reject) => {
      fail = reject;
    });
    const wrapped = withTimeout(source, 10, { code: TIMEOUT_CODES.AI });

    await assert.rejects(wrapped, TimeoutError);
    fail(new Error('late failure after timeout'));
    await tick(30); // give a would-be unhandled rejection time to surface
    assert.deepEqual(unhandled, [], 'late rejection must be swallowed');
  } finally {
    process.removeListener('unhandledRejection', onUnhandled);
  }
});

test('a fast source never trips the timeout (timer is cleared)', async () => {
  let settled = false;
  const wrapped = withTimeout(
    tick(5).then(() => {
      settled = true;
      return 'done';
    }),
    50,
  );
  assert.equal(await wrapped, 'done');
  await tick(60); // if the timer were not cleared, a TimeoutError would surface here
  assert.equal(settled, true);
});

test('onTimeout cleanup runs exactly once and only when the timeout fires', async () => {
  let slowCleanups = 0;
  let fastCleanups = 0;

  const slow = withTimeout(tick(100), 10, {
    onTimeout: () => {
      slowCleanups += 1;
    },
  });
  await assert.rejects(slow, TimeoutError);
  assert.equal(slowCleanups, 1, 'cleanup runs once on timeout');

  await withTimeout(tick(5), 100, {
    onTimeout: () => {
      fastCleanups += 1;
    },
  });
  await tick(30);
  assert.equal(fastCleanups, 0, 'cleanup must not run when the source wins');
});

test('onTimeout must never mask the timeout even when it throws', async () => {
  const wrapped = withTimeout(tick(100), 10, {
    onTimeout: () => {
      throw new Error('cleanup exploded');
    },
  });
  await assert.rejects(wrapped, TimeoutError);
});

test('withTimeout rejects RangeError for invalid durations', () => {
  const source = Promise.resolve('x');
  assert.throws(() => withTimeout(source, Number.NaN), RangeError);
  assert.throws(() => withTimeout(source, -1), RangeError);
  assert.throws(() => withTimeout(source, Number.POSITIVE_INFINITY), RangeError);
});

test('immediate source failures surface as-is (no timeout masking)', async () => {
  const boom = new Error('db exploded');
  await assert.rejects(withTimeout(Promise.reject(boom), 50), (error: unknown) => {
    assert.equal(error, boom);
    return true;
  });
});

test('timeout error messages are safe and stable for every code', () => {
  assert.equal(
    timeoutErrorMessage(TIMEOUT_CODES.AI),
    'Program generation timed out. Please try again.',
  );
  assert.equal(
    timeoutErrorMessage(TIMEOUT_CODES.PERSISTENCE),
    'Your program could not be processed right now. Please try again.',
  );
  assert.equal(timeoutErrorMessage('UNKNOWN_CODE'), 'The request timed out. Please try again.');

  // Safe: no internal identifiers, table names, or user data may leak.
  for (const message of [
    timeoutErrorMessage(TIMEOUT_CODES.AI),
    timeoutErrorMessage(TIMEOUT_CODES.PERSISTENCE),
    timeoutErrorMessage('UNKNOWN_CODE'),
  ]) {
    assert.ok(!/prisma|transaction|sqlite|query|workoutsession|programservice/i.test(message));
  }
});

test('persistence timeout budget ordering guarantees the wrapper wins first', () => {
  assert.ok(HISTORY_QUERY_TIMEOUT_MS > 0, 'history query budget must be positive');
  assert.ok(
    PERSIST_TIMEOUT_MS > HISTORY_QUERY_TIMEOUT_MS,
    'the save transaction is the heavier operation and gets a larger budget',
  );
  assert.ok(
    PERSIST_TRANSACTION_TIMEOUT_MS > PERSIST_TIMEOUT_MS,
    'native backstop must fire after the wrapper so TimeoutError wins deterministically',
  );
  assert.ok(PERSIST_MAX_WAIT_MS > 0, 'pool-wait cap must be positive');
  assert.ok(
    PERSIST_TRANSACTION_TIMEOUT_MS > PERSIST_MAX_WAIT_MS,
    'transaction timeout must exceed the pool-wait cap',
  );
});
