/**
 * WP-01/WP-02 first-slice unit tests: resolved-prescription resolution and
 * the pure orchestration authority (START → PREPARING → RUNNING + PAUSED).
 *
 * Verifies the plan §17 START_TESTS unit layer: start/pause/resume
 * transitions, PREPARING countdown authority, idempotent/rapid duplicate
 * START (the legacy START reliability concern, at the orchestration layer),
 * pause freeze/resume continuation, and the fail-closed resolver.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveExercisePrescription,
  resolvePrescription,
  UnresolvedPrescriptionError,
} from '../src/lib/workout/resolvedPrescription';
import {createSessionOrchestrator, PREPARING_DURATION_SECONDS} from '../src/lib/workout/orchestration';
import {
  type SessionExercise,
} from '../src/lib/workout/sessionContracts';
import type {ResolvedPrescription} from '../src/lib/workout/sessionV2Contracts';

const PLAN: SessionExercise[] = [
  {id: 's1', name: 'Squat', sets: 3, reps: 10, restSeconds: 30, fallbackDurationSeconds: 45},
  {id: 's2', name: 'Plank', sets: 2, durationSeconds: 40, restSeconds: 20},
];

function prescriptionFor(plan: readonly SessionExercise[]): ResolvedPrescription {
  return resolvePrescription(plan);
}

// ---------------------------------------------------------------------------
// Resolved prescription (plan §4)
// ---------------------------------------------------------------------------

test('resolver makes execution mode explicit and never infers identity', () => {
  const [repBased, timeBased] = prescriptionFor(PLAN).exercises;
  assert.equal(timeBased?.executionMode, 'TIME_BASED');
  assert.equal(timeBased?.targetSeconds, 40);
  assert.equal(timeBased?.targetReps, null);
  assert.equal(repBased?.executionMode, 'REP_BASED');
  assert.equal(repBased?.targetReps, 10);
  assert.equal(repBased?.targetSeconds, null);
  assert.equal(timeBased?.exercise.id, 's2');
  assert.equal(timeBased?.setCount, 2);
  assert.equal(timeBased?.restSeconds, 20);
});

test('resolver is fail-closed when no explicit target exists (no silent coercion)', () => {
  assert.throws(() => resolveExercisePrescription({id: 'x', name: 'X', sets: 1}), UnresolvedPrescriptionError);
  assert.throws(() => resolvePrescription([]), UnresolvedPrescriptionError);
});

test('resolver is pure: it never mutates the input plan', () => {
  const input: SessionExercise[] = [{id: 'p', name: 'P', sets: 2, reps: 8, restSeconds: 15}];
  const snapshot = JSON.stringify(input);
  resolvePrescription(input);
  assert.equal(JSON.stringify(input), snapshot);
});

// ---------------------------------------------------------------------------
// Orchestration authority (START → PREPARING slice)
// ---------------------------------------------------------------------------

test('initial state is READY_TO_START with START active and PREPARING pending', () => {
  const orchestrator = createSessionOrchestrator(prescriptionFor(PLAN));
  const state = orchestrator.state;
  assert.equal(state.lifecycle, 'READY_TO_START');
  assert.equal(state.activeModule, 'START');
  assert.equal(state.modules.START, 'ACTIVE');
  assert.equal(state.modules.PREPARING, 'PENDING');
  assert.equal(state.activeExercise?.exercise.id, 's1');
  assert.equal(state.preparingSecondsRemaining, null);
});

test('start transitions through the single authority: READY_TO_START → PREPARING', () => {
  const orchestrator = createSessionOrchestrator(prescriptionFor(PLAN));
  const {state, effects} = orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  assert.equal(state.lifecycle, 'PREPARING');
  assert.equal(state.activeModule, 'PREPARING');
  assert.equal(state.modules.START, 'DONE');
  assert.equal(state.modules.PREPARING, 'ACTIVE');
  assert.equal(state.preparingSecondsRemaining, PREPARING_DURATION_SECONDS);
  assert.deepEqual(effects.map((effect) => effect.kind), ['SESSION_STARTED', 'MODULE_CHANGED']);
});

test('START is idempotent: rapid duplicate/second start cannot re-enter PREPARING', () => {
  const orchestrator = createSessionOrchestrator(prescriptionFor(PLAN));
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  const {state, effects} = orchestrator.dispatch({type: 'START_SESSION'}, 1_050);
  assert.equal(state.lifecycle, 'PREPARING');
  assert.equal(state.modules.START, 'DONE');
  assert.deepEqual(effects, []);
});

test('presentation cannot start the session: only the orchestration action mutates state', () => {
  const orchestrator = createSessionOrchestrator(prescriptionFor(PLAN));
  // No public mutation surface exists beyond dispatch/advance — the view-model
  // is a defensive copy (top-level and module map).
  const before = orchestrator.state as {lifecycle: string; modules: Record<string, string>};
  before.lifecycle = 'RUNNING';
  before.modules.PREPARING = 'DONE';
  const after = orchestrator.state;
  assert.equal(after.lifecycle, 'READY_TO_START');
  assert.equal(after.modules.PREPARING, 'PENDING');
});

test('PREPARING countdown advances by whole seconds and completes into the INTRO boundary', () => {
  const orchestrator = createSessionOrchestrator(prescriptionFor(PLAN));
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  const tick = orchestrator.advance(2);
  assert.equal(tick.state.preparingSecondsRemaining, PREPARING_DURATION_SECONDS - 2);
  const finish = orchestrator.advance(PREPARING_DURATION_SECONDS);
  assert.equal(finish.state.lifecycle, 'AWAITING_WORK_SET');
  assert.equal(finish.state.activeModule, 'EXERCISE_INTRO');
  assert.equal(finish.state.modules.PREPARING, 'DONE');
  assert.equal(finish.state.preparingSecondsRemaining, null);
  assert.ok(finish.effects.some((effect) => effect.kind === 'MODULE_CHANGED'));
});

test('advance with a large overshoot lands exactly on the INTRO boundary (no skipped module)', () => {
  const orchestrator = createSessionOrchestrator(prescriptionFor(PLAN));
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  const {state} = orchestrator.advance(PREPARING_DURATION_SECONDS + 30);
  assert.equal(state.lifecycle, 'AWAITING_WORK_SET');
  assert.equal(state.modules.PREPARING, 'DONE');
  assert.equal(state.modules.EXERCISE_INTRO, 'ACTIVE');
});

test('pause during PREPARING freezes countdown and context; resume continues', () => {
  const orchestrator = createSessionOrchestrator(prescriptionFor(PLAN));
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  orchestrator.advance(2);
  const {state: paused, effects: pauseEffects} = orchestrator.dispatch({type: 'PAUSE'});
  assert.equal(paused.lifecycle, 'PAUSED');
  assert.equal(paused.pausedFromModule, 'PREPARING');
  assert.equal(paused.preparingSecondsRemaining, PREPARING_DURATION_SECONDS - 2);
  assert.ok(pauseEffects.some((effect) => effect.kind === 'PAUSED'));
  // Paused time is discarded, countdown frozen.
  orchestrator.advance(60);
  assert.equal(orchestrator.state.preparingSecondsRemaining, PREPARING_DURATION_SECONDS - 2);
  assert.equal(orchestrator.state.executionElapsedSeconds, 2);
  const {state: resumed, effects: resumeEffects} = orchestrator.dispatch({type: 'RESUME'});
  assert.equal(resumed.lifecycle, 'PREPARING');
  assert.ok(resumeEffects.some((effect) => effect.kind === 'RESUMED'));
  orchestrator.advance(3);
  assert.equal(orchestrator.state.lifecycle, 'AWAITING_WORK_SET', 'countdown completes into the INTRO boundary');
});

test('actions outside their lifecycle are no-ops (fail-closed guard rails)', () => {
  const orchestrator = createSessionOrchestrator(prescriptionFor(PLAN));
  assert.deepEqual(orchestrator.dispatch({type: 'PAUSE'}).effects, []);
  assert.deepEqual(orchestrator.dispatch({type: 'RESUME'}).effects, []);
  assert.deepEqual(orchestrator.advance(10).effects, []);
  const fresh = createSessionOrchestrator(prescriptionFor(PLAN));
  fresh.dispatch({type: 'START_SESSION'}, 1);
  // RESUME while not paused is a no-op.
  assert.equal(fresh.dispatch({type: 'RESUME'}).state.lifecycle, 'PREPARING');
});

test('pause/resume after PREPARING (WORK_SET RUNNING) preserves the running context', () => {
  const orchestrator = createSessionOrchestrator(prescriptionFor(PLAN));
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  orchestrator.advance(PREPARING_DURATION_SECONDS);
  orchestrator.dispatch({type: 'BEGIN_WORK_SET'});
  orchestrator.advance(5);
  const {state} = orchestrator.dispatch({type: 'PAUSE'});
  assert.equal(state.lifecycle, 'PAUSED');
  assert.equal(state.pausedFromModule, 'WORK_SET');
  assert.equal(state.executionElapsedSeconds, PREPARING_DURATION_SECONDS + 5);
  const {state: resumed} = orchestrator.dispatch({type: 'RESUME'});
  assert.equal(resumed.lifecycle, 'RUNNING');
  assert.equal(resumed.pausedFromModule, null);
});

// ---------------------------------------------------------------------------
// EXERCISE_INTRO module (owner polish delta §C: START → PREPARING → INTRO → SET1)
// ---------------------------------------------------------------------------

test('PREPARING countdown completion activates EXERCISE_INTRO, never SET1/RUNNING directly', () => {
  const orchestrator = createSessionOrchestrator(prescriptionFor(PLAN));
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  const {state, effects} = orchestrator.advance(PREPARING_DURATION_SECONDS);
  assert.equal(state.lifecycle, 'AWAITING_WORK_SET');
  assert.equal(state.activeModule, 'EXERCISE_INTRO');
  assert.equal(state.modules.PREPARING, 'DONE');
  assert.equal(state.modules.EXERCISE_INTRO, 'ACTIVE');
  assert.equal(state.modules.WORK_SET, 'PENDING');
  assert.equal(state.introExercise?.exercise.id, 's1', 'INTRO exposes the first exercise identity');
  assert.ok(effects.some((effect) => effect.kind === 'MODULE_CHANGED' && effect.moduleId === 'EXERCISE_INTRO'));
});

test('overshooting advance lands exactly on INTRO (no skipped module)', () => {
  const orchestrator = createSessionOrchestrator(prescriptionFor(PLAN));
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  const {state} = orchestrator.advance(PREPARING_DURATION_SECONDS + 30);
  assert.equal(state.lifecycle, 'AWAITING_WORK_SET');
  assert.equal(state.activeModule, 'EXERCISE_INTRO');
});

const INTRO_MODULES = {START: 'DONE', PREPARING: 'DONE', EXERCISE_INTRO: 'ACTIVE', WORK_SET: 'PENDING', REST: 'PENDING', EXERCISE_TRANSITION: 'PENDING', COMPLETE: 'PENDING'} as const;

function introOrchestrator() {
  const orchestrator = createSessionOrchestrator(prescriptionFor(PLAN));
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  orchestrator.advance(PREPARING_DURATION_SECONDS);
  return orchestrator;
}

test('BEGIN_WORK_SET from INTRO crosses the SET1 entry boundary exactly once', () => {
  const orchestrator = introOrchestrator();
  const {state, effects} = orchestrator.dispatch({type: 'BEGIN_WORK_SET'});
  assert.equal(state.lifecycle, 'RUNNING');
  assert.equal(state.activeModule, 'WORK_SET');
  assert.equal(state.modules.EXERCISE_INTRO, 'DONE');
  assert.equal(state.modules.WORK_SET, 'ACTIVE');
  assert.equal(state.introExercise, null, 'INTRO context released at the boundary');
  assert.ok(effects.some((effect) => effect.kind === 'MODULE_CHANGED' && effect.moduleId === 'WORK_SET'));
  // Re-dispatch is a no-op (fail-closed; the boundary is crossed once).
  assert.deepEqual(orchestrator.dispatch({type: 'BEGIN_WORK_SET'}).effects, []);
  assert.equal(orchestrator.state.activeModule, 'WORK_SET');
});

test('INTRO never auto-completes: time advance alone cannot leave AWAITING_WORK_SET', () => {
  const orchestrator = introOrchestrator();
  const {state} = orchestrator.advance(120);
  assert.equal(state.lifecycle, 'AWAITING_WORK_SET', 'no timeout-driven INTRO completion (delta §C)');
  assert.equal(state.activeModule, 'EXERCISE_INTRO');
  // Execution seconds do not accrue while parked in INTRO.
  assert.equal(state.executionElapsedSeconds, PREPARING_DURATION_SECONDS);
});

test('BEGIN_WORK_SET outside INTRO is a no-op (fail-closed guard rails)', () => {
  const fresh = createSessionOrchestrator(prescriptionFor(PLAN));
  assert.deepEqual(fresh.dispatch({type: 'BEGIN_WORK_SET'}).effects, []);
  assert.equal(fresh.state.lifecycle, 'READY_TO_START');
  const running = createSessionOrchestrator(prescriptionFor(PLAN));
  running.dispatch({type: 'START_SESSION'}, 1_000);
  assert.deepEqual(running.dispatch({type: 'BEGIN_WORK_SET'}).effects, []);
  assert.equal(running.state.lifecycle, 'PREPARING');
});

test('PAUSE inside INTRO freezes the intro context; resume returns to it (not SET1)', () => {
  const orchestrator = introOrchestrator();
  const {state: paused} = orchestrator.dispatch({type: 'PAUSE'});
  assert.equal(paused.lifecycle, 'PAUSED');
  assert.equal(paused.pausedFromModule, 'EXERCISE_INTRO');
  assert.ok(paused.introExercise, 'intro context preserved under the freeze');
  const {state: resumed} = orchestrator.dispatch({type: 'RESUME'});
  assert.equal(resumed.lifecycle, 'AWAITING_WORK_SET');
  assert.equal(resumed.activeModule, 'EXERCISE_INTRO');
  // The user still owns progression after the freeze.
  const {state} = orchestrator.dispatch({type: 'BEGIN_WORK_SET'});
  assert.equal(state.lifecycle, 'RUNNING');
  assert.equal(state.activeModule, 'WORK_SET');
});
