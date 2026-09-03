/**
 * AL-01 — Workout outcome / feedback model contract.
 *
 * The type-level data model for what the system records after each workout
 * session: completion, per-exercise performance, subjective difficulty /
 * feedback, and the session context in which the workout happened. This is
 * the "Observation / Outcome" segment of the closed loop
 * (`docs/product/PRODUCT-STRATEGY.md` §3): the durable, user-attributable
 * record that later stages (AL-02 Personal Movement Profile, AL-03/AL-04
 * adaptation) consume.
 *
 * This module is PURE — no Prisma, React, Dexie, services, environment, or
 * runtime side effects. It only dictates the shape of a recorded outcome.
 *
 * Additive discipline (AL-01 acceptance): this contract does NOT modify any
 * existing session/persistence type. It builds on the S-04 session contract
 * (`src/lib/workout/sessionContracts.ts` — the canonical session
 * state/summary boundary) and reuses the S-02 canonical exercise identity
 * (`ExerciseId` / `ExerciseSlug`); existing records (`WorkoutStateRecord`,
 * `ExerciseLogRecord`, `SessionSummary`, …) are untouched.
 *
 * Canonical exercise identity (S-02): per-exercise outcomes carry
 * `exerciseId` / `slug` when the plan provides them. `name` is display-only
 * (already localized by the caller) and must NEVER be used as exercise
 * identity; `exerciseIndex` is the plan position, not identity.
 *
 * Fail-closed modeling: a subjective rating or a completion kind is a closed
 * enum with a runtime guard; absent/unknown feedback stays ABSENT (no
 * invented values, no guessing — the S02-E lesson applies to outcomes as it
 * applies to identity). Context vocabulary (equipment-constraint tokens) is
 * owned by the MG-02 movement taxonomy — this module references the token
 * TYPE only, never invents tokens.
 */

import type { ExerciseId, ExerciseSlug } from '../exercise';
import type { SessionSummary } from '../workout/sessionContracts';
import type { MovementConstraintToken } from '../movement';

/** Version of this outcome-contract schema. Bump on any breaking shape change. */
export const OUTCOME_CONTRACT_VERSION = 1 as const;

/** Version literal mirroring `OUTCOME_CONTRACT_VERSION`. */
export type OutcomeContractVersion = typeof OUTCOME_CONTRACT_VERSION;

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

/**
 * How a workout ended. `DID_NOT_START` covers sessions opened and abandoned
 * before a single set; `ABANDONED` covers sessions stopped mid-way;
 * `COMPLETED_PARTIALLY` covers intentional partial completion (e.g. the user
 * finished the planned exercises but skipped rests/cooldown by design).
 */
export type WorkoutCompletionKind =
  | 'COMPLETED_FULLY'
  | 'COMPLETED_PARTIALLY'
  | 'ABANDONED'
  | 'DID_NOT_START';

/** Closed runtime list of `WorkoutCompletionKind`. */
export const WORKOUT_COMPLETION_KINDS = [
  'COMPLETED_FULLY',
  'COMPLETED_PARTIALLY',
  'ABANDONED',
  'DID_NOT_START',
] as const;

/** Type guard for the closed completion vocabulary. */
export function isWorkoutCompletionKind(value: unknown): value is WorkoutCompletionKind {
  return typeof value === 'string' && (WORKOUT_COMPLETION_KINDS as readonly string[]).includes(value);
}

/** Session-level completion record — derived from the S-04 `SessionSummary`. */
export interface WorkoutCompletion {
  kind: WorkoutCompletionKind;
  /** Planned working sets for the session (summary `totalSets`). */
  totalSets: number;
  /** Sets actually completed (summary `completedSets`). */
  completedSets: number;
}

// ---------------------------------------------------------------------------
// Subjective difficulty / feedback vocabulary
// ---------------------------------------------------------------------------

/**
 * Subjective difficulty feeling — the user's felt intensity of an exercise or
 * a whole session (not an objective load measurement). Closed enum; display
 * text is EN-only until a real FA corpus exists (no invented Persian).
 */
export type SubjectiveDifficultyFeeling =
  | 'VERY_EASY'
  | 'EASY'
  | 'JUST_RIGHT'
  | 'HARD'
  | 'VERY_HARD';

/** Closed runtime list of `SubjectiveDifficultyFeeling`. */
export const SUBJECTIVE_DIFFICULTY_FEELINGS = [
  'VERY_EASY',
  'EASY',
  'JUST_RIGHT',
  'HARD',
  'VERY_HARD',
] as const;

/** Type guard for the closed difficulty vocabulary. */
export function isSubjectiveDifficultyFeeling(value: unknown): value is SubjectiveDifficultyFeeling {
  return (
    typeof value === 'string' &&
    (SUBJECTIVE_DIFFICULTY_FEELINGS as readonly string[]).includes(value)
  );
}

/** EN display map for `SubjectiveDifficultyFeeling` (fa deferred to MG-07 corpus rules). */
export const SUBJECTIVE_DIFFICULTY_DISPLAY: Record<SubjectiveDifficultyFeeling, string> = {
  VERY_EASY: 'Very easy',
  EASY: 'Easy',
  JUST_RIGHT: 'Just right',
  HARD: 'Hard',
  VERY_HARD: 'Very hard',
};

// ---------------------------------------------------------------------------
// Per-exercise performance
// ---------------------------------------------------------------------------

/**
 * One exercise's outcome within a recorded session. Positional fields come
 * from the session plan; performance fields are filled by the recorder from
 * set-level logs or the final session snapshot; `difficultyFeeling` / `note`
 * are user-provided.
 */
export interface PerExerciseOutcome {
  /** 0-based position of the exercise inside the workout plan — NOT identity. */
  exerciseIndex: number;
  /** Canonical Exercise identity (S-02) when the plan provides it. */
  exerciseId?: ExerciseId;
  /** Canonical Exercise slug (S-02) when the plan provides it. */
  slug?: ExerciseSlug;
  /** Display name, already localized by the caller. Display-only — never identity. */
  name?: string;
  /** Planned working sets. */
  plannedSets: number;
  /** Sets actually completed. */
  completedSets: number;
  /** Target reps per set (informational). */
  plannedReps?: number | null;
  /** Actual total reps across completed sets when reported. */
  actualReps?: number | null;
  /** Active seconds spent on this exercise when tracked. */
  durationSeconds?: number | null;
  /** Every planned set of this exercise was completed. */
  completed: boolean;
  /** Subjective per-exercise difficulty (user-reported; optional). */
  difficultyFeeling?: SubjectiveDifficultyFeeling;
  /** Free-form user note for this exercise (optional). */
  note?: string;
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

/** Whole-session subjective feedback (user-reported after the workout). */
export interface WorkoutFeedback {
  /** Felt difficulty of the whole session. */
  difficultyFeeling?: SubjectiveDifficultyFeeling;
  /** Whole-session satisfaction on a closed 1..5 scale (optional). */
  satisfactionRating?: 1 | 2 | 3 | 4 | 5;
  /** Free-form user comments (optional). */
  comments?: string;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * Session context — the environment the workout happened in. Kept minimal
 * and privacy-conscious: only facts the recording surface already knows are
 * modeled; nothing is inferred here.
 */
export interface OutcomeContext {
  /** Program this session belonged to, if any. */
  programId?: string | null;
  /** Where the plan came from. */
  programSource?: 'GENERATED' | 'CURATED' | 'MANUAL';
  /** Interface locale the session ran under. */
  locale?: 'en' | 'fa';
  /**
   * Equipment constraints the user reported encountering mid-session. Token
   * TYPE imported from the MG-02 movement taxonomy — the vocabulary is owned
   * there and must not be invented in this module.
   */
  equipmentConstraintsEncountered?: readonly MovementConstraintToken[];
  /** Equipment the user actually had available (display-only, never identity). */
  equipmentAvailable?: readonly string[];
  /** Local-timezone offset in minutes (capture-time normalization aid). */
  timezoneOffsetMinutes?: number;
}

// ---------------------------------------------------------------------------
// The canonical outcome record
// ---------------------------------------------------------------------------

/**
 * A complete recorded workout outcome — one per finished/abandoned session.
 * Every user-attributable learning signal the adaptive loop may consume
 * starts from this record.
 */
export interface WorkoutOutcomeRecord {
  contractVersion: OutcomeContractVersion;
  /** Recorder-owned opaque id (durable identity of THIS record). */
  outcomeId: string;
  /** Supabase auth user id when the session was user-owned (privacy-minimal: absent when unknown). */
  userId?: string;
  /** Local calendar day `YYYY-MM-DD` (same contract as `WorkoutStateRecord.dateKey`). */
  dateKey: string;
  /** Local session id when the recording surface provides one. */
  sessionId?: string;
  /** Epoch ms when the workout started (null until started). */
  startedAt: number | null;
  /** Epoch ms when the outcome was finalized (null if never started). */
  completedAt: number | null;
  /** Total active workout time in seconds (working + resting). */
  durationSeconds: number;
  completion: WorkoutCompletion;
  exercises: readonly PerExerciseOutcome[];
  feedback: WorkoutFeedback;
  context: OutcomeContext;
}

// ---------------------------------------------------------------------------
// Deterministic validation (fail-closed)
// ---------------------------------------------------------------------------

/** Categories of problems the deterministic validator can flag. */
export type OutcomeProblemKind =
  | 'BAD_VERSION'
  | 'BAD_DATE_KEY'
  | 'BAD_COMPLETION_KIND'
  | 'BAD_DURATION'
  | 'NEGATIVE_COUNTS'
  | 'COMPLETED_SETS_EXCEED_TOTAL'
  | 'EXERCISE_SETS_INCONSISTENT'
  | 'EXERCISE_INDEX_NEGATIVE'
  | 'DUPLICATE_EXERCISE_INDEX'
  | 'EXERCISE_COMPLETED_FLAG_INCONSISTENT'
  | 'BAD_TIMESTAMP_ORDER'
  | 'BAD_DIFFICULTY_FEELING'
  | 'BAD_SATISFACTION_RATING';

/** One deterministic finding about an outcome record. */
export interface OutcomeProblem {
  kind: OutcomeProblemKind;
  /** Human-readable path/description of the problem. */
  message: string;
}

/** Result of {@link validateOutcomeRecord}. */
export interface OutcomeValidation {
  valid: boolean;
  problems: readonly OutcomeProblem[];
}

/**
 * Deterministic, fail-closed validation of a `WorkoutOutcomeRecord`. The
 * validator never repairs and never guesses — it only reports problems so the
 * recorder can refuse to persist a malformed outcome.
 */
export function validateOutcomeRecord(record: WorkoutOutcomeRecord): OutcomeValidation {
  const problems: OutcomeProblem[] = [];
  const add = (kind: OutcomeProblemKind, message: string) => problems.push({ kind, message });

  if (record.contractVersion !== OUTCOME_CONTRACT_VERSION) {
    add('BAD_VERSION', `contractVersion must be ${OUTCOME_CONTRACT_VERSION}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.dateKey)) {
    add('BAD_DATE_KEY', `dateKey must be YYYY-MM-DD, got ${record.dateKey}`);
  }
  if (!isWorkoutCompletionKind(record.completion.kind)) {
    add('BAD_COMPLETION_KIND', `unknown completion kind: ${String(record.completion.kind)}`);
  }
  if (!Number.isFinite(record.durationSeconds) || record.durationSeconds < 0) {
    add('BAD_DURATION', `durationSeconds must be a non-negative finite number`);
  }
  if (record.completion.totalSets < 0 || record.completion.completedSets < 0) {
    add('NEGATIVE_COUNTS', 'completion counts must not be negative');
  }
  if (record.completion.completedSets > record.completion.totalSets) {
    add('COMPLETED_SETS_EXCEED_TOTAL', 'completedSets must not exceed totalSets');
  }
  if (
    record.startedAt !== null &&
    record.completedAt !== null &&
    record.completedAt < record.startedAt
  ) {
    add('BAD_TIMESTAMP_ORDER', 'completedAt must not precede startedAt');
  }
  if (record.feedback.difficultyFeeling !== undefined &&
      !isSubjectiveDifficultyFeeling(record.feedback.difficultyFeeling)) {
    add('BAD_DIFFICULTY_FEELING', 'feedback.difficultyFeeling is outside the closed vocabulary');
  }
  const satisfaction = record.feedback.satisfactionRating;
  if (satisfaction !== undefined && (satisfaction < 1 || satisfaction > 5)) {
    add('BAD_SATISFACTION_RATING', 'satisfactionRating must be an integer in 1..5');
  }

  const seenIndices = new Set<number>();
  for (const [i, ex] of record.exercises.entries()) {
    const where = `exercises[${i}]`;
    if (!Number.isInteger(ex.exerciseIndex) || ex.exerciseIndex < 0) {
      add('EXERCISE_INDEX_NEGATIVE', `${where}.exerciseIndex must be a non-negative integer`);
    } else if (seenIndices.has(ex.exerciseIndex)) {
      add('DUPLICATE_EXERCISE_INDEX', `${where} duplicates exerciseIndex ${ex.exerciseIndex}`);
    } else {
      seenIndices.add(ex.exerciseIndex);
    }
    if (ex.plannedSets < 0 || ex.completedSets < 0) {
      add('NEGATIVE_COUNTS', `${where} counts must not be negative`);
    }
    if (ex.completedSets > ex.plannedSets) {
      add('EXERCISE_SETS_INCONSISTENT', `${where}.completedSets must not exceed plannedSets`);
    }
    if (ex.completed && ex.plannedSets > 0 && ex.completedSets < ex.plannedSets) {
      add(
        'EXERCISE_COMPLETED_FLAG_INCONSISTENT',
        `${where} is marked completed but completedSets (${ex.completedSets}) < plannedSets (${ex.plannedSets})`,
      );
    }
    if (ex.difficultyFeeling !== undefined && !isSubjectiveDifficultyFeeling(ex.difficultyFeeling)) {
      add('BAD_DIFFICULTY_FEELING', `${where}.difficultyFeeling is outside the closed vocabulary`);
    }
  }

  return { valid: problems.length === 0, problems };
}

// ---------------------------------------------------------------------------
// Derived read-model
// ---------------------------------------------------------------------------

/** Read-only summary derived from a validated outcome (feeds the loop). */
export interface OutcomeSummary {
  totalExercises: number;
  completedExercises: number;
  totalSets: number;
  completedSets: number;
  durationSeconds: number;
  /** Overall completion ratio 0..1 (0 when nothing planned). */
  completionRatio: number;
}

/**
 * Deterministic derived summary of an outcome record — computed, never
 * stored. Ratio guards divide-by-zero (0/0 → 0).
 */
export function summarizeOutcome(record: WorkoutOutcomeRecord): OutcomeSummary {
  const completedExercises = record.exercises.filter((ex) => ex.completed).length;
  const ratio =
    record.completion.totalSets === 0 ? 0 : record.completion.completedSets / record.completion.totalSets;
  return {
    totalExercises: record.exercises.length,
    completedExercises,
    totalSets: record.completion.totalSets,
    completedSets: record.completion.completedSets,
    durationSeconds: record.durationSeconds,
    completionRatio: ratio,
  };
}

// ---------------------------------------------------------------------------
// Recording-pipeline adapter (pure, deterministic)
// ---------------------------------------------------------------------------

/**
 * Base outcome data derivable from the S-04 `SessionSummary` handed to the
 * `WORKOUT_COMPLETED` effect. Exercises/feedback/context are NOT filled here —
 * the recorder appends those from the session plan, set-level logs, and
 * user input. Pure: same summary + kind → same base every time.
 */
export function outcomeBaseFromSummary(
  summary: SessionSummary,
  options: { kind: WorkoutCompletionKind; dateKey: string; startedAt: number | null; completedAt: number | null },
): Pick<WorkoutOutcomeRecord, 'durationSeconds' | 'completion'> {
  return {
    durationSeconds: summary.durationSeconds,
    completion: {
      kind: options.kind,
      totalSets: summary.totalSets,
      completedSets: summary.completedSets,
    },
  };
}
