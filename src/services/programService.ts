/**
 * Program service — persists validated AI-generated workout programs into the
 * Prisma `Program` / `ProgramExercise` tables and links them to the current
 * authenticated user.
 *
 * Reference (prisma/schema.prisma):
 *   model Program {
 *     id              String   @id @default(cuid())
 *     name            String   @unique
 *     description     String
 *     level           DifficultyLevel
 *     durationWeeks   Int
 *     sessionsPerWeek Int?
 *     ownerId         String?               // -> User ("UserPrograms")
 *     exercises       ProgramExercise[]
 *   }
 *   model ProgramExercise {
 *     programId   String
 *     exerciseId  String
 *     order       Int
 *     sets        Int?
 *     reps        Int?
 *     restSeconds Int?
 *     @@id([programId, exerciseId])
 *   }
 *   model Exercise {
 *     name       String          @unique
 *     category   ExerciseCategory
 *     difficulty DifficultyLevel
 *     ...
 *   }
 *
 * Integration model: `src/app/api/generate-program/route.ts` produces a
 * zod-validated program (`generateObject` + `ProgramSchema`) and calls
 * `persistProgramForUser(user.id, ...)` directly — the route already resolved
 * the authenticated user for the workout-history lookup. `saveGeneratedProgram`
 * is the equivalent convenience wrapper for callers that still need the user
 * resolution done here, which:
 *   1. Resolves the authenticated Supabase user (throws
 *      `UnauthenticatedError` when there is no session).
 *   2. Ensures the linked Prisma `User` row exists (`syncUserWithSupabase`),
 *      so the program's `ownerId` points at the current user.
 *   3. In ONE `prisma.$transaction`:
 *      a. Upserts every referenced exercise by its unique name — create-only
 *         when missing, so curated seed rows are never overwritten.
 *      b. Creates the `Program` owned by the user, or — when the user
 *         already has one (the app is single-program) — updates that
 *         program IN PLACE (same `Program.id`, replaced schedule / rest days
 *         / exercise links) so stored workout history stays attached across
 *         regenerations.
 *      c. Links exercises through `ProgramExercise` with the AI prescription
 *         (sets / reps / rest) in program order.
 *
 * Transaction safety: steps (3a)–(3c) share a single interactive transaction.
 * If any write fails, Prisma rolls everything back — the database never ends
 * up with a `Program` missing its `ProgramExercise` links, and no orphaned
 * exercises are left behind.
 *
 * Timeout safety: the transaction is bounded — `withTimeout` enforces a
 * client-side deadline (`PERSIST_TIMEOUT_MS`) and rejects with a stable
 * `TimeoutError` (code `PERSISTENCE_TIMEOUT`) so a stuck database cannot hold
 * the request's concurrency slot open indefinitely; Prisma's native
 * `$transaction` `timeout`/`maxWait` act as a larger server-side backstop that
 * rolls the transaction back. Budgets live in `src/lib/timeout.ts`.
 *
 * All functions are server-only: they read the request's auth cookie via
 * `createServerSupabaseClient` and use Prisma. Call them from Route
 * Handlers, Server Actions or Server Components.
 */
import {
  DifficultyLevel,
  ExerciseCategory,
  GenerationRequestStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';

import { prisma } from '../lib/prisma';
import type {
  AiGeneratedProgram,
  AiExercise,
  AiEquipment,
  AiMethod,
  AiProgramMode,
  AiWeeklySession,
} from '../lib/ai/contracts';
import { isRestDay } from '../lib/ai/restDays';
import { CANONICAL_CATALOG, resolveWithAmbiguity } from '../lib/exercise';
import {
  PERSIST_MAX_WAIT_MS,
  PERSIST_TIMEOUT_MS,
  PERSIST_TRANSACTION_TIMEOUT_MS,
  TIMEOUT_CODES,
  withTimeout,
} from '../lib/timeout';
import { getSupabaseAuthUser, syncUserWithSupabase } from './userService';

// Canonical owner of the AI program contracts: `src/lib/ai/contracts.ts`
// (S-01 Shared Contract Ownership). Re-exported here for compatibility — new
// code should import them from `@/lib/ai/contracts`.
export type {
  AiGeneratedProgram,
  AiExercise,
  AiEquipment,
  AiMethod,
  AiProgramMode,
  AiWeeklySession,
};

export interface SaveGeneratedProgramInput {
  /** The validated AI output (shape of `ProgramSchema` in the route). */
  program: AiGeneratedProgram;
  /**
   * The user's fitness level from the request
   * ('beginner' | 'intermediate' | 'advanced').
   */
  level: string;
  /**
   * The user's stated goal(s) — used to enrich the program description.
   * The route passes a comma-joined string of the normalized goal array
   * (e.g. `"strength, fat_loss"`); a single legacy string works too.
   */
  goal?: string;
  /** Preferred exercise-style ids selected in the onboarding quiz. */
  exerciseStyles?: string[];
  /**
   * Optional explicit program name. Defaults to `AI Program <program_id>`
   * (unique, since the AI emits a fresh `program_id` per generation and
   * `Program.name` is unique).
   */
  name?: string;
  /**
   * The user's rest-day selection (1–3 canonical weekday ids). Persisted on
   * the `Program` row (`restDays` Json). Rest-day sessions are excluded from
   * the persisted exercise links, so a stored program never contains a
   * workout on a selected rest day.
   */
  restDays?: string[];
}

// ---------------------------------------------------------------------------
// Mapping helpers (pure — exported for reuse and testing)
// ---------------------------------------------------------------------------

/**
 * The AI progression plan is always 6 weeks (weeks 1–2, 3–5, 6).
 */
export const PROGRAM_DURATION_WEEKS = 6;

const LEVEL_TO_ENUM: Record<string, DifficultyLevel> = {
  beginner: DifficultyLevel.BEGINNER,
  intermediate: DifficultyLevel.INTERMEDIATE,
  advanced: DifficultyLevel.ADVANCED,
};

/** Maps a free-form level string to the Prisma `DifficultyLevel` enum. */
export function levelToDifficulty(level?: string | null): DifficultyLevel {
  const normalized = level?.trim().toLowerCase() ?? '';
  return LEVEL_TO_ENUM[normalized] ?? DifficultyLevel.BEGINNER;
}

/**
 * Maps an AI `method` to the closest `ExerciseCategory` in the schema.
 * The schema has no generic "strength" category, so strength/hypertrophy
 * land on CALISTHENICS (or RESISTANCE_BAND when band-based).
 */
export function methodToCategory(
  method: AiMethod,
  equipment: AiEquipment,
): ExerciseCategory {
  switch (method) {
    case 'cardio':
      return ExerciseCategory.HIIT;
    case 'mobility':
    case 'flexibility':
      return ExerciseCategory.MOBILITY;
    case 'pilates':
      return ExerciseCategory.PILATES;
    case 'isometric':
      return ExerciseCategory.ISOMETRIC;
    case 'bodyweight':
      return ExerciseCategory.CALISTHENICS;
    case 'strength':
    case 'hypertrophy':
      return equipment === 'resistance_band'
        ? ExerciseCategory.RESISTANCE_BAND
        : ExerciseCategory.CALISTHENICS;
  }
}

const EQUIPMENT_LABELS: Record<AiEquipment, string> = {
  none: 'none',
  dumbbell: 'dumbbell',
  barbell: 'barbell',
  kettlebell: 'kettlebell',
  resistance_band: 'resistance band',
  pull_up_bar: 'pull-up bar',
  bench: 'bench',
  mat: 'mat',
  cardio_machine: 'cardio machine',
  cable_machine: 'cable machine',
  jump_rope: 'jump rope',
  other: 'other',
};

/** Stores the AI equipment as the Json array the `Exercise.equipment` field expects. */
function equipmentToJson(equipment: AiEquipment): Prisma.InputJsonValue {
  return equipment === 'none' ? [] : [EQUIPMENT_LABELS[equipment]];
}

/**
 * Parses the AI `reps` string (e.g. "8-10", "12", "AMRAP", "30s hold") into
 * a single integer for the `ProgramExercise.reps` Int column. Non-numeric
 * prescriptions (AMRAP, timed holds) map to `null` — the full text stays in
 * the linked `Exercise` instructions.
 */
export function parseReps(reps: string | null | undefined): number | null {
  if (!reps) return null;
  const match = /^\s*(\d+)/.exec(reps.trim());
  return match ? Number(match[1]) : null;
}

/** Builds the ordered step-by-step cue list stored in `Exercise.instructions`. */
function buildInstructions(ex: AiExercise): Prisma.InputJsonValue {
  const steps: string[] = [ex.instruction_cue];
  if (ex.tempo) steps.push(`Tempo: ${ex.tempo}.`);
  if (ex.rpe != null) steps.push(`RPE: ${ex.rpe}.`);
  return steps;
}

// ---------------------------------------------------------------------------
// Draft mapping (pure)
// ---------------------------------------------------------------------------

export interface ProgramExerciseDraft {
  exerciseName: string;
  /** Canonical system-catalog slug when the name resolved (S02-C), else undefined. */
  slug?: string;
  order: number;
  sets: number | null;
  reps: number | null;
  restSeconds: number | null;
}

export interface ProgramDraft {
  name: string;
  description: string;
  level: DifficultyLevel;
  durationWeeks: number;
  sessionsPerWeek: number;
  /** Rest-day weekday ids (persisted on `Program.restDays`). */
  restDays: string[];
  /** Full enforced AI schedule, retained for the dashboard and workout route. */
  weeklySchedule: AiWeeklySession[];
  /** Exercise rows to create (create-only — existing rows are left untouched). */
  exercises: Prisma.ExerciseCreateInput[];
  programExercises: ProgramExerciseDraft[];
}

/**
 * Transforms a validated AI program into the Prisma write shape.
 *
 * `ProgramExercise` uses the composite key `@@id([programId, exerciseId])`,
 * so the same exercise can appear at most once per program — when the AI
 * repeats an exercise across sessions, only its first occurrence is linked.
 *
 * Rest-day enforcement: sessions that must not carry a workout are SKIPPED
 * entirely — they contribute no exercise links, and `sessionsPerWeek` counts
 * only real training days. The skip decision is `isRestDay` (see
 * `src/lib/ai/restDays.ts`): an explicit `is_rest_day: true` flag OR a
 * session whose weekday (`day_name`, with a numeric `day` ISO fallback) is
 * one of the user's selected rest days. The route already runs
 * `enforceRestDays` before persistence, so this is defense in depth — a
 * persisted program never contains a workout on a selected rest day, even if
 * a caller bypassed the route-level pass.
 */
export function buildProgramDraft(input: SaveGeneratedProgramInput): ProgramDraft {
  const { program } = input;
  const restDays = input.restDays ?? [];
  const seen = new Set<string>();

  const exercises: Prisma.ExerciseCreateInput[] = [];
  const programExercises: ProgramExerciseDraft[] = [];
  let order = 0;

  const trainingSessions = (program.weekly_schedule ?? []).filter(
    (session) => !isRestDay(session, restDays),
  );

  for (const session of trainingSessions) {
    for (const ex of session.exercises ?? []) {
      if (seen.has(ex.name)) continue; // composite PK — one row per exercise per program
      seen.add(ex.name);
      order += 1;

      // S02-C: best-effort canonical resolution. When the incoming exercise
      // name resolves uniquely to a system-catalog entry, the DB row gains a
      // canonical `slug` so identity can progressively become canonical.
      // The display `name` is preserved as-is (incoming name — see Step 4
      // name-preservation policy); unresolved/ambiguous input stays NULL.
      const resolution = resolveWithAmbiguity({ kind: 'name', name: ex.name }, CANONICAL_CATALOG);
      const resolvedSlug =
        resolution.status === 'RESOLVED' && resolution.entry ? resolution.entry.slug : undefined;
      const createInput: Prisma.ExerciseCreateInput = {
        name: ex.name,
        description: ex.instruction_cue || `AI-generated exercise: ${ex.name}.`,
        category: methodToCategory(ex.method, ex.equipment),
        equipment: equipmentToJson(ex.equipment),
        difficulty: levelToDifficulty(input.level),
        durationSeconds: null,
        reps: parseReps(ex.reps),
        sets: ex.sets,
        restSeconds: ex.rest_seconds,
        instructions: buildInstructions(ex),
        imageUrl: null,
      };
      if (resolvedSlug) {
        // Slug is the identity anchor; faName is intentionally NOT populated
        // (no Persian corpus — Step 5 faName policy).
        createInput.slug = resolvedSlug;
      }
      exercises.push(createInput);

      programExercises.push({
        exerciseName: ex.name,
        slug: resolvedSlug,
        order,
        sets: ex.sets,
        reps: parseReps(ex.reps),
        restSeconds: ex.rest_seconds,
      });
    }
  }

  return {
    name: input.name?.trim() || `AI Program ${program.program_id}`,
    description: buildDescription(input),
    level: levelToDifficulty(input.level),
    durationWeeks: PROGRAM_DURATION_WEEKS,
    sessionsPerWeek: trainingSessions.length,
    restDays: input.restDays ?? [],
    weeklySchedule: program.weekly_schedule ?? [],
    exercises,
    programExercises,
  };
}

function buildDescription(input: SaveGeneratedProgramInput): string {
  const { program, goal } = input;
  const parts: string[] = [];
  const goalPart = goal?.trim();
  if (goalPart) parts.push(`Goal: ${goalPart}.`);
  parts.push(`AI-generated ${program.mode.replace(/_/g, ' ')} program.`);
  if (program.notes?.trim()) parts.push(program.notes.trim());
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const programWithDetails = Prisma.validator<Prisma.ProgramDefaultArgs>()({
  include: {
    exercises: {
      orderBy: { order: 'asc' },
      include: { exercise: true },
    },
    owner: { select: { id: true, email: true, name: true } },
  },
});

export type ProgramWithDetails = Prisma.ProgramGetPayload<typeof programWithDetails>;

/**
 * Persists a validated AI program for a given user inside a single
 * transaction (exercise upserts + Program + ProgramExercise links).
 *
 * In-place regeneration: when the user already owns a program, its existing
 * row is updated (same `Program.id`) instead of a new one being inserted, so
 * `WorkoutSession.programId` history and `QuizResponse.recommendedProgramId`
 * stay attached across regenerations (see `persistProgramTransaction`).
 *
 * Timeouts: the transaction runs with a bounded budget — `withTimeout`
 * (PERSIST_TIMEOUT_MS) enforces the client-side deadline and rejects with a
 * stable `TimeoutError` (code `PERSISTENCE_TIMEOUT`), while Prisma's native
 * `$transaction` `timeout` (PERSIST_TRANSACTION_TIMEOUT_MS, larger than the
 * wrapper's) acts as a server-side backstop that rolls the transaction back.
 *
 * Exported separately from `saveGeneratedProgram` so it can be reused
 * (e.g. tests) with an already-resolved user id.
 *
 * @throws TimeoutError (code `PERSISTENCE_TIMEOUT`) when the transaction does
 *         not settle within `PERSIST_TIMEOUT_MS`.
 * @throws P2002 when a program with the same `name` already exists (the
 *         transaction is rolled back, nothing is partially written).
 */
export async function persistProgramForUser(
  userId: string,
  input: SaveGeneratedProgramInput,
): Promise<ProgramWithDetails> {
  const transaction = prisma.$transaction(
    (tx) => persistProgramTransaction(tx, userId, input),
    {
      // Native backstop: bounds how long the engine keeps the transaction open
      // and how long it waits for a pooled connection. Must stay larger than
      // `PERSIST_TIMEOUT_MS` so `withTimeout` rejects first with our typed
      // `TimeoutError` and the engine rollback only fires for stuck transactions.
      timeout: PERSIST_TRANSACTION_TIMEOUT_MS,
      maxWait: PERSIST_MAX_WAIT_MS,
    },
  );

  return withTimeout(transaction, PERSIST_TIMEOUT_MS, {
    message: 'Program persistence timed out',
    code: TIMEOUT_CODES.PERSISTENCE,
  });
}

export interface PersistProgramWithIdempotencyInput extends SaveGeneratedProgramInput {
  /** The claimed idempotency record to finalize (from `beginIdempotentGeneration`). */
  idempotencyRecordId: string;
}

/**
 * Persists a validated AI program AND finalizes its idempotency record to
 * SUCCEEDED in ONE transaction. The Program create and the replayable
 * `responsePayload` commit atomically, so a persisted program is never
 * observable without a matching replayable record (and vice versa) — a retry
 * with the same `Idempotency-Key` replays the exact same response and never
 * persists a duplicate program.
 *
 * Same timeout budget as `persistProgramForUser`; on failure the caller must
 * mark the record FAILED (see `markIdempotentGenerationFailed`).
 */
export async function persistProgramForUserWithIdempotency(
  userId: string,
  input: PersistProgramWithIdempotencyInput,
  client: PrismaClient = prisma,
): Promise<ProgramWithDetails> {
  const transaction = client.$transaction(
    async (tx) => {
      const program = await persistProgramTransaction(tx, userId, input);

      // Cache the exact route response body ({ program, generated }) so retries
      // replay byte-identical 200s. Cast: `program` carries Date objects which
      // Prisma's Json serializer turns into ISO strings — the same shape
      // `NextResponse.json` would produce on the original request.
      const responsePayload = {program, generated: input.program} as unknown as Prisma.InputJsonValue;
      await tx.programGenerationRequest.update({
        where: {id: input.idempotencyRecordId},
        data: {
          status: GenerationRequestStatus.SUCCEEDED,
          programId: program.id,
          responsePayload,
        },
      });

      return program;
    },
    {
      timeout: PERSIST_TRANSACTION_TIMEOUT_MS,
      maxWait: PERSIST_MAX_WAIT_MS,
    },
  );

  return withTimeout(transaction, PERSIST_TIMEOUT_MS, {
    message: 'Program persistence timed out',
    code: TIMEOUT_CODES.PERSISTENCE,
  });
}

/**
 * The core persistence steps shared by `persistProgramForUser` and
 * `persistProgramForUserWithIdempotency` (they differ only in finalizing the
 * idempotency record inside the same transaction).
 *
 * In-place regeneration: when the user ALREADY owns a program (the app is
 * single-program — the dashboard reads the latest), the existing Program row
 * is UPDATED in place (same `Program.id`) rather than a new row being
 * inserted. This keeps every `WorkoutSession.programId` reference, the
 * `QuizResponse.recommendedProgramId` link and the generation-ledger
 * `programId` pointing at the SAME program, so stored workout history stays
 * attached across regenerations and no orphaned program rows accumulate.
 * The old exercise links are replaced by the new prescription in the same
 * transaction (they only reference `Exercise` rows, which are never deleted,
 * so historical `WorkoutSessionExercise` rows are untouched).
 */
/**
 * S02-C: canonical-aware exercise upsert. The fallback rule is that a Program
 * that persists today must keep persisting — resolver/slug work is strictly
 * additive and best-effort.
 *
 * - no slug (unresolved/ambiguous input): existing name-upsert, `slug` stays
 *   NULL — behavior identical to pre-S02-C.
 * - with slug (resolved input):
 *   1. reuse an existing canonical row keyed by `slug` when present;
 *   2. otherwise reuse/attach by exact `name`: a legacy row is updated with
 *      the slug (idempotent — the resolver is deterministic, so the same name
 *      always maps to the same slug), or a new row is created with the slug;
 *   3. if the slug is already owned by a *differently-named* canonical row
 *      (a real alias-variant collision, e.g. "Cat Cow" vs "Cat-Cow"), the
 *      unique constraint is NOT allowed to fail the Program — fall back to the
 *      legacy name-only upsert and leave the row un-slugged.
 *
 * Transactional/serialization note: concurrent interactive transactions on
 * SQLite serialize on the write lock, so after one commit the by-slug/by-name
 * lookup sees the committed row; a P2002 in the optimistic re-check just means
 * another logical position won the row and we degrade cleanly.
 */
async function upsertCanonicalExercise(
  tx: Prisma.TransactionClient,
  exercise: Prisma.ExerciseCreateInput,
): Promise<{ id: string; name: string; slug: string | null }> {
  const { name, slug } = exercise;

  // Unresolved / ambiguous — legacy behavior (no slug to resolve against).
  if (!slug) {
    return tx.exercise.upsert({
      where: { name },
      update: {},
      create: exercise,
      select: { id: true, name: true, slug: true },
    });
  }

  // 1) Reuse a pre-existing canonical slug row (avoids creating a duplicate
  //    when the same canonical exercise is referenced more than once).
  const canonical = await tx.exercise.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (canonical) return canonical;

  // 2) Reuse/attach by exact name, or create a new row with the slug.
  const withSlug = { ...exercise, slug };
  try {
    return await tx.exercise.upsert({
      where: { name },
      update: { slug }, // attach to a legacy NULL-slug row (idempotent)
      create: { ...withSlug },
      select: { id: true, name: true, slug: true },
    });
  } catch (err) {
    // 3) The slug is already owned by a differently-named row (unique
    //    constraint) — never let slug population fail Program persistence.
    //    Fall back to the exact legacy name-upsert (strip the slug so this
    //    cannot re-collide).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const { slug: _slug, ...withoutSlug } = exercise;
      return tx.exercise.upsert({
        where: { name },
        update: {},
        create: withoutSlug,
        select: { id: true, name: true, slug: true },
      });
    }
    throw err;
  }
}

async function persistProgramTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  input: SaveGeneratedProgramInput,
): Promise<ProgramWithDetails> {
  const draft = buildProgramDraft(input);

  // 1) Exercises — create-if-missing (upsert by unique name with an empty
  //    update so curated seed rows are never overwritten). S02-C: resolved
  //    canonical exercises additionally adopt their slug opportunistically
  //    (reuse an existing canonical row, attach a slug to a legacy exact-name
  //    row, or create a new row with the slug) — but the name fallback below
  //    guarantees a Program that persists today still persists identically.
  //
  //    The identity map keys every upserted row by BOTH its display name and
  //    its slug (when set), so `ProgramExercise` links below resolve to the
  //    canonical row even when an alias/variant display name was reused.
  const exerciseIdByKey = new Map<string, string>();
  for (const exercise of draft.exercises) {
    const row = await upsertCanonicalExercise(tx, exercise);
    exerciseIdByKey.set(row.name, row.id);
    if (row.slug) exerciseIdByKey.set(row.slug, row.id);
  }

  // 2) Program — the user's current program (latest) is replaced IN PLACE;
  //    only the first generation creates a new row. The user's rest-day
  //    selection is persisted alongside (Json array of weekday ids) so the
  //    stored program keeps its rest-day contract.
  const existing = await tx.program.findFirst({
    where: {ownerId: userId},
    orderBy: {createdAt: 'desc'},
    select: {id: true},
  });

  const program = existing
    ? await (async () => {
        // Replace the exercise links of the current program with the new
        // prescription. `WorkoutSessionExercise` references `Exercise` only,
        // so completed/in-progress sessions are not affected.
        await tx.programExercise.deleteMany({where: {programId: existing.id}});
        return await tx.program.update({
          where: {id: existing.id},
          data: {
            name: draft.name,
            description: draft.description,
            level: draft.level,
            durationWeeks: draft.durationWeeks,
            sessionsPerWeek: draft.sessionsPerWeek,
            restDays: draft.restDays,
            weeklySchedule: draft.weeklySchedule as unknown as Prisma.InputJsonValue,
          },
        });
      })()
    : await tx.program.create({
        data: {
          name: draft.name,
          description: draft.description,
          level: draft.level,
          durationWeeks: draft.durationWeeks,
          sessionsPerWeek: draft.sessionsPerWeek,
          restDays: draft.restDays,
          weeklySchedule: draft.weeklySchedule as unknown as Prisma.InputJsonValue,
          ownerId: userId,
        },
      });

  // 3) ProgramExercise links with the AI prescription, in program order.
  //    Resolve each link to the canonical row: prefer the slug key (so an
  //    alias/variant name links to the canonical row), else the exact display
  //    name (legacy/unresolved). Because every row was upserted above in the
  //    same transaction, the map is authoritative and no extra query is needed.
  if (draft.programExercises.length > 0) {
    const exerciseIdFor = (row: ProgramExerciseDraft): string =>
      (row.slug ? exerciseIdByKey.get(row.slug) : undefined) ??
      exerciseIdByKey.get(row.exerciseName) as string;

    await tx.programExercise.createMany({
      data: draft.programExercises.map((row) => ({
        programId: program.id,
        exerciseId: exerciseIdFor(row),
        order: row.order,
        sets: row.sets,
        reps: row.reps,
        restSeconds: row.restSeconds,
      })),
    });
  }

  return tx.program.findUniqueOrThrow({
    where: {id: program.id},
    ...programWithDetails,
  });
}

/**
 * Saves an AI-generated program into the `Program` / `ProgramExercise`
 * tables, linked to the current authenticated user.
 *
 * Steps:
 *   1. Resolve the authenticated Supabase user (throws `UnauthenticatedError`
 *      when the request has no auth session).
 *   2. Ensure the linked Prisma `User` row exists (`syncUserWithSupabase`).
 *   3. Persist program + exercises atomically (see `persistProgramForUser`).
 *
 * @returns the persisted program with its exercises and owner.
 */
export async function saveGeneratedProgram(
  input: SaveGeneratedProgramInput,
): Promise<ProgramWithDetails> {
  const supabaseUser = await getSupabaseAuthUser();
  const user = await syncUserWithSupabase(supabaseUser);
  return persistProgramForUser(user.id, input);
}
