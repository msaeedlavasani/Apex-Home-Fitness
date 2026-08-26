/**
 * S02-D1 — canonical exercise identity propagation seam.
 *
 * Exercises the pure enrichment contract in `src/lib/programSchedule.ts`:
 * joining weekly-schedule exercises with the relational `ProgramExercise →
 * Exercise` payload so downstream consumers can receive canonical identity
 * where available, while every legacy path (generated/session-local id, name)
 * keeps working unchanged.
 *
 * Source of truth = the persisted `Exercise` row id; canonical identity is
 * never invented and never fuzzy-matched. Offline, no Prisma.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  enrichExerciseIdentity,
  enrichScheduleExercises,
  exerciseIdentityIndex,
  type RelationalExercise,
  type WorkoutExerciseIdentity,
} from '../src/lib/programSchedule';

// Relational `program.exercises` payload as returned by the current API.
const RELATIONAL: RelationalExercise[] = [
  {order: 1, exercise: {id: 'clx_deadbug_1', name: 'Dead Bug', slug: 'dead-bug'}},
  {order: 2, exercise: {id: 'clx_pushup_1', name: 'Push-Up', slug: 'push-up'}},
  {order: 3, exercise: {id: 'clx_wallsit_1', name: 'Wall Sit', slug: 'wall-sit'}},
  // A legacy row resolved in S02-C but created under an alias display name.
  {order: 4, exercise: {id: 'clx_plank_1', name: 'Plank Forward', slug: 'plank-hold'}},
];

const index = exerciseIdentityIndex(RELATIONAL);

test('canonical relation available returns the persisted Exercise.id and slug', () => {
  const ref = enrichExerciseIdentity(
    {id: 'EX-101', name: 'Dead Bug', sets: 3},
    0,
    index,
  );
  assert.equal(ref.exerciseId, 'clx_deadbug_1');
  assert.equal(ref.slug, 'dead-bug');
  assert.equal(ref.name, 'Dead Bug');
  // Legacy generated id preserved alongside canonical identity.
  assert.equal(ref.legacyId, 'EX-101');
});

test('canonical slug explicit on the input resolves via the relational slug index', () => {
  // A future/client-provided slug routes through the bySlug path even when the
  // display name differs from the persisted row's display name.
  const ref = enrichExerciseIdentity({id: 'u-9', name: 'Front Plank', slug: 'plank-hold'}, 3, index);
  assert.equal(ref.exerciseId, 'clx_plank_1');
  assert.equal(ref.slug, 'plank-hold');
});

test('legacy generated id is preserved and the display name falls back when absent', () => {
  const ref = enrichExerciseIdentity({id: 'rule-2-0', name: '   Squat   ', sets: 3}, 5, index);
  // Whitespace is trimmed for matching.
  assert.equal(ref.name, 'Squat');
  assert.equal(ref.legacyId, 'rule-2-0');
});

test('no canonical match returns a valid legacy-only reference (nothing invented)', () => {
  const ref = enrichExerciseIdentity({id: 'generated-7', name: 'Totally-Unknown-Movement'}, 7, index);
  assert.equal(ref.exerciseId, undefined);
  assert.equal(ref.slug, undefined);
  assert.equal(ref.legacyId, 'generated-7');
  assert.equal(ref.name, 'Totally-Unknown-Movement');
});

test('missing id falls back to a generated-stable legacy id', () => {
  const ref = enrichExerciseIdentity({name: 'Dead Bug'}, 0, index);
  assert.equal(ref.exerciseId, 'clx_deadbug_1');
  assert.equal(ref.legacyId, 'generated-0');
});

test('the same exercise twice keeps distinct step identity with one canonical Exercise.id', () => {
  // Two workout STEPS for the same movement must not collapse into one.
  const refs = enrichScheduleExercises(
    [
      {id: 'EX-201', name: 'Push-Up', sets: 3},
      {id: 'EX-202', name: 'Push-Up', sets: 3},
    ],
    index,
  );
  assert.equal(refs.length, 2);
  // Distinct step identity via legacyId + position.
  assert.equal(refs[0]?.legacyId, 'EX-201');
  assert.equal(refs[1]?.legacyId, 'EX-202');
  // Same canonical movement identity — allowed.
  assert.equal(refs[0]?.exerciseId, 'clx_pushup_1');
  assert.equal(refs[1]?.exerciseId, 'clx_pushup_1');
});

test('alias collapse maps different names to the same canonical id WITHOUT collapsing steps', () => {
  // The relational row is named "Push-Up" but the schedule carries an alias-ish
  // spelling "pushups" plus a slug hint — both steps must resolve to the SAME
  // canonical row (identity of the movement) while remaining distinct steps.
  const refs = enrichScheduleExercises(
    [
      {id: 'EX-301', name: 'pushups', slug: 'push-up', sets: 3},
      {id: 'EX-302', name: 'Push-Up', sets: 3},
    ],
    index,
  );
  assert.equal(refs.length, 2, 'two schedule entries must remain two steps');
  assert.equal(refs[0]?.exerciseId, 'clx_pushup_1');
  assert.equal(refs[1]?.exerciseId, 'clx_pushup_1');
  assert.equal(refs[0]?.legacyId, 'EX-301');
  assert.equal(refs[1]?.legacyId, 'EX-302');
});

test('no fuzzy match: similar-looking names never invent canonical identity', () => {
  // "Push Up" (space) and "Push-Up" (hyphen) differ only in punctuation, but
  // the seam must NOT fuzzy-match them to the canonical row when there is no
  // exact name or slug hit.
  const ref = enrichExerciseIdentity({id: 'EX-9', name: 'Push Up', sets: 3}, 1, index);
  assert.equal(ref.exerciseId, undefined);
  assert.equal(ref.legacyId, 'EX-9');
});

test('the relational identity index is available to consumers', () => {
  const refs = enrichScheduleExercises(
    [
      {id: 'EX-1', name: 'Wall Sit'},
      {id: 'EX-2', name: 'Does-Not-Exist'},
    ],
    index,
  );
  assert.deepEqual(
    refs.map((r: WorkoutExerciseIdentity) => [r.exerciseId, r.legacyId]),
    [
      ['clx_wallsit_1', 'EX-1'],
      [undefined, 'EX-2'],
    ],
  );
});