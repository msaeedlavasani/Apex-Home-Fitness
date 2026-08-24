/**
 * smsIrProvider.ts — server-only OTP provider adapter for SMS.ir.
 *
 * Wraps the official SMS.ir "verify" endpoint (https://sms.ir/rest-api/):
 *
 *   POST https://api.sms.ir/v1/send/verify
 *   Headers: X-API-KEY, Content-Type: application/json, Accept: text/plain
 *   Body:    { "mobile": "9891…", "templateId": 123456,
 *              "parameters": [{ "name": "Code", "value": "12345" }] }
 *
 * Success is HTTP 200 with `{ "status": 1, "message": "موفق",
 * "data": { "messageId", "cost" } }`. Provider failures map to stable typed
 * codes (see `SMSIR_ERROR_CODES`): 401 → provider_auth, 429 → rate_limited,
 * 5xx → provider_unavailable, 400 (or 200 with a non-success body) classified
 * from the body-level `status` (10–14 auth, 20 throttle, 0 system problem).
 *
 * SERVER-ONLY
 * -----------
 * This module consumes server configuration (SMS_IR_API_KEY, …) and must never
 * be imported from Client Components or exposed via NEXT_PUBLIC_*. It is
 * server-only by construction: importing it pulls in `src/lib/ai/rateLimitStore`
 * → `node:crypto`, which fails the build inside a client bundle. The
 * `server-only` npm package is intentionally not used (not a dependency); add
 * `import 'server-only'` here if it ever is.
 *
 * Design (aligned with the existing logger / rate-limit patterns)
 * ---------------------------------------------------------------
 * - Iranian mobile numbers are validated + normalized to the 12-digit
 *   international form `98xxxxxxxxxx` before leaving the server.
 * - Outbound requests are bounded with `AbortSignal.timeout` (default 10 s),
 *   the same pattern as `RedisRestRateLimitStore`.
 * - Logging is redacted: the OTP code and the API key never reach the logger,
 *   and mobile numbers are masked (first 4 + last 2 digits) — `src/lib/logger`
 *   additionally redacts any `apiKey`/`token`-style keys recursively.
 * - Provider failures are typed `SmsIrProviderError`s so callers can answer
 *   with safe, data-free HTTP responses and stable retry decisions.
 * - A resend cooldown + per-mobile send window is enforced through the SAME
 *   swappable `RateLimitStore` used by the AI generation flow
 *   (src/lib/ai/rateLimitStore.ts): in-memory locally, Redis in production —
 *   no new storage abstraction.
 * - No automatic retries: a retried send could deliver duplicate OTP codes.
 *   Callers decide, using `error.retryable` as the signal. The local guard is
 *   consumed even when the provider call fails — conservative, so a failing
 *   provider cannot be hammered into a retry storm.
 *
 * Real credentials / template are NOT present in this repository — tests use
 * an injected fake `fetch` (mock provider tests). `createSmsIrOtpProvider`
 * fails loudly when env is missing, exactly like `createRateLimitStore`.
 *
 * Delivery monitoring (on by default)
 * -----------------------------------
 * After each successful send the provider schedules ONE best-effort probe of
 * `GET /v1/send/{messageId}` after `monitorDelayMs` (default 60 s) and logs
 * the outcome (`otp.delivery.delivered` / `otp.delivery.slow` /
 * `otp.delivery.pending` / `otp.delivery.failed`). The probe is fire-and-
 * forget: it never affects the send result, never retries, and swallows its
 * own errors (logging `otp.delivery.check_failed` instead). Disable with
 * `SMS_IR_MONITOR_DELAY_MS=0`. The raw `messageText` from the delivery
 * response is deliberately NOT surfaced or logged — it may contain the
 * plaintext OTP code.
 */

import {createLogger, type Logger} from '../logger';
import {
  createRateLimitStore,
  type RateLimitStore,
  type RateLimitStoreEnv,
} from '../ai/rateLimitStore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SMSIR_BASE_URL = 'https://api.sms.ir';
export const SMSIR_VERIFY_PATH = '/v1/send/verify';
export const SMSIR_DELIVERY_PATH_PREFIX = '/v1/send/';
export const SMSIR_DEFAULT_TIMEOUT_MS = 10_000;
export const SMSIR_DEFAULT_OTP_PARAMETER_NAME = 'Code';
/** Max length of a template parameter value (SMS.ir body status 114). */
export const SMSIR_PARAMETER_MAX_LENGTH = 25;
/** Delay before the post-send delivery probe (0 disables monitoring). */
export const SMSIR_DEFAULT_MONITOR_DELAY_MS = 60_000;
/** Delivery lag above this is logged as a warning (`otp.delivery.slow`). */
export const SMSIR_SLOW_DELIVERY_THRESHOLD_MS = 60_000;

/** Minimum delay between two OTP sends for the same mobile. */
export const OTP_RESEND_COOLDOWN_MS = 60_000;
/** Fixed window over which the per-mobile send cap is enforced. */
export const OTP_SEND_WINDOW_MS = 60_000;
/** Max OTP sends per mobile per window. */
export const OTP_SEND_WINDOW_LIMIT = 5;

const COOLDOWN_KEY_PREFIX = 'smsir:otp:cooldown:';
const SEND_KEY_PREFIX = 'smsir:otp:send:';

// ---------------------------------------------------------------------------
// Error model
// ---------------------------------------------------------------------------

export const SMSIR_ERROR_CODES = {
  /** Required configuration (SMS_IR_API_KEY / SMS_IR_TEMPLATE_ID) missing/invalid. */
  CONFIG_MISSING: 'config_missing',
  /** The supplied mobile number is not a valid Iranian number. */
  INVALID_MOBILE: 'invalid_mobile',
  /** The OTP code payload is malformed (empty or > 25 chars). */
  INVALID_CODE: 'invalid_code',
  /** API key invalid / disabled / IP-restricted (HTTP 401, body status 10–14). */
  PROVIDER_AUTH: 'provider_auth',
  /** Cooldown, per-mobile window, or provider-side throttle (HTTP 429, body 20). */
  RATE_LIMITED: 'rate_limited',
  /** The provider deterministically rejected the request (HTTP 400, body ≠ 1/0). */
  PROVIDER_REJECTED: 'provider_rejected',
  /** Transport error / 5xx / provider "system problem" (body status 0) — retryable. */
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  /** The request did not settle within `timeoutMs`. */
  TIMEOUT: 'timeout',
} as const;

export type SmsIrErrorCode = (typeof SMSIR_ERROR_CODES)[keyof typeof SMSIR_ERROR_CODES];

export interface SmsIrProviderErrorOptions {
  httpStatus?: number;
  /** Body-level `status`: 1 ok, 0 system problem, 10–14 auth, 20 throttle, … */
  providerStatus?: number;
  /** Provider-provided message (fixed strings — safe to log). */
  providerMessage?: string;
  /** True when retrying the SAME request may succeed later. */
  retryable?: boolean;
  /** Best-effort time to wait before retrying (ms). */
  retryAfterMs?: number;
  cause?: unknown;
}

export class SmsIrProviderError extends Error {
  readonly code: SmsIrErrorCode;
  readonly httpStatus?: number;
  readonly providerStatus?: number;
  readonly providerMessage?: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly cause?: unknown;

  constructor(code: SmsIrErrorCode, message: string, options: SmsIrProviderErrorOptions = {}) {
    super(message);
    this.name = 'SmsIrProviderError';
    this.code = code;
    this.httpStatus = options.httpStatus;
    this.providerStatus = options.providerStatus;
    this.providerMessage = options.providerMessage;
    this.retryable = options.retryable ?? false;
    this.retryAfterMs = options.retryAfterMs;
    this.cause = options.cause;
  }
}

// ---------------------------------------------------------------------------
// Mobile normalization / masking
// ---------------------------------------------------------------------------

/**
 * Iranian mobile representations accepted (digits only; spaces, dashes,
 * parentheses and dots are stripped):
 *
 *   09123456789    → 989123456789   (trunk zero)
 *   989123456789   → 989123456789   (already international)
 *   +989123456789  → 989123456789   (E.164)
 *   00989123456789 → 989123456789   (leading 00)
 *   9123456789     → 989123456789   (bare subscriber number — SMS.ir example form)
 *
 * Returns null for anything that is not a 10-digit Iranian mobile
 * (9xx xxx xxxx) with an optional 0 / 98 / +98 / 0098 prefix.
 */
const IRANIAN_MOBILE_RE = /^(?:(?:\+|00)?(?:98|0))?(9\d{9})$/;

export function normalizeIranianMobile(input: string): string | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.trim().replace(/[\s\-().]/g, '');
  const match = IRANIAN_MOBILE_RE.exec(cleaned);
  if (!match) return null;
  return `98${match[1]}`;
}

/** PII-safe form for logs: first 4 + last 2 digits, middle masked. */
export function maskMobile(input: string): string {
  const digits = String(input).replace(/\D/g, '');
  if (digits.length < 8) return '***';
  return `${digits.slice(0, 4)}******${digits.slice(-2)}`;
}

// ---------------------------------------------------------------------------
// Response parsing helpers
// ---------------------------------------------------------------------------

/** Loose body parse: never throws — a malformed body is treated as "unknown". */
async function readJsonBody(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await response.json();
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Best-effort `Retry-After` (seconds or HTTP-date) → ms. */
function parseRetryAfterMs(headers: Headers): number | undefined {
  const value = headers.get('retry-after');
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}

/**
 * Maps the raw SMS.ir `deliveryState` to a stable summary. A delivery
 * timestamp is the strongest signal: its presence means the message reached
 * the phone even if the numeric state lags behind.
 */
export function classifyDeliveryState(
  raw: number | undefined,
  deliveryDateTime?: string,
): SmsDeliveryState {
  if (deliveryDateTime) return 'delivered';
  switch (raw) {
    case 1:
      return 'delivered';
    case 2:
      return 'failed';
    case 0:
    case 3:
      return 'pending';
    default:
      return 'unknown';
  }
}

/**
 * Parses a provider timestamp ("YYYY-MM-DD HH:mm:ss", UTC per SMS.ir docs)
 * into epoch ms. The same zone is assumed for send + delivery, so the
 * difference stays correct even if the strings are actually local time.
 */
function parseProviderDateTimeMs(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : undefined;
}

/** Seconds between the send and delivery timestamps (undefined when unparseable). */
function deliveryLagSeconds(send?: string, delivery?: string): number | undefined {
  const sendMs = parseProviderDateTimeMs(send);
  const deliveryMs = parseProviderDateTimeMs(delivery);
  if (sendMs === undefined || deliveryMs === undefined || deliveryMs < sendMs) return undefined;
  return Math.round((deliveryMs - sendMs) / 1000);
}

/**
 * Default scheduler for the post-send probe: a plain `setTimeout` that is
 * unref'd so a pending probe never keeps the server (or a test process)
 * alive.
 */
function defaultDeliveryScheduler(fn: () => void, delayMs: number): void {
  const timer = setTimeout(fn, delayMs);
  (timer as {unref?: () => void}).unref?.();
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface SmsIrOtpProviderConfig {
  apiKey: string;
  /** Numeric template id from the SMS.ir panel ("ارسال سریع" section). */
  templateId: number;
  /** Template parameter name that receives the code (default "Code"). */
  otpParameterName?: string;
  /** Base URL without trailing slash (default https://api.sms.ir). */
  baseUrl?: string;
  /** Per-request budget; the fetch is aborted after this (default 10 s). */
  timeoutMs?: number;
  /** Min delay between two sends for the same mobile (default 60 s). */
  resendCooldownMs?: number;
  /** Fixed window for the per-mobile send cap (default 60 s). */
  sendWindowMs?: number;
  /** Max sends per mobile per window (default 5). */
  sendWindowLimit?: number;
  /** Injectable fetch (tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Shared rate-limit backend — same interface as the AI flow. */
  store?: RateLimitStore;
  /** Injectable logger (tests). Defaults to a scoped app logger. */
  logger?: Logger;
  /** Injectable clock (tests). Defaults to Date.now. */
  now?: () => number;
  /** After a successful send, schedule one delivery probe (default true). */
  monitorDelivery?: boolean;
  /** Delay before the probe (default 60 s; 0 disables monitoring). */
  monitorDelayMs?: number;
  /** Delivery lag above this logs `otp.delivery.slow` (default 60 s). */
  slowDeliveryThresholdMs?: number;
  /** Injectable scheduler (tests). Defaults to an unref'd setTimeout. */
  schedule?: (fn: () => void, delayMs: number) => void;
}

export interface SendOtpInput {
  /** Iranian mobile in any common form; normalized before sending. */
  mobile: string;
  /** The OTP code inserted into the template (≤ 25 chars, never logged). */
  code: string;
}

export interface SendOtpResult {
  messageId: number;
  cost?: number;
}

/** Delivery outcome as reported by `GET /v1/send/{messageId}`. */
export type SmsDeliveryState = 'delivered' | 'pending' | 'failed' | 'unknown';

export interface SmsDeliveryStatus {
  messageId: number;
  /** Raw provider `deliveryState` code (0 sending, 1 delivered, 2 failed, 3 queued). */
  deliveryState?: number;
  /** Parsed summary of `deliveryState` + delivery timestamp. */
  state: SmsDeliveryState;
  /** Provider-formatted send time ("YYYY-MM-DD HH:mm:ss"). */
  sendDateTime?: string;
  /** Provider-formatted delivery time — present only once delivered. */
  deliveryDateTime?: string;
  /** Seconds between send and delivery (both timestamps parsed). */
  deliveryLagSeconds?: number;
}

export type OtpSendGuardReason = 'cooldown' | 'window_limit';

export interface OtpSendGuardResult {
  allowed: boolean;
  reason?: OtpSendGuardReason;
  /** Absolute time (ms epoch) when the blocking window resets. */
  resetAt?: number;
}

export class SmsIrOtpProvider {
  private readonly apiKey: string;
  private readonly templateId: number;
  private readonly otpParameterName: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly resendCooldownMs: number;
  private readonly sendWindowMs: number;
  private readonly sendWindowLimit: number;
  private readonly fetchImpl: typeof fetch;
  private readonly store: RateLimitStore;
  private readonly log: Logger;
  private readonly now: () => number;
  private readonly monitorDelivery: boolean;
  private readonly monitorDelayMs: number;
  private readonly slowDeliveryThresholdMs: number;
  private readonly schedule: (fn: () => void, delayMs: number) => void;

  constructor(config: SmsIrOtpProviderConfig) {
    if (!config.apiKey) {
      throw new SmsIrProviderError(SMSIR_ERROR_CODES.CONFIG_MISSING, 'SmsIrOtpProvider requires an apiKey');
    }
    if (!Number.isInteger(config.templateId) || config.templateId <= 0) {
      throw new SmsIrProviderError(
        SMSIR_ERROR_CODES.CONFIG_MISSING,
        'SmsIrOtpProvider requires a positive integer templateId',
      );
    }
    this.apiKey = config.apiKey;
    this.templateId = config.templateId;
    this.otpParameterName = config.otpParameterName ?? SMSIR_DEFAULT_OTP_PARAMETER_NAME;
    this.baseUrl = (config.baseUrl ?? SMSIR_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? SMSIR_DEFAULT_TIMEOUT_MS;
    this.resendCooldownMs = config.resendCooldownMs ?? OTP_RESEND_COOLDOWN_MS;
    this.sendWindowMs = config.sendWindowMs ?? OTP_SEND_WINDOW_MS;
    this.sendWindowLimit = config.sendWindowLimit ?? OTP_SEND_WINDOW_LIMIT;
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.store = config.store ?? createRateLimitStore();
    this.log = config.logger ?? createLogger({scope: 'smsIr'});
    this.now = config.now ?? (() => Date.now());
    const monitorDelayMs = config.monitorDelayMs ?? SMSIR_DEFAULT_MONITOR_DELAY_MS;
    this.monitorDelayMs = Number.isFinite(monitorDelayMs) && monitorDelayMs > 0 ? monitorDelayMs : 0;
    this.monitorDelivery = config.monitorDelivery !== false && this.monitorDelayMs > 0;
    this.slowDeliveryThresholdMs = config.slowDeliveryThresholdMs ?? SMSIR_SLOW_DELIVERY_THRESHOLD_MS;
    this.schedule = config.schedule ?? defaultDeliveryScheduler;
  }

  /**
   * Cooldown + per-mobile window guard. Note: it consumes the counters, so a
   * caller that checks and then calls `sendOtp` consumes them twice — prefer
   * calling `sendOtp` directly (it performs the guard internally) unless the
   * check result alone is what you need.
   */
  async checkSendAllowed(rawMobile: string): Promise<OtpSendGuardResult> {
    const mobile = normalizeIranianMobile(rawMobile);
    if (!mobile) {
      throw new SmsIrProviderError(SMSIR_ERROR_CODES.INVALID_MOBILE, 'Invalid Iranian mobile number');
    }
    const now = this.now();
    const cooldown = await this.store.incrementWindow(
      `${COOLDOWN_KEY_PREFIX}${mobile}`,
      this.resendCooldownMs,
      1,
      now,
    );
    if (!cooldown.allowed) {
      return {allowed: false, reason: 'cooldown', resetAt: cooldown.resetAt};
    }
    const sendWindow = await this.store.incrementWindow(
      `${SEND_KEY_PREFIX}${mobile}`,
      this.sendWindowMs,
      this.sendWindowLimit,
      now,
    );
    if (!sendWindow.allowed) {
      return {allowed: false, reason: 'window_limit', resetAt: sendWindow.resetAt};
    }
    return {allowed: true};
  }

  /**
   * Validates + normalizes the mobile, enforces the local cooldown/window
   * guard, then calls `POST /v1/send/verify`. Throws `SmsIrProviderError`
   * with a stable `code` on any failure (see `SMSIR_ERROR_CODES`).
   */
  async sendOtp(input: SendOtpInput): Promise<SendOtpResult> {
    const mobile = normalizeIranianMobile(input.mobile);
    if (!mobile) {
      this.log.warn('otp.send.invalid_input', {mobile: maskMobile(input.mobile ?? ''), reason: 'invalid_mobile'});
      throw new SmsIrProviderError(SMSIR_ERROR_CODES.INVALID_MOBILE, 'Invalid Iranian mobile number');
    }
    if (
      typeof input.code !== 'string' ||
      input.code.length === 0 ||
      input.code.length > SMSIR_PARAMETER_MAX_LENGTH
    ) {
      this.log.warn('otp.send.invalid_input', {mobile: maskMobile(mobile), reason: 'invalid_code'});
      throw new SmsIrProviderError(
        SMSIR_ERROR_CODES.INVALID_CODE,
        `OTP code must be a non-empty string of at most ${SMSIR_PARAMETER_MAX_LENGTH} characters`,
      );
    }

    const guard = await this.checkSendAllowed(mobile);
    if (!guard.allowed) {
      const retryAfterMs = guard.resetAt !== undefined ? Math.max(0, guard.resetAt - this.now()) : undefined;
      this.log.warn('otp.send.rate_limited', {
        mobile: maskMobile(mobile),
        reason: guard.reason,
        retryAfterMs,
      });
      throw new SmsIrProviderError(
        SMSIR_ERROR_CODES.RATE_LIMITED,
        `OTP resend blocked (${guard.reason})`,
        {retryable: false, retryAfterMs},
      );
    }

    const body = JSON.stringify({
      mobile,
      templateId: this.templateId,
      parameters: [{name: this.otpParameterName, value: input.code}],
    });

    this.log.debug('otp.send.attempt', {mobile: maskMobile(mobile), templateId: this.templateId});

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${SMSIR_VERIFY_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/plain',
          'X-API-KEY': this.apiKey,
        },
        body,
        cache: 'no-store',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw this.toTransportError(error, mobile);
    }

    const bodyObj = await readJsonBody(response);
    const providerStatus = typeof bodyObj?.status === 'number' ? bodyObj.status : undefined;
    const providerMessage = typeof bodyObj?.message === 'string' ? bodyObj.message : undefined;

    if (response.ok && providerStatus === 1) {
      const data = (bodyObj?.data ?? {}) as {messageId?: unknown; cost?: unknown};
      if (typeof data.messageId === 'number' || typeof data.messageId === 'string') {
        const result: SendOtpResult = {
          messageId: Number(data.messageId),
          cost: typeof data.cost === 'number' ? data.cost : undefined,
        };
        this.log.info('otp.send.succeeded', {
          mobile: maskMobile(mobile),
          messageId: result.messageId,
          cost: result.cost,
        });
        this.scheduleDeliveryCheck(result.messageId, mobile);
        return result;
      }
    }

    throw this.toProviderFailure(response.status, providerStatus, providerMessage, response.headers, mobile);
  }

  /**
   * Reads the delivery status of a sent message (`GET /v1/send/{messageId}`
   * per the SMS.ir REST docs). Throws a typed `SmsIrProviderError` on any
   * failure — monitoring callers should catch and log `otp.delivery.*`.
   */
  async getDeliveryStatus(messageId: number | string): Promise<SmsDeliveryStatus> {
    const id = String(messageId).trim();
    if (!/^\d+$/.test(id)) {
      throw new SmsIrProviderError(SMSIR_ERROR_CODES.PROVIDER_REJECTED, 'Invalid SMS.ir messageId');
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${SMSIR_DELIVERY_PATH_PREFIX}${id}`, {
        method: 'GET',
        headers: {Accept: 'application/json', 'X-API-KEY': this.apiKey},
        cache: 'no-store',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw this.toTransportError(error, undefined, 'otp.delivery.lookup_failed');
    }

    const bodyObj = await readJsonBody(response);
    const providerStatus = typeof bodyObj?.status === 'number' ? bodyObj.status : undefined;
    const providerMessage = typeof bodyObj?.message === 'string' ? bodyObj.message : undefined;
    if (!response.ok || providerStatus !== 1) {
      throw this.toProviderFailure(
        response.status,
        providerStatus,
        providerMessage,
        response.headers,
        undefined,
        'otp.delivery.lookup_failed',
      );
    }

    const data = (bodyObj?.data ?? {}) as Record<string, unknown>;
    // `messageText` is deliberately NOT read or returned: it may contain the
    // plaintext OTP code.
    const deliveryState = typeof data.deliveryState === 'number' ? data.deliveryState : undefined;
    const sendDateTime = typeof data.sendDateTime === 'string' ? data.sendDateTime : undefined;
    const deliveryDateTime = typeof data.deliveryDateTime === 'string' ? data.deliveryDateTime : undefined;
    return {
      messageId: Number(id),
      deliveryState,
      state: classifyDeliveryState(deliveryState, deliveryDateTime),
      sendDateTime,
      deliveryDateTime,
      deliveryLagSeconds: deliveryLagSeconds(sendDateTime, deliveryDateTime),
    };
  }

  /**
   * Fire-and-forget post-send probe. Never throws and never blocks the send
   * result — a scheduler or probe failure only logs.
   */
  private scheduleDeliveryCheck(messageId: number, mobile: string): void {
    if (!this.monitorDelivery) return;
    const sentAtMs = this.now();
    try {
      this.schedule(() => {
        void this.runDeliveryCheck(messageId, mobile, sentAtMs);
      }, this.monitorDelayMs);
    } catch (error) {
      this.log.warn('otp.delivery.schedule_failed', {
        mobile: maskMobile(mobile),
        messageId,
        error: error instanceof Error ? error.message : undefined,
      });
    }
  }

  private async runDeliveryCheck(messageId: number, mobile: string, sentAtMs: number): Promise<void> {
    const elapsedSeconds = Math.max(0, Math.round((this.now() - sentAtMs) / 1000));
    try {
      const status = await this.getDeliveryStatus(messageId);
      const base = {
        mobile: maskMobile(mobile),
        messageId,
        deliveryState: status.deliveryState,
        elapsedSeconds,
      };
      if (status.state === 'delivered') {
        const lag = status.deliveryLagSeconds;
        if (lag !== undefined && lag * 1000 > this.slowDeliveryThresholdMs) {
          this.log.warn('otp.delivery.slow', {...base, deliveryLagSeconds: lag});
        } else {
          this.log.info('otp.delivery.delivered', {...base, deliveryLagSeconds: lag});
        }
      } else if (status.state === 'failed') {
        this.log.warn('otp.delivery.failed', base);
      } else {
        this.log.info('otp.delivery.pending', base);
      }
    } catch (error) {
      this.log.warn('otp.delivery.check_failed', {
        mobile: maskMobile(mobile),
        messageId,
        code: (error as {code?: string})?.code,
        elapsedSeconds,
      });
    }
  }

  /** Classify transport-level failures (timeout / network / unexpected). */
  private toTransportError(error: unknown, mobile?: string, logMsg = 'otp.send.failed'): SmsIrProviderError {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return this.fail(SMSIR_ERROR_CODES.TIMEOUT, 'SMS.ir request timed out', {mobile, retryable: true, cause: error}, logMsg);
    }
    if (error instanceof TypeError) {
      return this.fail(SMSIR_ERROR_CODES.PROVIDER_UNAVAILABLE, 'Network error while calling SMS.ir', {
        mobile,
        retryable: true,
        cause: error,
      }, logMsg);
    }
    return this.fail(SMSIR_ERROR_CODES.PROVIDER_UNAVAILABLE, 'Unexpected error while calling SMS.ir', {
      mobile,
      retryable: true,
      cause: error instanceof Error ? error : undefined,
    }, logMsg);
  }

  /**
   * Map an HTTP-level failure to a typed error. HTTP status first (401/429/5xx
   * are documented by SMS.ir), then the body-level `status` for everything
   * else (including HTTP 200 with a non-success body).
   */
  private toProviderFailure(
    httpStatus: number,
    providerStatus: number | undefined,
    providerMessage: string | undefined,
    headers: Headers,
    mobile?: string,
    logMsg = 'otp.send.failed',
  ): SmsIrProviderError {
    const base = {httpStatus, providerStatus, providerMessage};
    if (httpStatus === 401) {
      return this.fail(SMSIR_ERROR_CODES.PROVIDER_AUTH, 'SMS.ir rejected the API key', {...base, mobile, retryable: false});
    }
    if (httpStatus === 429) {
      return this.fail(SMSIR_ERROR_CODES.RATE_LIMITED, 'SMS.ir rate limit exceeded', {
        ...base,
        mobile,
        retryable: true,
        retryAfterMs: parseRetryAfterMs(headers),
      });
    }
    if (httpStatus >= 500) {
      return this.fail(SMSIR_ERROR_CODES.PROVIDER_UNAVAILABLE, 'SMS.ir is unavailable', {...base, mobile, retryable: true});
    }
    switch (providerStatus) {
      case 0: // "مشکلی در سامانه رخ داده است" — system problem, safe to retry
        return this.fail(SMSIR_ERROR_CODES.PROVIDER_UNAVAILABLE, providerMessage ?? 'SMS.ir reported a system problem', {
          ...base,
          mobile,
          retryable: true,
        });
      case 1: // status says success but data is unusable (e.g. missing messageId)
        return this.fail(SMSIR_ERROR_CODES.PROVIDER_UNAVAILABLE, 'SMS.ir returned an unreadable success response', {
          ...base,
          mobile,
          retryable: true,
        });
      case 10:
      case 11:
      case 12:
      case 13:
      case 14: // invalid / disabled / IP-restricted key, inactive / suspended account
        return this.fail(SMSIR_ERROR_CODES.PROVIDER_AUTH, providerMessage ?? 'SMS.ir API key problem', {
          ...base,
          mobile,
          retryable: false,
        });
      case 20: // "تعداد درخواست بیشتر از حد مجاز است"
        return this.fail(SMSIR_ERROR_CODES.RATE_LIMITED, providerMessage ?? 'SMS.ir throttled the request', {
          ...base,
          mobile,
          retryable: true,
        });
      case undefined: {
        if (httpStatus === 200) {
          return this.fail(SMSIR_ERROR_CODES.PROVIDER_UNAVAILABLE, 'SMS.ir returned an unreadable response', {
            ...base,
            mobile,
            retryable: true,
          });
        }
        return this.fail(SMSIR_ERROR_CODES.PROVIDER_REJECTED, `SMS.ir rejected the request (HTTP ${httpStatus})`, {
          ...base,
          mobile,
          retryable: false,
        });
      }
      default: // 104 invalid mobile, 113 template not found, 115 blacklisted, … — deterministic
        return this.fail(
          SMSIR_ERROR_CODES.PROVIDER_REJECTED,
          providerMessage ?? `SMS.ir rejected the request (status ${providerStatus})`,
          {...base, mobile, retryable: false},
        );
    }
  }

  /** Construct a typed error, log it redacted, and hand it to the caller. */
  private fail(
    code: SmsIrErrorCode,
    message: string,
    options: SmsIrProviderErrorOptions & {mobile?: string},
    logMsg = 'otp.send.failed',
  ): SmsIrProviderError {
    const error = new SmsIrProviderError(code, message, options);
    this.log.error(logMsg, {
      code: error.code,
      httpStatus: error.httpStatus,
      providerStatus: error.providerStatus,
      retryable: error.retryable,
      ...(options.mobile !== undefined ? {mobile: maskMobile(options.mobile)} : {}),
    });
    return error;
  }
}

// ---------------------------------------------------------------------------
// Env-driven factory
// ---------------------------------------------------------------------------

/**
 * Subset of the environment consumed by {@link createSmsIrOtpProvider}.
 * The rate-limit fields are shared with `src/lib/ai/rateLimitStore.ts` so OTP
 * limits use the same backend as the AI generation flow.
 */
export interface SmsIrProviderEnv extends RateLimitStoreEnv {
  SMS_IR_API_KEY?: string;
  SMS_IR_TEMPLATE_ID?: string;
  SMS_IR_API_BASE_URL?: string;
  SMS_IR_CODE_PARAMETER?: string;
  SMS_IR_TIMEOUT_MS?: string;
  /** Delay before the post-send delivery probe in ms (0 disables). */
  SMS_IR_MONITOR_DELAY_MS?: string;
}

/**
 * Builds the provider from environment configuration. Fails loudly when the
 * required credentials/template are missing — there is no safe "no-op"
 * default for OTP delivery (same philosophy as `createRateLimitStore`).
 *
 * SMS.ir sandbox note: with a Sandbox API key the only active template is
 * `123456` with parameter `Code` (text "کد تایید شما: #CODE#") — useful for
 * staging without spending credit.
 */
export function createSmsIrOtpProvider(env: SmsIrProviderEnv = process.env as SmsIrProviderEnv): SmsIrOtpProvider {
  const apiKey = env.SMS_IR_API_KEY?.trim();
  if (!apiKey) {
    throw new SmsIrProviderError(SMSIR_ERROR_CODES.CONFIG_MISSING, 'SMS_IR_API_KEY is not set (see .env.example)');
  }
  const templateId = env.SMS_IR_TEMPLATE_ID?.trim();
  if (!templateId) {
    throw new SmsIrProviderError(SMSIR_ERROR_CODES.CONFIG_MISSING, 'SMS_IR_TEMPLATE_ID is not set (see .env.example)');
  }
  const parsedTemplateId = Number(templateId);
  if (!Number.isInteger(parsedTemplateId) || parsedTemplateId <= 0) {
    throw new SmsIrProviderError(
      SMSIR_ERROR_CODES.CONFIG_MISSING,
      `SMS_IR_TEMPLATE_ID must be a positive integer, got "${templateId}"`,
    );
  }
  const timeoutMs = Number.parseInt(env.SMS_IR_TIMEOUT_MS ?? '', 10);
  const parsedTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs >= 500 ? timeoutMs : SMSIR_DEFAULT_TIMEOUT_MS;
  const monitorDelayRaw = Number.parseInt(env.SMS_IR_MONITOR_DELAY_MS ?? '', 10);
  const monitorDelayMs =
    Number.isFinite(monitorDelayRaw) && monitorDelayRaw >= 0 ? monitorDelayRaw : SMSIR_DEFAULT_MONITOR_DELAY_MS;
  return new SmsIrOtpProvider({
    apiKey,
    templateId: parsedTemplateId,
    baseUrl: env.SMS_IR_API_BASE_URL?.trim() || SMSIR_BASE_URL,
    otpParameterName: env.SMS_IR_CODE_PARAMETER?.trim() || SMSIR_DEFAULT_OTP_PARAMETER_NAME,
    timeoutMs: parsedTimeoutMs,
    monitorDelivery: monitorDelayMs > 0,
    monitorDelayMs,
    store: createRateLimitStore(env),
  });
}
