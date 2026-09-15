import {Expand, PersonStanding, type LucideIcon} from 'lucide-react';
import type {ResolvedExercisePrescription} from '@/lib/workout/sessionV2Contracts';

/**
 * Readiness guidance derivation (delta §18/§21/§36) — Experience-layer
 * presentation data for the PREPARING readiness card.
 *
 * DATA vs GUIDANCE law: readiness tips are GENERIC GUIDANCE COPY (part of
 * the §18 information architecture — "readiness guidance"), localized by the
 * presentation layer. Prescription DATA is never invented: the canonical
 * `SessionExercise`/resolved prescription carries NO equipment field, so an
 * equipment tip ("No equipment" in the validation fixture) is OMITTED until
 * the canonical prescription model actually resolves equipment (§36: "If
 * data does not exist: OMIT the field. Do not invent data."). Adding
 * equipment later is a pure additive step here.
 *
 * Not a hardcoded fixture: tips derive structurally (both tips always
 * apply — they describe preparation, not the exercise identity; the
 * exercise-specific content comes from the resolved prescription via the
 * details surface).
 */

export interface ReadinessTip {
  readonly Icon: LucideIcon;
  /** Localized tip title. */
  readonly title: string;
  /** Localized tip detail. */
  readonly detail: string;
}

export interface ReadinessCopy {
  readonly clearSpaceTitle: string;
  readonly clearSpaceDetail: string;
  readonly goodPostureTitle: string;
  readonly goodPostureDetail: string;
}

/** Derives the readiness tips for the guidance card (generic guidance only). */
export function deriveReadinessTips(copy: ReadinessCopy): readonly ReadinessTip[] {
  return [
    {Icon: Expand, title: copy.clearSpaceTitle, detail: copy.clearSpaceDetail},
    {Icon: PersonStanding, title: copy.goodPostureTitle, detail: copy.goodPostureDetail},
  ];
}

/** Re-exported for shell wiring type-safety. */
export type {ResolvedExercisePrescription};
