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
  /** Deterministic, sorted, unique refs to the evidence consulted (outcomeIds / observationIds). */
  evidence: readonly string[];
}