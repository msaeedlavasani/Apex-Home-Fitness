/**
 * AL-03 — Adaptation input pipeline: decision-layer input schema.
 *
 * The "Adaptation" segment of the closed loop
 * (`User ↔ Movement ↔ Workout ↔ Observation ↔ Outcome ↔ Profile ↔
 * Adaptation`): the well-typed input that answers *"what is the appropriate
 * training decision for this person now?"*. The pipeline (`./pipeline.ts`)
 * deterministically projects the AL-02 `ProfileSnapshot` (which already
 * accumulates AL-01 outcomes), the MG-06 relationship graph, and workout
 * history into this schema — the only input the AL-04 decision layer may
 * consume.
 *
 * This module is PURE — no Prisma, React, services, environment, or runtime
 * side effects. It depends type-only on the AL-02 profile contract, the
 * MG-06 relationship graph, and the MG-02/AL-01 vocabularies.
 *
 * Attributability: every piece of adaptation input either carries its
 * original confidence/derivation (inference copied from the profile) or is a
 * deterministic projection with the consulted evidence listed in
 * `evidence`. Nothing is invented; absence means "insufficient data"
 * (the profile's not-a-medical-system boundary applies unchanged).
 */

import type {
  AdherenceTier,
  CapabilityTier,
  MovementTrend,
  ProfileActivitySummary,
  ProfileEquipmentPosture,
  ProfileMovementSubject,
  ProfilePreferences,
} from '../profile';
import type {
  MovementConstraintToken,
  MovementId,
  MovementRelationshipKind,
  MovementSlug,
} from '../movement';

/** Version of this adaptation-input schema. Bump on any breaking shape change. */
export const ADAPTATION_INPUT_VERSION = 1 as const;

/** Version literal mirroring `ADAPTATION_INPUT_VERSION`. */
export type AdaptationInputVersion = typeof ADAPTATION_INPUT_VERSION;

/**
 * Difficulty subjects the decision layer must respect: a movement, a
 * movement constraint (MG-02 vocabulary), or the whole session. Mirrors the
 * AL-02 `ProfileDifficultyReport.subject` union.
 */
export type AdaptationDifficultySubject = ProfileMovementSubject | { kind: 'session' };

/** A movement the decision layer may select/reference. */
export interface MovementKnowledgeEntry {
  slug: MovementSlug;
  id?: MovementId;
  /** Resolved relationship edges (MG-06 kinds). */
  relationships: readonly {
    kind: MovementRelationshipKind;
    targetSlug?: MovementSlug;
    targetId?: MovementId;
    note?: string;
  }[];
}

/** Deterministic per-movement performance aggregate over observed history. */
export interface MovementPerformanceAggregate {
  subject: ProfileMovementSubject;
  totalPlannedSets: number;
  totalCompletedSets: number;
  /** 0..1 (0 when nothing planned). */
  completionRatio: number;
  /** Calendar date of the most recent recorded performance. */
  lastDateKey: string;
  /** Difficulty feeling of the most recent recorded performance. */
  lastDifficultyFeeling?: 'VERY_EASY' | 'EASY' | 'JUST_RIGHT' | 'HARD' | 'VERY_HARD';
  /** Outcome id of the most recent recorded performance (evidence fidelity, AL-04). */
  lastOutcomeId?: string;
}

/** User state projected from the profile (observed facts + attributed inference). */
export interface AdaptationUserState {
  /** Copied from `profile.inferred.capability` — attributed, never a fact. */
  capability?: { tier: CapabilityTier; confidence: number; derivedBy: string };
  /** Copied from `profile.inferred.adherence` — attributed, never a fact. */
  adherence?: { tier: AdherenceTier; confidence: number; derivedBy: string };
  /** Copied from `profile.inferred.movementTrends` — attributed, never a fact. */
  movementTrends?: readonly {
    subject: ProfileMovementSubject;
    trend: MovementTrend;
    confidence: number;
    derivedBy: string;
  }[];
  /** User-declared preferences (observed). */
  preferences: ProfilePreferences;
  /** Equipment posture (observed). */
  equipment: ProfileEquipmentPosture;
}

/** Adaptation-relevant workout history projection. */
export interface AdaptationHistory {
  /** Windowed observed aggregate (adherence basis — `profileActivitySummary`). */
  activity: ProfileActivitySummary;
  /** Per-movement performance aggregates (newest-consulted last). */
  performance: readonly MovementPerformanceAggregate[];
  /** Distinct recurring-difficulty subjects in first-reported order. */
  recurringDifficulties: readonly AdaptationDifficultySubject[];
}

/** Hard constraints the decision layer must respect. */
export interface AdaptationConstraints {
  /** Equipment the user declares available (display-only). */
  equipmentAvailable: readonly string[];
  /** Equipment the user declares missing (display-only). */
  equipmentMissing: readonly string[];
  /** Equipment constraints encountered across recorded outcomes (MG-02 tokens). */
  constraintsEncountered: readonly MovementConstraintToken[];
  /** Recurring-difficulty subjects — respected as training constraints. */
  recurringDifficultySubjects: readonly AdaptationDifficultySubject[];
}

/**
 * The canonical decision-layer input — the ONLY shape AL-04 (Adaptive
 * Training Graph) may consume. Produced exclusively by the pure pipeline
 * (`buildAdaptationInput`).
 */
export interface AdaptationInput {
  version: AdaptationInputVersion;
  /** Supabase auth user id when the profile was user-owned. */
  userId?: string;
  /** Date the input was derived (max history date, or the requested as-of). */
  asOfDateKey: string;
  user: AdaptationUserState;
  movementKnowledge: readonly MovementKnowledgeEntry[];
  history: AdaptationHistory;
  constraints: AdaptationConstraints;
  /**
   * The user's intended session (AL-04 gate D4a — additive, versioned,
   * backward-compatible extension): the movements the user/plan intends to
   * perform today, in intended order. Absent = anonymous/offline draft or
   * no intent available — the decision layer then returns a conservative
   * session-level baseline and makes no per-movement changes.
   */
  sessionIntent?: SessionIntent;
  /** Deterministic, sorted, unique refs to the evidence consulted (outcomeIds / observationIds). */
  evidence: readonly string[];
}

// ---------------------------------------------------------------------------
// Session intent (AL-04 gate D4a — additive AL-03 input extension)
// ---------------------------------------------------------------------------

/** One intended movement of the session the decision layer may adjust. */
export interface SessionIntentMovement {
  /** 0-based position inside the intended session (identity of the slot). */
  slotIndex: number;
  /** The intended movement — exercises only (constraint/session subjects are not intents). */
  subject: ProfileMovementSubject;
  /** Planned working sets in the intent. */
  plannedSets: number;
  /** Planned target reps — informational; v1 decisions never change rep targets. */
  plannedReps?: number | null;
}

/** The intended session: movements in intended order (sequencing deferred in v1). */
export interface SessionIntent {
  movements: readonly SessionIntentMovement[];
}

export type SessionIntentProblemKind = 'EMPTY' | 'BAD_SUBJECT' | 'BAD_SETS' | 'DUPLICATE_SLOT_INDEX';

export interface SessionIntentProblem {
  kind: SessionIntentProblemKind;
  message: string;
}

export interface SessionIntentValidation {
  valid: boolean;
  problems: readonly SessionIntentProblem[];
}

/**
 * Fail-closed validation of a session intent. Never repairs, never guesses:
 * an invalid intent is treated as absent by the pipeline (conservative
 * baseline) rather than interpreted.
 */
export function validateSessionIntent(intent: SessionIntent | undefined): SessionIntentValidation {
  const problems: SessionIntentProblem[] = [];
  if (!intent) return { valid: false, problems: [{ kind: 'EMPTY', message: 'sessionIntent is undefined' }] };
  if (intent.movements.length === 0) {
    problems.push({ kind: 'EMPTY', message: 'sessionIntent.movements must not be empty' });
  }
  const seen = new Set<number>();
  for (const [i, m] of intent.movements.entries()) {
    if (m.subject.kind !== 'exercise') {
      problems.push({ kind: 'BAD_SUBJECT', message: `sessionIntent.movements[${i}].subject must be an exercise` });
    }
    if (!Number.isInteger(m.plannedSets) || m.plannedSets < 1) {
      problems.push({ kind: 'BAD_SETS', message: `sessionIntent.movements[${i}].plannedSets must be a positive integer` });
    }
    if (m.plannedReps !== undefined && m.plannedReps !== null && (!Number.isInteger(m.plannedReps) || m.plannedReps < 1)) {
      problems.push({ kind: 'BAD_SETS', message: `sessionIntent.movements[${i}].plannedReps must be a positive integer or null` });
    }
    if (seen.has(m.slotIndex)) {
      problems.push({ kind: 'DUPLICATE_SLOT_INDEX', message: `duplicate slotIndex ${m.slotIndex}` });
    }
    seen.add(m.slotIndex);
  }
  return { valid: problems.length === 0, problems };
}

// ---------------------------------------------------------------------------
// Decision output schema (AL-04 — Adaptive Training Graph v1)
// ---------------------------------------------------------------------------

/** Version of the decision-output schema. Bump on any breaking shape change. */
export const ADAPTIVE_DECISION_VERSION = 1 as const;

/** Version literal mirroring `ADAPTIVE_DECISION_VERSION`. */
export type AdaptiveDecisionVersion = typeof ADAPTIVE_DECISION_VERSION;

/** Why the decision output was produced. */
export type DecisionBasis = 'RULE_DRIVEN' | 'INSUFFICIENT_DATA';

/** Deterministic rule-applicability strength — never a probability. */
export type DecisionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

/** The closed per-movement decision vocabulary (gate doc §2, L2). */
export type MovementDecisionKind = 'KEEP' | 'PROGRESS' | 'REGRESS' | 'SUBSTITUTE' | 'EXCLUDE';

/**
 * AUTO = safety-lowering, applies to the plan without confirmation
 * (regression/substitution/exclusion, negative deltas); ADVISORY = raises
 * load (progression, positive deltas) — confirmed before the plan changes.
 * Gate doc D2a.
 */
export type DecisionApplyMode = 'AUTO' | 'ADVISORY';

/** One per-movement decision, fully attributable. */
export interface MovementDecision {
  /** The intent slot this decision applies to. */
  slotIndex: number;
  subject: ProfileMovementSubject;
  decision: MovementDecisionKind;
  /** Resolved edge target when PROGRESS / REGRESS / SUBSTITUTE. */
  target?: { slug?: MovementSlug; id?: MovementId };
  /** Sets delta applied to this movement's planned sets (-1 | 0 | +1). */
  setsDelta: number;
  apply: DecisionApplyMode;
  confidence: DecisionConfidence;
  /** Stable id of the fired rule (e.g. 'L2-DIFF-VERY_HARD'). */
  ruleId: string;
  /** Outcome refs actually consulted for this decision. */
  evidenceRefs: readonly string[];
  /** Fixed EN template rendering — no free text, no invented Persian. */
  humanText: string;
}

/** Whole-session frame decision (gate doc §2, L1). */
export interface SessionDecision {
  /** Whole-session sets delta after volume-cap clamping. */
  setsDelta: number;
  /** True when the output is the conservative insufficient-data baseline. */
  conservativeBaseline: boolean;
  /** True when a recovery/return-to-training frame was detected. */
  recoveryFlag: boolean;
  /** Sorted, unique rule ids that produced the frame. */
  ruleIds: readonly string[];
}

/** The canonical AL-04 decision output — one typed, serializable document. */
export interface AdaptiveDecisionOutput {
  version: AdaptiveDecisionVersion;
  asOfDateKey: string;
  basis: DecisionBasis;
  session: SessionDecision;
  /** Intent order preserved (deterministic). */
  movements: readonly MovementDecision[];
  /** Sorted, unique, non-diagnostic warning flags. */
  flags: readonly string[];
}