/**
 * User service — links Supabase authentication to the Prisma data layer and
 * persists onboarding quiz responses.
 *
 * Reference (prisma/schema.prisma):
 *   model User {
 *     id           String   @id @default(cuid())
 *     email        String   @unique
 *     name         String
 *     passwordHash String
 *     fitnessGoal  String?
 *     fitnessLevel DifficultyLevel?
 *     quizResponses QuizResponse[]
 *     ...
 *   }
 *   model QuizResponse {
 *     id                   String  @id @default(cuid())
 *     userId               String
 *     answers              Json    // flexible answer payload
 *     recommendedProgramId String?
 *     score                Float?
 *     createdAt            DateTime @default(now())
 *     ...
 *   }
 *
 * Integration model: when a user signs in through Supabase Auth we ensure a
 * matching Prisma `User` row exists (keyed by the Supabase auth user id) and
 * create `QuizResponse` rows owned by that user. Password hashing is managed
 * by Supabase, so a placeholder is stored in `passwordHash`.
 *
 * Offline pipeline (src/lib/offline/db.ts + src/services/syncService.ts):
 * client components persist the active program and today's workout to
 * IndexedDB and queue completed exercises there. `syncService.ts` uploads
 * that outbox to the Supabase `workout_exercise_logs` table when the device
 * is online, keyed by this same Supabase auth user id (`supabaseUser.id`),
 * so every synced row traces back to the Prisma `User` this module creates.
 *
 * All functions in this module are server-only — they read the request's
 * auth cookie (via `createServerSupabaseClient`) and use Prisma. Call them
 * from Route Handlers, Server Actions or Server Components. Do NOT import
 * this module from client code; the client-side identity contract lives in
 * `syncService.getCurrentUserId()`.
 */
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { DifficultyLevel, Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { createServerSupabaseClient } from '../lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Onboarding quiz answers as produced by `src/components/quiz/OnboardingQuiz`:
 * `{ level, goal, equipment, limitations, limitationsDetails, restDays }`.
 * `goal` accepts the current multi-select string array and the legacy single
 * string. The schema stores the payload as a flexible Json value, so extra
 * keys are allowed (e.g. future steps such as `timePerSessionMin`).
 */
export interface QuizAnswers {
  /** 'beginner' | 'intermediate' | 'advanced' */
  level?: string;
  /** Current multi-select ids, or one legacy goal id. */
  goal?: string | string[];
  equipment?: string[];
  limitations?: string[];
  limitationsDetails?: string;
  [key: string]: unknown;
}

export interface SaveQuizResponseInput {
  answers: QuizAnswers;
  /** Optional program the quiz recommended (matches `recommendedProgramId`). */
  recommendedProgramId?: string | null;
  /** Optional recommender score (e.g. 0–100). */
  score?: number | null;
  /**
   * Client-supplied idempotency key (8–64 URL-safe chars — same format as the
   * `Idempotency-Key` header contract, see `src/lib/ai/idempotency.ts`).
   * The quiz flow passes the draft's stable `completionId` here so retries,
   * refreshes and post-OTP resumes of the same quiz completion always return
   * the SAME `QuizResponse` and never persist a duplicate. A key that already
   * belongs to another user is rejected (never replayed).
   */
  clientRequestId?: string | null;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class UserServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserServiceError';
  }
}

/** Thrown when the current request has no (or an invalid) auth session. */
export class UnauthenticatedError extends UserServiceError {
  constructor(message = 'Authentication required.') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

/**
 * Thrown when a `clientRequestId` is already bound to a DIFFERENT user's
 * `QuizResponse`. The idempotency key is only replayable by its owner; a
 * foreign key must never be silently replayed.
 */
export class QuizResponseConflictError extends UserServiceError {
  constructor(message = 'This quiz response idempotency key is already in use.') {
    super(message);
    this.name = 'QuizResponseConflictError';
  }
}

// ---------------------------------------------------------------------------
// Auth + user sync
// ---------------------------------------------------------------------------

/** Password hashing is managed by Supabase Auth, not the app. */
const AUTH_PASSWORD_PLACEHOLDER = 'supabase-managed';

const QUIZ_LEVEL_TO_ENUM: Record<string, DifficultyLevel> = {
  beginner: DifficultyLevel.BEGINNER,
  intermediate: DifficultyLevel.INTERMEDIATE,
  advanced: DifficultyLevel.ADVANCED,
};

/**
 * Returns the authenticated Supabase user for the current request.
 * @throws {UnauthenticatedError} if there is no valid session.
 */
export async function getSupabaseAuthUser(): Promise<SupabaseUser> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new UnauthenticatedError(error?.message ?? 'No authenticated user.');
  }
  return data.user;
}

function displayNameFor(supabaseUser: SupabaseUser): string {
  const meta = supabaseUser.user_metadata ?? {};
  const fullName = typeof meta.full_name === 'string' ? meta.full_name : undefined;
  const name = typeof meta.name === 'string' ? meta.name : undefined;
  return fullName ?? name ?? supabaseUser.email ?? 'Apex Athlete';
}

/**
 * Ensures a Prisma `User` exists for the given Supabase auth user and returns
 * it. The Prisma user is keyed by the Supabase auth user id so every app
 * record (quiz responses, workouts, programs) traces back to the
 * authenticated identity.
 *
 * Edge case handled: if the email already exists under a different id (e.g. a
 * pre-Supabase seeded user), the existing record is reused (name refreshed)
 * instead of creating a duplicate.
 */
export async function syncUserWithSupabase(supabaseUser: SupabaseUser) {
  const email = supabaseUser.email?.toLowerCase();
  if (!email) {
    throw new UserServiceError('Supabase user has no email address.');
  }
  const name = displayNameFor(supabaseUser);

  // 1) Canonical path — record keyed by the auth user id.
  const existing = await prisma.user.findUnique({
    where: { id: supabaseUser.id },
  });
  if (existing) {
    if (existing.email !== email || existing.name !== name) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { email, name },
      });
    }
    return existing;
  }

  // 2) Email already exists under another id (legacy record) — reuse it.
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { name },
    });
  }

  // 3) First contact — create the Prisma user linked to the auth identity.
  return prisma.user.create({
    data: {
      id: supabaseUser.id,
      email,
      name,
      passwordHash: AUTH_PASSWORD_PLACEHOLDER,
    },
  });
}

/**
 * Returns the authenticated user's Prisma profile, synced from Supabase.
 * @throws {UnauthenticatedError} if there is no valid session.
 */
export async function getCurrentUserProfile() {
  const supabaseUser = await getSupabaseAuthUser();
  return syncUserWithSupabase(supabaseUser);
}

// ---------------------------------------------------------------------------
// Quiz responses
// ---------------------------------------------------------------------------

/** Shared relation shape so fresh creates and idempotent replays return
 * byte-identical payloads (see `saveQuizResponse`). */
const quizResponseInclude = Prisma.validator<Prisma.QuizResponseDefaultArgs>()({
  include: {
    user: {
      select: {
        id: true,
        email: true,
        name: true,
        fitnessGoal: true,
        fitnessLevel: true,
      },
    },
    recommendedProgram: true,
  },
});

export type QuizResponseWithRelations = Prisma.QuizResponseGetPayload<
  typeof quizResponseInclude
>;

/** True when `error` is a Prisma unique-constraint violation (P2002). */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  );
}

/**
 * Saves a quiz response and links it to the authenticated user.
 *
 * Steps:
 *   1. Resolve the authenticated Supabase user (throws if unauthenticated).
 *   2. Ensure the linked Prisma `User` row exists (`syncUserWithSupabase`).
 *   3. Persist idempotently via `createQuizResponseForUser`: in ONE
 *      transaction derive profile fields (`fitnessGoal` / `fitnessLevel`)
 *      from the submitted answers, then create the `QuizResponse`. Deriving
 *      first means the returned `user` include reflects the freshly updated
 *      profile (not a stale snapshot), and both writes commit or roll back
 *      atomically.
 *
 * Idempotency: when `input.clientRequestId` is set, a replay (retry after a
 * lost response, refresh mid-flow, post-OTP resume) returns the EXISTING
 * `QuizResponse` for (clientRequestId, user) instead of creating a duplicate;
 * a key owned by a different user is rejected with
 * `QuizResponseConflictError`.
 *
 * @returns the created (or replayed) QuizResponse, including a safe
 *          projection of the linked user and (if any) the recommended
 *          program.
 * @throws {UnauthenticatedError} when the request has no auth session.
 * @throws {QuizResponseConflictError} when `clientRequestId` belongs to
 *         another user.
 */
export async function saveQuizResponse(
  input: SaveQuizResponseInput,
): Promise<QuizResponseWithRelations> {
  const supabaseUser = await getSupabaseAuthUser();
  const user = await syncUserWithSupabase(supabaseUser);
  return createQuizResponseForUser(user.id, input, prisma);
}

/**
 * Creates (or idempotently replays) a quiz response for an already-resolved
 * user id. Exported separately from `saveQuizResponse` so it can be reused
 * (e.g. tests) without the request-scoped auth resolution.
 *
 * @param client an explicit Prisma client for tests — defaults to the shared
 *        singleton.
 */
export async function createQuizResponseForUser(
  userId: string,
  input: SaveQuizResponseInput,
  client: PrismaClient = prisma,
): Promise<QuizResponseWithRelations> {
  // Fast replay path: a previous attempt already persisted this completion.
  if (input.clientRequestId) {
    const existing = await client.quizResponse.findFirst({
      where: {clientRequestId: input.clientRequestId, userId},
      ...quizResponseInclude,
    });
    if (existing) return existing;
  }

  try {
    return await client.$transaction(async (tx) => {
      // The quiz answers are the source of truth for the user's profile fields.
      await updateUserProfileFromQuiz(tx, userId, input.answers);

      return tx.quizResponse.create({
        data: {
          userId,
          answers: input.answers as Prisma.InputJsonValue,
          recommendedProgramId: input.recommendedProgramId ?? null,
          score: input.score ?? null,
          clientRequestId: input.clientRequestId ?? null,
        },
        ...quizResponseInclude,
      });
    });
  } catch (error) {
    // A concurrent request with the same key won the create race. Replay the
    // winner — but only for THIS user; a foreign key is a client conflict.
    if (input.clientRequestId && isUniqueViolation(error)) {
      const winner = await client.quizResponse.findFirst({
        where: {clientRequestId: input.clientRequestId, userId},
        ...quizResponseInclude,
      });
      if (winner) return winner;
      throw new QuizResponseConflictError();
    }
    throw error;
  }
}

/**
 * Returns the authenticated user's quiz responses, newest first.
 * @param userId optional override — defaults to the current user.
 * @throws {UnauthenticatedError} if there is no valid session.
 */
export async function getQuizResponses(userId?: string) {
  const supabaseUser = await getSupabaseAuthUser();
  const ownerId = userId ?? (await syncUserWithSupabase(supabaseUser)).id;

  return prisma.quizResponse.findMany({
    where: { userId: ownerId },
    orderBy: { createdAt: 'desc' },
    include: { recommendedProgram: true },
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Maps quiz answers onto the User profile fields declared in the schema. */
async function updateUserProfileFromQuiz(
  tx: Prisma.TransactionClient,
  userId: string,
  answers: QuizAnswers,
) {
  const data: Prisma.UserUpdateInput = {};

  const goals = Array.isArray(answers.goal)
    ? answers.goal
        .filter((goal): goal is string => typeof goal === 'string' && goal.trim().length > 0)
        .map((goal) => goal.trim())
    : typeof answers.goal === 'string' && answers.goal.trim().length > 0
      ? [answers.goal.trim()]
      : [];
  if (goals.length > 0) {
    // Keep the existing scalar profile column backward-compatible while the
    // complete multi-goal array remains available in QuizResponse.answers.
    data.fitnessGoal = goals.join(',');
  }

  if (typeof answers.level === 'string') {
    const level = QUIZ_LEVEL_TO_ENUM[answers.level.toLowerCase()];
    if (level) data.fitnessLevel = level;
  }

  if (Object.keys(data).length === 0) return;
  await tx.user.update({ where: { id: userId }, data });
}
