/**
 * Bounded-operation helpers — a testable `withTimeout` wrapper plus the
 * persistence timeout budget used by the program-generation flow.
 *
 * Why a wrapper instead of relying on Prisma's native timeouts alone:
 *  - Prisma's query/transaction timeouts surface engine-specific errors and
 *    cannot be unit-tested without a real database.
 *  - `withTimeout` produces one stable, typed `TimeoutError` (with a safe
 *    `code` for clients) that the API route can recognize and answer with a
 *    differentiated, data-free response.
 * Prisma's native `timeout`/`maxWait` are still passed to `$transaction` as a
 * server-side backstop (see `src/services/programService.ts`).
 */

/** Workout-history read — must stay far below the AI budget (45 s). */
export const HISTORY_QUERY_TIMEOUT_MS = 5_000;

/** Program save (wrapper budget): client-side deadline for the whole transaction. */
export const PERSIST_TIMEOUT_MS = 10_000;

/**
 * Prisma interactive-transaction backstop. Strictly larger than
 * `PERSIST_TIMEOUT_MS` so the wrapper's `TimeoutError` wins deterministically
 * and the engine rollback only fires for truly stuck transactions.
 */
export const PERSIST_TRANSACTION_TIMEOUT_MS = 15_000;

/** Cap on how long Prisma waits to acquire a transaction from the pool. */
export const PERSIST_MAX_WAIT_MS = 3_000;

/**
 * Stable machine-readable codes returned to clients. Part of the API contract
 * (see docs/AI_API.md) — safe to expose: they leak no internal state or data.
 */
export const TIMEOUT_CODES = {
  AI: 'AI_TIMEOUT',
  PERSISTENCE: 'PERSISTENCE_TIMEOUT',
} as const;

export type TimeoutCode = (typeof TIMEOUT_CODES)[keyof typeof TIMEOUT_CODES];

/** Error thrown by `withTimeout` when the bounded operation does not settle in time. */
export class TimeoutError extends Error {
  /** Stable code for the API response (`TIMEOUT_CODES.*`). */
  readonly code: string;

  constructor(message: string, code: string = 'TIMEOUT') {
    super(message);
    this.name = 'TimeoutError';
    this.code = code;
  }
}

export interface WithTimeoutOptions {
  /** Error message attached to the rejected `TimeoutError`. */
  message?: string;
  /** Stable code carried by the rejected `TimeoutError`. */
  code?: string;
  /**
   * Best-effort cleanup invoked exactly once when the timeout fires. It must
   * never throw — errors are swallowed so cleanup can never mask the timeout.
   */
  onTimeout?: () => void;
}

/**
 * Bounds `promise` to `ms` milliseconds.
 *
 * - Resolves with the source value when the source settles first.
 * - Rejects with `TimeoutError` when `ms` elapses first.
 * - Clears the timer on settlement (a fast source never trips the timeout).
 * - Swallows late rejections of the source: a slow operation that eventually
 *   fails after the wrapper already timed out can never become an unhandled
 *   rejection (this is a latent fix over the old inline `Promise.race`).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  options: WithTimeoutOptions = {},
): Promise<T> {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new RangeError('withTimeout: ms must be a non-negative finite number');
  }

  // Prevent late rejections of the source from surfacing as unhandled
  // rejections once the wrapper has already settled via the timeout.
  promise.catch(() => {});

  let timer: ReturnType<typeof setTimeout> | undefined;

  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      try {
        options.onTimeout?.();
      } catch {
        // Cleanup must never mask the timeout.
      }
      reject(new TimeoutError(options.message ?? 'Operation timed out', options.code));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Safe, user-facing message for a timeout code — stable, never echoes internal
 * details (no operation names, no identifiers, no user data).
 */
export function timeoutErrorMessage(code: string): string {
  switch (code) {
    case TIMEOUT_CODES.AI:
      return 'Program generation timed out. Please try again.';
    case TIMEOUT_CODES.PERSISTENCE:
      return 'Your program could not be processed right now. Please try again.';
    default:
      return 'The request timed out. Please try again.';
  }
}
