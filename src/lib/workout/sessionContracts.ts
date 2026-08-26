/**
 * Session contracts (S03-A — Architecture Stabilization).
 *
 * Framework-independent contracts describing the CURRENT Workout Session
 * Engine semantics (`useWorkoutEngine`), frozen before extraction (GB-01..10
 * APPROVED 2026-08-27). They mirror the engine's existing public types exactly
 * — READY/EXERCISING/RESTING/COMPLETED phases, the 10-field session state,
 * the current commands and the current callbacks-as-effects. NO PREPARE /
 * TRANSITION, no new extensibility abstractions, no V2 semantics.
 *
 * PURE: no React, no Prisma, no browser APIs, no services. The engine keeps
 * its own runtime types for now; the pure core (S03-B) and adapter (S03-C)
 * will adopt these canonical types. Do not import this module from React
 * components until the extraction wiring exists.
 */

/** Current phases ONLY (no PREPARE/TRANSITION — V2 product questions open). */
export type SessionPhase = 'READY' | 'EXERCISING' | 'RESTING' | 'COMPLETED';

/**
 * The serialized session state — exactly the current 10 `WorkoutEngineState`
 * fields. This shape is PINNED for S-03: snapshots persist it, so any shape
 * change requires GATE C. `restTarget` is internal (reconstructed) and is
 * intentionally NOT part of this contract.
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
 * The commands the engine accepts today (GB-06: current commands only).
 * `ACCOUNT` is the internal TIME input (elapsed whole seconds added to the
 * phase + total timers) — the wall-clock `account()` result. The pure core
 * will consume commands like this; the current hook exposes them as methods.
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
 * Semantic effects — the current callbacks as intents (GB-07: no event bus).
 * The adapter maps these to the existing option callbacks
 * (onPhaseChange / onSetComplete / onExerciseComplete / onWorkoutComplete /
 * onStateChange). Transport (audio, haptics, IndexedDB, analytics, network)
 * stays in the consumer. No audio/media-specific effects.
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
 * pure core computes them; consumers never mutate them.
 */
export interface SessionDerived {
  totalSets: number;
  completedSets: number;
  progress: number;
  phaseDurationSeconds: number | null;
  secondsLeft: number | null;
  totalExercises: number;
}
