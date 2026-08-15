/**
 * Gamification service — XP, levels, streaks and badges.
 *
 * Reference (prisma/schema.prisma):
 *   model User {
 *     xp       Int   @default(0)
 *     level    Int   @default(1)
 *     badges   Json? // [{ "id": "first_workout", "awardedAt": "…ISO…" }]
 *     ...
 *   }
 *   model WorkoutSession {
 *     xpAwarded Boolean @default(false)   // idempotency guard
 *     ...
 *   }
 *
 * XP rules (src/docs of DESIGN_SYSTEM.md §2 / §3 for the visual layer)
 * -------------------------------------------------------------------
 * - A completed exercise inside a completed session awards
 *   `basePerExercise` (10) XP, scaled by the exercise difficulty:
 *   BEGINNER ×1 · INTERMEDIATE ×1.5 · ADVANCED ×2 (rounded).
 * - Finishing a session awards `sessionCompletionBonus` (25) XP.
 * - Streak milestones grant a one-time bonus the day the streak first
 *   reaches them: 3 → +15, 7 → +50, 14 → +100, 30 → +250.
 *   The bonus is only awarded when a workout EXTENDS the streak onto the
 *   milestone day, so re-reaching a milestone after a break re-grants it,
 *   and completing several sessions on one day never double-counts.
 * - Level: flat curve — `level = floor(xp / LEVEL_XP_STEP) + 1` with
 *   `LEVEL_XP_STEP = 100`, i.e. every level costs 100 XP.
 *
 * Badges
 * ------
 * Ten badges (see `BADGES` below). Each badge carries a stable `id`, an
 * i18n key pair (`nameKey` / `descriptionKey`) with English fallbacks, a
 * tier (bronze / silver / gold / legend), an inline-SVG placeholder drawn
 * with `currentColor` (so UI tints it with any text color class), design
 * tokens for both Apple HIG and Material 3, and a pure eligibility
 * `condition` evaluated against a `GamificationStats` snapshot.
 *
 * Award flow & idempotency
 * ------------------------
 * Call `awardXpForWorkout(userId, sessionId)` exactly once per completed
 * session — typically from the server action / route handler that marks a
 * `WorkoutSession.completedAt`. The write path is guarded by
 * `WorkoutSession.xpAwarded`: a retried completion event returns the
 * original result instead of double-awarding. Badge checks run inside the
 * same transaction, so a badge can never be awarded without the XP that
 * unlocked it.
 *
 * Server-only: every entry point resolves the request's auth cookie via
 * `getSupabaseAuthUser` / `syncUserWithSupabase` (see `./userService`).
 * Call from Route Handlers, Server Actions or Server Components — never
 * from Client Components. Pure helpers (`computeSessionXp`, `computeLevel`,
 * `computeEligibleBadges`, …) are exported for unit tests and client-side
 * memoization; they accept plain structural data.
 */
import { DifficultyLevel, Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { computeCurrentStreak, type AnalyticsSession } from './analyticsService';
import { getSupabaseAuthUser, syncUserWithSupabase } from './userService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BadgeId =
  | 'first_workout'
  | 'workout_10'
  | 'workout_50'
  | 'workout_100'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'xp_1000'
  | 'xp_5000'
  | 'category_6';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'legend';

/** A badge the user has earned. `badges` Json stores an array of these. */
export interface EarnedBadge {
  id: string;
  /** ISO-8601 instant the badge was awarded. */
  awardedAt?: string;
}

/** Serializable projection of a badge, safe to pass into Client Components. */
export interface BadgeView {
  id: BadgeId;
  name: string;
  description: string;
  nameKey: string;
  descriptionKey: string;
  tier: BadgeTier;
  tierLabel: string;
  /** 24×24 inline SVG placeholder — stroke/fill use `currentColor`. */
  iconSvg: string;
  /** Apple HIG color token (CSS custom property), e.g. `var(--apple-yellow)`. */
  appleColor: string;
  /** Material 3 color role (CSS custom property), e.g. `var(--material-primary)`. */
  materialColor: string;
  earned: boolean;
  earnedAt?: string;
}

/** Full badge definition — `condition` is a function and NOT serializable. */
export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  nameKey: string;
  descriptionKey: string;
  tier: BadgeTier;
  iconSvg: string;
  condition: (stats: GamificationStats) => boolean;
}

/** Immutable counters a badge condition is evaluated against. */
export interface GamificationStats {
  /** Completed workout sessions, all time. */
  totalSessions: number;
  /** Lifetime XP (after the current award). */
  totalXp: number;
  /** Current consecutive-day streak (see `computeCurrentStreak`). */
  currentStreak: number;
  /** Distinct exercise categories ever trained in completed sessions. */
  distinctCategories: number;
}

/** Minimal exercise row shape accepted by the XP helpers. */
export interface GamificationSessionExercise {
  /** Whether the exercise was actually performed (schema default: false). */
  completed?: boolean | null;
  /** Linked exercise — `difficulty` drives the XP multiplier, `category` the
   *  distinct-category badge counter. Both come from `sessionInclude()`. */
  exercise?: { category?: string | null; difficulty?: string | null } | null;
}

/** Minimal `WorkoutSession` row shape accepted by the gamification helpers. */
export interface GamificationSession extends AnalyticsSession {
  exercises?: GamificationSessionExercise[];
}

export interface GamificationOptions {
  /** IANA timezone for streak/day math (defaults to the server timezone). */
  timeZone?: string;
  /** Reference "now" instant (mainly useful for tests). Defaults to `new Date()`. */
  now?: Date;
}

/** Full gamification snapshot for UI rendering. */
export interface GamificationProfile {
  userId: string;
  xp: number;
  level: number;
  /** XP earned inside the current level. */
  currentLevelXp: number;
  /** XP required to reach the next level. */
  nextLevelXp: number;
  /** 0..1 progress toward the next level. */
  progress: number;
  currentStreak: number;
  totalSessions: number;
  distinctCategories: number;
  earnedBadges: EarnedBadge[];
  /** Full catalog as serializable views (earned flags populated). */
  badges: BadgeView[];
}

/** Result of `awardXpForWorkout` — the exact reward a session produced. */
export interface XpAwardResult {
  sessionId: string;
  /** Whether this call actually awarded anything (false when replayed). */
  awarded: boolean;
  xpGained: number;
  breakdown: {
    exercises: number;
    sessionBonus: number;
    streakBonus: number;
  };
  levelBefore: number;
  levelAfter: number;
  newlyAwardedBadges: BadgeView[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class GamificationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GamificationServiceError';
  }
}

// ---------------------------------------------------------------------------
// XP rules & level curve
// ---------------------------------------------------------------------------

export const XP_RULES = {
  /** Base XP granted per completed exercise inside a completed session. */
  basePerExercise: 10,
  /** Bonus XP for finishing a workout session. */
  sessionCompletionBonus: 25,
  /** XP multiplier by exercise difficulty. */
  difficultyMultiplier: {
    [DifficultyLevel.BEGINNER]: 1,
    [DifficultyLevel.INTERMEDIATE]: 1.5,
    [DifficultyLevel.ADVANCED]: 2,
  } satisfies Record<DifficultyLevel, number>,
  /**
   * One-time streak bonuses. When a workout extends the streak to `days`,
   * `bonusXp` is added to that session's reward. Reaching a higher milestone
   * later adds the difference (the functions below sum the crossed ones).
   */
  streakMilestones: [
    { days: 3, bonusXp: 15 },
    { days: 7, bonusXp: 50 },
    { days: 14, bonusXp: 100 },
    { days: 30, bonusXp: 250 },
  ] as const,
} as const;

/** XP per level (flat curve): level = floor(xp / step) + 1. */
export const LEVEL_XP_STEP = 100;

// ---------------------------------------------------------------------------
// Badges (10) — SVG placeholders aligned with the Apple HIG / Material 3
// design system (see docs/DESIGN_SYSTEM.md §2): each badge exposes an Apple
// system color and an M3 role as CSS custom properties; the placeholder art
// is a 24×24 stroke icon using `currentColor`, so the UI tints it with the
// platform's token (e.g. `text-apple-yellow` on iOS/Web, `text-material-primary`
// on Android) and it flips automatically with `.dark`.
// ---------------------------------------------------------------------------

export const BADGE_TIERS: Record<
  BadgeTier,
  { label: string; appleColor: string; materialColor: string }
> = {
  bronze: {
    label: 'Bronze',
    appleColor: 'var(--apple-brown)',
    materialColor: 'var(--material-tertiary-container)',
  },
  silver: {
    label: 'Silver',
    appleColor: 'var(--apple-gray-2)',
    materialColor: 'var(--material-secondary-container)',
  },
  gold: {
    label: 'Gold',
    appleColor: 'var(--apple-yellow)',
    materialColor: 'var(--material-tertiary)',
  },
  legend: {
    label: 'Legend',
    appleColor: 'var(--apex-primary)',
    materialColor: 'var(--material-primary)',
  },
};

const SVG_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true"';

/** i18n key prefix — full keys are `badges.<id>.name` / `.description`. */
function badgeKeys(id: BadgeId): { nameKey: string; descriptionKey: string } {
  return {
    nameKey: `badges.${id}.name`,
    descriptionKey: `badges.${id}.description`,
  };
}

export const BADGES: readonly BadgeDefinition[] = [
  {
    id: 'first_workout',
    name: 'First Steps',
    description: 'Complete your first workout.',
    ...badgeKeys('first_workout'),
    tier: 'bronze',
    // Flag — the journey begins.
    iconSvg: `<svg ${SVG_ATTRS}><path d="M4 21V4"/><path d="M4 4h13l-3 4.5 3 4.5H4"/></svg>`,
    condition: (stats) => stats.totalSessions >= 1,
  },
  {
    id: 'workout_10',
    name: 'Double Digits',
    description: 'Complete 10 workouts.',
    ...badgeKeys('workout_10'),
    tier: 'bronze',
    // Medal ribbon.
    iconSvg: `<svg ${SVG_ATTRS}><circle cx="12" cy="9" r="5"/><path d="M8.5 13.5 7 21l5-3 5 3-1.5-7.5"/></svg>`,
    condition: (stats) => stats.totalSessions >= 10,
  },
  {
    id: 'workout_50',
    name: 'Half Century',
    description: 'Complete 50 workouts.',
    ...badgeKeys('workout_50'),
    tier: 'silver',
    // Dumbbell — consistent strength work.
    iconSvg: `<svg ${SVG_ATTRS}><path d="M6.5 6.5v11"/><path d="M17.5 6.5v11"/><path d="M3 9.5v5"/><path d="M21 9.5v5"/><path d="M6.5 12h11"/></svg>`,
    condition: (stats) => stats.totalSessions >= 50,
  },
  {
    id: 'workout_100',
    name: 'Century Club',
    description: 'Complete 100 workouts.',
    ...badgeKeys('workout_100'),
    tier: 'gold',
    // Trophy.
    iconSvg: `<svg ${SVG_ATTRS}><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3"/><path d="M17 6h3v2a3 3 0 0 1-3 3"/></svg>`,
    condition: (stats) => stats.totalSessions >= 100,
  },
  {
    id: 'streak_3',
    name: 'On a Roll',
    description: 'Train 3 days in a row.',
    ...badgeKeys('streak_3'),
    tier: 'bronze',
    // Flame.
    iconSvg: `<svg ${SVG_ATTRS}><path d="M12 3c1.2 3 4 4.2 4 8a4 4 0 0 1-8 0c0-1.6.6-2.7 1.2-3.7.5 1 .9 1.7 1.8 2.2C10.6 7.5 11 5 12 3z"/></svg>`,
    condition: (stats) => stats.currentStreak >= 3,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Train 7 days in a row.',
    ...badgeKeys('streak_7'),
    tier: 'silver',
    // Calendar with check.
    iconSvg: `<svg ${SVG_ATTRS}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 9.5h18"/><path d="m9 15 2 2 4-4"/></svg>`,
    condition: (stats) => stats.currentStreak >= 7,
  },
  {
    id: 'streak_30',
    name: 'Iron Will',
    description: 'Train 30 days in a row.',
    ...badgeKeys('streak_30'),
    tier: 'gold',
    // Mountain — day after day.
    iconSvg: `<svg ${SVG_ATTRS}><path d="m3 20 6-10 4 6 2-3 6 7z"/><circle cx="16.5" cy="6.5" r="1.5"/></svg>`,
    condition: (stats) => stats.currentStreak >= 30,
  },
  {
    id: 'xp_1000',
    name: 'Rising Star',
    description: 'Earn 1,000 lifetime XP.',
    ...badgeKeys('xp_1000'),
    tier: 'silver',
    // Star.
    iconSvg: `<svg ${SVG_ATTRS}><path d="m12 3 2.7 5.5 6 .9-4.35 4.2 1 6L12 16.8 6.65 19.6l1-6L3.3 9.4l6-.9z"/></svg>`,
    condition: (stats) => stats.totalXp >= 1000,
  },
  {
    id: 'xp_5000',
    name: 'Apex Legend',
    description: 'Earn 5,000 lifetime XP.',
    ...badgeKeys('xp_5000'),
    tier: 'gold',
    // Crown.
    iconSvg: `<svg ${SVG_ATTRS}><path d="m4 17 2-10 4 4 2-6 2 6 4-4 2 10z"/><path d="M4 21h16"/></svg>`,
    condition: (stats) => stats.totalXp >= 5000,
  },
  {
    id: 'category_6',
    name: 'All-Rounder',
    description: 'Train in 6 different exercise categories.',
    ...badgeKeys('category_6'),
    tier: 'legend',
    // Layers — many disciplines mastered.
    iconSvg: `<svg ${SVG_ATTRS}><path d="m12 2 10 5.5L12 13 2 7.5z"/><path d="m2 12 10 5.5L22 12"/><path d="m2 17 10 5.5L22 17"/></svg>`,
    condition: (stats) => stats.distinctCategories >= 6,
  },
];

// ---------------------------------------------------------------------------
// Pure computation helpers (exported for tests / client memoization)
// ---------------------------------------------------------------------------

/** XP awarded for a single completed exercise (difficulty-scaled, rounded). */
export function xpForExercise(exercise: GamificationSessionExercise): number {
  const difficulty = exercise.exercise?.difficulty as DifficultyLevel | null | undefined;
  const multiplier = (difficulty && XP_RULES.difficultyMultiplier[difficulty]) ?? 1;
  return Math.round(XP_RULES.basePerExercise * multiplier);
}

/** Total exercise XP inside a session (completed exercises only). */
export function computeSessionXp(session: GamificationSession): number {
  let xp = 0;
  for (const exercise of session.exercises ?? []) {
    if (exercise.completed !== true) continue;
    xp += xpForExercise(exercise);
  }
  return xp;
}

/** Player level from lifetime XP (flat curve, 100 XP per level). */
export function computeLevel(xp: number): number {
  return Math.floor(Math.max(0, xp) / LEVEL_XP_STEP) + 1;
}

/** Progress toward the next level. */
export function levelProgress(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
} {
  const safeXp = Math.max(0, xp);
  const level = computeLevel(safeXp);
  const currentLevelXp = (level - 1) * LEVEL_XP_STEP;
  return {
    level,
    currentLevelXp,
    nextLevelXp: level * LEVEL_XP_STEP,
    progress: Math.min(1, (safeXp - currentLevelXp) / LEVEL_XP_STEP),
  };
}

/** Total streak bonus a streak of `streakDays` has unlocked (all milestones ≤ days). */
export function computeStreakBonusXp(streakDays: number): number {
  return XP_RULES.streakMilestones.reduce(
    (sum, milestone) => sum + (streakDays >= milestone.days ? milestone.bonusXp : 0),
    0,
  );
}

/**
 * Streak bonuses crossed by moving from `previousStreak` to `currentStreak`
 * — i.e. milestones in `(previousStreak, currentStreak]`. Used by
 * `awardXpForWorkout` so a workout that extends the streak to a milestone
 * grants exactly that milestone's bonus, and nothing is re-granted when the
 * streak was already beyond it.
 */
export function crossedStreakBonusXp(
  previousStreak: number,
  currentStreak: number,
): number {
  return XP_RULES.streakMilestones.reduce(
    (sum, milestone) =>
      sum +
      (previousStreak < milestone.days && currentStreak >= milestone.days
        ? milestone.bonusXp
        : 0),
    0,
  );
}

/**
 * Immutable gamification stats derived from a session history: completed
 * sessions, distinct categories trained, and the current streak.
 */
export function computeGamificationStats(
  sessions: readonly AnalyticsSession[],
  xp: number,
  opts: GamificationOptions = {},
): GamificationStats {
  const categories = new Set<string>();
  let totalSessions = 0;

  for (const session of sessions) {
    if (!session.completedAt) continue;
    totalSessions += 1;
    for (const exercise of session.exercises ?? []) {
      if (exercise.completed !== true) continue;
      const category = exercise.exercise?.category;
      if (typeof category === 'string' && category) categories.add(category);
    }
  }

  return {
    totalSessions,
    totalXp: Math.max(0, xp),
    currentStreak: computeCurrentStreak(sessions, opts).days,
    distinctCategories: categories.size,
  };
}

/** Badges whose condition passes for `stats` (in catalog order). */
export function computeEligibleBadges(stats: GamificationStats): BadgeDefinition[] {
  return BADGES.filter((badge) => badge.condition(stats));
}

/** Serializes a badge definition (+ optional earned record) for the UI. */
export function toBadgeView(
  badge: BadgeDefinition,
  earned?: EarnedBadge,
): BadgeView {
  const tier = BADGE_TIERS[badge.tier];
  return {
    id: badge.id,
    name: badge.name,
    description: badge.description,
    nameKey: badge.nameKey,
    descriptionKey: badge.descriptionKey,
    tier: badge.tier,
    tierLabel: tier.label,
    iconSvg: badge.iconSvg,
    appleColor: tier.appleColor,
    materialColor: tier.materialColor,
    earned: Boolean(earned),
    ...(earned?.awardedAt ? { earnedAt: earned.awardedAt } : {}),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Parses the `User.badges` Json column, tolerating null / malformed data. */
function parseEarnedBadges(raw: unknown): EarnedBadge[] {
  if (!Array.isArray(raw)) return [];
  const earned: EarnedBadge[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'string') continue;
    earned.push({
      id: record.id,
      ...(typeof record.awardedAt === 'string' ? { awardedAt: record.awardedAt } : {}),
    });
  }
  return earned;
}

/** Badges the user already earned, keyed by id. */
function earnedBadgeMap(raw: unknown): Map<string, EarnedBadge> {
  return new Map(parseEarnedBadges(raw).map((badge) => [badge.id, badge]));
}

/** Resolves the authenticated Prisma user id (shared auth contract). */
async function resolveOwnerId(userId?: string): Promise<string> {
  const supabaseUser = await getSupabaseAuthUser();
  return userId ?? (await syncUserWithSupabase(supabaseUser)).id;
}

/** Workout-session rows needed by the gamification layer. */
function sessionInclude() {
  return {
    include: {
      exercises: {
        include: {
          exercise: { select: { difficulty: true, category: true } },
        },
      },
    },
  } as const;
}

// ---------------------------------------------------------------------------
// Server-side entry points (auth + Prisma)
// ---------------------------------------------------------------------------

/**
 * Returns the authenticated user's full gamification profile: XP, level,
 * streak, session totals and the badge catalog with earned flags.
 *
 * @param userId optional override — defaults to the current user.
 * @throws {UnauthenticatedError} when the request has no auth session.
 */
export async function getGamificationProfile(
  userId?: string,
  opts: GamificationOptions = {},
): Promise<GamificationProfile> {
  const ownerId = await resolveOwnerId(userId);

  const [user, sessions] = await Promise.all([
    prisma.user.findUnique({ where: { id: ownerId } }),
    prisma.workoutSession.findMany({
      where: { userId: ownerId },
      orderBy: { startedAt: 'asc' },
      ...sessionInclude(),
    }),
  ]);
  if (!user) {
    throw new GamificationServiceError(`User ${ownerId} not found.`);
  }

  const earned = earnedBadgeMap(user.badges);
  const stats = computeGamificationStats(sessions, user.xp, opts);
  const { level, currentLevelXp, nextLevelXp, progress } = levelProgress(user.xp);

  return {
    userId: ownerId,
    xp: user.xp,
    level,
    currentLevelXp,
    nextLevelXp,
    progress,
    currentStreak: stats.currentStreak,
    totalSessions: stats.totalSessions,
    distinctCategories: stats.distinctCategories,
    earnedBadges: Array.from(earned.values()),
    badges: BADGES.map((badge) => toBadgeView(badge, earned.get(badge.id))),
  };
}

/**
 * Awards XP (and any newly earned badges) for a completed workout session.
 *
 * Idempotent: when `WorkoutSession.xpAwarded` is already true, returns the
 * original reward payload with `awarded: false` and changes nothing — safe
 * to call again after a retried completion event.
 *
 * Reward math: exercise XP (base × difficulty multiplier, completed
 * exercises only) + session completion bonus + streak milestone bonus when
 * this workout extends the streak to a milestone day. XP and badge writes
 * happen in one transaction.
 *
 * @param userId optional override — defaults to the current user.
 * @throws {GamificationServiceError} if the session is not found or not owned
 *         by the resolved user; an in-progress session (no `completedAt`)
 *         returns a zero award instead.
 */
export async function awardXpForWorkout(
  userId: string,
  sessionId: string,
  opts: GamificationOptions = {},
): Promise<XpAwardResult> {
  const ownerId = await resolveOwnerId(userId);

  const [session, user] = await Promise.all([
    prisma.workoutSession.findUnique({
      where: { id: sessionId },
      ...sessionInclude(),
    }),
    prisma.user.findUnique({ where: { id: ownerId } }),
  ]);

  if (!session) {
    throw new GamificationServiceError(`Workout session ${sessionId} not found.`);
  }
  if (session.userId !== ownerId) {
    throw new GamificationServiceError('Workout session does not belong to the user.');
  }
  if (!user) {
    throw new GamificationServiceError(`User ${ownerId} not found.`);
  }
  if (!session.completedAt) {
    // In-progress sessions earn nothing yet — the caller can re-invoke once
    // the session is completed.
    return {
      sessionId,
      awarded: false,
      xpGained: 0,
      breakdown: { exercises: 0, sessionBonus: 0, streakBonus: 0 },
      levelBefore: user.level,
      levelAfter: user.level,
      newlyAwardedBadges: [],
    };
  }
  if (session.xpAwarded) {
    // Replay of an already-awarded session — nothing changes.
    return {
      sessionId,
      awarded: false,
      xpGained: 0,
      breakdown: { exercises: 0, sessionBonus: 0, streakBonus: 0 },
      levelBefore: user.level,
      levelAfter: user.level,
      newlyAwardedBadges: [],
    };
  }

  // --- Compute the reward -------------------------------------------------
  const exercisesXp = computeSessionXp(session);
  const sessionBonus = XP_RULES.sessionCompletionBonus;

  // Streak before/after this session — the milestone bonus is the delta.
  // The full include also feeds the post-award stats (distinct categories).
  const history = await prisma.workoutSession.findMany({
    where: { userId: ownerId, completedAt: { not: null } },
    orderBy: { startedAt: 'asc' },
    ...sessionInclude(),
  });
  const priorHistory = history.filter((row) => row.id !== sessionId);
  const previousStreak = computeCurrentStreak(priorHistory, opts).days;
  const currentStreak = computeCurrentStreak(history, opts).days;
  const streakBonus = crossedStreakBonusXp(previousStreak, currentStreak);

  const xpGained = exercisesXp + sessionBonus + streakBonus;
  const newXp = user.xp + xpGained;
  const levelBefore = user.level;
  const levelAfter = computeLevel(newXp);

  // --- Badge evaluation (post-award stats) ---------------------------------
  const earned = earnedBadgeMap(user.badges);
  const stats = computeGamificationStats(history, newXp, opts);
  const newlyAwarded = computeEligibleBadges(stats).filter(
    (badge) => !earned.has(badge.id),
  );

  // --- Single transaction: XP + level + badges ------------------------------
  const awardedAt = new Date().toISOString();
  const nextBadges: EarnedBadge[] = [
    ...Array.from(earned.values()),
    ...newlyAwarded.map((badge) => ({ id: badge.id, awardedAt })),
  ];

  await prisma.$transaction([
    prisma.user.update({
      where: { id: ownerId },
      data: {
        xp: newXp,
        level: levelAfter,
        badges: nextBadges as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.workoutSession.update({
      where: { id: sessionId },
      data: { xpAwarded: true },
    }),
  ]);

  return {
    sessionId,
    awarded: true,
    xpGained,
    breakdown: { exercises: exercisesXp, sessionBonus, streakBonus },
    levelBefore,
    levelAfter,
    newlyAwardedBadges: newlyAwarded.map((badge) =>
      toBadgeView(badge, { id: badge.id, awardedAt }),
    ),
  };
}

/**
 * Re-evaluates every badge against the user's current stats and awards any
 * newly eligible ones without touching XP. Idempotent — already-earned
 * badges are never duplicated.
 *
 * Useful for back-filling: after a data import, a schema migration or a
 * badge-rule change, call this once per user to reconcile their collection.
 *
 * @param userId optional override — defaults to the current user.
 */
export async function awardEligibleBadges(
  userId?: string,
  opts: GamificationOptions = {},
): Promise<BadgeView[]> {
  const ownerId = await resolveOwnerId(userId);

  const [user, sessions] = await Promise.all([
    prisma.user.findUnique({ where: { id: ownerId } }),
    prisma.workoutSession.findMany({
      where: { userId: ownerId, completedAt: { not: null } },
      orderBy: { startedAt: 'asc' },
      ...sessionInclude(),
    }),
  ]);
  if (!user) {
    throw new GamificationServiceError(`User ${ownerId} not found.`);
  }

  const earned = earnedBadgeMap(user.badges);
  const stats = computeGamificationStats(sessions, user.xp, opts);
  const newlyAwarded = computeEligibleBadges(stats).filter(
    (badge) => !earned.has(badge.id),
  );
  if (newlyAwarded.length === 0) return [];

  const awardedAt = new Date().toISOString();
  const nextBadges: EarnedBadge[] = [
    ...Array.from(earned.values()),
    ...newlyAwarded.map((badge) => ({ id: badge.id, awardedAt })),
  ];

  await prisma.user.update({
    where: { id: ownerId },
    data: { badges: nextBadges as unknown as Prisma.InputJsonValue },
  });

  return newlyAwarded.map((badge) =>
    toBadgeView(badge, { id: badge.id, awardedAt }),
  );
}

/**
 * Static badge catalog for UI screens (collections page, onboarding) —
 * server-side only, as definitions carry `condition` functions. Client
 * components should consume `getGamificationProfile().badges` instead.
 */
export function getBadgeCatalog(): readonly BadgeDefinition[] {
  return BADGES;
}

export default {
  XP_RULES,
  LEVEL_XP_STEP,
  BADGES,
  BADGE_TIERS,
  xpForExercise,
  computeSessionXp,
  computeLevel,
  levelProgress,
  computeStreakBonusXp,
  crossedStreakBonusXp,
  computeGamificationStats,
  computeEligibleBadges,
  toBadgeView,
  getGamificationProfile,
  awardXpForWorkout,
  awardEligibleBadges,
  getBadgeCatalog,
};
