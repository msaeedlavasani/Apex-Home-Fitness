import assert from 'node:assert/strict';
import test from 'node:test';

import type { ExerciseId, ExerciseSlug } from '../src/lib/exercise';
import type { MovementConstraintToken } from '../src/lib/movement';
import type { WorkoutCompletionKind } from '../src/lib/outcomes';
import {
  ADHERENCE_TIERS,
  CAPABILITY_TIERS,
  MOVEMENT_TRENDS,
  PROFILE_CONTRACT_VERSION,
  PROFILE_SEVERITIES,
  isAdherenceTier,
  isCapabilityTier,
  isMovementTrend,
  isProfileSeverity,
  profileActivitySummary,
  validateProfileSnapshot,
  type InferredSignals,
  type ProfileProblemKind,
  type ProfileSnapshot,
} from '../src/lib/profile';

/**
 * AL-02 profile-contract invariants:
 *  - the contract version is declared exactly once and equals 1;
 *  - closed inferred-signal vocabularies (capability/trend/severity/
 *    adherence) have working runtime guards;
 *  - the snapshot structurally separates OBSERVED facts from INFERRED
 *    model outputs, and inference always carries confidence + derivation +
 *    evidence refs (attributable, never a stored fact);
 *  - §2B signals are all modeled (compile-time shape + runtime example);
 *  - deterministic validation fails closed (dateKeys, counts, enums,
 *    confidence, evidence, projections-only privacy invariant);
 *  - the pure windowed activity aggregate is deterministic and guards
 *    divide-by-zero/empty history.
 */

const exerciseId = (v: string) => v as ExerciseId;
const slug = (v: string) => v as ExerciseSlug;
const constraint = (v: string) => v as MovementConstraintToken;

const kinds: WorkoutCompletionKind[] = [
  'COMPLETED_FULLY',
  'COMPLETED_PARTIALLY',
  'ABANDONED',
  'DID_NOT_START',
];

function exampleSnapshot(): ProfileSnapshot {
  return {
    contractVersion: PROFILE_CONTRACT_VERSION,
    userId: 'user-1',
    observed: {
      trainingHistory: [
        {
          outcomeId: 'outcome-a',
          dateKey: '2026-09-01',
          kind: 'COMPLETED_FULLY',
          totalSets: 6,
          completedSets: 6,
          durationSeconds: 1740,
        },
        {
          outcomeId: 'outcome-b',
          dateKey: '2026-09-03',
          kind: 'COMPLETED_PARTIALLY',
          totalSets: 6,
          completedSets: 4,
          durationSeconds: 1200,
        },
      ],
      movementPerformance: [
        {
          outcomeId: 'outcome-a',
          dateKey: '2026-09-01',
          subject: { kind: 'exercise', exerciseId: exerciseId('cm-ex-1'), slug: slug('bodyweight-squat') },
          displayName: 'Bodyweight Squat',
          plannedSets: 3,
          completedSets: 3,
          difficultyFeeling: 'JUST_RIGHT',
        },
      ],
      difficultyReports: [
        {
          reportId: 'diff-1',
          dateKey: '2026-09-02',
          subject: { kind: 'exercise', slug: slug('push-up') },
          detail: 'wrist felt uncomfortable',
        },
      ],
      asymmetryObservations: [],
      formObservations: [],
      equipment: {
        declaredAvailable: ['mat'],
        constraintsEncountered: [constraint('knee-loading')],
      },
      preferences: { locale: 'en', preferredDifficultyFeeling: 'JUST_RIGHT' },
      feedbackEntries: [
        { outcomeId: 'outcome-a', dateKey: '2026-09-01', satisfactionRating: 4, difficultyFeeling: 'JUST_RIGHT' },
      ],
    },
    inferred: {
      capability: {
        value: { tier: 'beginner' },
        confidence: 0.8,
        derivedBy: 'capability-model-v1',
        derivedAtDateKey: '2026-09-03',
        evidenceRefs: ['outcome-a', 'outcome-b'],
      },
      movementTrends: [
        {
          value: { subject: { kind: 'exercise', slug: slug('bodyweight-squat') }, trend: 'IMPROVING' },
          confidence: 0.7,
          derivedBy: 'trend-model-v1',
          derivedAtDateKey: '2026-09-03',
          evidenceRefs: ['outcome-a'],
        },
      ],
      adherence: {
        value: { tier: 'MEDIUM' },
        confidence: 0.9,
        derivedBy: 'adherence-model-v1',
        derivedAtDateKey: '2026-09-03',
        evidenceRefs: ['outcome-a', 'outcome-b'],
      },
    },
    privacy: { projectionsOnly: true, userViewSupported: true, userDeletionSupported: true },
    updateCount: 2,
    createdAtEpochMs: 1000,
    updatedAtEpochMs: 2000,
  };
}

test('contract version: PROFILE_CONTRACT_VERSION is 1', () => {
  assert.equal(PROFILE_CONTRACT_VERSION, 1);
});

test('closed vocabularies: guards accept every member and reject strangers', () => {
  for (const tier of CAPABILITY_TIERS) {
    assert.equal(isCapabilityTier(tier), true, tier);
  }
  assert.equal(isCapabilityTier('expert'), false);
  for (const trend of MOVEMENT_TRENDS) {
    assert.equal(isMovementTrend(trend), true, trend);
  }
  assert.equal(isMovementTrend('UNKNOWN'), false);
  for (const severity of PROFILE_SEVERITIES) {
    assert.equal(isProfileSeverity(severity), true, severity);
  }
  assert.equal(isProfileSeverity('CRITICAL'), false);
  for (const tier of ADHERENCE_TIERS) {
    assert.equal(isAdherenceTier(tier), true, tier);
  }
  assert.equal(isAdherenceTier('NONE'), false);
});

test('every §2B strategy signal is modeled in the observed/inferred shape', () => {
  // Compile-time proof: all §2B signals exist as typed sections.
  const snapshot = exampleSnapshot();
  const observed = snapshot.observed;
  assert.ok(Array.isArray(observed.trainingHistory)); // training history
  assert.ok(Array.isArray(observed.movementPerformance)); // movement performance
  assert.ok(Array.isArray(observed.difficultyReports)); // recurring difficulties
  assert.ok(Array.isArray(observed.asymmetryObservations)); // asymmetries (reliable only)
  assert.ok(Array.isArray(observed.formObservations)); // form degradation (proxies only)
  assert.ok(observed.equipment); // available equipment + session constraints
  assert.ok(observed.preferences); // preferences
  assert.ok(Array.isArray(observed.feedbackEntries)); // user feedback
  const inferred = snapshot.inferred;
  assert.ok(inferred.capability); // capability
  assert.ok(inferred.movementTrends); // progression
  assert.ok(inferred.adherence); // adherence

  // Remaining §2B signals exist as typed optional surfaces on InferredSignals
  // (compile-time proof via typed assignment; absent at runtime until a model
  // produces them — absence = insufficient data, never a negative claim).
  const typed: InferredSignals = {
    recurringDifficulty: [],
    asymmetry: [],
    formRisk: [],
    tolerance: [],
  };
  assert.ok(Array.isArray(typed.recurringDifficulty)); // recurring difficulties (inferred aggregate)
  assert.ok(Array.isArray(typed.asymmetry)); // asymmetries (inferred, over reliable observations)
  assert.ok(Array.isArray(typed.formRisk)); // form degradation (inferred risk)
  assert.ok(Array.isArray(typed.tolerance)); // exercise tolerance (inferred)
});

test('a fully populated snapshot validates clean', () => {
  const validation = validateProfileSnapshot(exampleSnapshot());
  assert.equal(validation.valid, true, JSON.stringify(validation.problems));
});

test('observed vs inferred: inference always carries confidence + derivation + evidence', () => {
  const snapshot = exampleSnapshot();
  // Inferred values are wrapper-typed: confidence/derivedBy/derivedAtDateKey/evidenceRefs.
  const capability = snapshot.inferred.capability!;
  assert.ok(capability.confidence >= 0 && capability.confidence <= 1);
  assert.ok(capability.derivedBy.length > 0);
  assert.ok(capability.evidenceRefs.length > 0);
  // Observed facts need no derivation wrapper.
  const session = snapshot.observed.trainingHistory[0];
  assert.ok('dateKey' in session);
  assert.ok(!('confidence' in session), 'observed facts must not carry inference wrappers');
});

test('validator: inference without evidence refs is rejected', () => {
  const snapshot = exampleSnapshot();
  snapshot.inferred.capability = {
    value: { tier: 'beginner' },
    confidence: 0.5,
    derivedBy: 'model-v1',
    derivedAtDateKey: '2026-09-03',
    evidenceRefs: [],
  };
  assertProblems(snapshot, ['MISSING_EVIDENCE_REFS']);
});

test('validator: confidence outside 0..1 is rejected', () => {
  const snapshot = exampleSnapshot();
  snapshot.inferred.capability!.confidence = 1.4;
  assertProblems(snapshot, ['BAD_CONFIDENCE']);
});

test('validator: malformed dateKeys and inconsistent counts are rejected', () => {
  const badDate = exampleSnapshot();
  badDate.observed.trainingHistory = [
    { ...badDate.observed.trainingHistory[0], dateKey: '01-09-2026' },
  ];
  assertProblems(badDate, ['BAD_DATE_KEY']);

  const inconsistent = exampleSnapshot();
  inconsistent.observed.trainingHistory = [
    { ...inconsistent.observed.trainingHistory[0], completedSets: 8, totalSets: 6 },
  ];
  assertProblems(inconsistent, ['INCONSISTENT_COMPLETION']);
});

test('validator: out-of-vocabulary inferred enums are rejected', () => {
  const snapshot = exampleSnapshot();
  // @ts-expect-error — forcing an unknown trend must fail validation.
  snapshot.inferred.movementTrends![0].value.trend = 'WORSENING';
  assertProblems(snapshot, ['BAD_ENUM']);
});

test('validator: the projections-only privacy invariant is enforced', () => {
  const snapshot = exampleSnapshot();
  // @ts-expect-error — projectionsOnly is structurally true; forcing false must fail.
  snapshot.privacy.projectionsOnly = false;
  assertProblems(snapshot, ['BAD_PROJECTIONS_ONLY']);
});

test('validator: updatedAt before createdAt is rejected', () => {
  const snapshot = exampleSnapshot();
  snapshot.createdAtEpochMs = 5000;
  snapshot.updatedAtEpochMs = 1000;
  assertProblems(snapshot, ['BAD_TIMESTAMPS']);
});

test('activity aggregate: windowed counts and streak math are deterministic', () => {
  const history = exampleSnapshot().observed.trainingHistory;
  const summary = profileActivitySummary(history, { asOfDateKey: '2026-09-03' });
  assert.equal(summary.sessionCount, 2);
  assert.equal(summary.startedSessionCount, 2);
  assert.equal(summary.totalSets, 12);
  assert.equal(summary.completedSets, 10);
  assert.equal(summary.totalDurationSeconds, 2940);
  assert.equal(summary.longestStreakDays, 1); // 09-01 and 09-03 are not consecutive
  assert.equal(summary.lastDateKey, '2026-09-03');

  // Consecutive days produce a streak.
  const consecutive = [
    { outcomeId: 'o1', dateKey: '2026-09-01', kind: kinds[0], totalSets: 3, completedSets: 3, durationSeconds: 600 },
    { outcomeId: 'o2', dateKey: '2026-09-02', kind: kinds[0], totalSets: 3, completedSets: 3, durationSeconds: 600 },
    { outcomeId: 'o3', dateKey: '2026-09-04', kind: kinds[0], totalSets: 3, completedSets: 3, durationSeconds: 600 },
  ];
  assert.equal(profileActivitySummary(consecutive).longestStreakDays, 2);
});

test('activity aggregate: empty history is safe (no crash, zero values)', () => {
  const summary = profileActivitySummary([], { asOfDateKey: '2026-09-03' });
  assert.equal(summary.sessionCount, 0);
  assert.equal(summary.longestStreakDays, 0);
  assert.equal(summary.lastDateKey, undefined);
});

function assertProblems(snapshot: ProfileSnapshot, kinds: ProfileProblemKind[]): void {
  const validation = validateProfileSnapshot(snapshot);
  assert.equal(validation.valid, false, 'snapshot must be flagged invalid');
  const found = validation.problems.map((p) => p.kind);
  for (const kind of kinds) {
    assert.ok(found.includes(kind), `expected problem ${kind}, got ${JSON.stringify(found)}`);
  }
}
