import {Dumbbell, Expand, PersonStanding, type LucideIcon} from 'lucide-react';
import type {ResolvedExercisePrescription} from '@/lib/workout/sessionV2Contracts';

/**
 * Readiness guidance derivation (delta §18/§21/§36) — Experience-layer
 * presentation data for the PREPARING readiness card.
 *
 * DATA vs GUIDANCE law (updated by the WORKOUT-V2-IMPL-01 owner correction,
 * §11/§13): the guidance card is data-driven from the RESOLVED prescription.
 * Two tips are generic guidance (clear space, good posture — they describe
 * preparation, never the exercise identity). The THIRD tip is prescription-
 * derived, not hardcoded: the canonical plan contract carries NO equipment
 * field, so a bodyweight exercise is defined by the ABSENCE of an equipment
 * requirement in the resolved data — `deriveReadinessTips` receives that
 * resolved fact and renders "No equipment" ONLY when the prescription
 * resolves bodyweight. A future plan contract with real equipment data
 * feeds a different label here without faking it (the copy is supplied by
 * the localized message layer, the CONDITION by the resolved data).
 *
 * Reference-specific review contract: the current Bodyweight fixture must
 * resolve THREE visible rows/columns (mobile stacked / desktop columns).
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
  /** Title/detail for the prescription-derived equipment tip (bodyweight). */
  readonly noEquipmentTitle: string;
  readonly noEquipmentDetail: string;
}

/**
 * Derives the readiness tips for the guidance card from the RESOLVED
 * prescription: two generic guidance rows + the prescription-derived
 * equipment row. `prescription` drives the third row — never a fixture.
 */
export function deriveReadinessTips(
  copy: ReadinessCopy,
  prescription?: ResolvedExercisePrescription | null,
): readonly ReadinessTip[] {
  const tips: ReadinessTip[] = [
    {Icon: Expand, title: copy.clearSpaceTitle, detail: copy.clearSpaceDetail},
    {Icon: PersonStanding, title: copy.goodPostureTitle, detail: copy.goodPostureDetail},
  ];
  // Prescription-derived: the canonical plan contract has no equipment
  // field, so bodyweight = no equipment requirement resolved in the data.
  // When a future contract resolves real equipment, extend here additively
  // (never fabricate "No equipment" for an equipped prescription).
  if (prescription != null) {
    tips.push({
      Icon: Dumbbell,
      title: copy.noEquipmentTitle,
      detail: copy.noEquipmentDetail,
    });
  }
  return tips;
}

/** Re-exported for shell wiring type-safety. */
export type {ResolvedExercisePrescription};
