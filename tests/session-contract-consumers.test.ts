import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

import {
  buildWorkoutStateRecord,
  hydrateFromRecord,
  matchesPlan,
  toOfflineExercises,
} from '../src/lib/offline/workoutPersistence';
import {clampSets} from '../src/lib/workout/plan';
import type {
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
// S-04 type identity: the hook's public domain types are EXACTLY the
// canonical contract types (re-exports, not parallel declarations).
// ---------------------------------------------------------------------------

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;

type _StateIdentity = Assert<Equal<SessionState, WorkoutEngineState>>;
type _ExerciseIdentity = Assert<Equal<SessionExercise, WorkoutExercise>>;
type _SummaryIdentity = Assert<Equal<SessionSummary, WorkoutSummary>>;
type _HydrateIdentity = Assert<Equal<SessionHydrateInput, WorkoutEngineHydrateInput>>;
type _PhaseIdentity = Assert<Equal<SessionPhase, WorkoutPhase>>;

test('S-04: hook public domain types are the canonical contract (compile-time identity)', () => {
  // The type-level assertions above are the proof; this runtime test pins the
  // aliasing so accidental drift fails loudly here too.
  const state: SessionState = {
    phase: 'EXERCISING', currentExerciseIndex: 0, currentSet: 1, completedSets: 0,
    totalSets: 3, phaseElapsedSeconds: 0, totalElapsedSeconds: 0, isRunning: true,
    startedAt: 1_700_000_000_000, completedAt: null,
  };
  const engineState: WorkoutEngineState = state; // assignable both ways ⇒ identical
  assert.deepStrictEqual(engineState, state);
  assert.equal(typeof clampSets, 'function');
});

// ---------------------------------------------------------------------------
// S-04 consumer contract: the persistence bridge consumes the canonical
// contract directly (no hook types in its signatures at runtime).
// ---------------------------------------------------------------------------

const PLAN: SessionExercise[] = [
  {id: 'ex-1', name: 'Squats', sets: 3, reps: 12, durationSeconds: 30, restSeconds: 45},
  {id: 'ex-2', name: 'Plank', sets: 2, reps: null, durationSeconds: 60, restSeconds: 30},
];

const STATE: SessionState = {
  phase: 'RESTING', currentExerciseIndex: 1, currentSet: 1, completedSets: 3,
  totalSets: 5, phaseElapsedSeconds: 12, totalElapsedSeconds: 340, isRunning: true,
  startedAt: 1_700_000_000_000, completedAt: null,
};

test('S-04: persistence maps canonical plan/state types end-to-end', () => {
  const exercises = toOfflineExercises(PLAN, {currentExerciseIndex: 1, phase: 'RESTING'});
  assert.equal(exercises.length, 2);
  assert.equal(exercises[0].completed, true); // index 0 before current
  assert.equal(exercises[1].completed, false); // current, not COMPLETED

  const persisted = buildWorkoutStateRecord(PLAN, STATE);
  assert.equal(persisted.phase, 'RESTING');
  assert.equal(persisted.exercises.length, 2);
  assert.equal(persisted.isComplete, false);
  // The db layer fills the identity/stamp fields before storing; rebuild a
  // full record the way `db.ts` does so matchesPlan/hydrateFromRecord accept it.
  const record = {...persisted, workoutKey: 'u1:2026-09-01', userId: 'u1', dateKey: '2026-09-01', updatedAt: 1_700_000_000_100};
  assert.equal(matchesPlan(record, PLAN), true);
  assert.equal(matchesPlan(record, [PLAN[0]]), false);

  const hydrate: SessionHydrateInput | null = hydrateFromRecord(record, PLAN);
  assert.ok(hydrate);
  assert.equal(hydrate.phase, 'RESTING');
  assert.equal(hydrate.currentExerciseIndex, 1);
  // The hydration input feeds the core's HYDRATE command via the hook adapter.
  const engineHydrate: WorkoutEngineHydrateInput = hydrate;
  assert.equal(engineHydrate.isComplete, false);
});

test('S-04: clampSets normalizes plan set counts for persistence', () => {
  assert.equal(clampSets(3), 3);
  assert.equal(clampSets(null), 1);
  assert.equal(clampSets(undefined), 1);
  assert.equal(clampSets(0), 1);
  assert.equal(clampSets(2.9), 2);
});

// ---------------------------------------------------------------------------
// S-04 import boundary: NO src/lib module may import the React hook — the
// canonical session boundary owns persistence/plan/state types.
// ---------------------------------------------------------------------------

test('S-04: src/lib never imports from the React hook module', () => {
  const {execSync} = require('node:child_process') as typeof import('node:child_process');
  // Import statements only — prose comments may mention the hook.
  const output = execSync(
    "grep -rn \"import.*useWorkoutEngine\" src/lib --include='*.ts' --include='*.tsx' || true",
    {cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8'},
  ).trim();
  assert.equal(output, '', `src/lib must not import useWorkoutEngine:\n${output}`);
});

test('S-04: contracts module stays types-only (no runtime logic)', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/lib/workout/sessionContracts.ts', import.meta.url)),
    'utf8',
  );
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  assert.doesNotMatch(code, /\bfunction\b|=>/, 'contracts must not contain runtime logic');
  assert.doesNotMatch(code, /'use client'/, 'contracts must not be a client module');
});
