/**
 * MG-02 — Movement taxonomy design.
 *
 * The canonical closed vocabulary for the Movement Graph taxonomy fields
 * declared in the MG-01 domain contract (`./types.ts`): movement patterns,
 * muscle groups (primary/secondary), equipment types, difficulty tiers,
 * impact levels, unilateral/bilateral symmetry, home-suitability ratings,
 * and movement constraints — each with FA/EN display mappings.
 *
 * Layering (per `docs/architecture/MG-02-MOVEMENT-TAXONOMY.md`):
 *   - The MG-01 contract keeps taxonomy fields as NOMINAL token types so the
 *     shape stays stable; THIS module closes the vocabulary: literal unions
 *     (MovementPattern, MuscleGroup, …), display maps, and `isX` guards, plus
 *     `toXToken` bridges that cast a closed literal to its nominal token.
 *   - `DifficultyTier` was already closed in MG-01 (mirrors the live Prisma
 *     `DifficultyLevel` enum); this module adds its display map.
 *   - FA display strings are PROVISIONAL app-authored renderings for
 *     TAXONOMY TERMS ONLY (not exercise names — GATE A applies to exercise
 *     display names, which stay absent until a real corpus exists). A
 *     corpus verification pass is planned with the MG-07 localization model.
 *   - The vocabularies are exhaustive for the CURRENT canonical catalog
 *     (76 entries; proven by `tests/movement-taxonomy.test.ts`). Future
 *     vocabulary additions are a governed decision (ADR/owner review), not
 *     an ad-hoc enum extension.
 *
 * Pure module: no Prisma, React, services, or runtime side effects.
 */

import type {
  DifficultyTier,
  EquipmentTypeToken,
  HomeSuitabilityToken,
  ImpactLevelToken,
  MovementConstraintToken,
  MovementPatternToken,
  MovementSymmetryToken,
  MovementTaxonomy,
  MuscleGroupToken,
} from './types';

// ---------------------------------------------------------------------------
// Display contract
// ---------------------------------------------------------------------------

/** FA/EN display rendering for one taxonomy term. */
export interface TaxonomyDisplay {
  /** English display string. */
  en: string;
  /** Persian display string (provisional app-authored; verify with MG-07). */
  fa: string;
}

// ---------------------------------------------------------------------------
// Movement patterns
// ---------------------------------------------------------------------------

export const MOVEMENT_PATTERNS = [
  'squat',
  'hinge',
  'lunge',
  'horizontal-push',
  'vertical-push',
  'horizontal-pull',
  'vertical-pull',
  'core-anti-extension',
  'core-anti-rotation',
  'core-flexion',
  'rotation',
  'isolation',
  'plyometric',
  'isometric-hold',
  'mobility',
  'cardio',
  'balance',
  'gait',
  'breathwork',
] as const;

export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

export const MOVEMENT_PATTERN_DISPLAY: Record<MovementPattern, TaxonomyDisplay> = {
  squat: { en: 'Squat', fa: 'اسکات' },
  hinge: { en: 'Hinge', fa: 'لولای لگن' },
  lunge: { en: 'Lunge', fa: 'لانژ' },
  'horizontal-push': { en: 'Horizontal push', fa: 'پرس افقی' },
  'vertical-push': { en: 'Vertical push', fa: 'پرس عمودی' },
  'horizontal-pull': { en: 'Horizontal pull', fa: 'کشش افقی' },
  'vertical-pull': { en: 'Vertical pull', fa: 'کشش عمودی' },
  'core-anti-extension': { en: 'Core anti-extension', fa: 'ضد اکستنشن مرکز تنه' },
  'core-anti-rotation': { en: 'Core anti-rotation', fa: 'ضد چرخش مرکز تنه' },
  'core-flexion': { en: 'Core flexion', fa: 'فلکشن مرکز تنه' },
  rotation: { en: 'Rotation', fa: 'چرخش' },
  isolation: { en: 'Isolation / accessory', fa: 'ایزوله' },
  plyometric: { en: 'Plyometric', fa: 'پلایومتریک' },
  'isometric-hold': { en: 'Isometric hold', fa: 'نگهداشت ایزومتریک' },
  mobility: { en: 'Mobility / flexibility', fa: 'تحرک‌پذیری' },
  cardio: { en: 'Cardio', fa: 'کاردیو' },
  balance: { en: 'Balance', fa: 'تعادل' },
  gait: { en: 'Gait / stepping', fa: 'راه‌رفتن' },
  breathwork: { en: 'Breathwork / relaxation', fa: 'تنفس' },
};

export function isMovementPattern(value: unknown): value is MovementPattern {
  return typeof value === 'string' && (MOVEMENT_PATTERNS as readonly string[]).includes(value);
}

/** Bridges a closed literal to the MG-01 nominal token type. */
export function toMovementPatternToken(pattern: MovementPattern): MovementPatternToken {
  return pattern as MovementPatternToken;
}

// ---------------------------------------------------------------------------
// Muscle groups
// ---------------------------------------------------------------------------

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'traps',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'obliques',
  'lower-back',
  'glutes',
  'hamstrings',
  'quadriceps',
  'adductors',
  'abductors',
  'calves',
  'hip-flexors',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_DISPLAY: Record<MuscleGroup, TaxonomyDisplay> = {
  chest: { en: 'Chest', fa: 'سینه' },
  back: { en: 'Back', fa: 'پشت' },
  shoulders: { en: 'Shoulders', fa: 'شانه' },
  traps: { en: 'Traps', fa: 'ذوزنقه‌ای' },
  biceps: { en: 'Biceps', fa: 'جلو بازو' },
  triceps: { en: 'Triceps', fa: 'پشت بازو' },
  forearms: { en: 'Forearms', fa: 'ساعد' },
  core: { en: 'Core / abs', fa: 'شکم' },
  obliques: { en: 'Obliques', fa: 'مایل شکمی' },
  'lower-back': { en: 'Lower back', fa: 'کمر' },
  glutes: { en: 'Glutes', fa: 'سرینی' },
  hamstrings: { en: 'Hamstrings', fa: 'پشت ران' },
  quadriceps: { en: 'Quadriceps', fa: 'جلو ران' },
  adductors: { en: 'Adductors', fa: 'نزدیک‌کننده‌های ران' },
  abductors: { en: 'Abductors', fa: 'دورکننده‌های ران' },
  calves: { en: 'Calves', fa: 'ساق پا' },
  'hip-flexors': { en: 'Hip flexors', fa: 'خم‌کننده‌های لگن' },
};

export function isMuscleGroup(value: unknown): value is MuscleGroup {
  return typeof value === 'string' && (MUSCLE_GROUPS as readonly string[]).includes(value);
}

export function toMuscleGroupToken(group: MuscleGroup): MuscleGroupToken {
  return group as MuscleGroupToken;
}

// ---------------------------------------------------------------------------
// Equipment types
// ---------------------------------------------------------------------------

export const EQUIPMENT_TYPES = [
  'bodyweight',
  'resistance-band',
  'dumbbell',
  'kettlebell',
  'barbell',
  'cable-machine',
  'pull-up-bar',
  'chair',
  'wall',
  'cardio-machine',
  'jump-rope',
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const EQUIPMENT_TYPE_DISPLAY: Record<EquipmentType, TaxonomyDisplay> = {
  bodyweight: { en: 'Bodyweight', fa: 'وزن بدن' },
  'resistance-band': { en: 'Resistance band', fa: 'کش مقاومتی' },
  dumbbell: { en: 'Dumbbell', fa: 'دمبل' },
  kettlebell: { en: 'Kettlebell', fa: 'کتل‌بل' },
  barbell: { en: 'Barbell', fa: 'هالتر' },
  'cable-machine': { en: 'Cable machine', fa: 'دستگاه سیم‌کش' },
  'pull-up-bar': { en: 'Pull-up bar', fa: 'بارفیکس' },
  chair: { en: 'Chair', fa: 'صندلی' },
  wall: { en: 'Wall', fa: 'دیوار' },
  'cardio-machine': { en: 'Cardio machine', fa: 'دستگاه کاردیو' },
  'jump-rope': { en: 'Jump rope', fa: 'طناب' },
};

export function isEquipmentType(value: unknown): value is EquipmentType {
  return typeof value === 'string' && (EQUIPMENT_TYPES as readonly string[]).includes(value);
}

export function toEquipmentTypeToken(equipment: EquipmentType): EquipmentTypeToken {
  return equipment as EquipmentTypeToken;
}

// ---------------------------------------------------------------------------
// Difficulty tiers (closed in MG-01 — display map added here)
// ---------------------------------------------------------------------------

export const DIFFICULTY_TIERS = ['beginner', 'intermediate', 'advanced'] as const;

export const DIFFICULTY_TIER_DISPLAY: Record<DifficultyTier, TaxonomyDisplay> = {
  beginner: { en: 'Beginner', fa: 'مبتدی' },
  intermediate: { en: 'Intermediate', fa: 'متوسط' },
  advanced: { en: 'Advanced', fa: 'پیشرفته' },
};

export function isDifficultyTier(value: unknown): value is DifficultyTier {
  return typeof value === 'string' && (DIFFICULTY_TIERS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Impact levels
// ---------------------------------------------------------------------------

export const IMPACT_LEVELS = ['low', 'moderate', 'high'] as const;

export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export const IMPACT_LEVEL_DISPLAY: Record<ImpactLevel, TaxonomyDisplay> = {
  low: { en: 'Low impact', fa: 'کم‌ضربه' },
  moderate: { en: 'Moderate impact', fa: 'ضربه متوسط' },
  high: { en: 'High impact', fa: 'پرضربه' },
};

export function isImpactLevel(value: unknown): value is ImpactLevel {
  return typeof value === 'string' && (IMPACT_LEVELS as readonly string[]).includes(value);
}

export function toImpactLevelToken(level: ImpactLevel): ImpactLevelToken {
  return level as ImpactLevelToken;
}

// ---------------------------------------------------------------------------
// Symmetry (unilateral / bilateral)
// ---------------------------------------------------------------------------

export const MOVEMENT_SYMMETRIES = ['unilateral', 'bilateral', 'alternating'] as const;

export type MovementSymmetry = (typeof MOVEMENT_SYMMETRIES)[number];

export const MOVEMENT_SYMMETRY_DISPLAY: Record<MovementSymmetry, TaxonomyDisplay> = {
  unilateral: { en: 'Unilateral', fa: 'یک‌طرفه' },
  bilateral: { en: 'Bilateral', fa: 'دوطرفه' },
  alternating: { en: 'Alternating', fa: 'متناوب' },
};

export function isMovementSymmetry(value: unknown): value is MovementSymmetry {
  return typeof value === 'string' && (MOVEMENT_SYMMETRIES as readonly string[]).includes(value);
}

export function toMovementSymmetryToken(symmetry: MovementSymmetry): MovementSymmetryToken {
  return symmetry as MovementSymmetryToken;
}

// ---------------------------------------------------------------------------
// Home suitability
// ---------------------------------------------------------------------------

export const HOME_SUITABILITY_LEVELS = ['excellent', 'good', 'limited'] as const;

export type HomeSuitabilityLevel = (typeof HOME_SUITABILITY_LEVELS)[number];

export const HOME_SUITABILITY_DISPLAY: Record<HomeSuitabilityLevel, TaxonomyDisplay> = {
  excellent: { en: 'Excellent for home', fa: 'عالی برای خانه' },
  good: { en: 'Good for home', fa: 'مناسب برای خانه' },
  limited: { en: 'Limited at home', fa: 'محدود در خانه' },
};

export function isHomeSuitabilityLevel(value: unknown): value is HomeSuitabilityLevel {
  return typeof value === 'string' && (HOME_SUITABILITY_LEVELS as readonly string[]).includes(value);
}

export function toHomeSuitabilityToken(level: HomeSuitabilityLevel): HomeSuitabilityToken {
  return level as HomeSuitabilityToken;
}

// ---------------------------------------------------------------------------
// Movement constraints
// ---------------------------------------------------------------------------

export const MOVEMENT_CONSTRAINTS = [
  'requires-equipment',
  'requires-space',
  'requires-spotter',
  'wrist-loading',
  'knee-loading',
  'shoulder-loading',
  'balance-challenging',
  'high-skill',
  'mobility-required',
] as const;

export type MovementConstraint = (typeof MOVEMENT_CONSTRAINTS)[number];

export const MOVEMENT_CONSTRAINT_DISPLAY: Record<MovementConstraint, TaxonomyDisplay> = {
  'requires-equipment': { en: 'Requires equipment', fa: 'نیاز به تجهیزات' },
  'requires-space': { en: 'Requires space', fa: 'نیاز به فضا' },
  'requires-spotter': { en: 'Requires a spotter', fa: 'نیاز به اسپات' },
  'wrist-loading': { en: 'Wrist loading', fa: 'فشار بر مچ' },
  'knee-loading': { en: 'Knee loading', fa: 'فشار بر زانو' },
  'shoulder-loading': { en: 'Shoulder loading', fa: 'فشار بر شانه' },
  'balance-challenging': { en: 'Balance-challenging', fa: 'نیازمند تعادل' },
  'high-skill': { en: 'High skill', fa: 'مهارت بالا' },
  'mobility-required': { en: 'Mobility required', fa: 'نیازمند تحرک‌پذیری' },
};

export function isMovementConstraint(value: unknown): value is MovementConstraint {
  return typeof value === 'string' && (MOVEMENT_CONSTRAINTS as readonly string[]).includes(value);
}

export function toMovementConstraintToken(constraint: MovementConstraint): MovementConstraintToken {
  return constraint as MovementConstraintToken;
}

// ---------------------------------------------------------------------------
// Token validation (fail-closed: unknown tokens surface, never guess)
// ---------------------------------------------------------------------------

/**
 * Returns human-readable errors for any taxonomy token NOT in the closed
 * vocabulary, or `[]` when the taxonomy is fully known. Fail-closed: an
 * unknown token is reported, never silently accepted (consistent with the
 * S02-E identity-resolution lesson — ambiguity surfaces).
 */
export function taxonomyTokenErrors(taxonomy: MovementTaxonomy): readonly string[] {
  const errors: string[] = [];
  for (const token of taxonomy.primaryMuscles ?? []) {
    if (!isMuscleGroup(token)) errors.push(`primaryMuscles: unknown muscle group token "${token}"`);
  }
  for (const token of taxonomy.secondaryMuscles ?? []) {
    if (!isMuscleGroup(token)) errors.push(`secondaryMuscles: unknown muscle group token "${token}"`);
  }
  for (const token of taxonomy.movementPatterns ?? []) {
    if (!isMovementPattern(token)) errors.push(`movementPatterns: unknown movement pattern token "${token}"`);
  }
  for (const token of taxonomy.equipment ?? []) {
    if (!isEquipmentType(token)) errors.push(`equipment: unknown equipment type token "${token}"`);
  }
  if (taxonomy.difficulty !== undefined && !isDifficultyTier(taxonomy.difficulty)) {
    errors.push(`difficulty: unknown difficulty tier "${taxonomy.difficulty}"`);
  }
  if (taxonomy.impact !== undefined && !isImpactLevel(taxonomy.impact)) {
    errors.push(`impact: unknown impact level token "${taxonomy.impact}"`);
  }
  if (taxonomy.symmetry !== undefined && !isMovementSymmetry(taxonomy.symmetry)) {
    errors.push(`symmetry: unknown symmetry token "${taxonomy.symmetry}"`);
  }
  if (taxonomy.homeSuitability !== undefined && !isHomeSuitabilityLevel(taxonomy.homeSuitability)) {
    errors.push(`homeSuitability: unknown home-suitability token "${taxonomy.homeSuitability}"`);
  }
  for (const token of taxonomy.constraints ?? []) {
    if (!isMovementConstraint(token)) errors.push(`constraints: unknown movement constraint token "${token}"`);
  }
  return errors;
}

/** True when every token in the taxonomy belongs to the closed vocabulary. */
export function isKnownTaxonomy(taxonomy: MovementTaxonomy): boolean {
  return taxonomyTokenErrors(taxonomy).length === 0;
}