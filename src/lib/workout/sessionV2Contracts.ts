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
 *   - it does NOT define set/rest/deferral state, completion eligibility,
 *     mentor, audio or controls contracts — later work packages extend
 *     additively;
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
 * exit action `BEGIN_WORK_SET` hands control to the SET1 entry contract.
 * NO set execution, completion, REST or progression logic is implemented
 * here — WORK_SET remains a PENDING module and a later slice.
 *
 * PURE: types + pure helpers only — no React, no I/O, no side effects.
 */

import type {SessionExercise} from './sessionContracts';

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
  | 'REST'
  | 'EXERCISE_TRANSITION'
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
 * Orchestration commands (plan §17 `START_SHARED_CONTRACTS`). The set is
 * still the first-slice set (start/pause/resume) plus the INTRO extension's
 * `BEGIN_WORK_SET` — the deterministic INTRO → SET1 boundary (delta §C).
 * No SKIP/COMPLETE/deferral commands exist.
 */
export type SessionAction =
  | {type: 'START_SESSION'}
  | {type: 'PAUSE'}
  | {type: 'RESUME'}
  | {type: 'BEGIN_WORK_SET'};

/**
 * Session lifecycle (plan §5 states — implementation view, INTRO slice):
 * `READY_TO_START → PREPARING → AWAITING_WORK_SET (INTRO) → RUNNING`.
 * `AWAITING_WORK_SET` is the INTRO presentation window: orchestration
 * presentation is parked there until the explicit `BEGIN_WORK_SET` action
 * moves the session to `RUNNING` at the SET1 entry boundary (delta §C).
 * `PAUSED` freezes the current execution context (spec FR-9 posture).
 */
export type SessionLifecycle =
  | 'READY_TO_START'
  | 'PREPARING'
  | 'AWAITING_WORK_SET'
  | 'RUNNING'
  | 'PAUSED';

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
  readonly modules: Readonly<Record<ExperienceModuleId, ExperienceModuleState>>;
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
}

/**
 * Orchestration effects — semantic intents consumed by the adapter
 * (transport stays in the consumer, mirroring the V1 effect boundary).
 */
export type SessionOrchestrationEffect =
  | {kind: 'SESSION_STARTED'; startedAtMs: number}
  | {kind: 'MODULE_CHANGED'; moduleId: ExperienceModuleId | null}
  | {kind: 'PAUSED'; duringModule: ExperienceModuleId | null}
  | {kind: 'RESUMED'; duringModule: ExperienceModuleId | null};

/** Neutral initial module map: nothing activated yet. */
export function initialModuleStates(): Record<ExperienceModuleId, ExperienceModuleState> {
  return {
    START: 'ACTIVE',
    PREPARING: 'PENDING',
    EXERCISE_INTRO: 'PENDING',
    WORK_SET: 'PENDING',
    REST: 'PENDING',
    EXERCISE_TRANSITION: 'PENDING',
    COMPLETE: 'PENDING',
  };
}

/**
 * Progression policy defaults for the authorized slice (spec §5.5). INTRO's
 * user-controlled exit (BEGIN_WORK_SET) is `CONFIRMATION_REQUIRED` — the
 * user decides when the movement is understood; NO timeout auto-completes
 * INTRO (delta §C).
 */
export const SLICE_PROGRESSION_POLICY: ModuleProgressionPolicy = {
  START: 'AUTO',
  PREPARING: 'AUTO',
  EXERCISE_INTRO: 'CONFIRMATION_REQUIRED',
};

/** Positive-integer normalizer (0/undefined → null). Pure. */
export function normalizePositiveInt(value: number | null | undefined): number | null {
  if (value == null) return null;
  const n = Math.floor(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
