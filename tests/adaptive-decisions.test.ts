/**
 * AL-04 — Adaptive Training Graph v1 decision engine tests.
 *
 * Covers the signed-off rule table (gate `docs/architecture/AL-04-DECISION-GATE.md`):
 * L2 difficulty-feeling → action, L0 gates (constraint/recovery/feasibility),
 * L1 frame (adherence + volume caps), insufficient-data baseline, D2a
 * apply modes, determinism, and the D4a session-intent validation.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildAdaptiveDecision, DECISION_POLICY, validateSessionIntent } from '../src/lib/adaptive';
import type {
  AdaptationInput,
  MovementKnowledgeEntry,
  MovementPerformanceAggregate,
  SessionIntent,
} from '../src/lib/adaptive';
import type { ProfileMovementSubject } from '../src/lib/profile';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AS_OF = '2026-09-03';

function exercise(slug: string): ProfileMovementSubject {
  return { kind: 'exercise', slug: slug as never };
}

function intent(rows: Array<[string, number]>): SessionIntent {
  return {
    movements: rows.map(([slug, plannedSets], i) => ({
      slotIndex: i,
      subject: exercise(slug),
      plannedSets,
    })),
  };
}

function entry(
  slug: string,
  relationships: Array<{ kind: 'progression' | 'regression' | 'substitution'; targetSlug: string; note?: string }>,
): MovementKnowledgeEntry {
  return { slug: slug as never, relationships: relationships.map((r) => ({ kind: r.kind, targetSlug: r.targetSlug as never, note: r.note })) };
}

function perf(
  slug: string,
  over: Partial<MovementPerformanceAggregate> = {},
): MovementPerformanceAggregate {
  return {
    subject: exercise(slug),
    totalPlannedSets: 6,
    totalCompletedSets: 6,
    completionRatio: 1,
    lastDateKey: AS_OF,
    lastOutcomeId: `out-${slug}`,
    ...over,
  };
}

interface InputOverrides {
  user?: Partial<AdaptationInput['user']>;
  performance?: MovementPerformanceAggregate[];
  movementKnowledge?: MovementKnowledgeEntry[];
  recurringDifficulties?: AdaptationInput['constraints']['recurringDifficultySubjects'];
  activity?: Partial<AdaptationInput['history']['activity']>;
  sessionIntent?: SessionIntent;
  /** Force the session-intent field to be absent (conservative path). */
  noIntent?: boolean;
  evidence?: string[];
}

function input(over: InputOverrides = {}): AdaptationInput {
  const sessionIntent = over.noIntent ? undefined : (over.sessionIntent ?? intent([['push-up', 9]]));
  return {
    version: 1,
    asOfDateKey: AS_OF,
    user: {
      capability: { tier: 'intermediate', confidence: 0.8, derivedBy: 'profile.capability.v1' },
      adherence: { tier: 'HIGH', confidence: 0.9, derivedBy: 'profile.adherence.v1' },
      preferences: {},
      equipment: { declaredAvailable: [], constraintsEncountered: [] },
      ...over.user,
    },
    movementKnowledge: over.movementKnowledge ?? [
      entry('push-up', [
        { kind: 'progression', targetSlug: 'decline-push-up' },
        { kind: 'regression', targetSlug: 'incline-push-up' },
      ]),
      entry('pull-up', [{ kind: 'substitution', targetSlug: 'banded-pull-apart', note: 'no bar available' }]),
    ],
    history: {
      activity: {
        sessions: [],
        sessionCount: 4,
        startedSessionCount: 4,
        totalSets: 36,
        completedSets: 32,
        totalDurationSeconds: 2400,
        longestStreakDays: 3,
        lastDateKey: AS_OF,
        ...over.activity,
      },
      performance: over.performance ?? [perf('push-up')],
      recurringDifficulties: [],
    },
    constraints: {
      equipmentAvailable: [],
      equipmentMissing: [],
      constraintsEncountered: [],
      recurringDifficultySubjects: over.recurringDifficulties ?? [],
    },
    sessionIntent,
    evidence: over.evidence ?? [],
  };
}

// ---------------------------------------------------------------------------
// Session-intent validation (D4a additive extension)
// ---------------------------------------------------------------------------

describe('validateSessionIntent (D4a additive input extension)', () => {
  it('accepts a well-formed intent', () => {
    const v = validateSessionIntent(intent([['push-up', 9], ['squat', 6]]));
    assert.equal(v.valid, true);
    assert.equal(v.problems.length, 0);
  });

  it('rejects negative/zero planned sets', () => {
    const v = validateSessionIntent({ movements: [{ slotIndex: 0, subject: exercise('push-up'), plannedSets: 0 }] });
    assert.equal(v.valid, false);
    assert.ok(v.problems.some((p) => p.kind === 'BAD_SETS'));
  });

  it('rejects duplicate slot indices', () => {
    const v = validateSessionIntent({
      movements: [
        { slotIndex: 0, subject: exercise('push-up'), plannedSets: 3 },
        { slotIndex: 0, subject: exercise('squat'), plannedSets: 3 },
      ],
    });
    assert.equal(v.valid, false);
    assert.ok(v.problems.some((p) => p.kind === 'DUPLICATE_SLOT_INDEX'));
  });

  it('rejects non-exercise subjects in an intent', () => {
    const v = validateSessionIntent({
      movements: [{ slotIndex: 0, subject: { kind: 'movementConstraint', constraint: 'knee' as never }, plannedSets: 3 }],
    });
    assert.equal(v.valid, false);
    assert.ok(v.problems.some((p) => p.kind === 'BAD_SUBJECT'));
  });

  it('rejects undefined/empty intents', () => {
    assert.equal(validateSessionIntent(undefined).valid, false);
    assert.equal(validateSessionIntent({ movements: [] }).valid, false);
  });
});

// ---------------------------------------------------------------------------
// L2 — difficulty-feeling rule table
// ---------------------------------------------------------------------------

describe('L2 per-movement decisions (difficulty table)', () => {
  it('VERY_EASY + fresh + complete → PROGRESS one edge step (ADVISORY)', () => {
    const out = buildAdaptiveDecision(input({ performance: [perf('push-up', { lastDifficultyFeeling: 'VERY_EASY' })] }));
    const d = out.movements[0];
    assert.equal(out.basis, 'RULE_DRIVEN');
    assert.equal(d.decision, 'PROGRESS');
    assert.equal(d.target?.slug, 'decline-push-up');
    assert.equal(d.apply, 'ADVISORY');
    assert.equal(d.confidence, 'HIGH');
    assert.equal(d.ruleId, 'L2-DIFF-VERY_EASY');
    assert.deepEqual(d.evidenceRefs, ['out-push-up']);
    assert.ok(d.humanText.length > 0);
  });

  it('VERY_EASY + no progression edge → KEEP with +1 set (ADVISORY)', () => {
    const out = buildAdaptiveDecision(
      input({
        movementKnowledge: [entry('push-up', [{ kind: 'regression', targetSlug: 'incline-push-up' }])],
        performance: [perf('push-up', { lastDifficultyFeeling: 'VERY_EASY' })],
      }),
    );
    assert.equal(out.movements[0].decision, 'KEEP');
    assert.equal(out.movements[0].setsDelta, DECISION_POLICY.movementDeltaMax);
    assert.equal(out.movements[0].apply, 'ADVISORY');
  });

  it('VERY_EASY + stale row → KEEP (no change)', () => {
    const out = buildAdaptiveDecision(
      input({
        performance: [perf('push-up', { lastDifficultyFeeling: 'VERY_EASY', lastDateKey: '2026-07-01' })],
      }),
    );
    assert.equal(out.movements[0].decision, 'KEEP');
    assert.equal(out.movements[0].setsDelta, 0);
  });

  it('EASY + completion 0.95 + IMPROVING trend → PROGRESS', () => {
    const out = buildAdaptiveDecision(
      input({
        performance: [perf('push-up', { lastDifficultyFeeling: 'EASY', completionRatio: 0.95 })],
        user: {
          movementTrends: [
            { subject: exercise('push-up'), trend: 'IMPROVING', confidence: 0.7, derivedBy: 'profile.trends.v1' },
          ],
        },
      }),
    );
    assert.equal(out.movements[0].decision, 'PROGRESS');
    assert.equal(out.movements[0].target?.slug, 'decline-push-up');
  });

  it('EASY + low completion → KEEP', () => {
    const out = buildAdaptiveDecision(
      input({ performance: [perf('push-up', { lastDifficultyFeeling: 'EASY', completionRatio: 0.8 })] }),
    );
    assert.equal(out.movements[0].decision, 'KEEP');
    assert.equal(out.movements[0].setsDelta, 0);
  });

  it('JUST_RIGHT → KEEP (maintenance anchor)', () => {
    const out = buildAdaptiveDecision(
      input({ performance: [perf('push-up', { lastDifficultyFeeling: 'JUST_RIGHT' })] }),
    );
    assert.equal(out.movements[0].decision, 'KEEP');
    assert.equal(out.movements[0].setsDelta, 0);
    assert.equal(out.movements[0].ruleId, 'L2-DIFF-JUST_RIGHT');
  });

  it('HARD → KEEP, no progression', () => {
    const out = buildAdaptiveDecision(
      input({ performance: [perf('push-up', { lastDifficultyFeeling: 'HARD' })] }),
    );
    assert.equal(out.movements[0].decision, 'KEEP');
    assert.equal(out.movements[0].ruleId, 'L2-DIFF-HARD');
  });

  it('HARD + REGRESSING trend → REGRESS (AUTO)', () => {
    const out = buildAdaptiveDecision(
      input({
        performance: [perf('push-up', { lastDifficultyFeeling: 'HARD' })],
        user: {
          movementTrends: [
            { subject: exercise('push-up'), trend: 'REGRESSING', confidence: 0.6, derivedBy: 'profile.trends.v1' },
          ],
        },
      }),
    );
    assert.equal(out.movements[0].decision, 'REGRESS');
    assert.equal(out.movements[0].target?.slug, 'incline-push-up');
    assert.equal(out.movements[0].apply, 'AUTO');
  });

  it('VERY_HARD → REGRESS (AUTO, HIGH)', () => {
    const out = buildAdaptiveDecision(
      input({ performance: [perf('push-up', { lastDifficultyFeeling: 'VERY_HARD' })] }),
    );
    const d = out.movements[0];
    assert.equal(d.decision, 'REGRESS');
    assert.equal(d.target?.slug, 'incline-push-up');
    assert.equal(d.apply, 'AUTO');
    assert.equal(d.confidence, 'HIGH');
  });

  it('VERY_HARD + no regression edge → SUBSTITUTE', () => {
    const out = buildAdaptiveDecision(
      input({
        movementKnowledge: [entry('push-up', [{ kind: 'substitution', targetSlug: 'dumbbell-push-up' }])],
        performance: [perf('push-up', { lastDifficultyFeeling: 'VERY_HARD' })],
      }),
    );
    assert.equal(out.movements[0].decision, 'SUBSTITUTE');
    assert.equal(out.movements[0].target?.slug, 'dumbbell-push-up');
    assert.equal(out.movements[0].apply, 'AUTO');
  });

  it('VERY_HARD + no edges → deload hold: KEEP −1 (AUTO, LOW)', () => {
    const out = buildAdaptiveDecision(
      input({
        movementKnowledge: [entry('push-up', [])],
        performance: [perf('push-up', { lastDifficultyFeeling: 'VERY_HARD' })],
      }),
    );
    const d = out.movements[0];
    assert.equal(d.decision, 'KEEP');
    assert.equal(d.setsDelta, -1);
    assert.equal(d.apply, 'AUTO');
    assert.equal(d.confidence, 'LOW');
    assert.equal(d.ruleId, 'L2-DIFF-VERY_HARD-DELOAD');
  });

  it('no difficulty feeling recorded → KEEP (absence ≠ EASY)', () => {
    const out = buildAdaptiveDecision(input({ performance: [perf('push-up', { lastDifficultyFeeling: undefined })] }));
    assert.equal(out.movements[0].decision, 'KEEP');
    assert.equal(out.movements[0].ruleId, 'L2-NO-FEELING');
  });

  it('cold movement (no performance row) → KEEP, no invention', () => {
    const out = buildAdaptiveDecision(
      input({
        sessionIntent: intent([['push-up', 9], ['squat', 6]]),
        movementKnowledge: [
          entry('push-up', [{ kind: 'regression', targetSlug: 'incline-push-up' }]),
          entry('squat', [{ kind: 'regression', targetSlug: 'box-squat' }]),
        ],
        performance: [perf('push-up')],
      }),
    );
    assert.equal(out.basis, 'RULE_DRIVEN');
    assert.equal(out.movements[0].decision, 'KEEP'); // push-up
    assert.equal(out.movements[1].decision, 'KEEP'); // squat (cold)
    assert.equal(out.movements[1].ruleId, 'L2-COLD');
  });

  it('movement with no graph knowledge → KEEP (G-FEAS, fail-closed)', () => {
    const out = buildAdaptiveDecision(
      input({ movementKnowledge: [], performance: [perf('push-up', { lastDifficultyFeeling: 'VERY_EASY' })] }),
    );
    assert.equal(out.movements[0].decision, 'KEEP');
    assert.equal(out.movements[0].ruleId, 'L0-G-FEAS');
    assert.equal(out.movements[0].setsDelta, 0);
  });
});

// ---------------------------------------------------------------------------
// L0 — safety gates
// ---------------------------------------------------------------------------

describe('L0 safety gates', () => {
  it('recurring difficulty on the movement → REGRESS via regression edge (AUTO, flag)', () => {
    const out = buildAdaptiveDecision(
      input({ recurringDifficulties: [exercise('push-up')] }),
    );
    const d = out.movements[0];
    assert.equal(d.decision, 'REGRESS');
    assert.equal(d.target?.slug, 'incline-push-up');
    assert.equal(d.apply, 'AUTO');
    assert.ok(out.flags.includes('recurring-difficulty-flagged'));
  });

  it('recurring difficulty + no safe edges → EXCLUDE (AUTO)', () => {
    const out = buildAdaptiveDecision(
      input({
        movementKnowledge: [entry('push-up', [{ kind: 'progression', targetSlug: 'decline-push-up' }])],
        recurringDifficulties: [exercise('push-up')],
      }),
    );
    const d = out.movements[0];
    assert.equal(d.decision, 'EXCLUDE');
    assert.equal(d.apply, 'AUTO');
  });

  it('recovery frame (long inactivity) suppresses progression and lowers volume', () => {
    const out = buildAdaptiveDecision(
      input({
        activity: { sessions: [], sessionCount: 1, startedSessionCount: 1, totalSets: 9, completedSets: 8, totalDurationSeconds: 600, longestStreakDays: 1, lastDateKey: '2026-08-01' },
        performance: [perf('push-up', { lastDifficultyFeeling: 'VERY_EASY' })],
      }),
    );
    assert.equal(out.session.recoveryFlag, true);
    assert.ok(out.session.ruleIds.includes('L1-G-RECOV'));
    assert.ok(out.flags.includes('recovery-frame'));
    assert.equal(out.movements[0].decision, 'KEEP');
    assert.equal(out.movements[0].ruleId, 'L2-SUPPRESSED');
  });

  it('abandoned sessions in the window force the recovery frame', () => {
    const out = buildAdaptiveDecision(
      input({
        activity: {
          sessions: [{ outcomeId: 'o1', dateKey: '2026-09-01', kind: 'ABANDONED', totalSets: 9, completedSets: 2, durationSeconds: 300 }],
          sessionCount: 1,
          startedSessionCount: 1,
          totalSets: 9,
          completedSets: 2,
          totalDurationSeconds: 300,
          longestStreakDays: 1,
          lastDateKey: '2026-09-01',
        },
      }),
    );
    assert.equal(out.session.recoveryFlag, true);
  });
});

// ---------------------------------------------------------------------------
// L1 — session frame
// ---------------------------------------------------------------------------

describe('L1 session frame + volume caps', () => {
  it('LOW adherence → session delta −1 and progressions suppressed', () => {
    const out = buildAdaptiveDecision(
      input({
        user: { adherence: { tier: 'LOW', confidence: 0.9, derivedBy: 'profile.adherence.v1' } },
        performance: [perf('push-up', { lastDifficultyFeeling: 'VERY_EASY' })],
      }),
    );
    assert.equal(out.session.setsDelta, -1);
    assert.ok(out.session.ruleIds.includes('L1-ADHERENCE'));
    assert.equal(out.movements[0].decision, 'KEEP');
    assert.equal(out.movements[0].ruleId, 'L2-SUPPRESSED');
  });

  it('volume cap clamps the proposed total to the capability cap', () => {
    const out = buildAdaptiveDecision(
      input({
        user: { capability: { tier: 'beginner', confidence: 0.8, derivedBy: 'profile.capability.v1' } },
        sessionIntent: intent([['push-up', 16]]),
        performance: [perf('push-up', { lastDifficultyFeeling: 'VERY_EASY' })],
        movementKnowledge: [entry('push-up', [])], // no progression edge → +1 set proposal
      }),
    );
    const cap = DECISION_POLICY.capabilityVolumeCaps.beginner;
    const total = out.session.setsDelta + out.movements.reduce((s, d) => s + d.setsDelta, 0);
    assert.ok(total <= cap, `proposed total ${total} exceeds cap ${cap}`);
    assert.ok(out.session.ruleIds.includes('L1-G-VOLCAP'));
    assert.ok(out.flags.includes('volume-cap-clamped'));
  });
});

// ---------------------------------------------------------------------------
// Insufficient data
// ---------------------------------------------------------------------------

describe('insufficient-data baseline', () => {
  it('no performance for any intended movement → INSUFFICIENT_DATA, all KEEP, conservative', () => {
    const out = buildAdaptiveDecision(input({ performance: [] }));
    assert.equal(out.basis, 'INSUFFICIENT_DATA');
    assert.equal(out.session.conservativeBaseline, true);
    assert.equal(out.session.setsDelta, 0);
    assert.equal(out.movements.length, 1);
    assert.equal(out.movements[0].decision, 'KEEP');
    assert.equal(out.movements[0].ruleId, 'L2-COLD');
    assert.ok(out.flags.includes('insufficient-data'));
  });

  it('no capability and no adherence → INSUFFICIENT_DATA even with performance', () => {
    const out = buildAdaptiveDecision(
      input({
        user: { capability: undefined, adherence: undefined, movementTrends: undefined },
      }),
    );
    assert.equal(out.basis, 'INSUFFICIENT_DATA');
    assert.equal(out.movements[0].decision, 'KEEP');
  });

  it('no session intent → conservative session-only output, no invented plan', () => {
    const out = buildAdaptiveDecision(input({ noIntent: true }));
    assert.equal(out.basis, 'INSUFFICIENT_DATA');
    assert.equal(out.movements.length, 0);
    assert.equal(out.session.conservativeBaseline, true);
    assert.ok(out.flags.includes('no-session-intent'));
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe('determinism', () => {
  it('identical input → identical output (deep equality)', () => {
    const base = input({
      performance: [perf('push-up', { lastDifficultyFeeling: 'VERY_HARD' }), perf('squat')],
      sessionIntent: intent([['push-up', 9], ['squat', 6]]),
    });
    const a = buildAdaptiveDecision(base);
    const b = buildAdaptiveDecision(base);
    assert.deepEqual(a, b);
  });

  it('edge resolution picks a deterministic target among multiple edges', () => {
    const out = buildAdaptiveDecision(
      input({
        movementKnowledge: [
          entry('push-up', [
            { kind: 'progression', targetSlug: 'decline-push-up' },
            { kind: 'progression', targetSlug: 'weighted-push-up' },
          ]),
        ],
        performance: [perf('push-up', { lastDifficultyFeeling: 'VERY_EASY' })],
      }),
    );
    assert.equal(out.movements[0].target?.slug, 'decline-push-up'); // lexicographic first
  });
});