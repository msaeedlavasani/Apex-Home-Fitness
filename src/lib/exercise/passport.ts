/**
 * Exercise Passport — the minimum Workout presentation read-model over the
 * canonical Exercise/Movement authority.
 *
 * This is an adapter contract, not a second exercise store. Stable exercise
 * knowledge comes from the persisted Exercise row and its optional Movement
 * knowledge; Program/Prescription values are deliberately absent here.
 */

import type {ExerciseId, ExerciseSlug} from './contracts';

export const EXERCISE_PASSPORT_VERSION = 1 as const;
export const SUPPORTED_SQUAT_MENTOR_ASSET = 'AHF_Mentor_Squat.glb';

const SQUAT_IDENTITY_TOKENS = ['squat', 'اسکات', 'اسکوات'] as const;

/** Capability lookup owned by the canonical Exercise knowledge boundary. */
export function exerciseSupportsSquatMentor(source: {readonly name: string; readonly slug?: unknown; readonly id?: unknown; readonly nameKey?: unknown}): boolean {
  return [source.slug, source.nameKey, source.name, source.id].some(
    (value) => typeof value === 'string' && SQUAT_IDENTITY_TOKENS.some((token) => value.toLowerCase().includes(token)),
  );
}

export interface ExercisePassport {
  readonly version: typeof EXERCISE_PASSPORT_VERSION;
  readonly exerciseId?: ExerciseId;
  readonly slug?: ExerciseSlug;
  readonly name: string;
  readonly introCues: readonly string[];
  readonly setupInstructions: readonly string[];
  readonly mentor: {
    readonly supported: boolean;
    readonly asset?: string;
  };
}

export interface ExercisePassportSource {
  readonly exerciseId?: ExerciseId;
  readonly slug?: ExerciseSlug;
  readonly name: string;
  readonly instructions?: unknown;
  readonly coachingCues?: unknown;
  readonly mentorSupported?: boolean;
  readonly mentorAsset?: string;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim())
    : [];
}

/** Builds the Workout-facing knowledge projection without inventing data. */
export function exercisePassportFromAuthority(source: ExercisePassportSource): ExercisePassport {
  const setupInstructions = strings(source.instructions);
  const introCues = strings(source.coachingCues);
  const resolvedIntroCues = introCues.length > 0 ? introCues : setupInstructions;
  return {
    version: EXERCISE_PASSPORT_VERSION,
    exerciseId: source.exerciseId,
    slug: source.slug,
    name: source.name,
    introCues: resolvedIntroCues,
    setupInstructions,
    mentor: {
      supported: source.mentorSupported === true,
      ...(source.mentorSupported === true && (source.mentorAsset || SUPPORTED_SQUAT_MENTOR_ASSET)
        ? {asset: source.mentorAsset ?? SUPPORTED_SQUAT_MENTOR_ASSET}
        : {}),
    },
  };
}
