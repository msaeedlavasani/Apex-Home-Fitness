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
 * All functions in this module are server-only — they read the request's
 * auth cookie (via `createServerSupabaseClient`) and use Prisma. Call them
 * from Route Handlers, Server Actions or Server Components.
 */
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { DifficultyLevel, Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { createServerSupabaseClient } from '../lib/supabase-server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Onboarding quiz answers as produced by `src/components/quiz/OnboardingQuiz`:
 * `{ level, goal, equipment, limitations, limitationsDetails }`.
 * The schema stores the payload as a flexible Json value, so extra keys are
 * allowed (e.g. future steps such as `timePerSessionMin`).
 */
export interface QuizAnswers {
  /** 'beginner' | 'intermediate' | 'advanced' */
  level?: string;
  /** 'strength' | 'fat_loss' | 'flexibility' | 'functional_fitness' */
  goal?: string;
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
  const supabase = createServerSupabaseClient();
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

/**
 * Saves a quiz response and links it to the authenticated user.
 *
 * Steps:
 *   1. Resolve the authenticated Supabase user (throws if unauthenticated).
 *   2. Ensure the linked Prisma `User` row exists (`syncUserWithSupabase`).
 *   3. Create the `QuizResponse` owned by that user.
 *   4. Derive profile fields (`fitnessGoal` / `fitnessLevel`) on the linked
 *      user from the submitted answers.
 *
 * @returns the created QuizResponse, including a safe projection of the
 *          linked user and (if any) the recommended program.
 * @throws {UnauthenticatedError} when the request has no auth session.
 */
export async function saveQuizResponse(input: SaveQuizResponseInput) {
  const supabaseUser = await getSupabaseAuthUser();
  const user = await syncUserWithSupabase(supabaseUser);

  const quizResponse = await prisma.quizResponse.create({
    data: {
      userId: user.id,
      answers: input.answers as Prisma.InputJsonValue,
      recommendedProgramId: input.recommendedProgramId ?? null,
      score: input.score ?? null,
    },
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

  // The quiz answers are the source of truth for the user's profile fields.
  await updateUserProfileFromQuiz(user.id, input.answers);

  return quizResponse;
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
async function updateUserProfileFromQuiz(userId: string, answers: QuizAnswers) {
  const data: Prisma.UserUpdateInput = {};

  if (typeof answers.goal === 'string' && answers.goal.trim()) {
    data.fitnessGoal = answers.goal.trim();
  }

  if (typeof answers.level === 'string') {
    const level = QUIZ_LEVEL_TO_ENUM[answers.level.toLowerCase()];
    if (level) data.fitnessLevel = level;
  }

  if (Object.keys(data).length === 0) return;
  await prisma.user.update({ where: { id: userId }, data });
}
