/**
 * Unit tests for the pure computation helpers in
 * `src/services/gamificationService.ts` (XP rules, level curve, streaks,
 * badge eligibility, badge-JSON parsing, badge views).
 *
 * No database, no auth — everything is exercised with plain structural data
 * and explicit `now` / `timeZone` options so the results are deterministic.
 * The DB-backed entry points (`getGamificationProfile`, `awardXpForWorkout`,
 * `awardEligibleBadges`) are deliberately not covered here; their reward math
 * is reproduced by composing the pure helpers (see the "award math" section).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BADGES,
  BADGE_TIERS,
  LEVEL_XP_STEP,
  XP_RULES,
  computeEligibleBadges,
  computeGamificationStats,
  computeLevel,
  computeSessionXp,
  computeStreakBonusXp,
  crossedStreakBonusXp,
  getBadgeCatalog,
  levelProgress,
  parseEarnedBadges,
  toBadgeView,
  xpForExercise,
  type GamificationSession,
  type GamificationSessionExercise,
} from '../src/services/gamificationService';
import {
  computeCurrentStreak,
  type AnalyticsSession,
} from '../src/services/analyticsService';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TEST_TIME_ZONE = 'UTC';
/** Deterministic reference "now": 2026-08-15 (Saturday) noon UTC. */
const NOW = new Date('2026-08-15T12:00:00Z');

const UTC_OPTS = { timeZone: TEST_TIME_ZONE, now: NOW } as const;

function exercise(
  overrides: Partial<GamificationSessionExercise> = {},
): GamificationSessionExercise {
  return {
    completed: true,
    exercise: { category: 'HIIT', difficulty: 'BEGINNER' },
    ...overrides,
  };
}

function session(
  startedAtIso: string,
  overrides: Partial<GamificationSession> = {},
): GamificationSession {
  return {
    id: `s-${startedAtIso}`,
    startedAt: startedAtIso,
    completedAt: startedAtIso,
    ...overrides,
  };
}

/** A completed session on every day from `start` to `end` (inclusive, ISO dates). */
function dailyHistory(startIso: string, endIso: string): AnalyticsSession[] {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sessions: AnalyticsSession[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const iso = cursor.toISOString();
    sessions.push({ id: `s-${iso}`, startedAt: iso, completedAt: iso });
  }
  return sessions;
}

// ---------------------------------------------------------------------------
// XP rules — xpForExercise / computeSessionXp
// ---------------------------------------------------------------------------

test('xpForExercise scales base XP by difficulty (1× / 1.5× / 2×)', () => {
  assert.equal(xpForExercise(exercise({ exercise: { difficulty: 'BEGINNER' } })), 10);
  assert.equal(xpForExercise(exercise({ exercise: { difficulty: 'INTERMEDIATE' } })), 15);
  assert.equal(xpForExercise(exercise({ exercise: { difficulty: 'ADVANCED' } })), 20);
});

test('xpForExercise falls back to the base 10 XP for unknown or missing difficulty', () => {
  assert.equal(xpForExercise(exercise({ exercise: { difficulty: null } })), 10);
  assert.equal(xpForExercise(exercise({ exercise: { difficulty: undefined } })), 10);
  // Unknown / lower-case values are not in the multiplier map → base XP.
  assert.equal(xpForExercise(exercise({ exercise: { difficulty: 'beginner' } })), 10);
  assert.equal(xpForExercise(exercise({ exercise: { difficulty: 'EXTREME' } })), 10);
  // No linked exercise at all (e.g. unlinked session-exercise row).
  assert.equal(xpForExercise(exercise({ exercise: null })), 10);
  assert.equal(xpForExercise({ completed: true }), 10);
});

test('computeSessionXp sums only completed exercises, ignoring completion state quirks', () => {
  assert.equal(computeSessionXp(session('2026-08-15T08:00:00Z')), 0);
  assert.equal(computeSessionXp(session('2026-08-15T08:00:00Z', { exercises: [] })), 0);
  assert.equal(computeSessionXp(session('2026-08-15T08:00:00Z', { exercises: undefined })), 0);

  const s = session('2026-08-15T08:00:00Z', {
    exercises: [
      exercise({ exercise: { difficulty: 'BEGINNER' } }), // 10
      exercise({ exercise: { difficulty: 'INTERMEDIATE' } }), // 15
      exercise({ exercise: { difficulty: 'ADVANCED' } }), // 20
      exercise({ completed: false, exercise: { difficulty: 'ADVANCED' } }), // skipped
      exercise({ completed: null, exercise: { difficulty: 'ADVANCED' } }), // skipped
      exercise({ completed: undefined, exercise: { difficulty: 'ADVANCED' } }), // skipped
    ],
  });
  assert.equal(computeSessionXp(s), 45);
});

test('computeSessionXp treats a completed exercise with no difficulty as base XP', () => {
  const s = session('2026-08-15T08:00:00Z', {
    exercises: [exercise({ completed: true, exercise: null })],
  });
  assert.equal(computeSessionXp(s), 10);
});

// ---------------------------------------------------------------------------
// Level curve — computeLevel / levelProgress
// ---------------------------------------------------------------------------

test('computeLevel uses the flat curve floor(xp / 100) + 1', () => {
  assert.equal(computeLevel(0), 1);
  assert.equal(computeLevel(1), 1);
  assert.equal(computeLevel(99), 1);
  assert.equal(computeLevel(100), 2);
  assert.equal(computeLevel(199), 2);
  assert.equal(computeLevel(200), 3);
  assert.equal(computeLevel(250), 3);
  assert.equal(computeLevel(999), 10);
  assert.equal(computeLevel(1000), 11);
  assert.equal(computeLevel(5000), 51);
});

test('computeLevel clamps negative XP to level 1', () => {
  assert.equal(computeLevel(-1), 1);
  assert.equal(computeLevel(-1000), 1);
});

test('levelProgress reports the in-level position and progress ratio', () => {
  assert.deepEqual(levelProgress(0), {
    level: 1,
    currentLevelXp: 0,
    nextLevelXp: 100,
    progress: 0,
  });
  assert.deepEqual(levelProgress(50), {
    level: 1,
    currentLevelXp: 0,
    nextLevelXp: 100,
    progress: 0.5,
  });
  // Exact boundary: next level starts at 0 progress.
  assert.deepEqual(levelProgress(100), {
    level: 2,
    currentLevelXp: 100,
    nextLevelXp: 200,
    progress: 0,
  });
  assert.equal(levelProgress(199).progress, 0.99);
  assert.deepEqual(levelProgress(250), {
    level: 3,
    currentLevelXp: 200,
    nextLevelXp: 300,
    progress: 0.5,
  });
});

test('levelProgress treats negative XP as zero', () => {
  assert.deepEqual(levelProgress(-5), levelProgress(0));
});

test('levelProgress clamps progress at 1 even for oversized XP', () => {
  assert.equal(levelProgress(2_000_000).progress, 0);
  assert.ok(levelProgress(2_000_000).progress >= 0 && levelProgress(2_000_000).progress <= 1);
});

// ---------------------------------------------------------------------------
// Streak milestone bonuses — computeStreakBonusXp / crossedStreakBonusXp
// ---------------------------------------------------------------------------

test('computeStreakBonusXp accumulates every milestone at or below the streak', () => {
  assert.equal(computeStreakBonusXp(0), 0);
  assert.equal(computeStreakBonusXp(2), 0);
  assert.equal(computeStreakBonusXp(3), 15);
  assert.equal(computeStreakBonusXp(6), 15);
  assert.equal(computeStreakBonusXp(7), 65); // 15 + 50
  assert.equal(computeStreakBonusXp(13), 65);
  assert.equal(computeStreakBonusXp(14), 165); // 15 + 50 + 100
  assert.equal(computeStreakBonusXp(29), 165);
  assert.equal(computeStreakBonusXp(30), 415); // 15 + 50 + 100 + 250
  assert.equal(computeStreakBonusXp(100), 415); // capped — no milestone above 30
  assert.equal(computeStreakBonusXp(-1), 0);
});

test('crossedStreakBonusXp awards only milestones newly crossed by the delta', () => {
  assert.equal(crossedStreakBonusXp(0, 3), 15);
  assert.equal(crossedStreakBonusXp(2, 3), 15);
  assert.equal(crossedStreakBonusXp(3, 4), 0); // already past 3, no new milestone
  assert.equal(crossedStreakBonusXp(0, 7), 65); // 3 and 7
  assert.equal(crossedStreakBonusXp(6, 7), 50); // only 7
  assert.equal(crossedStreakBonusXp(2, 14), 165); // 3, 7 and 14
  assert.equal(crossedStreakBonusXp(13, 14), 100);
  assert.equal(crossedStreakBonusXp(29, 30), 250);
  assert.equal(crossedStreakBonusXp(30, 31), 0);
  assert.equal(crossedStreakBonusXp(7, 7), 0);
  assert.equal(crossedStreakBonusXp(0, 0), 0);
});

// ---------------------------------------------------------------------------
// Streak math used by the award flow (computeCurrentStreak with UTC+now)
// ---------------------------------------------------------------------------

test('computeCurrentStreak counts consecutive active days ending today', () => {
  const three = dailyHistory('2026-08-13T08:00:00Z', '2026-08-15T08:00:00Z');
  assert.equal(computeCurrentStreak(three, UTC_OPTS).days, 3);

  // Multiple sessions on the same day still count as one day.
  const multi = [
    session('2026-08-15T06:00:00Z'),
    session('2026-08-15T09:00:00Z'),
    session('2026-08-14T09:00:00Z'),
    session('2026-08-13T09:00:00Z'),
  ];
  assert.equal(computeCurrentStreak(multi, UTC_OPTS).days, 3);
});

test('computeCurrentStreak keeps the streak alive when the last workout was yesterday', () => {
  const yesterday = dailyHistory('2026-08-14T08:00:00Z', '2026-08-14T08:00:00Z');
  assert.equal(computeCurrentStreak(yesterday, UTC_OPTS).days, 1);
  const two = dailyHistory('2026-08-13T08:00:00Z', '2026-08-14T08:00:00Z');
  assert.equal(computeCurrentStreak(two, UTC_OPTS).days, 2);
});

test('computeCurrentStreak resets after a missed day and ignores incomplete sessions', () => {
  // Today + a gap on Aug 14 → only today counts.
  const gap = [session('2026-08-15T08:00:00Z'), session('2026-08-12T08:00:00Z')];
  assert.equal(computeCurrentStreak(gap, UTC_OPTS).days, 1);

  // Older sessions only → nothing (not yesterday, not today).
  const stale = dailyHistory('2026-08-10T08:00:00Z', '2026-08-12T08:00:00Z');
  assert.equal(computeCurrentStreak(stale, UTC_OPTS).days, 0);

  // Incomplete (no completedAt) sessions never feed the streak.
  const incomplete = [session('2026-08-15T08:00:00Z', { completedAt: null })];
  assert.equal(computeCurrentStreak(incomplete, UTC_OPTS).days, 0);
});

// ---------------------------------------------------------------------------
// computeGamificationStats
// ---------------------------------------------------------------------------

test('computeGamificationStats produces an all-zero snapshot for empty history', () => {
  assert.deepEqual(computeGamificationStats([], 0, UTC_OPTS), {
    totalSessions: 0,
    totalXp: 0,
    currentStreak: 0,
    distinctCategories: 0,
  });
});

test('computeGamificationStats counts only completed sessions and clamps XP', () => {
  const history = [
    session('2026-08-15T08:00:00Z'),
    session('2026-08-14T08:00:00Z', { completedAt: null }), // not completed
  ];
  const stats = computeGamificationStats(history, -42, UTC_OPTS);
  assert.equal(stats.totalSessions, 1);
  assert.equal(stats.totalXp, 0); // negative XP clamped
  assert.equal(stats.currentStreak, 1);
});

test('computeGamificationStats derives distinct categories from completed exercises only', () => {
  const history = [
    session('2026-08-15T08:00:00Z', {
      exercises: [
        exercise({ exercise: { category: 'HIIT', difficulty: 'BEGINNER' } }),
        exercise({ exercise: { category: 'HIIT', difficulty: 'ADVANCED' } }), // dedupe
        exercise({ completed: false, exercise: { category: 'YOGA' } }), // skipped
        exercise({ exercise: { category: null } }), // ignored
        exercise({ exercise: { category: '' } }), // ignored
      ],
    }),
    session('2026-08-14T08:00:00Z', {
      exercises: [exercise({ exercise: { category: 'CALISTHENICS' } })],
    }),
    session('2026-08-13T08:00:00Z', { completedAt: null, exercises: [exercise({ exercise: { category: 'PILATES' } })] }),
  ];
  const stats = computeGamificationStats(history, 250, UTC_OPTS);
  assert.equal(stats.totalSessions, 2);
  assert.equal(stats.totalXp, 250);
  assert.equal(stats.currentStreak, 2); // Aug 15 + Aug 14 (Aug 13 is incomplete)
  assert.equal(stats.distinctCategories, 2); // HIIT + CALISTHENICS
});

// ---------------------------------------------------------------------------
// Badge eligibility — computeEligibleBadges
// ---------------------------------------------------------------------------

test('computeEligibleBadges returns nothing for an empty snapshot', () => {
  assert.deepEqual(
    computeEligibleBadges({ totalSessions: 0, totalXp: 0, currentStreak: 0, distinctCategories: 0 }),
    [],
  );
});

test('badge thresholds are exact — one below the threshold is not eligible', () => {
  // Every counter is one unit below its badge threshold.
  const near = computeEligibleBadges({
    totalSessions: 0,
    totalXp: 999,
    currentStreak: 2,
    distinctCategories: 5,
  });
  assert.deepEqual(near.map((b) => b.id), []);

  // 9 sessions satisfy first_workout (≥1) but not workout_10 (≥10).
  const nineSessions = computeEligibleBadges({
    totalSessions: 9,
    totalXp: 0,
    currentStreak: 0,
    distinctCategories: 0,
  });
  assert.deepEqual(nineSessions.map((b) => b.id), ['first_workout']);
});

test('session-count badges unlock at 1 / 10 / 50 / 100 sessions', () => {
  const ids = (stats: Parameters<typeof computeEligibleBadges>[0]) =>
    computeEligibleBadges(stats).map((b) => b.id);

  assert.deepEqual(ids({ totalSessions: 1, totalXp: 0, currentStreak: 0, distinctCategories: 0 }), [
    'first_workout',
  ]);
  assert.deepEqual(
    ids({ totalSessions: 10, totalXp: 0, currentStreak: 0, distinctCategories: 0 }),
    ['first_workout', 'workout_10'],
  );
  assert.deepEqual(
    ids({ totalSessions: 50, totalXp: 0, currentStreak: 0, distinctCategories: 0 }),
    ['first_workout', 'workout_10', 'workout_50'],
  );
  assert.deepEqual(
    ids({ totalSessions: 100, totalXp: 0, currentStreak: 0, distinctCategories: 0 }),
    ['first_workout', 'workout_10', 'workout_50', 'workout_100'],
  );
});

test('streak badges unlock at 3 / 7 / 30 days', () => {
  const ids = (streak: number) =>
    computeEligibleBadges({ totalSessions: 0, totalXp: 0, currentStreak: streak, distinctCategories: 0 }).map(
      (b) => b.id,
    );
  assert.deepEqual(ids(3), ['streak_3']);
  assert.deepEqual(ids(7), ['streak_3', 'streak_7']);
  assert.deepEqual(ids(30), ['streak_3', 'streak_7', 'streak_30']);
});

test('XP badges unlock at 1000 / 5000 lifetime XP', () => {
  const ids = (xp: number) =>
    computeEligibleBadges({ totalSessions: 0, totalXp: xp, currentStreak: 0, distinctCategories: 0 }).map(
      (b) => b.id,
    );
  assert.deepEqual(ids(1000), ['xp_1000']);
  assert.deepEqual(ids(5000), ['xp_1000', 'xp_5000']);
});

test('the category badge unlocks at 6 distinct categories', () => {
  const ids = (categories: number) =>
    computeEligibleBadges({ totalSessions: 0, totalXp: 0, currentStreak: 0, distinctCategories: categories }).map(
      (b) => b.id,
    );
  assert.deepEqual(ids(6), ['category_6']);
  assert.deepEqual(ids(8), ['category_6']);
});

test('a maxed-out snapshot unlocks every badge in catalog order', () => {
  const all = computeEligibleBadges({
    totalSessions: 100,
    totalXp: 5000,
    currentStreak: 30,
    distinctCategories: 6,
  });
  assert.deepEqual(
    all.map((b) => b.id),
    ['first_workout', 'workout_10', 'workout_50', 'workout_100', 'streak_3', 'streak_7', 'streak_30', 'xp_1000', 'xp_5000', 'category_6'],
  );
  assert.equal(all.length, BADGES.length);
});

// ---------------------------------------------------------------------------
// Badge catalog invariants
// ---------------------------------------------------------------------------

test('the badge catalog has 10 entries with unique, well-formed definitions', () => {
  assert.equal(BADGES.length, 10);
  assert.equal(getBadgeCatalog(), BADGES);

  const ids = BADGES.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length, 'badge ids must be unique');

  for (const badge of BADGES) {
    assert.equal(typeof badge.condition, 'function', `${badge.id}: condition`);
    assert.ok(badge.name.length > 0, `${badge.id}: name`);
    assert.ok(badge.description.length > 0, `${badge.id}: description`);
    assert.equal(badge.nameKey, `badges.${badge.id}.name`, `${badge.id}: nameKey`);
    assert.equal(badge.descriptionKey, `badges.${badge.id}.description`, `${badge.id}: descriptionKey`);
    assert.ok(badge.tier in BADGE_TIERS, `${badge.id}: tier ${badge.tier} must exist in BADGE_TIERS`);
    assert.ok(badge.iconSvg.startsWith('<svg '), `${badge.id}: iconSvg must be an inline SVG`);
    assert.ok(badge.iconSvg.includes('currentColor'), `${badge.id}: iconSvg must use currentColor`);
  }
});

test('BADGE_TIERS exposes Apple HIG and Material 3 tokens for every tier', () => {
  assert.deepEqual(Object.keys(BADGE_TIERS).sort(), ['bronze', 'gold', 'legend', 'silver']);
  for (const [tier, tokens] of Object.entries(BADGE_TIERS)) {
    assert.ok(tokens.label.length > 0, `${tier}: label`);
    // Apple token is `--apple-*` for bronze/silver/gold; legend uses the
    // brand token `--apex-primary`. All are CSS custom properties.
    assert.ok(tokens.appleColor.startsWith('var(--'), `${tier}: appleColor`);
    assert.ok(tokens.materialColor.startsWith('var(--material-'), `${tier}: materialColor`);
  }
});

// ---------------------------------------------------------------------------
// parseEarnedBadges — malformed User.badges Json tolerance
// ---------------------------------------------------------------------------

test('parseEarnedBadges tolerates null, non-arrays and empty arrays', () => {
  assert.deepEqual(parseEarnedBadges(null), []);
  assert.deepEqual(parseEarnedBadges(undefined), []);
  assert.deepEqual(parseEarnedBadges('nope'), []);
  assert.deepEqual(parseEarnedBadges({ id: 'first_workout' }), []);
  assert.deepEqual(parseEarnedBadges(42), []);
  assert.deepEqual(parseEarnedBadges([]), []);
});

test('parseEarnedBadges keeps valid records and drops malformed items', () => {
  const raw = [
    { id: 'first_workout', awardedAt: '2026-08-15T10:00:00.000Z' },
    { id: 'workout_10' }, // no awardedAt → kept, no timestamp
    { id: 'xp_1000', awardedAt: 12345 }, // non-string awardedAt → dropped field
    null,
    'first_workout',
    7,
    { awardedAt: '2026-08-15T10:00:00.000Z' }, // missing id → dropped
    { id: 42 }, // non-string id → dropped
    {},
  ];
  assert.deepEqual(parseEarnedBadges(raw), [
    { id: 'first_workout', awardedAt: '2026-08-15T10:00:00.000Z' },
    { id: 'workout_10' },
    { id: 'xp_1000' },
  ]);
});

test('parseEarnedBadges preserves duplicate ids (dedupe happens at the map level)', () => {
  const parsed = parseEarnedBadges([
    { id: 'streak_3', awardedAt: '2026-08-01T00:00:00.000Z' },
    { id: 'streak_3', awardedAt: '2026-08-10T00:00:00.000Z' },
  ]);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].id, 'streak_3');
  assert.equal(parsed[1].id, 'streak_3');
});

// ---------------------------------------------------------------------------
// toBadgeView — serialization for the UI
// ---------------------------------------------------------------------------

test('toBadgeView renders an unearned badge without earned fields', () => {
  const badge = BADGES.find((b) => b.id === 'first_workout')!;
  const view = toBadgeView(badge);
  assert.equal(view.earned, false);
  assert.ok(!('earnedAt' in view), 'unearned badge must not carry earnedAt');
  assert.equal(view.tierLabel, 'Bronze');
  assert.equal(view.appleColor, 'var(--apple-brown)');
});

test('toBadgeView carries the earned record into the view', () => {
  const badge = BADGES.find((b) => b.id === 'streak_7')!;
  const withTimestamp = toBadgeView(badge, { id: 'streak_7', awardedAt: '2026-08-15T10:00:00.000Z' });
  assert.equal(withTimestamp.earned, true);
  assert.equal(withTimestamp.earnedAt, '2026-08-15T10:00:00.000Z');
  assert.equal(withTimestamp.tierLabel, 'Silver');

  const withoutTimestamp = toBadgeView(badge, { id: 'streak_7' });
  assert.equal(withoutTimestamp.earned, true);
  assert.ok(!('earnedAt' in withoutTimestamp), 'no awardedAt → no earnedAt key');
});

// ---------------------------------------------------------------------------
// Award math composition — the exact formula awardXpForWorkout applies
// (exercises + session bonus + crossed streak milestone bonus), reproduced
// from the pure helpers so the DB path stays free of drift.
// ---------------------------------------------------------------------------

test('award math: exercises + session bonus + streak milestone bonus', () => {
  // A session with 3 completed BEGINNER exercises: 30 exercise XP.
  const workout = session('2026-08-15T08:00:00Z', {
    exercises: [exercise(), exercise(), exercise()],
  });
  const exercisesXp = computeSessionXp(workout);
  const sessionBonus = XP_RULES.sessionCompletionBonus;
  // Streak 2 → 3 crosses the 3-day milestone (+15).
  const streakBonus = crossedStreakBonusXp(2, 3);

  assert.equal(exercisesXp, 30);
  assert.equal(sessionBonus, 25);
  assert.equal(streakBonus, 15);
  assert.equal(exercisesXp + sessionBonus + streakBonus, 70);
});

test('award math: re-reaching a milestone after a break re-grants the bonus', () => {
  // Previous streak broken at 1, now back to 3 → milestone 3 crossed again.
  assert.equal(crossedStreakBonusXp(1, 3), 15);
  // Streak 29 → 30 crosses the final milestone (+250) only.
  assert.equal(crossedStreakBonusXp(29, 30), 250);
});

test('award math: several sessions on one day never double-count milestones', () => {
  // Second session of the same day: streak stays 3 → delta (3, 3) = 0.
  assert.equal(crossedStreakBonusXp(3, 3), 0);
});

test('award math: level after follows computeLevel(newXp) from the pure curve', () => {
  // Fresh user, one 70-XP session → level stays 1; crossing 100 XP → level 2.
  assert.equal(computeLevel(0 + 70), 1);
  assert.equal(computeLevel(30 + 70), 2);
});

// ---------------------------------------------------------------------------
// Constants & config
// ---------------------------------------------------------------------------

test('XP_RULES exposes the documented constants', () => {
  assert.equal(XP_RULES.basePerExercise, 10);
  assert.equal(XP_RULES.sessionCompletionBonus, 25);
  assert.deepEqual(XP_RULES.difficultyMultiplier, {
    BEGINNER: 1,
    INTERMEDIATE: 1.5,
    ADVANCED: 2,
  });
  assert.deepEqual(
    XP_RULES.streakMilestones.map((m) => [m.days, m.bonusXp]),
    [
      [3, 15],
      [7, 50],
      [14, 100],
      [30, 250],
    ],
  );
  assert.equal(LEVEL_XP_STEP, 100);
});
