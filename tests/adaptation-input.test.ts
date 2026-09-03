import assert from 'node:assert/strict';
import test from 'node:test';

import type { ExerciseId, ExerciseSlug } from '../src/lib/exercise';
import type { MovementConstraintToken, MovementId, MovementSlug } from '../src/lib/movement';
import type { RelationshipNode } from '../src/lib/movement';
import type { ProfileSnapshot } from '../src/lib/profile';
import {
  ADAPTATION_INPUT_VERSION,
  aggregateMovementPerformance,
  buildAdaptationInput,
  movementKnowledgeFromGraph,
  recurringDifficultySubjects,
} from '../src/lib/adaptive';

/**
 * AL-03 adaptation-input-pipeline invariants:
 *  - the input schema version is declared exactly once and equals 1;
 *  - the pipeline is PURE and deterministic (same source → same input);
 *  - a full (profile + MG-06 graph + history) source yields a well-typed
 *    input: attributed inference (capability/adherence), observed
 *    projections (equipment, preferences, activity, performance,
 *    recurring difficulties), resolved movement knowledge, sorted unique
 *    evidence refs;
 *  - edge cases are fail-closed: missing profile, empty history, empty
 *    graph — all produce a valid, conservative input (absence, never
 *    invention);
 *  - projection helpers (movement knowledge adapter, per-movement
 *    aggregates, recurring difficulties) are deterministic.
 */

const exerciseId = (v: string) => v as ExerciseId;
const slug = (v: string) => v as ExerciseSlug;
const constraint = (v: string) => v as MovementConstraintToken;
const mSlug = (v: string) => v as MovementSlug;
const mId = (v: string) => v as MovementId;

function sampleProfile(): ProfileSnapshot {
  return {
    contractVersion: 1,
    userId: 'user-1',
    observed: {
      trainingHistory: [
        { outcomeId: 'outcome-a', dateKey: '2026-09-01', kind: 'COMPLETED_FULLY', totalSets: 6, completedSets: 6, durationSeconds: 1740 },
        { outcomeId: 'outcome-b', dateKey: '2026-09-03', kind: 'COMPLETED_PARTIALLY', totalSets: 6, completedSets: 4, durationSeconds: 1200 },
      ],
      movementPerformance: [
        { outcomeId: 'outcome-a', dateKey: '2026-09-01', subject: { kind: 'exercise', slug: slug('bodyweight-squat') }, plannedSets: 3, completedSets: 3, difficultyFeeling: 'JUST_RIGHT' },
        { outcomeId: 'outcome-b', dateKey: '2026-09-03', subject: { kind: 'exercise', slug: slug('bodyweight-squat') }, plannedSets: 3, completedSets: 2, difficultyFeeling: 'HARD' },
      ],
      difficultyReports: [
        { reportId: 'diff-1', dateKey: '2026-09-02', subject: { kind: 'exercise', slug: slug('push-up') }, detail: 'wrist' },
        { reportId: 'diff-2', dateKey: '2026-09-03', subject: { kind: 'exercise', slug: slug('push-up') } },
        { reportId: 'diff-3', dateKey: '2026-09-03', subject: { kind: 'movementConstraint', constraint: constraint('knee-loading') } },
      ],
      asymmetryObservations: [],
      formObservations: [],
      equipment: {
        declaredAvailable: ['mat'],
        declaredMissing: ['dumbbell'],
        constraintsEncountered: [constraint('knee-loading')],
      },
      preferences: { locale: 'en', preferredDifficultyFeeling: 'JUST_RIGHT' },
      feedbackEntries: [{ outcomeId: 'outcome-a', dateKey: '2026-09-01', satisfactionRating: 4 }],
    },
    inferred: {
      capability: { value: { tier: 'beginner' }, confidence: 0.8, derivedBy: 'capability-model-v1', derivedAtDateKey: '2026-09-03', evidenceRefs: ['outcome-a', 'outcome-b'] },
      adherence: { value: { tier: 'MEDIUM' }, confidence: 0.9, derivedBy: 'adherence-model-v1', derivedAtDateKey: '2026-09-03', evidenceRefs: ['outcome-a'] },
    },
    privacy: { projectionsOnly: true },
    updateCount: 2,
    createdAtEpochMs: 1000,
    updatedAtEpochMs: 2000,
  };
}

function sampleGraph(): RelationshipNode[] {
  return [
    {
      slug: mSlug('bodyweight-squat'),
      id: mId('mv-squat'),
      relationships: [
        { kind: 'progression', target: { kind: 'slug', slug: mSlug('goblet-squat') } },
        { kind: 'regression', target: { kind: 'id', id: mId('mv-chair-squat') }, note: 'knee-friendly entry point' },
      ],
    },
  ];
}

test('input schema version: ADAPTATION_INPUT_VERSION is 1', () => {
  assert.equal(ADAPTATION_INPUT_VERSION, 1);
});

test('happy path: full profile + graph + history produces a well-typed input', () => {
  const input = buildAdaptationInput({ profile: sampleProfile(), movementKnowledge: sampleGraph() });
  assert.equal(input.version, 1);
  assert.equal(input.userId, 'user-1');
  assert.equal(input.asOfDateKey, '2026-09-03');

  // Attributed inference copied from the profile — never a bare fact.
  assert.deepEqual(input.user.capability, { tier: 'beginner', confidence: 0.8, derivedBy: 'capability-model-v1' });
  assert.deepEqual(input.user.adherence, { tier: 'MEDIUM', confidence: 0.9, derivedBy: 'adherence-model-v1' });
  assert.deepEqual(input.user.preferences, { locale: 'en', preferredDifficultyFeeling: 'JUST_RIGHT' });
  assert.deepEqual(input.user.equipment.declaredAvailable, ['mat']);
  assert.deepEqual(input.user.equipment.declaredMissing, ['dumbbell']);

  // Observed history projection.
  assert.equal(input.history.activity.sessionCount, 2);
  assert.equal(input.history.activity.completedSets, 10);

  // Per-movement aggregates (bodyweight-squat totals across both outcomes).
  assert.equal(input.history.performance.length, 1);
  const squat = input.history.performance[0];
  assert.equal(squat.totalPlannedSets, 6);
  assert.equal(squat.totalCompletedSets, 5);
  assert.equal(squat.completionRatio, 5 / 6);
  assert.equal(squat.lastDateKey, '2026-09-03');
  assert.equal(squat.lastDifficultyFeeling, 'HARD');

  // Recurring difficulties: first-seen order, deduped.
  assert.deepEqual(
    input.history.recurringDifficulties.map((s) =>
      s.kind === 'exercise' ? s.slug : s.kind === 'session' ? 'session' : s.constraint,
    ),
    [slug('push-up'), constraint('knee-loading')],
  );

  // Movement knowledge with resolved edges.
  assert.equal(input.movementKnowledge.length, 1);
  const entry = input.movementKnowledge[0];
  assert.equal(entry.slug, mSlug('bodyweight-squat'));
  assert.deepEqual(
    entry.relationships.map((r) => r.kind),
    ['progression', 'regression'],
  );
  assert.equal(entry.relationships[0].targetSlug, mSlug('goblet-squat'));
  assert.equal(entry.relationships[1].targetId, mId('mv-chair-squat'));

  // Constraints mirror equipment + recurring subjects.
  assert.deepEqual(input.constraints.constraintsEncountered, [constraint('knee-loading')]);
  assert.equal(input.constraints.recurringDifficultySubjects.length, 2);

  // Evidence: sorted, unique, non-empty.
  assert.deepEqual(input.evidence, ['outcome-a', 'outcome-b']);
});

test('determinism: identical sources produce identical inputs', () => {
  const a = buildAdaptationInput({ profile: sampleProfile(), movementKnowledge: sampleGraph() });
  const b = buildAdaptationInput({ profile: sampleProfile(), movementKnowledge: sampleGraph() });
  assert.deepEqual(a, b);
});

test('missing profile: anonymous user produces a valid conservative input', () => {
  const input = buildAdaptationInput({ movementKnowledge: [] });
  assert.equal(input.version, 1);
  assert.equal(input.userId, undefined);
  assert.equal(input.user.capability, undefined);
  assert.equal(input.user.adherence, undefined);
  assert.deepEqual(input.user.preferences, {});
  assert.deepEqual(input.user.equipment.declaredAvailable, []);
  assert.equal(input.history.activity.sessionCount, 0);
  assert.equal(input.history.performance.length, 0);
  assert.equal(input.movementKnowledge.length, 0);
  assert.deepEqual(input.evidence, []);
  assert.equal(input.asOfDateKey, '1970-01-01');
});

test('empty history: zeros + no history evidence, other evidence still collected', () => {
  const profile = sampleProfile();
  profile.observed.trainingHistory = [];
  const input = buildAdaptationInput({ profile, movementKnowledge: [] });
  assert.equal(input.history.activity.sessionCount, 0);
  assert.equal(input.history.activity.longestStreakDays, 0);
  // Evidence still cites performance/reports/feedback rows.
  assert.deepEqual(input.evidence, ['outcome-a', 'outcome-b']);
  assert.equal(input.history.performance.length, 1);
});

test('movement knowledge adapter: edges resolve to slug/id targets; empty graph → []', () => {
  const entries = movementKnowledgeFromGraph(sampleGraph());
  assert.equal(entries[0].relationships[0].targetSlug, mSlug('goblet-squat'));
  assert.equal(entries[0].relationships[1].targetId, mId('mv-chair-squat'));
  assert.deepEqual(movementKnowledgeFromGraph([]), []);
});

test('performance aggregation: totals, ratio, and newest-row fields are deterministic', () => {
  const rows = [
    { subject: { kind: 'exercise', slug: slug('push-up') } as const, plannedSets: 3, completedSets: 3, dateKey: '2026-09-01' },
    { subject: { kind: 'exercise', slug: slug('push-up') } as const, plannedSets: 3, completedSets: 1, dateKey: '2026-09-02' },
    { subject: { kind: 'exercise', slug: slug('plank') } as const, plannedSets: 0, completedSets: 0, dateKey: '2026-09-02' },
  ];
  const aggregates = aggregateMovementPerformance(rows);
  assert.equal(aggregates.length, 2);
  // Deterministic order: subject-key sort (plank before push-up).
  const pushUp = aggregates.find((a) => a.subject.kind === 'exercise' && a.subject.slug === slug('push-up'))!;
  assert.ok(pushUp, 'push-up aggregate present');
  assert.equal(pushUp.totalPlannedSets, 6);
  assert.equal(pushUp.totalCompletedSets, 4);
  assert.equal(pushUp.completionRatio, 2 / 3);
  assert.equal(pushUp.lastDateKey, '2026-09-02');
  const plank = aggregates.find((a) => a.subject.kind === 'exercise' && a.subject.slug === slug('plank'))!;
  assert.equal(plank.completionRatio, 0, 'divide-by-zero guard');
});

test('recurring difficulties: dedupe + first-seen order', () => {
  const subjects = recurringDifficultySubjects([
    { subject: { kind: 'exercise', slug: slug('push-up') } },
    { subject: { kind: 'movementConstraint', constraint: constraint('knee-loading') } },
    { subject: { kind: 'exercise', slug: slug('push-up') } },
    { subject: { kind: 'session' } },
  ]);
  assert.deepEqual(
    subjects.map((s) => (s.kind === 'session' ? 'session' : s.kind === 'exercise' ? s.slug : s.constraint)),
    [slug('push-up'), constraint('knee-loading'), 'session'],
  );
});