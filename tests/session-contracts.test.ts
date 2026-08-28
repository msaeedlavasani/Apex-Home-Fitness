import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import type {
  SessionCommand,
  SessionDerived,
  SessionEffect,
  SessionExercise,
  SessionHydrateInput,
  SessionPhase,
  SessionState,
  SessionSummary,
} from '../src/lib/workout/sessionContracts';
import type {
  WorkoutEngineHydrateInput,
  WorkoutEngineState,
  WorkoutExercise,
  WorkoutPhase,
  WorkoutSummary,
} from '../src/components/workout/useWorkoutEngine';

// ---------------------------------------------------------------------------
// Structural parity with the current engine (R6 mirrors useWorkoutEngine
// exactly — compile-time proof in both directions).
// ---------------------------------------------------------------------------

function engineStateToSession(state: WorkoutEngineState): SessionState {
  return state;
}

function sessionStateToEngine(state: SessionState): WorkoutEngineState {
  return state;
}

function hydrateInputToSession(input: WorkoutEngineHydrateInput): SessionHydrateInput {
  return input;
}

function summaryToSession(summary: WorkoutSummary): SessionSummary {
  return summary;
}

function phaseToSession(phase: WorkoutPhase): SessionPhase {
  return phase;
}

function sessionPhaseToEngine(phase: SessionPhase): WorkoutPhase {
  return phase;
}

function workoutExerciseToSession(exercise: WorkoutExercise): SessionExercise {
  return exercise;
}

function sessionExerciseToEngine(exercise: SessionExercise): WorkoutExercise {
  return exercise;
}

const ENGINE_STATE_SAMPLE: WorkoutEngineState = {
  phase: 'EXERCISING',
  currentExerciseIndex: 1,
  currentSet: 2,
  completedSets: 3,
  totalSets: 11,
  phaseElapsedSeconds: 17,
  totalElapsedSeconds: 240,
  isRunning: true,
  startedAt: 1_756_000_000_000,
  completedAt: null,
};

test('SessionState mirrors the current 10-field engine state exactly', () => {
  // Both directions must compile — the contract shape is pinned to the engine.
  const asSession = engineStateToSession(ENGINE_STATE_SAMPLE);
  const backToEngine = sessionStateToEngine(asSession);
  assert.deepStrictEqual(backToEngine, ENGINE_STATE_SAMPLE);
  assert.deepStrictEqual(Object.keys(asSession).sort(), [
    'completedAt',
    'completedSets',
    'currentExerciseIndex',
    'currentSet',
    'isRunning',
    'phase',
    'phaseElapsedSeconds',
    'startedAt',
    'totalElapsedSeconds',
    'totalSets',
  ]);
});

test('SessionPhase, SessionSummary and SessionHydrateInput mirror engine types', () => {
  assert.equal(phaseToSession('RESTING'), 'RESTING');
  assert.equal(sessionPhaseToEngine('COMPLETED'), 'COMPLETED');
  assert.deepStrictEqual(
    summaryToSession({totalExercises: 6, totalSets: 17, completedSets: 17, durationSeconds: 1320}),
    {totalExercises: 6, totalSets: 17, completedSets: 17, durationSeconds: 1320},
  );
  assert.deepStrictEqual(
    hydrateInputToSession({phase: 'RESTING', currentSet: 2, isComplete: false}),
    {phase: 'RESTING', currentSet: 2, isComplete: false},
  );
});

// ---------------------------------------------------------------------------
// Canonical exercise identity (S02/R4/R5 model: Exercise.id + Exercise.slug).
// ---------------------------------------------------------------------------

test('SessionExercise carries canonical identity alongside plan position', () => {
  const exercise = {
    id: 'pe-1', // plan-position key — NOT the canonical Exercise id
    name: 'اسکوات', // display-only, localized by the caller — never identity
    sets: 3,
    reps: 12,
    durationSeconds: null,
    restSeconds: 30,
    exerciseId: 'ex_01hx7k2m', // canonical Exercise.id
    slug: 'squat', // canonical Exercise.slug
  } satisfies SessionExercise;

  assert.equal(exercise.exerciseId, 'ex_01hx7k2m');
  assert.equal(exercise.slug, 'squat');
  // Identity fields survive plan construction and ordering.
  const plan: readonly SessionExercise[] = [
    exercise,
    {id: 'pe-2', name: 'پوش‌آپ', sets: 2, exerciseId: 'ex_02push', slug: 'push-up'},
    {id: 'pe-3', name: 'Plank', sets: 1}, // legacy/plan-only item: identity optional
  ];
  assert.deepStrictEqual(
    plan.map((item) => item.slug ?? null),
    ['squat', 'push-up', null],
  );
});

test('Current WorkoutExercise plans are accepted (identity fields optional)', () => {
  const planItem: SessionExercise = workoutExerciseToSession({
    id: 'fbi-1',
    name: 'Jumping Jacks',
    sets: 4,
    reps: null,
    durationSeconds: 40,
    restSeconds: 20,
  });
  assert.equal(planItem.exerciseId, undefined);
  assert.equal(planItem.slug, undefined);
  // Reverse direction keeps compiling — the contract is a superset.
  const engineItem: WorkoutExercise = sessionExerciseToEngine(planItem);
  assert.equal(engineItem.name, 'Jumping Jacks');
});

// ---------------------------------------------------------------------------
// Serialization safety: session state must round-trip through JSON verbatim
// (persistence layers store it as-is).
// ---------------------------------------------------------------------------

test('SessionState and SessionHydrateInput are JSON round-trip safe', () => {
  const state: SessionState = {
    phase: 'RESTING',
    currentExerciseIndex: 0,
    currentSet: 2,
    completedSets: 1,
    totalSets: 11,
    phaseElapsedSeconds: 5,
    totalElapsedSeconds: 95,
    isRunning: false,
    startedAt: 1_756_000_000_000,
    completedAt: null,
  };
  assert.deepStrictEqual(JSON.parse(JSON.stringify(state)), state);

  const hydrate: SessionHydrateInput = {
    phase: 'COMPLETED',
    currentExerciseIndex: 5,
    currentSet: 3,
    phaseElapsedSeconds: 0,
    totalElapsedSeconds: 1320,
    startedAt: 1_756_000_000_000,
    completedAt: 1_756_000_300_000,
  };
  assert.deepStrictEqual(JSON.parse(JSON.stringify(hydrate)), hydrate);
});

test('SessionDerived stays a plain read-model of numbers and nulls', () => {
  const derived = {
    totalSets: 11,
    completedSets: 4,
    progress: 4 / 11,
    phaseDurationSeconds: 30,
    secondsLeft: 13,
    totalExercises: 6,
  } satisfies SessionDerived;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(derived)), derived);
  assert.ok(derived.progress >= 0 && derived.progress <= 1);
});

// ---------------------------------------------------------------------------
// Command/effect surface: the exact current engine commands and
// callbacks-as-effects, exhaustively.
// ---------------------------------------------------------------------------

test('SessionCommand covers exactly the current engine commands', () => {
  const commands = [
    {kind: 'START'},
    {kind: 'PAUSE'},
    {kind: 'RESUME'},
    {kind: 'COMPLETE_SET'},
    {kind: 'SKIP_REST'},
    {kind: 'NEXT_EXERCISE'},
    {kind: 'PREVIOUS_EXERCISE'},
    {kind: 'JUMP_TO', index: 2},
    {kind: 'RESET'},
    {kind: 'RESTART'},
    {kind: 'HYDRATE', input: {phase: 'EXERCISING'}},
    {kind: 'ACCOUNT', elapsedSeconds: 3},
  ] as const satisfies readonly SessionCommand[];

  // Compile-time exhaustiveness: adding/removing a variant breaks this Record.
  const coverage: Record<SessionCommand['kind'], true> = {
    START: true,
    PAUSE: true,
    RESUME: true,
    COMPLETE_SET: true,
    SKIP_REST: true,
    NEXT_EXERCISE: true,
    PREVIOUS_EXERCISE: true,
    JUMP_TO: true,
    RESET: true,
    RESTART: true,
    HYDRATE: true,
    ACCOUNT: true,
  };
  assert.deepEqual(Object.keys(coverage).sort(), commands.map((c) => c.kind).sort());
});

test('SessionEffect covers exactly the current engine callbacks', () => {
  const effects = [
    {kind: 'PHASE_CHANGED', phase: 'EXERCISING'},
    {kind: 'SET_COMPLETED', exerciseIndex: 0, set: 1},
    {kind: 'EXERCISE_COMPLETED', exerciseIndex: 0},
    {kind: 'WORKOUT_COMPLETED', summary: {totalExercises: 6, totalSets: 17, completedSets: 17, durationSeconds: 1320}},
    {kind: 'STATE_CHANGED', state: ENGINE_STATE_SAMPLE},
  ] as const satisfies readonly SessionEffect[];

  const coverage: Record<SessionEffect['kind'], true> = {
    PHASE_CHANGED: true,
    SET_COMPLETED: true,
    EXERCISE_COMPLETED: true,
    WORKOUT_COMPLETED: true,
    STATE_CHANGED: true,
  };
  assert.deepEqual(Object.keys(coverage).sort(), effects.map((e) => e.kind).sort());
});

// ---------------------------------------------------------------------------
// Purity: the contracts module stays types-only with zero runtime
// dependencies (no React, no browser APIs, no services, no side effects).
// ---------------------------------------------------------------------------

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

test('sessionContracts module is pure: types only, no runtime dependencies', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/lib/workout/sessionContracts.ts', import.meta.url)),
    'utf8',
  );
  const code = stripComments(source);
  assert.doesNotMatch(code, /\bimport\b/, 'contracts must not import anything');
  assert.doesNotMatch(code, /'use client'/, 'contracts must not be a client module');
  assert.doesNotMatch(code, /\bwindow\b|\bdocument\b|\blocalStorage\b|\bindexedDB\b|\bfetch\(/, 'no browser APIs');
  assert.doesNotMatch(code, /\bnew Date\b|\bDate\.now\b/, 'no clock access — time is an input');
  assert.doesNotMatch(code, /\bfunction\b|=>/, 'no runtime logic — types only');
  assert.match(code, /export type SessionPhase/);
  assert.match(code, /export interface SessionState/);
  assert.match(code, /export interface SessionExercise/);
  assert.match(code, /export type SessionCommand/);
  assert.match(code, /export type SessionEffect/);
});
