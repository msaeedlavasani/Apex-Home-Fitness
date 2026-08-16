/**
 * Client HTTP layer for the quiz completion flow (Batch 14 / task 3).
 *
 * Wraps the two persistence endpoints the flow needs and classifies every
 * failure deterministically so the page can render the right UX:
 *
 *   - `auth`      → session lost/expired — the flow must hand off to OTP.
 *   - `retryable` → network/5xx/429/timeout — safe to retry (the save is
 *                   idempotent via `clientRequestId` and generation is
 *                   idempotent via `Idempotency-Key`, so a retry never
 *                   duplicates anything).
 *   - `in_progress` → generation with the same key is running — the caller
 *                   waits and retries the SAME request (replayed later).
 *   - `permanent` → 400/409/422/4xx — retrying cannot help; show an error.
 *
 * The endpoints:
 *   - `POST /api/quiz/save` — new (this task), idempotent save of the quiz
 *     response (wraps `userService.saveQuizResponse`).
 *   - `POST /api/generate-program` — existing; idempotency via the
 *     `Idempotency-Key` header (see src/lib/ai/idempotency.ts + generation
 *     ledger in src/services/generationIdempotency.ts).
 */
import type { GenerateProgramInput } from '@/lib/ai/requestSecurity';

export type QuizApiErrorKind = 'auth' | 'retryable' | 'in_progress' | 'permanent';

/** Typed fetch failure carrying the stable classification + server code. */
export class QuizApiError extends Error {
  readonly kind: QuizApiErrorKind;
  readonly status?: number;
  /** Stable server error code, when the response carried one. */
  readonly code?: string;

  constructor(
    message: string,
    kind: QuizApiErrorKind,
    status?: number,
    code?: string,
  ) {
    super(message);
    this.name = 'QuizApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

/** HTTP statuses worth retrying (timeouts, rate limits, server errors). */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const NETWORK_ERROR_PATTERN =
  /failed to fetch|networkerror|fetch failed|econnreset|econnrefused|econnaborted|etimedout|timeout|aborted|offline|internet disconnected/i;

/** Stable codes that mean "retrying with the same payload is pointless". */
const PERMANENT_CODES = new Set([
  'IDEMPOTENCY_CONFLICT',
  'CLIENT_REQUEST_ID_CONFLICT',
  'MEDICAL_CLEARANCE_REQUIRED',
  'INVALID_IDEMPOTENCY_KEY',
  // The auth backend (Supabase env / mock mode) is not configured on the
  // server — no amount of retrying can succeed until ops fixes the env.
  'AUTH_BACKEND_NOT_CONFIGURED',
]);

function classify(status: number | undefined, code: string | undefined): QuizApiErrorKind {
  if (code === 'IDEMPOTENCY_IN_PROGRESS') return 'in_progress';
  if (status === 401) return 'auth';
  if (code && PERMANENT_CODES.has(code)) return 'permanent';
  if (status !== undefined) {
    if (status === 400 || status === 422) return 'permanent';
    if (RETRYABLE_STATUS.has(status)) return 'retryable';
    if (status >= 400 && status < 500) return 'permanent';
    if (status >= 500) return 'retryable';
  }
  return 'retryable'; // unknown failure — never silently drop the flow
}

/** Builds a classified error from an unexpected (non-HTTP) failure. */
function toQuizApiError(err: unknown, fallback: string): QuizApiError {
  if (err instanceof QuizApiError) return err;
  const message = err instanceof Error ? err.message : String(err);
  const retryable = err instanceof TypeError || NETWORK_ERROR_PATTERN.test(message);
  return new QuizApiError(fallback, retryable ? 'retryable' : 'retryable');
}

async function errorBody(res: Response): Promise<{error?: string; code?: string}> {
  try {
    const body = (await res.json()) as {error?: string; code?: string};
    return body ?? {};
  } catch {
    return {};
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Payload types (client-side projections — the server owns the full shapes)
// ---------------------------------------------------------------------------

export interface QuizSaveResponseResult {
  quizResponse: {
    id: string;
    userId: string;
    answers: unknown;
    recommendedProgramId: string | null;
    score: number | null;
    createdAt: string;
  };
}

export interface GenerateProgramResult {
  program: { id: string; name: string; ownerId: string | null };
  generated: unknown;
}

// ---------------------------------------------------------------------------
// Endpoint wrappers
// ---------------------------------------------------------------------------

export interface SaveQuizResponseApiInput {
  answers: unknown;
  /** The draft's stable completionId — replays return the same response. */
  clientRequestId: string;
}

/**
 * `POST /api/quiz/save` — idempotent quiz-response save.
 * @throws {QuizApiError} kind 'auth' | 'retryable' | 'permanent'.
 */
export async function saveQuizResponseApi(
  input: SaveQuizResponseApiInput,
): Promise<QuizSaveResponseResult> {
  let res: Response;
  try {
    res = await fetch('/api/quiz/save', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(input),
    });
  } catch (err) {
    throw toQuizApiError(err, 'Network error while saving your answers.');
  }

  if (!res.ok) {
    const {error, code} = await errorBody(res);
    throw new QuizApiError(
      error || `Failed to save quiz response (${res.status}).`,
      classify(res.status, code),
      res.status,
      code,
    );
  }
  return (await res.json()) as QuizSaveResponseResult;
}

export interface GenerateProgramApiOptions {
  /** How many times a 409 IN_PROGRESS is retried with backoff (default 6). */
  inProgressRetries?: number;
  /** Base backoff for IN_PROGRESS retries, ms (default 1500, grows linearly). */
  inProgressBackoffMs?: number;
}

/**
 * `POST /api/generate-program` with the `Idempotency-Key` header — retries of
 * the same completion replay the cached 200 (never a duplicate program).
 *
 * A 409 `IDEMPOTENCY_IN_PROGRESS` means the SAME key is already generating
 * (e.g. a crashed tab, or a concurrent duplicate) — the caller waits with
 * linear backoff and retries the identical request; once the ledger row goes
 * stale the server reclaims it and completes the generation.
 *
 * @throws {QuizApiError} kind 'auth' | 'retryable' | 'in_progress' |
 *         'permanent' — 'in_progress' only when the backoff budget ran out.
 */
export async function generateProgramApi(
  input: GenerateProgramInput,
  idempotencyKey: string,
  options: GenerateProgramApiOptions = {},
): Promise<GenerateProgramResult> {
  const maxRetries = options.inProgressRetries ?? 6;
  const backoffMs = options.inProgressBackoffMs ?? 1500;
  let attempt = 0;

  for (;;) {
    let res: Response;
    try {
      res = await fetch('/api/generate-program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(input),
      });
    } catch (err) {
      throw toQuizApiError(err, 'Network error while generating your program.');
    }

    if (res.ok) return (await res.json()) as GenerateProgramResult;

    const {error, code} = await errorBody(res);
    if (res.status === 409 && code === 'IDEMPOTENCY_IN_PROGRESS' && attempt < maxRetries) {
      attempt += 1;
      await sleep(backoffMs * attempt);
      continue;
    }

    throw new QuizApiError(
      error || `Failed to generate program (${res.status}).`,
      classify(res.status, code),
      res.status,
      code,
    );
  }
}
