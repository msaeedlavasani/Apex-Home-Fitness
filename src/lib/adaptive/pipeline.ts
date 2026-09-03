/**
 * AL-03 — Adaptation input pipeline (pure, deterministic).
 *
 * Projects (profile, movement knowledge, workout history) into the
 * decision-layer `AdaptationInput` schema (`./types.ts`). Pure: no side
 * effects, no I/O, no services — the same inputs always produce the same
 * output. Fail-closed by construction: missing profile / empty history /
 * graph without relationships all yield a valid, conservative input
 * (absence is "insufficient data", never an invented value).
 *
 * Inputs (per `docs/TASKS.md` AL-03):
 *  - AL-02 `ProfileSnapshot` (accumulated signals; optional — anonymous
 *    users produce an empty user state);
 *  - MG-06 relationship graph (`RelationshipNode[]`);
 *  - workout history (`ProfileTrainingSession[]`, defaults to the profile's
 *    observed history).
 */

import { profileActivitySummary } from '../profile';
import type {
  ProfileSnapshot,
  ProfileTrainingSession,
  ProfileMovementSubject,
} from '../profile';
import type { RelationshipNode, MovementSlug, MovementId } from '../movement';
import {
  ADAPTATION_INPUT_VERSION,
  type AdaptationConstraints,
  type AdaptationDifficultySubject,
  type AdaptationInput,
  type AdaptationUserState,
  type MovementKnowledgeEntry,
  type MovementPerformanceAggregate,
} from './types';

/** Source inputs accepted by {@link buildAdaptationInput}. */
export interface AdaptationInputSource {
  /** AL-02 profile snapshot. Omitted for anonymous/unknown users. */
  profile?: ProfileSnapshot;
  /** MG-06 relationship graph nodes (may be empty). */
  movementKnowledge: readonly RelationshipNode[];
  /**
   * Workout history. Defaults to `profile.observed.trainingHistory`; an
   * explicit history is allowed for testing/offline use.
   */
  history?: readonly ProfileTrainingSession[];
  /** Derivation date (defaults to the newest history date, else `1970-01-01`). */
  asOfDateKey?: string;
}

const EPOCH_DATE = '1970-01-01';

/** Sorts + dedupes evidence refs deterministically. */
function collectEvidence(profile: ProfileSnapshot | undefined, history: readonly ProfileTrainingSession[]): string[] {
  const refs = new Set<string>();
  for (const session of history) refs.add(session.outcomeId);
  if (profile) {
    for (const p of profile.observed.movementPerformance) refs.add(p.outcomeId);
    for (const d of profile.observed.difficultyReports) if (d.outcomeId) refs.add(d.outcomeId);
    for (const f of profile.observed.feedbackEntries) refs.add(f.outcomeId);
  }
  return [...refs].sort();
}

/** Deterministic subject key (slug preferred, else exerciseId / token / 'session'). */
function subjectKey(subject: AdaptationDifficultySubject): string {
  if (subject.kind === 'exercise') return subject.slug ?? subject.exerciseId ?? '';
  if (subject.kind === 'session') return 'session';
  return subject.constraint;
}

/**
 * Deterministic per-movement aggregate over the profile's observed
 * performance rows (newest row last; ratio guards divide-by-zero).
 */
export function aggregateMovementPerformance(
  rows: ReadonlyArray<{
    subject: ProfileMovementSubject;
    plannedSets: number;
    completedSets: number;
    difficultyFeeling?: 'VERY_EASY' | 'EASY' | 'JUST_RIGHT' | 'HARD' | 'VERY_HARD';
    dateKey: string;
  }>,
): MovementPerformanceAggregate[] {
  const byKey = new Map<string, MovementPerformanceAggregate>();
  for (const row of rows) {
    const key = subjectKey(row.subject);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        subject: row.subject,
        totalPlannedSets: row.plannedSets,
        totalCompletedSets: row.completedSets,
        completionRatio: row.plannedSets === 0 ? 0 : row.completedSets / row.plannedSets,
        lastDateKey: row.dateKey,
        lastDifficultyFeeling: row.difficultyFeeling,
      });
    } else {
      existing.totalPlannedSets += row.plannedSets;
      existing.totalCompletedSets += row.completedSets;
      existing.completionRatio =
        existing.totalPlannedSets === 0 ? 0 : existing.totalCompletedSets / existing.totalPlannedSets;
      if (row.dateKey >= existing.lastDateKey) {
        existing.lastDateKey = row.dateKey;
        existing.lastDifficultyFeeling = row.difficultyFeeling;
      }
    }
  }
  return [...byKey.values()].sort((a, b) => subjectKey(a.subject).localeCompare(subjectKey(b.subject)));
}

/** Distinct recurring-difficulty subjects in first-reported order. */
export function recurringDifficultySubjects(
  reports: ReadonlyArray<{ subject: AdaptationDifficultySubject }>,
): AdaptationDifficultySubject[] {
  const seen = new Set<string>();
  const result: AdaptationDifficultySubject[] = [];
  for (const report of reports) {
    const key = subjectKey(report.subject);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(report.subject);
    }
  }
  return result;
}

/** Projects MG-06 graph nodes into decision-layer movement knowledge entries. */
export function movementKnowledgeFromGraph(graph: readonly RelationshipNode[]): MovementKnowledgeEntry[] {
  return graph.map((node) => ({
    slug: node.slug,
    id: node.id,
    relationships: (node.relationships ?? []).map((edge) => ({
      kind: edge.kind,
      targetSlug: edge.target.kind === 'slug' ? (edge.target.slug as MovementSlug) : undefined,
      targetId: edge.target.kind === 'id' ? (edge.target.id as MovementId) : undefined,
      note: edge.note,
    })),
  }));
}

function userStateFrom(profile: ProfileSnapshot | undefined): AdaptationUserState {
  if (!profile) {
    return { preferences: {}, equipment: { declaredAvailable: [], constraintsEncountered: [] } };
  }
  const capability = profile.inferred.capability;
  const adherence = profile.inferred.adherence;
  return {
    capability: capability
      ? { tier: capability.value.tier, confidence: capability.confidence, derivedBy: capability.derivedBy }
      : undefined,
    adherence: adherence
      ? { tier: adherence.value.tier, confidence: adherence.confidence, derivedBy: adherence.derivedBy }
      : undefined,
    movementTrends: profile.inferred.movementTrends?.map((t) => ({
      subject: t.value.subject,
      trend: t.value.trend,
      confidence: t.confidence,
      derivedBy: t.derivedBy,
    })),
    preferences: profile.observed.preferences,
    equipment: profile.observed.equipment,
  };
}

function constraintsFrom(
  profile: ProfileSnapshot | undefined,
  recurring: readonly AdaptationDifficultySubject[],
): AdaptationConstraints {
  const equipment = profile?.observed.equipment;
  return {
    equipmentAvailable: equipment?.declaredAvailable ?? [],
    equipmentMissing: equipment?.declaredMissing ?? [],
    constraintsEncountered: equipment?.constraintsEncountered ?? [],
    recurringDifficultySubjects: recurring,
  };
}

/**
 * Builds the canonical adaptation input. Pure and deterministic: identical
 * (profile, graph, history, as-of) always produce identical input.
 */
export function buildAdaptationInput(source: AdaptationInputSource): AdaptationInput {
  const profile = source.profile;
  const history = source.history ?? profile?.observed.trainingHistory ?? [];
  const asOfDateKey =
    source.asOfDateKey ??
    (history.length > 0 ? history[history.length - 1].dateKey : EPOCH_DATE);

  const movementKnowledge = movementKnowledgeFromGraph(source.movementKnowledge);
  const recurring = recurringDifficultySubjects(profile?.observed.difficultyReports ?? []);

  return {
    version: ADAPTATION_INPUT_VERSION,
    userId: profile?.userId,
    asOfDateKey,
    user: userStateFrom(profile),
    movementKnowledge,
    history: {
      activity: profileActivitySummary(history, { asOfDateKey }),
      performance: aggregateMovementPerformance(profile?.observed.movementPerformance ?? []),
      recurringDifficulties: recurring,
    },
    constraints: constraintsFrom(profile, recurring),
    evidence: collectEvidence(profile, history),
  };
}