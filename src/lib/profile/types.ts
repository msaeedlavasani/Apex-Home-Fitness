/**
 * AL-02 — Personal Movement Profile data contract.
 *
 * The type-level model of the **accumulated per-user training signals**
 * (`docs/product/PRODUCT-STRATEGY.md` §2B): capability, training history,
 * movement performance, progression, recurring difficulties, asymmetries
 * (where reliably observable), form degradation, exercise tolerance,
 * adherence, available equipment, preferences, session constraints, and
 * user feedback. This is the profile stage of the closed loop
 * (`User ↔ Movement ↔ Workout ↔ Observation ↔ Outcome ↔ Adaptation`) that
 * the adaptation layers (AL-03/AL-04) will consume.
 *
 * **NOT a medical diagnosis system.** Nothing in this contract is a
 * diagnosis, prognosis, or medical assessment. Inferred signals are always
 * confidence-bearing, attributable model outputs — never stored facts —
 * and absence means "insufficient data", never health.
 *
 * This module is PURE — no Prisma, React, services, environment, or runtime
 * side effects. It depends type-only on the AL-01 outcome contract (its
 * primary input), the S-02 canonical exercise identity, and the MG-02
 * movement vocabulary.
 *
 * Structural separation (AL-02 acceptance): the snapshot splits
 * `observed` (facts — recorded, deterministic projections of outcomes and
 * user declarations, each referenceable) from `inferred` (model outputs —
 * every entry carries `confidence`, `derivedBy`, `derivedAtDateKey`, and
 * `evidenceRefs`, so inference is always attributable and never
 * masquerades as fact).
 *
 * Privacy by design (AL-02 acceptance): the profile stores ONLY minimal
 * deterministic projections + references to source records (never raw
 * session bodies, notes-as-identity, or duplicated outcome payloads); user
 * control surfaces (view/export/delete) are documented in
 * `docs/architecture/AL-02-PERSONAL-MOVEMENT-PROFILE.md`. No persistence or
 * update pipeline is implemented here.
 */

import type { ExerciseId, ExerciseSlug } from '../exercise';
import type { MovementConstraintToken } from '../movement';
import type { SubjectiveDifficultyFeeling, WorkoutCompletionKind } from '../outcomes';

/** Version of this profile-contract schema. Bump on any breaking shape change. */
export const PROFILE_CONTRACT_VERSION = 1 as const;

/** Version literal mirroring `PROFILE_CONTRACT_VERSION`. */
export type ProfileContractVersion = typeof PROFILE_CONTRACT_VERSION;

/** Canonical movement/exercise subject of a profile signal. */
export type ProfileMovementSubject =
  | { kind: 'exercise'; exerciseId?: ExerciseId; slug?: ExerciseSlug }
  | { kind: 'movementConstraint'; constraint: MovementConstraintToken };

// ---------------------------------------------------------------------------
// Observed signals — facts
// ---------------------------------------------------------------------------

/**
 * One recorded training session projected into the profile (minimal
 * deterministic subset of an AL-01 `WorkoutOutcomeRecord`). Session bodies
 * are never duplicated here — only the projection + `outcomeId` reference.
 */
export interface ProfileTrainingSession {
  /** Reference to the source AL-01 outcome record. */
  outcomeId: string;
  /** Local calendar day `YYYY-MM-DD` of the session. */
  dateKey: string;
  /** Completion kind of the session. */
  kind: WorkoutCompletionKind;
  totalSets: number;
  completedSets: number;
  /** Total active time in seconds. */
  durationSeconds: number;
}

/** Per-movement performance projection (subset of AL-01 per-exercise rows). */
export interface ProfileMovementPerformance {
  outcomeId: string;
  dateKey: string;
  subject: ProfileMovementSubject;
  /** Display name only — never identity (S-02). */
  displayName?: string;
  plannedSets: number;
  completedSets: number;
  /** Subjective difficulty reported for this movement. */
  difficultyFeeling?: SubjectiveDifficultyFeeling;
  actualReps?: number | null;
}

/**
 * A user-reported difficulty (recurring-difficulty signal). Only explicit
 * user reports create entries — silence is never interpreted as a
 * difficulty (fail-closed).
 */
export interface ProfileDifficultyReport {
  reportId: string;
  dateKey: string;
  outcomeId?: string;
  subject: ProfileMovementSubject | { kind: 'session' };
  /** Free-form user note (never parsed as structured fact). */
  detail?: string;
}

/**
 * An asymmetry observation — only where RELIABLY observable. Today the only
 * supported source is explicit user reporting; measured sources (future
 * observation signals, CP-02+) must go through their own validation before
 * any asymmetry claim exists. Absence = no reliable observation, never
 * "symmetric".
 */
export interface ProfileAsymmetryObservation {
  observationId: string;
  dateKey: string;
  subject: ProfileMovementSubject;
  side: 'LEFT' | 'RIGHT';
  /** How the asymmetry was observed. */
  source: 'USER_REPORTED' | 'MEASURED';
  note?: string;
}

/**
 * A form-degradation proxy observation. Kept intentionally narrow: today
 * only explicit user/coach notes are representable; measured proxies (form
 * signals from a future Companion) will add new `source` kinds through
 * their own gates — nothing here fabricates form quality.
 */
export interface ProfileFormObservation {
  observationId: string;
  dateKey: string;
  subject: ProfileMovementSubject;
  source: 'USER_REPORTED' | 'MEASURED_PROXY';
  note?: string;
}

/** Equipment posture — user-declared + outcome-observed. */
export interface ProfileEquipmentPosture {
  /** Equipment the user declares available (display-only tokens). */
  declaredAvailable: readonly string[];
  /** Equipment the user declares missing (display-only tokens). */
  declaredMissing?: readonly string[];
  /**
   * Equipment constraints encountered across recorded outcomes (MG-02
   * vocabulary — aggregated deterministically from outcome context).
   */
  constraintsEncountered: readonly MovementConstraintToken[];
}

/** User-declared preferences (never inferred). */
export interface ProfilePreferences {
  /** Preferred interface locale. */
  locale?: 'en' | 'fa';
  /** Self-reported preferred workout difficulty feeling. */
  preferredDifficultyFeeling?: SubjectiveDifficultyFeeling;
}

/** User-feedback projection (subset of AL-01 `WorkoutFeedback` + reference). */
export interface ProfileFeedbackEntry {
  outcomeId: string;
  dateKey: string;
  satisfactionRating?: 1 | 2 | 3 | 4 | 5;
  difficultyFeeling?: SubjectiveDifficultyFeeling;
  /** NOTE: comments are referenced, never stored in the profile (data minimization). */
}

/** Every OBSERVED profile signal, grouped by strategy §2B topic. */
export interface ObservedSignals {
  /** Training history (§2B): projected sessions, newest-last. */
  trainingHistory: readonly ProfileTrainingSession[];
  /** Movement performance (§2B): per-movement outcome projections. */
  movementPerformance: readonly ProfileMovementPerformance[];
  /** Recurring difficulties (§2B): explicit user reports only. */
  difficultyReports: readonly ProfileDifficultyReport[];
  /** Asymmetries (§2B) — only where reliably observable. */
  asymmetryObservations: readonly ProfileAsymmetryObservation[];
  /** Form degradation (§2B) — proxy observations only. */
  formObservations: readonly ProfileFormObservation[];
  /** Available equipment + encountered constraints (§2B). */
  equipment: ProfileEquipmentPosture;
  /** Preferences (§2B) — user-declared. */
  preferences: ProfilePreferences;
  /** Session constraints (§2B) are expressed via equipment constraints +
   * declared-missing equipment + preferences; feedback (§2B): */
  feedbackEntries: readonly ProfileFeedbackEntry[];
}

// ---------------------------------------------------------------------------
// Inferred signals — attributable model outputs, never facts
// ---------------------------------------------------------------------------

/**
 * Wrapper for every inferred signal. Inferred values MUST NOT be stored as
 * facts: they are the output of a named, versioned derivation over explicit
 * evidence, with a confidence 0..1. Absence of an inference = insufficient
 * data, never a negative health/fitness claim.
 */
export interface ProfileInference<T> {
  value: T;
  /** 0..1 — fail-closed: no/low evidence ⇒ low confidence. */
  confidence: number;
  /** Named derivation (algorithm/model id + version). */
  derivedBy: string;
  /** Date the inference was derived (profile-time, not wall-clock claims). */
  derivedAtDateKey: string;
  /** References to the observed evidence (outcomeIds / observationIds). */
  evidenceRefs: readonly string[];
}

/** Closed capability tiers — aligned with the movement difficulty vocabulary. */
export type CapabilityTier = 'beginner' | 'intermediate' | 'advanced';
export const CAPABILITY_TIERS = ['beginner', 'intermediate', 'advanced'] as const;
/** Type guard for the closed capability vocabulary. */
export function isCapabilityTier(value: unknown): value is CapabilityTier {
  return typeof value === 'string' && (CAPABILITY_TIERS as readonly string[]).includes(value);
}

/** Closed trend vocabulary for per-movement progression inference. */
export type MovementTrend = 'IMPROVING' | 'STABLE' | 'REGRESSING';
export const MOVEMENT_TRENDS = ['IMPROVING', 'STABLE', 'REGRESSING'] as const;
export function isMovementTrend(value: unknown): value is MovementTrend {
  return typeof value === 'string' && (MOVEMENT_TRENDS as readonly string[]).includes(value);
}

/** Closed severity vocabulary for difficulty/asymmetry/form risk inference. */
export type ProfileSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export const PROFILE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export function isProfileSeverity(value: unknown): value is ProfileSeverity {
  return typeof value === 'string' && (PROFILE_SEVERITIES as readonly string[]).includes(value);
}

/** Closed adherence vocabulary for the adherence inference. */
export type AdherenceTier = 'HIGH' | 'MEDIUM' | 'LOW';
export const ADHERENCE_TIERS = ['HIGH', 'MEDIUM', 'LOW'] as const;
export function isAdherenceTier(value: unknown): value is AdherenceTier {
  return typeof value === 'string' && (ADHERENCE_TIERS as readonly string[]).includes(value);
}

/** Inferred signals — each optional; present only when a model produced it. */
export interface InferredSignals {
  /** Capability (§2B). */
  capability?: ProfileInference<{ tier: CapabilityTier }>;
  /** Per-movement progression trends (§2B: progression). */
  movementTrends?: readonly ProfileInference<{ subject: ProfileMovementSubject; trend: MovementTrend }>[];
  /** Recurring-difficulty aggregates (flagged for review, never diagnostic). */
  recurringDifficulty?: readonly ProfileInference<{
    subject: ProfileMovementSubject | { kind: 'session' };
    severity: ProfileSeverity;
    occurrences: number;
  }>[];
  /** Asymmetry inference (only over reliable observations). */
  asymmetry?: readonly ProfileInference<{
    subject: ProfileMovementSubject;
    side: 'LEFT' | 'RIGHT';
    severity: ProfileSeverity;
  }>[];
  /** Form-degradation risk inference. */
  formRisk?: readonly ProfileInference<{
    subject: ProfileMovementSubject;
    severity: ProfileSeverity;
  }>[];
  /** Exercise tolerance inference. */
  tolerance?: readonly ProfileInference<{
    subject: ProfileMovementSubject | { kind: 'overall' };
    tolerance: 'LOW' | 'MODERATE' | 'HIGH';
  }>[];
  /** Adherence inference (§2B: adherence). */
  adherence?: ProfileInference<{ tier: AdherenceTier }>;
}

// ---------------------------------------------------------------------------
// The canonical profile snapshot
// ---------------------------------------------------------------------------

/** Privacy posture of a profile snapshot (design contract — see the AL-02 doc). */
export interface ProfilePrivacyPosture {
  /**
   * Data minimization is STRUCTURAL: the profile stores only minimal
   * projections + references (never raw session bodies or duplicated
   * outcome payloads). This flag is a binding invariant of the contract.
   */
  projectionsOnly: true;
  /** True once the owner can view the full observed content of the profile. */
  userViewSupported?: boolean;
  /** True once the owner can request deletion of their profile data. */
  userDeletionSupported?: boolean;
}

/** A complete Personal Movement Profile snapshot. */
export interface ProfileSnapshot {
  contractVersion: ProfileContractVersion;
  /** Supabase auth user id when known (absent = anonymous/offline draft). */
  userId?: string;
  observed: ObservedSignals;
  inferred: InferredSignals;
  privacy: ProfilePrivacyPosture;
  /** Monotonic per-profile write counter (conflict discipline). */
  updateCount: number;
  /** Epoch ms of first profile write. */
  createdAtEpochMs: number;
  /** Epoch ms of the last profile write. */
  updatedAtEpochMs: number;
}

// ---------------------------------------------------------------------------
// Deterministic validation (fail-closed)
// ---------------------------------------------------------------------------

export type ProfileProblemKind =
  | 'BAD_VERSION'
  | 'BAD_DATE_KEY'
  | 'BAD_COUNTS'
  | 'INCONSISTENT_COMPLETION'
  | 'BAD_CONFIDENCE'
  | 'BAD_ENUM'
  | 'BAD_TIMESTAMPS'
  | 'MISSING_EVIDENCE_REFS'
  | 'BAD_PROJECTIONS_ONLY';

export interface ProfileProblem {
  kind: ProfileProblemKind;
  message: string;
}

export interface ProfileValidation {
  valid: boolean;
  problems: readonly ProfileProblem[];
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateKey(value: string): boolean {
  return DATE_KEY_RE.test(value);
}

/**
 * Deterministic, fail-closed validation of a `ProfileSnapshot`. Never
 * repairs and never guesses — malformed/inconsistent snapshots are refused
 * by the (future) writer.
 */
export function validateProfileSnapshot(snapshot: ProfileSnapshot): ProfileValidation {
  const problems: ProfileProblem[] = [];
  const add = (kind: ProfileProblemKind, message: string) => problems.push({ kind, message });

  if (snapshot.contractVersion !== PROFILE_CONTRACT_VERSION) {
    add('BAD_VERSION', `contractVersion must be ${PROFILE_CONTRACT_VERSION}`);
  }
  if (snapshot.privacy.projectionsOnly !== true) {
    add('BAD_PROJECTIONS_ONLY', 'privacy.projectionsOnly must be true (structural data minimization)');
  }
  if (snapshot.updatedAtEpochMs < snapshot.createdAtEpochMs) {
    add('BAD_TIMESTAMPS', 'updatedAtEpochMs must not precede createdAtEpochMs');
  }
  if (!Number.isInteger(snapshot.updateCount) || snapshot.updateCount < 0) {
    add('BAD_COUNTS', 'updateCount must be a non-negative integer');
  }

  for (const [i, session] of snapshot.observed.trainingHistory.entries()) {
    if (!isValidDateKey(session.dateKey)) add('BAD_DATE_KEY', `trainingHistory[${i}].dateKey must be YYYY-MM-DD`);
    if (session.totalSets < 0 || session.completedSets < 0) add('BAD_COUNTS', `trainingHistory[${i}] negative counts`);
    if (session.completedSets > session.totalSets) {
      add('INCONSISTENT_COMPLETION', `trainingHistory[${i}].completedSets exceeds totalSets`);
    }
    if (session.durationSeconds < 0) add('BAD_COUNTS', `trainingHistory[${i}].durationSeconds must be >= 0`);
  }
  for (const [i, p] of snapshot.observed.movementPerformance.entries()) {
    if (!isValidDateKey(p.dateKey)) add('BAD_DATE_KEY', `movementPerformance[${i}].dateKey must be YYYY-MM-DD`);
    if (p.completedSets > p.plannedSets) {
      add('INCONSISTENT_COMPLETION', `movementPerformance[${i}].completedSets exceeds plannedSets`);
    }
  }
  for (const [i, d] of snapshot.observed.difficultyReports.entries()) {
    if (!isValidDateKey(d.dateKey)) add('BAD_DATE_KEY', `difficultyReports[${i}].dateKey must be YYYY-MM-DD`);
  }
  for (const [i, a] of snapshot.observed.asymmetryObservations.entries()) {
    if (!isValidDateKey(a.dateKey)) add('BAD_DATE_KEY', `asymmetryObservations[${i}].dateKey must be YYYY-MM-DD`);
    if (a.side !== 'LEFT' && a.side !== 'RIGHT') add('BAD_ENUM', `asymmetryObservations[${i}].side must be LEFT|RIGHT`);
  }
  for (const [i, f] of snapshot.observed.formObservations.entries()) {
    if (!isValidDateKey(f.dateKey)) add('BAD_DATE_KEY', `formObservations[${i}].dateKey must be YYYY-MM-DD`);
  }
  for (const [i, f] of snapshot.observed.feedbackEntries.entries()) {
    if (!isValidDateKey(f.dateKey)) add('BAD_DATE_KEY', `feedbackEntries[${i}].dateKey must be YYYY-MM-DD`);
    if (f.satisfactionRating !== undefined && (f.satisfactionRating < 1 || f.satisfactionRating > 5)) {
      add('BAD_ENUM', `feedbackEntries[${i}].satisfactionRating must be in 1..5`);
    }
  }

  const checkInference = (label: string, inference: ProfileInference<unknown> | undefined): void => {
    if (!inference) return;
    if (inference.confidence < 0 || inference.confidence > 1) {
      add('BAD_CONFIDENCE', `${label}.confidence must be in 0..1`);
    }
    if (!isValidDateKey(inference.derivedAtDateKey)) {
      add('BAD_DATE_KEY', `${label}.derivedAtDateKey must be YYYY-MM-DD`);
    }
    if (inference.evidenceRefs.length === 0) {
      add('MISSING_EVIDENCE_REFS', `${label} must cite observed evidence (evidenceRefs non-empty)`);
    }
  };

  checkInference('inferred.capability', snapshot.inferred.capability);
  checkInference('inferred.adherence', snapshot.inferred.adherence);
  for (const [i, t] of (snapshot.inferred.movementTrends ?? []).entries()) {
    checkInference(`inferred.movementTrends[${i}]`, t);
    if (!isMovementTrend(t.value.trend)) add('BAD_ENUM', `inferred.movementTrends[${i}].trend outside vocabulary`);
  }
  for (const [i, r] of (snapshot.inferred.recurringDifficulty ?? []).entries()) {
    checkInference(`inferred.recurringDifficulty[${i}]`, r);
    if (!isProfileSeverity(r.value.severity)) add('BAD_ENUM', `inferred.recurringDifficulty[${i}].severity outside vocabulary`);
  }
  for (const [i, a] of (snapshot.inferred.asymmetry ?? []).entries()) {
    checkInference(`inferred.asymmetry[${i}]`, a);
    if (!isProfileSeverity(a.value.severity)) add('BAD_ENUM', `inferred.asymmetry[${i}].severity outside vocabulary`);
  }
  for (const [i, f] of (snapshot.inferred.formRisk ?? []).entries()) {
    checkInference(`inferred.formRisk[${i}]`, f);
    if (!isProfileSeverity(f.value.severity)) add('BAD_ENUM', `inferred.formRisk[${i}].severity outside vocabulary`);
  }
  for (const [i, t] of (snapshot.inferred.tolerance ?? []).entries()) {
    checkInference(`inferred.tolerance[${i}]`, t);
    if (!['LOW', 'MODERATE', 'HIGH'].includes(t.value.tolerance)) {
      add('BAD_ENUM', `inferred.tolerance[${i}].tolerance outside vocabulary`);
    }
  }

  return { valid: problems.length === 0, problems };
}

// ---------------------------------------------------------------------------
// Deterministic observed aggregates (pure, projection-only)
// ---------------------------------------------------------------------------

/** Windowed aggregate of observed training history — computed, never stored. */
export interface ProfileActivitySummary {
  /** Sessions recorded in the window, oldest-last chronological order. */
  sessions: readonly ProfileTrainingSession[];
  sessionCount: number;
  /** Sessions with completion.kind !== 'DID_NOT_START'. */
  startedSessionCount: number;
  totalSets: number;
  completedSets: number;
  totalDurationSeconds: number;
  /** Longest run of consecutive calendar days with a session (0 when none). */
  longestStreakDays: number;
  /** Calendar date of the most recent session (undefined when none). */
  lastDateKey?: string;
}

function toEpoch(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00Z`).getTime();
}

function addDays(dateKey: string, days: number): string {
  const d = new Date(toEpoch(dateKey) + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/**
 * Deterministic windowed aggregate over observed training history — the
 * adherence/consistency OBSERVED basis (inference is a separate concern).
 * Window defaults to the trailing 28 calendar days ending at `asOfDateKey`
 * (inclusive). Pure: same history + window → same summary.
 */
export function profileActivitySummary(
  history: readonly ProfileTrainingSession[],
  options: { asOfDateKey?: string; windowDays?: number } = {},
): ProfileActivitySummary {
  const windowDays = options.windowDays ?? 28;
  const endKey = options.asOfDateKey ?? (history.length > 0 ? history[history.length - 1].dateKey : '1970-01-01');
  const windowStart = addDays(endKey, -(windowDays - 1));
  const sessions = history
    .filter((s) => s.dateKey >= windowStart && s.dateKey <= endKey)
    .sort((a, b) => (a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0));

  let totalSets = 0;
  let completedSets = 0;
  let totalDurationSeconds = 0;
  const days = new Set(sessions.map((s) => s.dateKey));
  for (const s of sessions) {
    totalSets += s.totalSets;
    completedSets += s.completedSets;
    totalDurationSeconds += s.durationSeconds;
  }

  let longestStreakDays = 0;
  let streak = 0;
  for (let d = toEpoch(windowStart); d <= toEpoch(endKey); d += 86_400_000) {
    const key = new Date(d).toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      longestStreakDays = Math.max(longestStreakDays, streak);
    } else {
      streak = 0;
    }
  }

  const last = sessions.length > 0 ? sessions[sessions.length - 1] : undefined;
  return {
    sessions,
    sessionCount: sessions.length,
    startedSessionCount: sessions.filter((s) => s.kind !== 'DID_NOT_START').length,
    totalSets,
    completedSets,
    totalDurationSeconds,
    longestStreakDays,
    lastDateKey: last?.dateKey,
  };
}
