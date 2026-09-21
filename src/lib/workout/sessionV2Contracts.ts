/**
 * Workout V2 session contracts (WP-01) — SPEC 0001 first-slice extension.
 *
 * Canonical sources (binding): `docs/specs/0001-workout-experience/spec.md`
 * (§2 modular composition, §5.1 prescription semantics) and
 * `docs/specs/0001-workout-experience/plan.md` (§3 boundaries, §5
 * orchestration contract, §17 START readiness).
 *
 * WHAT THIS MODULE IS:
 *   - the module/phase vocabulary for the V2 composed experience
 *     (`START · PREPARING · EXERCISE_INTRO · WORK_SET · REST ·
 *     EXERCISE_TRANSITION · COMPLETE` are product CONCEPTS — the module ids
 *     below are their contract-level names, not a component inventory);
 *   - the explicit execution semantics on the RESOLVED PRESCRIPTION
 *     (`REP_BASED | TIME_BASED` — both first-class, exactly two; HOLD is NOT
 *     a third mode and has no field here);
 *   - the per-phase progression policy (`AUTO | CONFIRMATION_REQUIRED`);
 *   - the orchestration command/effect contract and the presentation
 *     view-model shape (frozen at WP-02 design per dependencies.md §1).
 *
 * WHAT THIS MODULE IS NOT (first-slice discipline):
 *   - it does not own presentation, mentor, audio or persistence contracts;
 *     the WP-14 orchestration extension adds session-control state/actions
 *     additively without changing the V1 session contract;
 *   - it does NOT change the shipped V1 session contracts
 *     (`./sessionContracts.ts`) — that engine is untouched operational
 *     fallback (plan §13);
 *   - it carries NO persistence shape: nothing here is written to
 *     IndexedDB/DB, and no snapshotVersion changes (WP-01 prohibition).
 *
 * INTRO EXTENSION (owner polish delta §C — INTRO only): the EXERCISE_INTRO
 * module is now AUTHORED as the deterministic boundary between PREPARING
 * and WORK_SET. The contract-level entry point is `activeModule =
 * 'EXERCISE_INTRO'` with `introExercise` exposed from the view-model; the
 * the typed `BEGIN_WORK_SET` intent hands control to the SET1 entry contract;
 * the Workout Experience adapter dispatches that intent when the Mentor
 * presentation boundary reports ready/degraded, while explicit deferred
 * resolution may enter SET in the same orchestration transition.
 * NO set execution, completion, REST or progression logic is implemented
 * here — WORK_SET remains a PENDING module and a later slice.
 *
 * PURE: types + pure helpers only — no React, no I/O, no side effects.
 */

import type {SessionExercise} from './sessionContracts';
import type {
  NormalizedMovementEvidence,
  RuntimeExecutionStrategy,
  TrackingState,
} from './executionStrategy';

/**
 * Experience-module vocabulary (spec §2). The ordered composition the
 * orchestration owns. First authorized slice activates only START and
 * PREPARING; the rest exist so the shared contract matches the approved
 * architecture and must not be activated by later-slice code paths.
 */
export type ExperienceModuleId =
  | 'START'
  | 'PREPARING'
  | 'EXERCISE_INTRO'
  | 'WORK_SET'
  | 'SET_RESULT'
  | 'REST'
  | 'EXERCISE_TRANSITION'
  | 'WORKOUT_RESULT'
  | 'COMPLETE';

/** Lifecycle state of one experience module (orchestration-owned). */
export type ExperienceModuleState = 'PENDING' | 'ACTIVE' | 'DONE' | 'SKIPPED';

/**
 * Per-phase progression policy (spec §5.5): `AUTO` advance is the default;
 * `CONFIRMATION_REQUIRED` is permitted when prescription/session context
 * requires explicit confirmation. Policy is a property of the phase, never a
 * module-owned branch.
 */
export type ProgressionPolicy = 'AUTO' | 'CONFIRMATION_REQUIRED';

/**
 * Execution mode (spec §5.1): exactly two first-class v1 modes. The mode is
 * an explicit property of the resolved prescription — the UI must never
 * infer it from arbitrary values, and no policy here chooses between modes.
 */
export type ExecutionMode = 'REP_BASED' | 'TIME_BASED';

/**
 * Prescription semantics for ONE exercise inside the resolved prescription
 * (plan §4): explicit execution semantics resolved BEFORE the session
 * consumes it. `EXERCISE IDENTITY != WORKOUT PRESCRIPTION` — the exercise
 * says what the movement is; these fields say how it is prescribed here.
 * The same exercise may appear with different prescriptions in one plan.
 */
export interface ResolvedExercisePrescription {
  /** Underlying plan item (identity, display name, canonical ids). */
  readonly exercise: SessionExercise;
  /** Explicit execution mode — never inferred from target values. */
  readonly executionMode: ExecutionMode;
  /** Target repetitions per set (`REP_BASED`; null otherwise). */
  readonly targetReps: number | null;
  /** Target seconds per set (`TIME_BASED`; null otherwise). */
  readonly targetSeconds: number | null;
  /** Set count for this exercise block (prescription-driven; no fixed 3). */
  readonly setCount: number;
  /** Rest seconds after each set (null = no rest — prescription-driven). */
  readonly restSeconds: number | null;
  /** Program-resolved fallback for camera-less REP_BASED execution. */
  readonly fallbackDurationSeconds?: number | null;
  /** Resolved per-set dosage; the first slice keeps exercise-level fields for compatibility. */
  readonly sets?: readonly ResolvedSetPrescription[];
}

export interface ResolvedSetPrescription {
  readonly executionMode: ExecutionMode;
  readonly targetReps: number | null;
  readonly targetSeconds: number | null;
  readonly restSeconds: number | null;
  readonly fallbackDurationSeconds: number | null;
}

/** The resolved prescription the session consumes (plan §12 data flow). */
export interface ResolvedPrescription {
  readonly exercises: readonly ResolvedExercisePrescription[];
}

/**
 * Progression policy per module in the authorized slice. Future modules add
 * their entries additively; nothing here hardcodes set/rest sequencing.
 */
export type ModuleProgressionPolicy = Partial<Record<ExperienceModuleId, ProgressionPolicy>>;

/**
 * Orchestration commands. WP-14 extends the frozen base with the approved
 * session controls; every action remains a typed intent handled by the one
 * orchestration authority. `DEFER_EXERCISE` is session-scoped and never
 * writes back to the resolved prescription.
 */
export type SessionAction =
  | {type: 'START_SESSION'}
  | {type: 'PAUSE'}
  | {type: 'RESUME'}
  | {type: 'BEGIN_WORK_SET'}
  | {type: 'MOVEMENT_EVIDENCE'; evidence: NormalizedMovementEvidence}
  | {type: 'TRACKING_LOST'}
  | {type: 'TRACKING_REACQUIRED'}
  | {type: 'TRACKING_UNRECOVERABLE'; fallbackRemainingSeconds: number}
  | {type: 'SKIP_REST'}
  | {type: 'EXIT_WORKOUT'}
  | {type: 'CONFIRM_EXIT'}
  | {type: 'CANCEL_EXIT'}
  | {type: 'RESTART_CURRENT_SET'}
  | {type: 'DEFER_EXERCISE'; disposition: 'MOVE_TO_END' | 'SKIP_FOR_SESSION'}
  | {type: 'RESOLVE_DEFERRED_EXERCISE'; disposition: 'PERFORM_NOW' | 'SKIP_FOR_SESSION'}
  | {type: 'SKIP_EXERCISE'};

/**
 * Session lifecycle (plan §5 states — implementation view, INTRO slice):
 * `READY_TO_START → PREPARING → AWAITING_WORK_SET (INTRO) → RUNNING`.
 * `AWAITING_WORK_SET` is the INTRO presentation window: orchestration
 * presentation is parked there until the typed `BEGIN_WORK_SET` action moves
 * the session to `RUNNING` at the SET1 entry boundary (delta §C). The action
 * is orchestration-owned; the adapter may dispatch it from the Mentor
 * ready/degraded signal so the user does not need a presentation CTA.
 * `PAUSED` freezes the current execution context (spec FR-9 posture).
 */
export type SessionLifecycle =
  | 'READY_TO_START'
  | 'PREPARING'
  | 'AWAITING_WORK_SET'
  | 'RUNNING'
  | 'SET_RESULT'
  | 'RESTING'
  | 'WORKOUT_RESULT'
  | 'PAUSED'
  | 'EXIT_REQUESTED';

/** Session-scoped outcome state; none of these values mutate the prescription. */
export type SessionExerciseOutcomeStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'OUTSTANDING_DEFERRED'
  | 'SKIPPED_FOR_SESSION';

export interface SessionExerciseOutcome {
  readonly exerciseIndex: number;
  readonly status: SessionExerciseOutcomeStatus;
}

/** Immutable progress snapshot owned by the reusable SET capability. */
export interface SetProgress {
  readonly status: 'ACTIVE' | 'COMPLETE';
  readonly executionMode: ExecutionMode;
  readonly runtimeStrategy: RuntimeExecutionStrategy;
  readonly trackingState: TrackingState | null;
  readonly setNumber: number;
  readonly setCount: number;
  readonly performedRepCount: number;
  readonly validRepCount: number;
  readonly completedReps: number;
  readonly targetReps: number | null;
  readonly elapsedSeconds: number;
  readonly targetSeconds: number | null;
  readonly remainingSeconds: number | null;
}

/** Typed REST boundary owned by the reusable REST capability. */
export type RestKind = 'BETWEEN_SETS' | 'BETWEEN_EXERCISES';

export interface RestState {
  readonly status: 'ACTIVE' | 'COMPLETE';
  readonly kind: RestKind;
  readonly elapsedSeconds: number;
  readonly totalSeconds: number;
  readonly remainingSeconds: number;
}

/** Stable evidence presented after each completed Set. */
export interface SetResult {
  readonly exerciseIndex: number;
  readonly setNumber: number;
  readonly setCount: number;
  readonly executionMode: ExecutionMode;
  readonly runtimeStrategy: RuntimeExecutionStrategy;
  readonly trackingState: TrackingState | null;
  readonly performedRepCount: number;
  readonly validRepCount: number;
  readonly completedReps: number;
  readonly targetReps: number | null;
  readonly elapsedSeconds: number;
  readonly targetSeconds: number | null;
  readonly isFinalSet: boolean;
  readonly isFinalExercise: boolean;
  readonly elapsedInResultSeconds: number;
}

/** Semantic result read-model; no persistence or adaptation policy. */
export interface WorkoutResultSummary {
  readonly totalExercises: number;
  readonly completedExercises: number;
  readonly skippedExercises: number;
  readonly completedSets: number;
  readonly totalSets: number;
  readonly completionKind: 'COMPLETED_FULLY' | 'COMPLETED_PARTIALLY' | 'ENDED_WITHOUT_COMPLETION';
}

/**
 * Presentation view-model — the frozen WP-02 output presentation consumes
 * (dependencies.md §1/§5; plan §3 "presentation never sequences").
 * Everything the shell/stages render is derived from this one shape; no
 * presentation component owns or mutates sequencing state.
 */
export interface SessionViewModel {
  readonly lifecycle: SessionLifecycle;
  /** Currently presented module (null = session live, no module presentation in this slice). */
  readonly activeModule: ExperienceModuleId | null;
  /** Module lifecycle map — later slices may only extend activation of their own modules. */
  readonly modules: Readonly<Partial<Record<ExperienceModuleId, ExperienceModuleState>>>;
  /** The exercise the session will execute first once running (null before start). */
  readonly activeExercise: ResolvedExercisePrescription | null;
  readonly activeExerciseIndex: number | null;
  /**
   * The exercise INTRO is presenting (delta §C: INTRO is ONCE per new
   * exercise identity, before its first work set — spec §5.3). Null
   * outside EXERCISE_INTRO.
   */
  readonly introExercise: ResolvedExercisePrescription | null;
  /** Seconds remaining in PREPARING (null outside PREPARING). Text-rendered — never animation-only. */
  readonly preparingSecondsRemaining: number | null;
  /** Total session execution seconds (preparing + running), pause-frozen. */
  readonly executionElapsedSeconds: number;
  /** When paused: the module being paused (null when not paused). */
  readonly pausedFromModule: ExperienceModuleId | null;
  /** Run 1 SET capability state; absent before the first Set is entered. */
  readonly setProgress?: SetProgress | null;
  /** Stable result/evidence after each completed Set. */
  readonly setResult?: SetResult | null;
  /** Run 1 REST capability state; absent outside REST. */
  readonly restState?: RestState | null;
  /** 1-based current Set number for the active Exercise. */
  readonly currentSetNumber?: number | null;
  /** Completed Sets across the resolved session. */
  readonly completedSetCount?: number;
  /** Total Sets across the resolved session. */
  readonly totalSetCount?: number;
  /** Session-scoped outcome status for every resolved exercise. */
  readonly exerciseOutcomes: readonly SessionExerciseOutcome[];
  /** True only when no unresolved exercise obligation remains. */
  readonly completionEligible: boolean;
  /** Result read-model, populated only at WORKOUT_RESULT. */
  readonly workoutResult: WorkoutResultSummary | null;
  /** Exit intent raised for the later WP-12 confirmation/return boundary. */
  readonly exitRequested: boolean;
}

/**
 * Orchestration effects — semantic intents consumed by the adapter
 * (transport stays in the consumer, mirroring the V1 effect boundary).
 */
export type SessionOrchestrationEffect =
  | {kind: 'SESSION_STARTED'; startedAtMs: number}
  | {kind: 'MODULE_CHANGED'; moduleId: ExperienceModuleId | null}
  | {kind: 'PAUSED'; duringModule: ExperienceModuleId | null}
  | {kind: 'RESUMED'; duringModule: ExperienceModuleId | null}
  | {kind: 'SET_COMPLETED'; exerciseIndex: number; setNumber: number}
  | {kind: 'SET_RESULT_READY'; exerciseIndex: number; setNumber: number}
  | {kind: 'REST_STARTED'; restKind: RestKind; seconds: number}
  | {kind: 'REST_COMPLETED'; restKind: RestKind}
  | {kind: 'SET_RESTARTED'; exerciseIndex: number; setNumber: number}
  | {kind: 'EXERCISE_DEFERRED'; exerciseIndex: number}
  | {kind: 'DEFERRED_EXERCISE_RESOLVED'; exerciseIndex: number; disposition: 'PERFORM_NOW' | 'SKIP_FOR_SESSION'}
  | {kind: 'EXERCISE_SKIPPED'; exerciseIndex: number}
  | {kind: 'EXERCISE_COMPLETED'; exerciseIndex: number}
  | {kind: 'WORKOUT_RESULT_READY'; summary: WorkoutResultSummary}
  | {kind: 'EXIT_REQUESTED'}
  | {kind: 'EXIT_CONFIRMED'}
  | {kind: 'EXIT_CANCELLED'};

/** Neutral initial module map: nothing activated yet. */
export function initialModuleStates(): Record<ExperienceModuleId, ExperienceModuleState> {
  return {
    START: 'ACTIVE',
    PREPARING: 'PENDING',
    EXERCISE_INTRO: 'PENDING',
    WORK_SET: 'PENDING',
    SET_RESULT: 'PENDING',
    REST: 'PENDING',
    EXERCISE_TRANSITION: 'PENDING',
    WORKOUT_RESULT: 'PENDING',
    COMPLETE: 'PENDING',
  };
}

/**
 * Progression policy defaults for the authorized slice (spec §5.5). INTRO is
 * an automatic readiness boundary: the orchestrator receives a typed Mentor
 * ready/degraded signal and owns the transition into SET. Deferred
 * `PERFORM_NOW` resolution uses the same single-writer boundary. No
 * presentation component routes globally.
 */
export const SLICE_PROGRESSION_POLICY: ModuleProgressionPolicy = {
  START: 'AUTO',
  PREPARING: 'AUTO',
  EXERCISE_INTRO: 'AUTO',
};

/** Positive-integer normalizer (0/undefined → null). Pure. */
export function normalizePositiveInt(value: number | null | undefined): number | null {
  if (value == null) return null;
  const n = Math.floor(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
