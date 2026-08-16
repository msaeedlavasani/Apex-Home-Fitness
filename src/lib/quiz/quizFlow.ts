/**
 * Pure helpers for the Batch 14 onboarding flow
 * (Landing → Quiz → OTP login/signup → save quiz response → generate program
 * → Dashboard).
 *
 * This module is intentionally side-effect free (no fetch, no storage, no
 * auth) so the flow logic is unit-testable. The HTTP layer lives in
 * `./quizApi.ts`, the client-side draft persistence in `./quizDraft.ts`.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * TASK-2 CONTRACT (extracted from the current codebase, Batch 14 / task 2)
 * ──────────────────────────────────────────────────────────────────────────
 * The OTP verify/session endpoints are IMPLEMENTED in the workspace as of
 * this task (see src/app/api/auth/, src/lib/auth/, src/services/otpService.ts
 * and phoneSessionService.ts):
 *
 *   - `POST /api/auth/request-code`  — body `{ phone }` → 200
 *     `{ ok: true, retryAfterSeconds, devCode? (mock only) }`; errors
 *     `{ ok: false, error: 'invalid_phone' | 'rate_limited' |
 *     'provider_error' }` with 400/429/500.
 *   - `POST /api/auth/verify`        — body `{ phone, code }` → 200
 *     `{ ok: true }` and establishes the session: Supabase Auth SSR cookies
 *     (supabase mode) or a signed `ahf_session` cookie (mock mode, dev/CI).
 *   - Session check (client): supabase mode → `createBrowserSupabaseClient()
 *     .auth.getUser()` (the contract `syncService.getCurrentUserId()` already
 *     uses); mock mode → `verifyMockSession` on the `ahf_session` cookie
 *     (same code the middleware trusts). See ./quizAuth.ts.
 *   - Auth UI (task 4): `/{locale}/auth/login?next=<allowlisted>` →
 *     `/{locale}/auth/verify` → redirect to `next` (sanitized against
 *     `src/lib/auth/protect.ts` `REDIRECT_ALLOWLIST`, which includes 'quiz').
 *
 * This quiz flow consumes that contract at three points:
 *   1. On quiz completion it checks the session client-side
 *      (`checkQuizSession` in ./quizAuth.ts).
 *   2. Without a session it hands off via `authLoginPath(locale,
 *      '/<locale>/quiz')` (`/auth/login?next=…`) — the completed draft stays
 *      in localStorage, so the answers are NOT lost after verify.
 *   3. After verify the auth UI redirects to `next` (= the quiz page), which
 *      resumes the completion flow with the authenticated session.
 * ──────────────────────────────────────────────────────────────────────────
 */
import { z } from 'zod';

import { REST_DAYS_SCHEMA } from '@/lib/ai/restDays';
import type { GenerateProgramInput } from '@/lib/ai/requestSecurity';

// Client-safe mirror of the server's goal contract. Do not import
// requestSecurity.ts here: it owns server-side rate limiting and node:crypto.
const GOAL_SCHEMA = z
  .union([
    z.enum(['strength', 'fat_loss', 'flexibility', 'functional_fitness']),
    z
      .array(z.enum(['strength', 'fat_loss', 'flexibility', 'functional_fitness']))
      .min(1)
      .max(4)
      .refine((items) => new Set(items).size === items.length, 'Duplicate goals are not allowed'),
  ])
  .transform((value) => (Array.isArray(value) ? value : [value]));
import { authLoginPath } from '@/lib/auth/protect';

// Keep this client-side helper free of the server-only idempotency module
// (which imports node:crypto for request hashing).
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
function isValidClientIdempotencyKey(key: string): boolean {
  return IDEMPOTENCY_KEY_PATTERN.test(key);
}

/**
 * The post-auth destination for the quiz completion flow. The auth UI
 * sanitizes `next` against the redirect allowlist ('quiz' is allowlisted in
 * `src/lib/auth/protect.ts`), so after a successful verify the user lands
 * back here and the page resumes the save → generate → dashboard flow.
 */
export function quizAuthHandoffUrl(locale: string): string {
  return authLoginPath(locale, `/${locale}/quiz`);
}

// ---------------------------------------------------------------------------
// Answer validation — one source of truth for the client flow AND the
// `POST /api/quiz/save` route. Values mirror the quiz component ids
// (src/components/quiz/*) and the server contract
// (`GENERATE_PROGRAM_INPUT_SCHEMA` in src/lib/ai/requestSecurity.ts).
// ---------------------------------------------------------------------------

const LEVEL_VALUES = ['beginner', 'intermediate', 'advanced'] as const;

const EQUIPMENT_VALUES = [
  'none',
  'pull_up_bar',
  'bands',
  'dumbbells',
  'barbell',
  'kettlebells',
  'bench',
  'cable_machine',
  'jump_rope',
] as const;

const LIMITATION_VALUES = [
  'none',
  'knee',
  'lower_back',
  'shoulder',
  'wrist',
  'ankle',
  'hip',
  'neck',
] as const;

function uniqueItems<T extends string>(items: T[]): boolean {
  return new Set(items).size === items.length;
}

function noneIsExclusive<T extends string>(items: T[]): boolean {
  return !items.includes('none' as T) || items.length === 1;
}

/**
 * Validates + normalizes the quiz answers payload:
 *   - `goal` is normalized to a canonical array (legacy single string kept
 *     compatible — same transform as `GOAL_SCHEMA`);
 *   - `limitationsDetails` defaults to '';
 *   - `theme` is UI-only and optional (it is NOT sent to generation).
 * `.strict()` rejects unknown keys so a future payload drift fails loudly.
 */
export const QUIZ_ANSWERS_SCHEMA = z
  .object({
    theme: z.string().trim().max(20).optional(),
    level: z.enum(LEVEL_VALUES),
    goal: GOAL_SCHEMA,
    equipment: z
      .array(z.enum(EQUIPMENT_VALUES))
      .min(1)
      .max(9)
      .refine(uniqueItems, 'Duplicate equipment is not allowed')
      .refine(noneIsExclusive, 'None cannot be combined with equipment'),
    limitations: z
      .array(z.enum(LIMITATION_VALUES))
      .max(8)
      .refine(uniqueItems, 'Duplicate limitations are not allowed')
      .refine(noneIsExclusive, 'None cannot be combined with limitations'),
    limitationsDetails: z.string().trim().max(1000).default(''),
    restDays: REST_DAYS_SCHEMA,
  })
  .strict();

export type QuizAnswersNormalized = z.infer<typeof QUIZ_ANSWERS_SCHEMA>;

/** Parses + normalizes quiz answers; throws a ZodError when invalid. */
export function normalizeQuizAnswers(answers: unknown): QuizAnswersNormalized {
  return QUIZ_ANSWERS_SCHEMA.parse(answers);
}

/**
 * Maps normalized quiz answers onto the strict `POST /api/generate-program`
 * input. Note `theme` is deliberately EXCLUDED (visual preference only) and
 * `restDays` is always present (the quiz requires 1–3).
 */
export function buildGenerationInput(answers: QuizAnswersNormalized): GenerateProgramInput {
  return {
    level: answers.level,
    goal: answers.goal,
    equipment: answers.equipment,
    limitations: answers.limitations,
    limitationsDetails: answers.limitationsDetails,
    restDays: answers.restDays,
  };
}

/**
 * Stable `Idempotency-Key` for one quiz completion: `quiz-<completionId>`.
 * The draft's `completionId` never changes while the draft lives, so every
 * retry/refresh/resume of the same completion replays the same generation
 * key (the server replays the cached 200 — never a second program).
 */
export function quizGenerationIdempotencyKey(completionId: string): string {
  const key = `quiz-${completionId}`;
  if (!isValidClientIdempotencyKey(key)) {
    throw new Error(`Invalid quiz completion id for idempotency: "${completionId}".`);
  }
  return key;
}

/**
 * Builds the `POST /api/quiz/save` body. `clientRequestId` = the draft's
 * stable `completionId` — `saveQuizResponse` replays the same QuizResponse
 * for the same key, so a retried save never duplicates.
 */
export function buildSaveResponsePayload(
  answers: QuizAnswersNormalized,
  completionId: string,
): { answers: QuizAnswersNormalized; clientRequestId: string } {
  return { answers, clientRequestId: completionId };
}
