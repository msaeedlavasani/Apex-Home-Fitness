/**
 * Workout V2 session orchestration (WP-02) — THE single sequencing authority.
 *
 * Canonical sources (binding): `docs/specs/0001-workout-experience/spec.md`
 * (§2 "orchestration owns composition — no module may become a hidden global
 * workout state machine") and `docs/specs/0001-workout-experience/plan.md`
 * (§3 boundaries, §5 orchestration contract, §11 ownership rules, §17 START
 * readiness).
 *
 * OWNS (first authorized slice): session lifecycle
 * (`READY_TO_START → PREPARING → RUNNING`, with `PAUSED` as an orthogonal
 * freeze), module applicability for START/PREPARING, the start/pause/resume
 * action set, and the frozen presentation view-model.
 *
 * DOES NOT OWN (later work packages, prohibited here): exercise-block
 * sequencing, set/rest progression, transitions, deferred/skipped resolution,
 * completion eligibility — the contract is shaped so those extend additively
 * without redesign (spec §2), but they are NOT implemented in this slice.
 *
 * Presentation NEVER sequences: components consume the view-model and
 * dispatch these actions through the adapter — nothing else. No competing
 * mini state machines (plan §11: one owner per responsibility).
 *
 * PURE: no React, no I/O, no timers. The adapter owns the clock and injects
 * elapsed time via `SESSION_ACTION`-mapped `advance(seconds)` — the same
 * ACCOUNT boundary pattern as the V1 core (ADR-0002; S03D).
 */

import {
  type ExperienceModuleId,
  type ResolvedPrescription,
  type SessionAction,
  type SessionOrchestrationEffect,
  type SessionViewModel,
  initialModuleStates,
} from './sessionV2Contracts';

/**
 * PREPARING duration for the first slice — an explicit IMPLEMENTATION
 * DECISION (plan §3: where the spec is silent the plan proposes and labels).
 * The spec deliberately defers the PREPARE numeric default (spec §16), so
 * this constant lives in the adapter-facing orchestration seam, is trivially
 * replaceable, and is NOT promoted into any prescription/storage contract.
 */
export const PREPARING_DURATION_SECONDS = 5;

export type OrchestrationState = SessionViewModel;

export interface OrchestrationTransition {
  state: OrchestrationState;
  effects: SessionOrchestrationEffect[];
}

function isStartModule(moduleId: ExperienceModuleId | null): boolean {
  return moduleId === 'START';
}

function isPreparingModule(moduleId: ExperienceModuleId | null): boolean {
  return moduleId === 'PREPARING';
}

function initialViewModel(prescription: ResolvedPrescription): OrchestrationState {
  const modules = initialModuleStates();
  return {
    lifecycle: 'READY_TO_START',
    activeModule: 'START',
    modules,
    activeExercise: prescription.exercises[0] ?? null,
    activeExerciseIndex: prescription.exercises.length > 0 ? 0 : null,
    preparingSecondsRemaining: null,
    executionElapsedSeconds: 0,
    pausedFromModule: null,
  };
}

/**
 * Creates the orchestration authority over a resolved prescription.
 * One instance drives one session; presentation renders `state` and dispatches
 * `advance`/`dispatch` only.
 */
export function createSessionOrchestrator(prescription: ResolvedPrescription) {
  let state = initialViewModel(prescription);

  const started = (atMs: number): OrchestrationTransition => {
    if (!isStartModule(state.activeModule) || state.lifecycle !== 'READY_TO_START') {
      return {state, effects: []};
    }
    const modules = {...state.modules, START: 'DONE' as const, PREPARING: 'ACTIVE' as const};
    const next: OrchestrationState = {
      ...state,
      lifecycle: 'PREPARING',
      activeModule: 'PREPARING',
      modules,
      preparingSecondsRemaining: PREPARING_DURATION_SECONDS,
    };
    state = next;
    return {state, effects: [{kind: 'SESSION_STARTED', startedAtMs: atMs}, {kind: 'MODULE_CHANGED', moduleId: 'PREPARING'}]};
  };

  const advance = (elapsedSeconds: number): OrchestrationTransition => {
    const elapsed = Math.max(0, Math.floor(elapsedSeconds));
    if (elapsed <= 0) return {state, effects: []};

    // Paused: the freeze is absolute — position and context preserved (FR-9).
    if (state.lifecycle === 'PAUSED') return {state, effects: []};

    if (isPreparingModule(state.activeModule) && state.lifecycle === 'PREPARING') {
      const remaining = Math.max(0, (state.preparingSecondsRemaining ?? 0) - elapsed);
      const total = state.executionElapsedSeconds + elapsed;
      const modules = state.modules;
      if (remaining > 0) {
        const next: OrchestrationState = {
          ...state, preparingSecondsRemaining: remaining, executionElapsedSeconds: total,
        };
        state = next;
        return {state: next, effects: []};
      }
      // PREPARING elapsed → the session is RUNNING; the exercise-block
      // composition (EXERCISE_INTRO / WORK_SET / …) activates in later
      // authorized slices. The view-model exposes the first exercise now.
      const nextModules = {...modules, PREPARING: 'DONE' as const};
      const next: OrchestrationState = {
        ...state,
        lifecycle: 'RUNNING',
        activeModule: null,
        modules: nextModules,
        preparingSecondsRemaining: null,
        executionElapsedSeconds: total,
      };
      state = next;
      return {state: next, effects: [{kind: 'MODULE_CHANGED', moduleId: null}]};
    }

    if (state.lifecycle === 'RUNNING') {
      const next: OrchestrationState = {...state, executionElapsedSeconds: state.executionElapsedSeconds + elapsed};
      state = next;
      return {state: next, effects: []};
    }

    return {state, effects: []};
  };

  const freeze = (duringModule: ExperienceModuleId | null): OrchestrationTransition => {
    if (state.lifecycle !== 'PREPARING' && state.lifecycle !== 'RUNNING') {
      return {state, effects: []};
    }
    const next: OrchestrationState = {
      ...state,
      lifecycle: 'PAUSED',
      pausedFromModule: state.activeModule,
    };
    state = next;
    return {state: next, effects: [{kind: 'PAUSED', duringModule}]};
  };

  const unfreeze = (): OrchestrationTransition => {
    if (state.lifecycle !== 'PAUSED') return {state, effects: []};
    const duringModule = state.pausedFromModule;
    const next: OrchestrationState = {
      ...state,
      lifecycle: duringModule === 'PREPARING' ? 'PREPARING' : 'RUNNING',
      pausedFromModule: null,
    };
    state = next;
    return {state: next, effects: [{kind: 'RESUMED', duringModule}]};
  };

  return {
    /** Current orchestration state (defensive copy — consumers never mutate). */
    get state(): OrchestrationState {
      return {...state, modules: {...state.modules}};
    },
    /** Time input from the adapter clock (whole seconds; no-op while paused). */
    advance(elapsedSeconds: number): OrchestrationTransition {
      return advance(elapsedSeconds);
    },
    /** Session actions (first-slice set: start/pause/resume only). */
    dispatch(action: SessionAction, atMs = Date.now()): OrchestrationTransition {
      switch (action.type) {
        case 'START_SESSION':
          return started(atMs);
        case 'PAUSE':
          return freeze(state.activeModule);
        case 'RESUME':
          return unfreeze();
        default: {
          const exhaustive: never = action;
          void exhaustive;
          return {state, effects: []};
        }
      }
    },
  };
}

export type SessionOrchestrator = ReturnType<typeof createSessionOrchestrator>;
