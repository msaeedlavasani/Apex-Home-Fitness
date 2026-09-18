import type {SessionExercise} from '@/lib/workout/sessionContracts';

/**
 * Mentor demonstration binding (owner device correction §3).
 *
 * WHY: the Owner observed the PREPARING/INTRO identity reading "Plank Hold"
 * while the single approved Mentor asset demonstrates the Squat. The V2
 * route's FALLBACK plan substitutes `pushUps → squat`, but the fallback
 * workout for the current date can still lead with an UNSUPPORTED exercise
 * (e.g. `plank`) — the shell then silently bound whatever the resolver
 * produced to the one Squat-demonstrating Mentor, with Squat-authored cues.
 *
 * THE BOUNDARY: the current authorized Beta validation fixture supports
 * EXACTLY ONE demonstration (the canonical `AHF_Mentor_Squat.glb` and its
 * squat-authored coaching cues). This module is the FAIL-CLOSED gate that
 * keeps the validation fixture internally consistent:
 *
 *   exercise identity ↔ Mentor demonstration ↔ coaching cues
 *
 * An exercise is SUPPORTED when its canonical identity (resolved
 * `exerciseId`/`slug`, or the localized plan `nameKey` before resolver
 * resolution, or its localized display name) resolves to the Squat.
 * Multi-exercise Mentor selection is a LATER gate — this module does not
 * invent support, rename the squat demonstration, or add assets.
 *
 * PURE: no React, no I/O, no locale coupling (name checks are
 * case-insensitive and script-inclusive, so EN and FA both bind).
 */

/** The single canonical demonstration asset of the current fixture. */
export const MENTOR_DEMONSTRATION_ASSET = 'AHF_Mentor_Squat.glb';

/** Canonical Squat identity tokens across plan sources (EN + FA). */
const SQUAT_IDENTITY_TOKENS = [
  'squat', // canonical slug / nameKey (the V2 substitution target)
  'اسکات', // canonical FA message key content (Library.exercises.squat)
  'اسکوات', // V1 legacy FA squat naming (e.g. "اسکوات با وزن بدن")
] as const;

/** Plan-item identity fields the binding can consume (see `SessionExercise`). */
interface BindableExercise {
  readonly name: string;
  readonly id?: string;
  readonly exerciseId?: unknown;
  readonly slug?: unknown;
  /** Localized plan `nameKey` (sample-plan items only; not on the canonical contract). */
  readonly nameKey?: string;
}

/** True when the exercise's identity resolves to the canonical Squat. */
export function isSquatMentorExercise(
  exercise: BindableExercise,
): boolean {
  const candidates = [exercise.slug, exercise.nameKey, exercise.name, exercise.id];
  return candidates.some(
    (value) =>
      typeof value === 'string' &&
      SQUAT_IDENTITY_TOKENS.some((token) => value.toLowerCase().includes(token)),
  );
}

/** The resolved fixture plan item: an exercise plus its localized nameKey. */
export interface MentorFixturePlanItem {
  readonly exercise: SessionExercise;
  readonly nameKey?: string;
}

export class UnsupportedMentorExerciseError extends Error {
  constructor(exerciseName: string, demonstration: string) {
    super(
      `Exercise "${exerciseName}" cannot bind to the ${demonstration} demonstration: ` +
        'the current V2 validation fixture supports only the Squat. ' +
        'The plan must lead with a Squat exercise until multi-exercise Mentor selection ships.',
    );
    this.name = 'UnsupportedMentorExerciseError';
  }
}

/**
 * Picks the FIRST plan exercise the current Mentor fixture can honestly
 * demonstrate (fail-closed): the Squat when present, otherwise a typed
 * `UnsupportedMentorExerciseError` — never a silent mismatch, never a
 * substituted identity. The first SUPPORTED exercise wins (plan position
 * order is the product's presentation order).
 */
export function resolveMentorFixtureExercise(
  plan: readonly MentorFixturePlanItem[],
): MentorFixturePlanItem {
  const supported = plan.find((item) => isSquatMentorExercise({...item.exercise, nameKey: item.nameKey}));
  if (!supported) {
    throw new UnsupportedMentorExerciseError(
      plan[0]?.exercise.name ?? '<empty plan>',
      MENTOR_DEMONSTRATION_ASSET,
    );
  }
  return supported;
}
