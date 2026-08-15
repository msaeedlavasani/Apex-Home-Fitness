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
 * zod-validated program (`generateObject` + `ProgramSchema`) and hands it to
 * `saveGeneratedProgram`, which:
 *   1. Resolves the authenticated Supabase user (throws
 *      `UnauthenticatedError` when there is no session).
 *   2. Ensures the linked Prisma `User` row exists (`syncUserWithSupabase`),
 *      so the program's `ownerId` points at the current user.
 *   3. In ONE `prisma.$transaction`:
 *      a. Upserts every referenced exercise by its unique name — create-only
 *         when missing, so curated seed rows are never overwritten.
 *      b. Creates the `Program` owned by the user.
 *      c. Links exercises through `ProgramExercise` with the AI prescription
 *         (sets / reps / rest) in program order.
 *
 * Transaction safety: steps (3a)–(3c) share a single interactive transaction.
 * If any write fails, Prisma rolls everything back — the database never ends
 * up with a `Program` missing its `ProgramExercise` links, and no orphaned
 * exercises are left behind.
 *
 * All functions are server-only: they read the request's auth cookie via
 * `createServerSupabaseClient` and use Prisma. Call them from Route
 * Handlers, Server Actions or Server Components.
 */
import { DifficultyLevel, ExerciseCategory, Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { getSupabaseAuthUser, syncUserWithSupabase } from './userService';

// ---------------------------------------------------------------------------
// Types — mirrors the validated `ProgramSchema` from
// `src/app/api/generate-program/route.ts` (the shape of `result.object`).
// ---------------------------------------------------------------------------

export type AiMethod =
  | 'strength'
  | 'hypertrophy'
  | 'cardio'
  | 'mobility'
  | 'pilates'
  | 'bodyweight'
  | 'isometric'
  | 'flexibility';

export type AiEquipment =
  | 'none'
  | 'dumbbell'
  | 'barbell'
  | 'kettlebell'
  | 'resistance_band'
  | 'pull_up_bar'
  | 'bench'
  | 'mat'
  | 'cardio_machine'
  | 'other';

export type AiProgramMode = 'general' | 'injury_focused' | 'equipment_limited';

/** A single exercise object inside the validated AI output. */
export interface AiExercise {
  id: string;
  name: string;
  method: AiMethod;
  equipment: AiEquipment;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  tempo: string | null;
  rpe: number | null;
  instruction_cue: string;
  alternatives: Array<{ name: string; equipment: string; reason: string }>;
  contraindicated_for: string[];
}

/** One training day inside the validated AI output. */
export interface AiWeeklySession {
  day: number;
  focus: string;
  warmup: Array<{ name: string; duration_seconds: number; purpose: string }>;
  exercises: AiExercise[];
  cooldown: Array<{ name: string; duration_seconds: number; purpose: string }>;
  notes?: string;
}

/** The full validated AI program output (`ProgramSchema`). */
export interface AiGeneratedProgram {
  mode: AiProgramMode;
  program_id: string;
  method_mix: {
    strength_pct: number;
    hypertrophy_pct: number;
    cardio_pct: number;
    mobility_pct: number;
    pilates_pct: number;
    bodyweight_pct: number;
    isometric_pct: number;
  };
  weekly_schedule: AiWeeklySession[];
  progression_plan: {
    weeks_1_2: string;
    weeks_3_5: string;
    week_6: string;
    overload_variables: string[];
  };
  warnings: string[];
  notes: string;
  disclaimer: string;
}

export interface SaveGeneratedProgramInput {
  /** The validated AI output (shape of `ProgramSchema` in the route). */
  program: AiGeneratedProgram;
  /**
   * The user's fitness level from the request
   * ('beginner' | 'intermediate' | 'advanced').
   */
  level: string;
  /** The user's stated goal — used to enrich the program description. */
  goal?: string;
  /**
   * Optional explicit program name. Defaults to `AI Program <program_id>`
   * (unique, since the AI emits a fresh `program_id` per generation and
   * `Program.name` is unique).
   */
  name?: string;
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
 */
export function buildProgramDraft(input: SaveGeneratedProgramInput): ProgramDraft {
  const { program } = input;
  const seen = new Set<string>();

  const exercises: Prisma.ExerciseCreateInput[] = [];
  const programExercises: ProgramExerciseDraft[] = [];
  let order = 0;

  for (const session of program.weekly_schedule ?? []) {
    for (const ex of session.exercises ?? []) {
      if (seen.has(ex.name)) continue; // composite PK — one row per exercise per program
      seen.add(ex.name);
      order += 1;

      exercises.push({
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
      });

      programExercises.push({
        exerciseName: ex.name,
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
    sessionsPerWeek: program.weekly_schedule?.length ?? 0,
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
 * Exported separately from `saveGeneratedProgram` so it can be reused
 * (e.g. tests) with an already-resolved user id.
 *
 * @throws P2002 when a program with the same `name` already exists (the
 *         transaction is rolled back, nothing is partially written).
 */
export async function persistProgramForUser(
  userId: string,
  input: SaveGeneratedProgramInput,
): Promise<ProgramWithDetails> {
  const draft = buildProgramDraft(input);

  return prisma.$transaction(async (tx) => {
    // 1) Exercises — create-if-missing (upsert by unique name with an empty
    //    update so curated seed rows are never overwritten).
    for (const exercise of draft.exercises) {
      await tx.exercise.upsert({
        where: { name: exercise.name },
        update: {},
        create: exercise,
      });
    }

    // 2) Program — linked to the current authenticated user.
    const program = await tx.program.create({
      data: {
        name: draft.name,
        description: draft.description,
        level: draft.level,
        durationWeeks: draft.durationWeeks,
        sessionsPerWeek: draft.sessionsPerWeek,
        ownerId: userId,
      },
    });

    // 3) ProgramExercise links with the AI prescription, in program order.
    if (draft.programExercises.length > 0) {
      const names = Array.from(new Set(draft.programExercises.map((row) => row.exerciseName)));
      const exercises = await tx.exercise.findMany({
        where: { name: { in: names } },
        select: { id: true, name: true },
      });
      const exerciseIdByName = new Map(exercises.map((e) => [e.name, e.id]));

      await tx.programExercise.createMany({
        data: draft.programExercises.map((row) => ({
          programId: program.id,
          exerciseId: exerciseIdByName.get(row.exerciseName) as string,
          order: row.order,
          sets: row.sets,
          reps: row.reps,
          restSeconds: row.restSeconds,
        })),
      });
    }

    return tx.program.findUniqueOrThrow({
      where: { id: program.id },
      ...programWithDetails,
    });
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
