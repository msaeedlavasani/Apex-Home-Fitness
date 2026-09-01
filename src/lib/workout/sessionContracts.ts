/**
 * Session contracts — THE canonical, stable Session State contract (S-04).
 *
 * Framework-independent contracts describing the CURRENT Workout Session
 * Engine semantics: READY/EXERCISING/RESTING/COMPLETED phases, the 10-field
 * session state, the current commands and the current callbacks-as-effects.
 * No new extensibility abstractions, no V2 semantics.
 *
 * S-04 STATUS (2026-09-01): this module is the SINGLE canonical boundary for
 * session plan/state/summary/hydrate/phase types. Consumers — the React
 * adapter (`useWorkoutEngine` re-exports these types under its legacy
 * `Workout*` names for compatibility), the persistence bridge
 * (`src/lib/offline/workoutPersistence.ts`), the workout page, and tests —
 * import from here. No consumer imports session types from the hook module.
 * `src/lib/workout/sessionCore.ts` (the pure state machine) consumes these
 * same state/command/effect types; its own plan-input port accepts a
 * structurally compatible wider shape (un-branded identity strings).
 *
 * CANONICAL EXERCISE IDENTITY: the plan-item contract carries the canonical
 * identity established by S02/R4/R5 — `exerciseId` (Prisma `Exercise.id`) and
 * `slug` (`Exercise.slug`). These are the identity fields later session layers
 * persist and propagate; `id` remains the plan-position key and `name` is
 * display-only (already localized by the caller) and must never be used as
 * exercise identity.
 *
 * PURE: no React, no Prisma client, no browser APIs, no services, no side
 * effects — types only (type-only imports are erased at compile time).
 * Runtime plan helpers live in `./plan` (`clampSets`) — kept out of this
 * module so the contract itself stays types-only.
 */

import type {ExerciseId, ExerciseSlug} from '../exercise';

/** Canonical Exercise identity (S02): opaque branded `Exercise.id`/`Exercise.slug`. */

/**
 * The plan-item contract: one exercise inside a workout session plan. Mirrors
 * the engine's `WorkoutExercise` set/repetition fields and adds the canonical
 * Exercise identity carried by program-derived plans.
 */
export interface SessionExercise {
  /** Plan-position key (unique within the plan; not the canonical Exercise id). */
  id: string;
  /** Display name, already localized by the caller. Display-only — never identity. */
  name: string;
  /** Number of working sets for this exercise. */
  sets: number;
  /** Target repetitions per set (informational). */
  reps?: number | null;
  /** Working time per set in seconds. Omit/null for open-ended sets (timer counts up). */
  durationSeconds?: number | null;
  /** Rest time after each set in seconds. Omit/null to skip rest. */
  restSeconds?: number | null;
  /** Canonical Exercise identity: Prisma `Exercise.id` (branded). Present for program-derived plans. */
  exerciseId?: ExerciseId;
  /** Canonical Exercise identity: `Exercise.slug` (branded). Present for program-derived plans. */
  slug?: ExerciseSlug;
}

/** Current phases ONLY (no PREPARE/TRANSITION — V2 product questions open). */
export type SessionPhase = 'READY' | 'EXERCISING' | 'RESTING' | 'COMPLETED';

/**
 * The serialized session state — exactly the current 10 `WorkoutEngineState`
 * fields. This shape is serialization-safe (JSON round-trip stable) so
 * persistence layers can store it verbatim. `restTarget` is internal
 * (reconstructed) and is intentionally NOT part of this contract.
 */
export interface SessionState {
  phase: SessionPhase;
  /** 0-based index into the plan (position/step based — never canonical exerciseId). */
  currentExerciseIndex: number;
  /** 1-based set number within the current exercise. */
  currentSet: number;
  completedSets: number;
  totalSets: number;
  /** Seconds spent in the current phase (counts up in both modes). */
  phaseElapsedSeconds: number;
  /** Total active workout time in seconds since start(). */
  totalElapsedSeconds: number;
  /** Whether the phase timer is currently counting. */
  isRunning: boolean;
  /** Epoch ms when the workout was started (null until start()). */
  startedAt: number | null;
  /** Epoch ms when the workout was completed (null until finished). */
  completedAt: number | null;
}

/**
 * Input accepted by HYDRATE — mirrors `WorkoutEngineHydrateInput`: every field
 * optional, missing values fall back to defaults (index 0, set 1, zeroed
 * timers, EXERCISING); `isComplete` convenience sets `completedAt = now`.
 */
export interface SessionHydrateInput {
  phase?: SessionPhase;
  currentExerciseIndex?: number;
  currentSet?: number;
  phaseElapsedSeconds?: number;
  totalElapsedSeconds?: number;
  startedAt?: number | null;
  completedAt?: number | null;
  isComplete?: boolean;
}

/** Summary handed to the WORKOUT_COMPLETED effect — mirrors `WorkoutSummary`. */
export interface SessionSummary {
  totalExercises: number;
  totalSets: number;
  completedSets: number;
  /** Total active workout time (working + resting) in seconds. */
  durationSeconds: number;
}

/**
 * The commands the engine accepts today. `ACCOUNT` is the internal TIME input
 * (elapsed whole seconds added to the phase + total timers) — the wall-clock
 * `account()` result. The session core (R7) will consume these commands; the
 * current hook exposes them as methods.
 */
export type SessionCommand =
  | { kind: 'START' }
  | { kind: 'PAUSE' }
  | { kind: 'RESUME' }
  | { kind: 'COMPLETE_SET' }
  | { kind: 'SKIP_REST' }
  | { kind: 'NEXT_EXERCISE' }
  | { kind: 'PREVIOUS_EXERCISE' }
  | { kind: 'JUMP_TO'; index: number }
  | { kind: 'RESET' }
  | { kind: 'RESTART' }
  | { kind: 'HYDRATE'; input: SessionHydrateInput }
  | { kind: 'ACCOUNT'; elapsedSeconds: number };

/**
 * Semantic effects — the current callbacks as intents. The adapter maps these
 * to the existing option callbacks (onPhaseChange / onSetComplete /
 * onExerciseComplete / onWorkoutComplete / onStateChange). Transport (audio,
 * haptics, IndexedDB, analytics, network) stays in the consumer. No
 * audio/media-specific effects.
 */
export type SessionEffect =
  | { kind: 'PHASE_CHANGED'; phase: SessionPhase }
  | { kind: 'SET_COMPLETED'; exerciseIndex: number; set: number }
  | { kind: 'EXERCISE_COMPLETED'; exerciseIndex: number }
  | { kind: 'WORKOUT_COMPLETED'; summary: SessionSummary }
  | { kind: 'STATE_CHANGED'; state: SessionState };

/**
 * Derived read-model fields the engine computes from the session state
 * (mirrors the derived values in `UseWorkoutEngineResult`). Read-only; the
 * session core (R7) computes them; consumers never mutate them.
 */
export interface SessionDerived {
  totalSets: number;
  completedSets: number;
  /** Overall completion ratio, 0..1. */
  progress: number;
  /** Duration of the current phase in seconds (null = open-ended). */
  phaseDurationSeconds: number | null;
  /** Remaining seconds of the current phase (null = open-ended). */
  secondsLeft: number | null;
  totalExercises: number;
}
