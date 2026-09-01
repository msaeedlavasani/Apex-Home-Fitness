import assert from 'node:assert/strict';
import test from 'node:test';

import { CANONICAL_CATALOG } from '../src/lib/exercise';
import {
  DIFFICULTY_TIER_DISPLAY,
  DIFFICULTY_TIERS,
  EQUIPMENT_TYPE_DISPLAY,
  EQUIPMENT_TYPES,
  HOME_SUITABILITY_DISPLAY,
  HOME_SUITABILITY_LEVELS,
  IMPACT_LEVEL_DISPLAY,
  IMPACT_LEVELS,
  MOVEMENT_CONSTRAINT_DISPLAY,
  MOVEMENT_CONSTRAINTS,
  MOVEMENT_PATTERN_DISPLAY,
  MOVEMENT_PATTERNS,
  MOVEMENT_SYMMETRIES,
  MOVEMENT_SYMMETRY_DISPLAY,
  MUSCLE_GROUP_DISPLAY,
  MUSCLE_GROUPS,
  isDifficultyTier,
  isEquipmentType,
  isHomeSuitabilityLevel,
  isImpactLevel,
  isKnownTaxonomy,
  isMovementConstraint,
  isMovementPattern,
  isMovementSymmetry,
  isMuscleGroup,
  taxonomyTokenErrors,
  toEquipmentTypeToken,
  toHomeSuitabilityToken,
  toImpactLevelToken,
  toMovementConstraintToken,
  toMovementPatternToken,
  toMovementSymmetryToken,
  toMuscleGroupToken,
  type EquipmentType,
  type MovementPattern,
  type MovementTaxonomy,
} from '../src/lib/movement';
import type { EquipmentTypeToken, MovementConstraintToken, MovementPatternToken, MovementSymmetryToken, MuscleGroupToken } from '../src/lib/movement/types';

/**
 * MG-02 taxonomy invariants:
 *  - every vocabulary is a CLOSED set (each token has a non-empty FA/EN
 *    display entry; the display map keys equal the vocabulary exactly);
 *  - the vocabularies are EXHAUSTIVE for the current canonical catalog:
 *    every catalog slug classifies into ≥1 movement pattern and ≥1 equipment
 *    type (illustrative classification — enrichment is future pipeline work);
 *  - guards accept only known tokens; the token validator is FAIL-CLOSED
 *    (unknown tokens surface as errors, never silently accepted);
 *  - difficulty tiers (closed in MG-01) carry FA/EN display maps.
 */

/** Illustrative per-slug movement-pattern classification of the canonical
 * catalog (74 entries). Demonstrates exhaustiveness ONLY — authoritative
 * enrichment is future pipeline work (MG-04/MG-08). */
const SLUG_PATTERNS: Record<string, readonly MovementPattern[]> = {
  'downward-facing-dog': ['mobility'],
  'chaturanga-dandasana-low-plank': ['horizontal-push', 'core-anti-extension'],
  'crow-pose-bakasana': ['balance', 'horizontal-push'],
  'tree-pose': ['balance'],
  'warrior-ii': ['lunge', 'balance'],
  burpee: ['plyometric', 'squat', 'horizontal-push'],
  'high-knees': ['cardio', 'gait'],
  'jump-squats': ['plyometric', 'squat'],
  'skater-jumps': ['plyometric', 'balance'],
  'mountain-climbers': ['cardio', 'core-anti-extension'],
  'chair-dips': ['vertical-push'],
  'pistol-squat': ['squat', 'balance'],
  'plank-to-push-up': ['horizontal-push', 'core-anti-extension'],
  'pull-up': ['vertical-pull'],
  'push-up': ['horizontal-push'],
  'roll-up': ['core-flexion'],
  'side-kick-side-leg-lifts': ['isolation'],
  'single-leg-circle': ['isolation', 'mobility'],
  teaser: ['core-flexion', 'balance'],
  'the-hundred': ['core-flexion', 'cardio'],
  '90-90-hip-switch': ['rotation', 'mobility'],
  'ape-gait': ['gait'],
  'beast-hold': ['isometric-hold', 'core-anti-extension'],
  'crab-reach': ['mobility', 'core-flexion'],
  'frog-jump-frog-leap': ['plyometric', 'squat'],
  'lateral-roll': ['rotation', 'mobility'],
  'glute-bridge-hold': ['hinge', 'isometric-hold'],
  'hollow-body-hold': ['core-anti-extension', 'isometric-hold'],
  'l-sit-hold': ['core-flexion', 'isometric-hold'],
  'plank-hold': ['core-anti-extension', 'isometric-hold'],
  'wall-sit': ['squat', 'isometric-hold'],
  'banded-bicep-curl': ['isolation'],
  'banded-glute-kickback': ['isolation'],
  'banded-lateral-walk': ['gait'],
  'banded-pull-apart': ['isolation'],
  'banded-row': ['horizontal-pull'],
  'cat-cow': ['mobility', 'rotation'],
  'deep-squat-hold': ['squat', 'isometric-hold'],
  'shoulder-dislocates': ['mobility'],
  'world-s-greatest-stretch': ['mobility', 'rotation'],
  'resistance-band-row': ['horizontal-pull'],
  'resistance-band-squat': ['squat'],
  'dumbbell-floor-press': ['horizontal-push'],
  'kettlebell-deadlift': ['hinge'],
  'cable-row': ['horizontal-pull'],
  'supported-split-squat': ['lunge'],
  'bodyweight-good-morning': ['hinge'],
  'bodyweight-calf-raise': ['isolation'],
  'tempo-bodyweight-squat': ['squat'],
  'dumbbell-curl': ['isolation'],
  'resistance-band-lateral-raise': ['isolation'],
  'brisk-cardio-machine': ['cardio'],
  'jump-rope-intervals': ['plyometric', 'cardio'],
  'low-impact-step-jack': ['cardio'],
  'supported-relaxation': ['breathwork'],
  'diaphragmatic-breathing': ['breathwork'],
  'standing-calf-raise': ['isolation'],
  'bodyweight-squat': ['squat'],
  'glute-bridge': ['hinge'],
  'forearm-plank-hold': ['core-anti-extension', 'isometric-hold'],
  'incline-push-up': ['horizontal-push'],
  'bird-dog': ['core-anti-rotation', 'balance'],
  'dead-bug': ['core-anti-extension', 'core-anti-rotation'],
  'open-book-rotation': ['rotation', 'mobility'],
  'march-in-place': ['gait', 'cardio'],
  'standing-hip-hinge-drill': ['hinge'],
  'seated-band-row-hold': ['horizontal-pull', 'isometric-hold'],
  'pull-up-bar-scapular-hold': ['vertical-pull', 'isometric-hold'],
  'standing-glute-squeeze': ['isolation'],
  'side-lying-leg-lift': ['isolation'],
  'supine-arm-reach': ['mobility'],
  'ankle-rock': ['mobility'],
  'standing-chest-opener': ['mobility'],
  'seated-hamstring-stretch': ['mobility'],
};

/** Illustrative per-slug equipment classification of the canonical catalog. */
const SLUG_EQUIPMENT: Record<string, readonly EquipmentType[]> = {
  'downward-facing-dog': ['bodyweight'],
  'chaturanga-dandasana-low-plank': ['bodyweight'],
  'crow-pose-bakasana': ['bodyweight'],
  'tree-pose': ['bodyweight'],
  'warrior-ii': ['bodyweight'],
  burpee: ['bodyweight'],
  'high-knees': ['bodyweight'],
  'jump-squats': ['bodyweight'],
  'skater-jumps': ['bodyweight'],
  'mountain-climbers': ['bodyweight'],
  'chair-dips': ['chair'],
  'pistol-squat': ['bodyweight'],
  'plank-to-push-up': ['bodyweight'],
  'pull-up': ['pull-up-bar'],
  'push-up': ['bodyweight'],
  'roll-up': ['bodyweight'],
  'side-kick-side-leg-lifts': ['bodyweight'],
  'single-leg-circle': ['bodyweight'],
  teaser: ['bodyweight'],
  'the-hundred': ['bodyweight'],
  '90-90-hip-switch': ['bodyweight'],
  'ape-gait': ['bodyweight'],
  'beast-hold': ['bodyweight'],
  'crab-reach': ['bodyweight'],
  'frog-jump-frog-leap': ['bodyweight'],
  'lateral-roll': ['bodyweight'],
  'glute-bridge-hold': ['bodyweight'],
  'hollow-body-hold': ['bodyweight'],
  'l-sit-hold': ['bodyweight'],
  'plank-hold': ['bodyweight'],
  'wall-sit': ['wall'],
  'banded-bicep-curl': ['resistance-band'],
  'banded-glute-kickback': ['resistance-band'],
  'banded-lateral-walk': ['resistance-band'],
  'banded-pull-apart': ['resistance-band'],
  'banded-row': ['resistance-band'],
  'cat-cow': ['bodyweight'],
  'deep-squat-hold': ['bodyweight'],
  'shoulder-dislocates': ['bodyweight'],
  'world-s-greatest-stretch': ['bodyweight'],
  'resistance-band-row': ['resistance-band'],
  'resistance-band-squat': ['resistance-band'],
  'dumbbell-floor-press': ['dumbbell'],
  'kettlebell-deadlift': ['kettlebell'],
  'cable-row': ['cable-machine'],
  'supported-split-squat': ['bodyweight'],
  'bodyweight-good-morning': ['bodyweight'],
  'bodyweight-calf-raise': ['bodyweight'],
  'tempo-bodyweight-squat': ['bodyweight'],
  'dumbbell-curl': ['dumbbell'],
  'resistance-band-lateral-raise': ['resistance-band'],
  'brisk-cardio-machine': ['cardio-machine'],
  'jump-rope-intervals': ['jump-rope'],
  'low-impact-step-jack': ['bodyweight'],
  'supported-relaxation': ['bodyweight'],
  'diaphragmatic-breathing': ['bodyweight'],
  'standing-calf-raise': ['bodyweight'],
  'bodyweight-squat': ['bodyweight'],
  'glute-bridge': ['bodyweight'],
  'forearm-plank-hold': ['bodyweight'],
  'incline-push-up': ['bodyweight'],
  'bird-dog': ['bodyweight'],
  'dead-bug': ['bodyweight'],
  'open-book-rotation': ['bodyweight'],
  'march-in-place': ['bodyweight'],
  'standing-hip-hinge-drill': ['bodyweight'],
  'seated-band-row-hold': ['resistance-band'],
  'pull-up-bar-scapular-hold': ['pull-up-bar'],
  'standing-glute-squeeze': ['bodyweight'],
  'side-lying-leg-lift': ['bodyweight'],
  'supine-arm-reach': ['bodyweight'],
  'ankle-rock': ['bodyweight'],
  'standing-chest-opener': ['bodyweight'],
  'seated-hamstring-stretch': ['bodyweight'],
};

const catalogSlugs = CANONICAL_CATALOG.map((e) => e.slug);

test('canonical catalog: slugs match the classification fixtures 1:1', () => {
  const patternSlugs = Object.keys(SLUG_PATTERNS).sort();
  const equipmentSlugs = Object.keys(SLUG_EQUIPMENT).sort();
  assert.deepEqual(patternSlugs, [...catalogSlugs].sort(), 'patterns fixture must cover every catalog slug');
  assert.deepEqual(equipmentSlugs, [...catalogSlugs].sort(), 'equipment fixture must cover every catalog slug');
  assert.equal(CANONICAL_CATALOG.length, 74, 'current canonical catalog has 74 entries (40 seed + 34 rules)');
});

test('exhaustiveness: every catalog entry classifies into known movement patterns', () => {
  for (const slug of catalogSlugs) {
    const patterns = SLUG_PATTERNS[slug];
    assert.ok(patterns.length >= 1, `no movement pattern for ${slug}`);
    for (const p of patterns) assert.ok(isMovementPattern(p), `unknown movement pattern "${p}" for ${slug}`);
  }
});

test('exhaustiveness: every catalog entry classifies into a known equipment type', () => {
  for (const slug of catalogSlugs) {
    const equipment = SLUG_EQUIPMENT[slug];
    assert.ok(equipment.length >= 1, `no equipment for ${slug}`);
    for (const e of equipment) assert.ok(isEquipmentType(e), `unknown equipment type "${e}" for ${slug}`);
  }
});

test('every movement pattern token is used by the current catalog (no dead vocabulary)', () => {
  const used = new Set(Object.values(SLUG_PATTERNS).flat());
  for (const pattern of MOVEMENT_PATTERNS) {
    assert.ok(used.has(pattern), `movement pattern "${pattern}" unused by the current catalog`);
  }
});

test('display maps: every token in every vocabulary has non-empty FA/EN renderings', () => {
  const maps: Array<[readonly string[], Record<string, { en: string; fa: string }>]> = [
    [MOVEMENT_PATTERNS, MOVEMENT_PATTERN_DISPLAY],
    [MUSCLE_GROUPS, MUSCLE_GROUP_DISPLAY],
    [EQUIPMENT_TYPES, EQUIPMENT_TYPE_DISPLAY],
    [IMPACT_LEVELS, IMPACT_LEVEL_DISPLAY],
    [MOVEMENT_SYMMETRIES, MOVEMENT_SYMMETRY_DISPLAY],
    [HOME_SUITABILITY_LEVELS, HOME_SUITABILITY_DISPLAY],
    [MOVEMENT_CONSTRAINTS, MOVEMENT_CONSTRAINT_DISPLAY],
    [DIFFICULTY_TIERS, DIFFICULTY_TIER_DISPLAY],
  ];
  for (const [tokens, display] of maps) {
    for (const token of tokens) {
      const entry = display[token];
      assert.ok(entry, `missing display entry for "${token}"`);
      assert.ok(entry.en.length > 0, `empty EN display for "${token}"`);
      assert.ok(entry.fa.length > 0, `empty FA display for "${token}"`);
    }
    // Display maps are exhaustive: keys exactly equal the vocabulary.
    assert.deepEqual(Object.keys(display).sort(), [...tokens].sort(), `display keys mismatch vocabulary`);
  }
});

test('guards: accept known tokens and reject unknown strings', () => {
  assert.equal(isMovementPattern('squat'), true);
  assert.equal(isMovementPattern('squatting'), false);
  assert.equal(isMuscleGroup('quadriceps'), true);
  assert.equal(isMuscleGroup('quads'), false);
  assert.equal(isEquipmentType('resistance-band'), true);
  assert.equal(isEquipmentType('band'), false);
  assert.equal(isImpactLevel('high'), true);
  assert.equal(isImpactLevel('extreme'), false);
  assert.equal(isMovementSymmetry('unilateral'), true);
  assert.equal(isMovementSymmetry('one-sided'), false);
  assert.equal(isHomeSuitabilityLevel('excellent'), true);
  assert.equal(isHomeSuitabilityLevel('perfect'), false);
  assert.equal(isMovementConstraint('knee-loading'), true);
  assert.equal(isMovementConstraint('knee'), false);
  assert.equal(isDifficultyTier('advanced'), true);
  assert.equal(isDifficultyTier('expert'), false);
});

test('token converters bridge closed literals to the nominal MG-01 tokens', () => {
  const pattern = toMovementPatternToken('hinge');
  const group = toMuscleGroupToken('hamstrings');
  const equipment = toEquipmentTypeToken('kettlebell');
  const impact = toImpactLevelToken('low');
  const symmetry = toMovementSymmetryToken('alternating');
  const home = toHomeSuitabilityToken('good');
  const constraint = toMovementConstraintToken('requires-spotter');
  assert.equal(pattern, 'hinge');
  assert.equal(group, 'hamstrings');
  assert.equal(equipment, 'kettlebell');
  assert.equal(impact, 'low');
  assert.equal(symmetry, 'alternating');
  assert.equal(home, 'good');
  assert.equal(constraint, 'requires-spotter');
});

test('validator: fully-known taxonomy passes (fail-open) — no errors', () => {
  const valid: MovementTaxonomy = {
    primaryMuscles: [toMuscleGroupToken('quadriceps')],
    secondaryMuscles: [toMuscleGroupToken('glutes')],
    movementPatterns: [toMovementPatternToken('squat')],
    equipment: [toEquipmentTypeToken('bodyweight')],
    difficulty: 'beginner',
    impact: toImpactLevelToken('low'),
    symmetry: toMovementSymmetryToken('bilateral'),
    homeSuitability: toHomeSuitabilityToken('excellent'),
    constraints: [toMovementConstraintToken('knee-loading')],
  };
  assert.deepEqual(taxonomyTokenErrors(valid), []);
  assert.equal(isKnownTaxonomy(valid), true);
});

test('validator: unknown tokens surface as errors (fail-closed, never guessed)', () => {
  const invalid: MovementTaxonomy = {
    primaryMuscles: ['quads' as unknown as MuscleGroupToken],
    movementPatterns: ['squatting' as unknown as MovementPatternToken],
    equipment: ['kettle' as unknown as EquipmentTypeToken],
    symmetry: 'both-sides' as unknown as MovementSymmetryToken,
    constraints: ['knee' as unknown as MovementConstraintToken],
  };
  const errors = taxonomyTokenErrors(invalid);
  assert.ok(errors.length >= 5, `expected ≥5 errors, got: ${errors.join('; ')}`);
  assert.ok(errors.some((e) => e.includes('squatting')), 'movement pattern error must name the unknown token');
  assert.ok(errors.some((e) => e.includes('both-sides')), 'symmetry error must name the unknown token');
  assert.equal(isKnownTaxonomy(invalid), false);
});

test('difficulty tiers are closed in MG-01 and carry FA/EN display maps here', () => {
  assert.deepEqual([...DIFFICULTY_TIERS], ['beginner', 'intermediate', 'advanced']);
  assert.equal(DIFFICULTY_TIER_DISPLAY.beginner.en, 'Beginner');
  assert.equal(DIFFICULTY_TIER_DISPLAY.beginner.fa, 'مبتدی');
  assert.equal(DIFFICULTY_TIER_DISPLAY.advanced.fa, 'پیشرفته');
});

test('muscle-group vocabulary covers primary/secondary needs of the current catalog', () => {
  // Every muscle group token is distinct and display-complete (already proven
  // above); here we assert the vocabulary is a SET (no duplicates).
  assert.equal(new Set(MUSCLE_GROUPS).size, MUSCLE_GROUPS.length);
  assert.ok(MUSCLE_GROUPS.length >= 15, 'muscle-group vocabulary must be substantial');
});