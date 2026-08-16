import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OTP_RESEND_COOLDOWN_MS,
  OTP_SEND_WINDOW_LIMIT,
  SMSIR_BASE_URL,
  SMSIR_ERROR_CODES,
  SMSIR_VERIFY_PATH,
  SmsIrOtpProvider,
  SmsIrProviderError,
  createSmsIrOtpProvider,
  maskMobile,
  normalizeIranianMobile,
  type SmsIrOtpProviderConfig,
} from '../src/lib/auth/smsIrProvider';
import {InMemoryRateLimitStore} from '../src/lib/ai/rateLimitStore';
import type {Logger} from '../src/lib/logger';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface CapturedRequest {
  url: string;
  init: RequestInit;
}

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  msg: string;
  ctx?: Record<string, unknown>;
}

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json', ...headers},
  });
}

/** Fake fetch that always succeeds with the SMS.ir success shape. */
function okFetch(captured?: CapturedRequest[]): typeof fetch {
  return async (input, init) => {
    captured?.push({url: typeof input === 'string' ? input : input.toString(), init: init ?? {}});
    return jsonResponse(200, {status: 1, message: 'موفق', data: {messageId: 89545112, cost: 1.0}});
  };
}

/** Fake fetch that always returns a fixed status/body. */
function statusFetch(status: number, body: unknown, headers?: Record<string, string>): typeof fetch {
  return async () => jsonResponse(status, body, headers);
}

function silentLogger(): Logger {
  const noop = (): void => {};
  const logger: Logger = {
    scope: 'test',
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    child: () => logger,
  };
  return logger;
}

function collectingLogger(): {logger: Logger; entries: LogEntry[]} {
  const entries: LogEntry[] = [];
  const make =
    (level: LogEntry['level']) =>
    (msg: string, ctx?: Record<string, unknown>): void => {
      entries.push({level, msg, ctx});
    };
  const logger: Logger = {
    scope: 'test',
    debug: make('debug'),
    info: make('info'),
    warn: make('warn'),
    error: make('error'),
    child: () => logger,
  };
  return {logger, entries};
}

function makeProvider(overrides: Partial<SmsIrOtpProviderConfig> = {}): SmsIrOtpProvider {
  return new SmsIrOtpProvider({
    apiKey: 'test-api-key',
    templateId: 123456,
    fetchImpl: okFetch(),
    store: new InMemoryRateLimitStore(),
    logger: silentLogger(),
    now: () => Date.now(),
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Iranian mobile normalization / validation
// ---------------------------------------------------------------------------

test('normalizeIranianMobile accepts every common Iranian form', () => {
  const cases: Array<[string, string]> = [
    ['09123456789', '989123456789'],
    ['989123456789', '989123456789'],
    ['+989123456789', '989123456789'],
    ['00989123456789', '989123456789'],
    ['9123456789', '989123456789'],
    ['0912 345 6789', '989123456789'],
    ['0912-345-6789', '989123456789'],
    ['0912.345.6789', '989123456789'],
    [' 09123456789 ', '989123456789'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(normalizeIranianMobile(input), expected, `input: "${input}"`);
  }
});

test('normalizeIranianMobile rejects non-Iranian or malformed numbers', () => {
  const bad = [
    '',
    '   ',
    '12345',
    '0912345678', // 9 digits after the trunk zero
    '79123456789', // not a 9xx number
    '091234567890', // too long
    '+98912345678', // too short after +98
    '9891234567890', // too long after 98
    'abc09123456789',
    '0912-3456-7890x',
    null as unknown as string,
    9123456789 as unknown as string,
  ];
  for (const input of bad) {
    assert.equal(normalizeIranianMobile(input), null, `input: ${JSON.stringify(input)}`);
  }
});

test('maskMobile hides the middle digits', () => {
  assert.equal(maskMobile('989123456789'), '9891******89');
  assert.equal(maskMobile('09123456789'), '0912******89');
  assert.equal(maskMobile('short'), '***');
  assert.equal(maskMobile(''), '***');
});

// ---------------------------------------------------------------------------
// Env factory — fails loudly without credentials (no silent no-op)
// ---------------------------------------------------------------------------

test('factory fails loudly when SMS_IR_API_KEY is missing', () => {
  assert.throws(
    () => createSmsIrOtpProvider({SMS_IR_TEMPLATE_ID: '123456'}),
    (error: unknown) =>
      error instanceof SmsIrProviderError &&
      error.code === SMSIR_ERROR_CODES.CONFIG_MISSING &&
      /SMS_IR_API_KEY/.test(error.message),
  );
});

test('factory fails loudly when SMS_IR_TEMPLATE_ID is missing or invalid', () => {
  assert.throws(
    () => createSmsIrOtpProvider({SMS_IR_API_KEY: 'k'}),
    (error: unknown) =>
      error instanceof SmsIrProviderError && error.code === SMSIR_ERROR_CODES.CONFIG_MISSING,
  );
  assert.throws(
    () => createSmsIrOtpProvider({SMS_IR_API_KEY: 'k', SMS_IR_TEMPLATE_ID: 'not-a-number'}),
    (error: unknown) =>
      error instanceof SmsIrProviderError && /positive integer/.test(error.message),
  );
  assert.throws(
    () => createSmsIrOtpProvider({SMS_IR_API_KEY: 'k', SMS_IR_TEMPLATE_ID: '0'}),
    (error: unknown) => error instanceof SmsIrProviderError,
  );
});

test('factory builds a provider from valid env', () => {
  const provider = createSmsIrOtpProvider({SMS_IR_API_KEY: 'k', SMS_IR_TEMPLATE_ID: '123456'});
  assert.ok(provider instanceof SmsIrOtpProvider);
});

test('constructor rejects missing/invalid config loudly', () => {
  assert.throws(
    () => new SmsIrOtpProvider({apiKey: '', templateId: 1}),
    (error: unknown) => error instanceof SmsIrProviderError && error.code === SMSIR_ERROR_CODES.CONFIG_MISSING,
  );
  assert.throws(
    () => new SmsIrOtpProvider({apiKey: 'k', templateId: 0}),
    (error: unknown) => error instanceof SmsIrProviderError,
  );
  assert.throws(
    () => new SmsIrOtpProvider({apiKey: 'k', templateId: 1.5}),
    (error: unknown) => error instanceof SmsIrProviderError,
  );
});

// ---------------------------------------------------------------------------
// sendOtp — request encoding & success mapping
// ---------------------------------------------------------------------------

test('sendOtp posts the normalized mobile, template id and parameter to /v1/send/verify', async () => {
  const captured: CapturedRequest[] = [];
  const provider = makeProvider({fetchImpl: okFetch(captured)});

  const result = await provider.sendOtp({mobile: '0912 345 6789', code: '12345'});

  assert.deepEqual(result, {messageId: 89545112, cost: 1.0});
  assert.equal(captured.length, 1);
  const {url, init} = captured[0];
  assert.equal(url, `${SMSIR_BASE_URL}${SMSIR_VERIFY_PATH}`);
  assert.equal(init.method, 'POST');
  const headers = new Headers(init.headers);
  assert.equal(headers.get('X-API-KEY'), 'test-api-key');
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.equal(headers.get('Accept'), 'text/plain');
  assert.deepEqual(JSON.parse(String(init.body)), {
    mobile: '989123456789',
    templateId: 123456,
    parameters: [{name: 'Code', value: '12345'}],
  });
});

test('sendOtp honors a custom base URL and parameter name', async () => {
  const captured: CapturedRequest[] = [];
  const provider = makeProvider({
    baseUrl: 'https://sandbox.sms.ir/',
    otpParameterName: 'VerificationCode',
    fetchImpl: okFetch(captured),
  });

  await provider.sendOtp({mobile: '+989123456789', code: '987654'});

  assert.equal(captured[0].url, 'https://sandbox.sms.ir/v1/send/verify');
  const body = JSON.parse(String(captured[0].init.body)) as {parameters: Array<{name: string; value: string}>};
  assert.deepEqual(body.parameters, [{name: 'VerificationCode', value: '987654'}]);
});

test('sendOtp rejects invalid mobiles before any network call', async () => {
  const captured: CapturedRequest[] = [];
  const provider = makeProvider({fetchImpl: okFetch(captured)});

  for (const bad of ['', '12345', '0912345678', '79123456789', '+98912345678']) {
    await assert.rejects(
      () => provider.sendOtp({mobile: bad, code: '12345'}),
      (error: unknown) =>
        error instanceof SmsIrProviderError && error.code === SMSIR_ERROR_CODES.INVALID_MOBILE,
    );
  }
  assert.equal(captured.length, 0, 'no network request may be made for invalid mobiles');
});

test('sendOtp rejects empty or oversized codes before any network call', async () => {
  const captured: CapturedRequest[] = [];
  const provider = makeProvider({fetchImpl: okFetch(captured)});

  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: ''}),
    (error: unknown) =>
      error instanceof SmsIrProviderError && error.code === SMSIR_ERROR_CODES.INVALID_CODE,
  );
  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: 'x'.repeat(26)}),
    (error: unknown) =>
      error instanceof SmsIrProviderError && error.code === SMSIR_ERROR_CODES.INVALID_CODE,
  );
  assert.equal(captured.length, 0);
});

// ---------------------------------------------------------------------------
// Provider error mapping (HTTP status → typed code)
// ---------------------------------------------------------------------------

test('sendOtp maps HTTP 401 to provider_auth (not retryable)', async () => {
  const provider = makeProvider({fetchImpl: statusFetch(401, {status: 10, message: 'نامعتبر'})});
  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: '12345'}),
    (error: unknown) => {
      assert.ok(error instanceof SmsIrProviderError);
      assert.equal(error.code, SMSIR_ERROR_CODES.PROVIDER_AUTH);
      assert.equal(error.retryable, false);
      assert.equal(error.httpStatus, 401);
      assert.equal(error.providerStatus, 10);
      return true;
    },
  );
});

test('sendOtp maps HTTP 429 to rate_limited (retryable) and honors Retry-After', async () => {
  const provider = makeProvider({
    fetchImpl: statusFetch(429, {status: 20, message: 'تعداد درخواست بیشتر از حد مجاز است'}, {'Retry-After': '12'}),
  });
  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: '12345'}),
    (error: unknown) => {
      assert.ok(error instanceof SmsIrProviderError);
      assert.equal(error.code, SMSIR_ERROR_CODES.RATE_LIMITED);
      assert.equal(error.retryable, true);
      assert.equal(error.retryAfterMs, 12_000);
      return true;
    },
  );
});

test('sendOtp maps HTTP 5xx to retryable provider_unavailable', async () => {
  for (const status of [500, 502, 503]) {
    const provider = makeProvider({fetchImpl: statusFetch(status, {status: 0, message: 'مشکل در سامانه'})});
    await assert.rejects(
      () => provider.sendOtp({mobile: '09123456789', code: '12345'}),
      (error: unknown) => {
        assert.ok(error instanceof SmsIrProviderError);
        assert.equal(error.code, SMSIR_ERROR_CODES.PROVIDER_UNAVAILABLE);
        assert.equal(error.retryable, true);
        assert.equal(error.httpStatus, status);
        return true;
      },
    );
  }
});

test('sendOtp maps 400 body status 104 (invalid mobile) to provider_rejected', async () => {
  const provider = makeProvider({fetchImpl: statusFetch(400, {status: 104, message: 'موبایل نادرست'})});
  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: '12345'}),
    (error: unknown) => {
      assert.ok(error instanceof SmsIrProviderError);
      assert.equal(error.code, SMSIR_ERROR_CODES.PROVIDER_REJECTED);
      assert.equal(error.retryable, false);
      assert.equal(error.providerMessage, 'موبایل نادرست');
      return true;
    },
  );
});

test('sendOtp maps 400 body status 20 to rate_limited', async () => {
  const provider = makeProvider({fetchImpl: statusFetch(400, {status: 20})});
  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: '12345'}),
    (error: unknown) =>
      error instanceof SmsIrProviderError &&
      error.code === SMSIR_ERROR_CODES.RATE_LIMITED &&
      error.retryable === true,
  );
});

test('sendOtp maps 400 body status 10–14 to provider_auth', async () => {
  for (const status of [10, 11, 12, 13, 14]) {
    const provider = makeProvider({fetchImpl: statusFetch(400, {status})});
    await assert.rejects(
      () => provider.sendOtp({mobile: '09123456789', code: '12345'}),
      (error: unknown) =>
        error instanceof SmsIrProviderError &&
        error.code === SMSIR_ERROR_CODES.PROVIDER_AUTH &&
        error.retryable === false,
      `body status ${status} must map to provider_auth`,
    );
  }
});

test('sendOtp treats 200 with body status 0 (system problem) as retryable unavailability', async () => {
  const provider = makeProvider({fetchImpl: statusFetch(200, {status: 0, message: 'مشکل در سامانه'})});
  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: '12345'}),
    (error: unknown) => {
      assert.ok(error instanceof SmsIrProviderError);
      assert.equal(error.code, SMSIR_ERROR_CODES.PROVIDER_UNAVAILABLE);
      assert.equal(error.retryable, true);
      return true;
    },
  );
});

test('sendOtp treats 200 with body status 113 (template not found) as provider_rejected', async () => {
  const provider = makeProvider({fetchImpl: statusFetch(200, {status: 113, message: 'قالب یافت نشد'})});
  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: '12345'}),
    (error: unknown) =>
      error instanceof SmsIrProviderError &&
      error.code === SMSIR_ERROR_CODES.PROVIDER_REJECTED &&
      error.providerStatus === 113,
  );
});

test('sendOtp treats 200 with a success body but no messageId as unreadable', async () => {
  const provider = makeProvider({fetchImpl: statusFetch(200, {status: 1, message: 'موفق', data: {}})});  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: '12345'}),
    (error: unknown) =>
      error instanceof SmsIrProviderError && error.code === SMSIR_ERROR_CODES.PROVIDER_UNAVAILABLE,
  );
});

// ---------------------------------------------------------------------------
// Transport failures — timeout & network
// ---------------------------------------------------------------------------

test('sendOtp maps an aborted request (timeout) to a retryable timeout error', async () => {
  const fetchImpl = (_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject((init.signal as AbortSignal).reason);
      });
    });
  const provider = makeProvider({timeoutMs: 15, fetchImpl: fetchImpl as typeof fetch});

  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: '12345'}),
    (error: unknown) => {
      assert.ok(error instanceof SmsIrProviderError);
      assert.equal(error.code, SMSIR_ERROR_CODES.TIMEOUT);
      assert.equal(error.retryable, true);
      return true;
    },
  );
});

test('sendOtp maps a network TypeError to retryable provider_unavailable', async () => {
  const fetchImpl = (async () => {
    throw new TypeError('fetch failed');
  }) as typeof fetch;
  const provider = makeProvider({fetchImpl});

  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: '12345'}),
    (error: unknown) => {
      assert.ok(error instanceof SmsIrProviderError);
      assert.equal(error.code, SMSIR_ERROR_CODES.PROVIDER_UNAVAILABLE);
      assert.equal(error.retryable, true);
      return true;
    },
  );
});

// ---------------------------------------------------------------------------
// Cooldown / rate limiting (shared RateLimitStore)
// ---------------------------------------------------------------------------

test('sendOtp enforces the resend cooldown per mobile', async () => {
  const store = new InMemoryRateLimitStore();
  let now = Date.UTC(2026, 7, 16, 10, 0, 0);
  const provider = makeProvider({store, now: () => now});

  await provider.sendOtp({mobile: '09123456789', code: '11111'});

  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: '22222'}),
    (error: unknown) => {
      assert.ok(error instanceof SmsIrProviderError);
      assert.equal(error.code, SMSIR_ERROR_CODES.RATE_LIMITED);
      assert.ok(error.retryAfterMs !== undefined && error.retryAfterMs > 0, 'retryAfterMs must be reported');
      return true;
    },
  );

  // After the cooldown window a send is allowed again.
  now += OTP_RESEND_COOLDOWN_MS + 1_000;
  await provider.sendOtp({mobile: '09123456789', code: '33333'});
});

test('sendOtp enforces the per-mobile window limit', async () => {
  const store = new InMemoryRateLimitStore();
  let now = Date.UTC(2026, 7, 16, 10, 0, 0);
  const provider = makeProvider({
    store,
    now: () => now,
    resendCooldownMs: 10_000,
    sendWindowMs: 60_000,
    sendWindowLimit: 2,
  });

  await provider.sendOtp({mobile: '09123456789', code: '11111'});
  now += 11_000; // cooldown passes; window count 2/2
  await provider.sendOtp({mobile: '09123456789', code: '22222'});
  now += 11_000; // cooldown passes again; window saturated
  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: '33333'}),
    (error: unknown) => {
      assert.ok(error instanceof SmsIrProviderError);
      assert.equal(error.code, SMSIR_ERROR_CODES.RATE_LIMITED);
      const retryAfter = error.retryAfterMs;
      assert.ok(retryAfter !== undefined && retryAfter > 0, 'retryAfterMs must be reported');
      assert.ok(retryAfter <= 60_000, 'retryAfterMs must not exceed the window');
      return true;
    },
  );
});

test('different mobiles are rate-limited independently', async () => {
  const store = new InMemoryRateLimitStore();
  let now = Date.UTC(2026, 7, 16, 10, 0, 0);
  const provider = makeProvider({store, now: () => now});

  await provider.sendOtp({mobile: '09123456789', code: '11111'});
  // Same instant, different number → allowed (fresh cooldown/window keys).
  await provider.sendOtp({mobile: '09351234567', code: '22222'});
});

test('checkSendAllowed reports cooldown then window_limit reasons', async () => {
  const store = new InMemoryRateLimitStore();
  let now = 1_000_000;
  const provider = makeProvider({
    store,
    now: () => now,
    resendCooldownMs: 10_000,
    sendWindowMs: 60_000,
    sendWindowLimit: 2,
  });

  assert.deepEqual(await provider.checkSendAllowed('09123456789'), {allowed: true});

  const cooldownBlocked = await provider.checkSendAllowed('09123456789');
  assert.equal(cooldownBlocked.allowed, false);
  assert.equal(cooldownBlocked.reason, 'cooldown');
  assert.ok(cooldownBlocked.resetAt !== undefined);

  now = 1_011_000; // cooldown passes, window count 2/2
  assert.equal((await provider.checkSendAllowed('09123456789')).allowed, true);

  now = 1_022_000; // cooldown passes again, window saturated
  const windowBlocked = await provider.checkSendAllowed('09123456789');
  assert.equal(windowBlocked.allowed, false);
  assert.equal(windowBlocked.reason, 'window_limit');
  assert.ok(windowBlocked.resetAt !== undefined);
});

// ---------------------------------------------------------------------------
// Redacted logging — no OTP code, no API key, masked mobile only
// ---------------------------------------------------------------------------

test('logs never contain the OTP code, the API key or the full mobile (success path)', async () => {
  const {logger, entries} = collectingLogger();
  const captured: CapturedRequest[] = [];
  const provider = makeProvider({logger, fetchImpl: okFetch(captured)});

  await provider.sendOtp({mobile: '09123456789', code: '424242'});

  assert.ok(entries.some((e) => e.msg === 'otp.send.succeeded'), 'success entry expected');
  const all = JSON.stringify(entries);
  assert.ok(!all.includes('424242'), 'OTP code must never reach the logger');
  assert.ok(!all.includes('test-api-key'), 'API key must never reach the logger');
  assert.ok(!all.includes('09123456789'), 'full mobile must never reach the logger');
  assert.ok(all.includes('9891******89'), 'masked mobile must appear in logs');
});

test('failure logs stay redacted and carry the typed error code', async () => {
  const {logger, entries} = collectingLogger();
  const provider = makeProvider({logger, fetchImpl: statusFetch(401, {status: 10, message: 'نامعتبر'})});

  await assert.rejects(
    () => provider.sendOtp({mobile: '09123456789', code: '424242'}),
    (error: unknown) =>
      error instanceof SmsIrProviderError && error.code === SMSIR_ERROR_CODES.PROVIDER_AUTH,
  );

  const all = JSON.stringify(entries);
  assert.ok(!all.includes('424242'), 'OTP code must never reach the logger');
  assert.ok(!all.includes('test-api-key'), 'API key must never reach the logger');
  assert.ok(!all.includes('09123456789'), 'full mobile must never reach the logger');

  const failed = entries.find((e) => e.msg === 'otp.send.failed');
  assert.ok(failed, 'failed entry expected');
  assert.equal(failed.ctx?.code, SMSIR_ERROR_CODES.PROVIDER_AUTH);
  assert.equal(failed.ctx?.retryable, false);
});

test('rate-limited sends are logged with the masked mobile and reason', async () => {
  const {logger, entries} = collectingLogger();
  const store = new InMemoryRateLimitStore();
  const provider = makeProvider({logger, store, now: () => Date.UTC(2026, 7, 16, 10, 0, 0)});

  await provider.sendOtp({mobile: '09123456789', code: '11111'});
  await assert.rejects(() => provider.sendOtp({mobile: '09123456789', code: '22222'}), SmsIrProviderError);

  const rateLimited = entries.find((e) => e.msg === 'otp.send.rate_limited');
  assert.ok(rateLimited, 'rate-limited entry expected');
  assert.equal(rateLimited.ctx?.reason, 'cooldown');
  assert.equal(rateLimited.ctx?.mobile, '9891******89');
  assert.ok(
    typeof rateLimited.ctx?.retryAfterMs === 'number' && rateLimited.ctx.retryAfterMs > 0,
    'retryAfterMs must be logged for the cooldown',
  );
});
