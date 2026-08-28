/**
 * Canonical exercise system catalog foundation (S02-A).
 *
 * Source-controlled, pure catalog of canonical system exercises used for
 * resolution/fixtures. PERSISTENCE of Exercise rows (the DB `Exercise` table)
 * is a separate concern — per GATE A (GA-03 hybrid model) this module is the
 * source-controlled source of truth for the SYSTEM list; the DB owns persisted
 * ids. Do NOT add Prisma/DB/React imports here.
 *
 * Catalog curation rules (GATE A §5 / §6, this doc):
 *   - Every entry has a stable slug + canonical display name.
 *   - Aliases are added ONLY when confidently equivalent (verified variants).
 *   - No semantic merges are guessed: "Tempo Bodyweight Squat" and
 *     "Bodyweight Squat" are DIFFERENT catalog entries (separate movements),
 *     and no cross-vocabulary aliasing is asserted between rules-engine names
 *     and seed names unless the name is exactly identical.
 *   - No Persian names are invented (GATE A found no Persian corpus); `faName`
 *     stays absent until a real source exists.
 *
 * The catalog is intentionally a FOUNDATION, not a complete production list.
 * Vocabularies that cannot yet map confidently are tracked separately in
 * `exerciseCatalogIndex` (exhaustive set of every recognized name/slug) and in
 * the vocabulary analysis (`docs/architecture/S02A-SOURCE-VOCABULARY.md`, §9).
 */

import type { ExerciseCatalogEntry, ExerciseSlug } from './contracts';

/** Tags a literal string as an ExerciseSlug (used where a slug is authored
 * directly, e.g. the library demo catalog whose slugs mirror page ids). */
function s(slug: string): ExerciseSlug {
  return slug as ExerciseSlug;
}

/** Helper asserts slugs stay kebab-case and free of characters that would
 * collide with the resolver's normalization surface. */
export function slugifyName(name: string): ExerciseSlug {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') as ExerciseSlug;
}

/**
 * The canonical seed exercise set, derived from `prisma/seed.ts` (40 exercises)
 * with deterministic `slugifyName` slugs and the exact seed display names.
 * This set is CANONICALIZED (name === catalog name, no aliases implied).
 */
export const SEED_CATALOG: readonly ExerciseCatalogEntry[] = [
  { slug: slugifyName('Downward-Facing Dog'), name: 'Downward-Facing Dog', aliases: [] },
  { slug: slugifyName('Chaturanga Dandasana (Low Plank)'), name: 'Chaturanga Dandasana (Low Plank)', aliases: [] },
  { slug: slugifyName('Crow Pose (Bakasana)'), name: 'Crow Pose (Bakasana)', aliases: [] },
  { slug: slugifyName('Tree Pose'), name: 'Tree Pose', aliases: [] },
  { slug: slugifyName('Warrior II'), name: 'Warrior II', aliases: [] },
  { slug: slugifyName('Burpee'), name: 'Burpee', aliases: ['burpees'] },
  { slug: slugifyName('High Knees'), name: 'High Knees', aliases: [] },
  { slug: slugifyName('Jump Squats'), name: 'Jump Squats', aliases: ['jump-squat'] },
  { slug: slugifyName('Skater Jumps'), name: 'Skater Jumps', aliases: [] },
  { slug: slugifyName('Mountain Climbers'), name: 'Mountain Climbers', aliases: ['mountain-climbers', 'mountain climber'] },
  { slug: slugifyName('Chair Dips'), name: 'Chair Dips', aliases: [] },
  { slug: slugifyName('Pistol Squat'), name: 'Pistol Squat', aliases: [] },
  { slug: slugifyName('Plank to Push-Up'), name: 'Plank to Push-Up', aliases: [] },
  { slug: slugifyName('Pull-Up'), name: 'Pull-Up', aliases: ['pull-up', 'pull-up bar'] },
  { slug: slugifyName('Push-Up'), name: 'Push-Up', aliases: ['push-up', 'pushups'] },
  { slug: slugifyName('Roll-Up'), name: 'Roll-Up', aliases: [] },
  { slug: slugifyName('Side Kick (Side Leg Lifts)'), name: 'Side Kick (Side Leg Lifts)', aliases: ['side-lying leg lift', 'side leg lift'] },
  { slug: slugifyName('Single-Leg Circle'), name: 'Single-Leg Circle', aliases: [] },
  { slug: slugifyName('Teaser'), name: 'Teaser', aliases: [] },
  { slug: slugifyName('The Hundred'), name: 'The Hundred', aliases: [] },
  { slug: slugifyName('90/90 Hip Switch'), name: '90/90 Hip Switch', aliases: [] },
  { slug: slugifyName('Ape Gait'), name: 'Ape Gait', aliases: [] },
  { slug: slugifyName('Beast Hold'), name: 'Beast Hold', aliases: [] },
  { slug: slugifyName('Crab Reach'), name: 'Crab Reach', aliases: [] },
  { slug: slugifyName('Frog Jump (Frog Leap)'), name: 'Frog Jump (Frog Leap)', aliases: [] },
  { slug: slugifyName('Lateral Roll'), name: 'Lateral Roll', aliases: [] },
  { slug: slugifyName('Glute Bridge Hold'), name: 'Glute Bridge Hold', aliases: ['glute-bridge', 'glute bridge'] },
  { slug: slugifyName('Hollow Body Hold'), name: 'Hollow Body Hold', aliases: [] },
  { slug: slugifyName('L-Sit Hold'), name: 'L-Sit Hold', aliases: [] },
  { slug: slugifyName('Plank Hold'), name: 'Plank Hold', aliases: ['plank'] },
  { slug: slugifyName('Wall Sit'), name: 'Wall Sit', aliases: [] },
  { slug: slugifyName('Banded Bicep Curl'), name: 'Banded Bicep Curl', aliases: [] },
  { slug: slugifyName('Banded Glute Kickback'), name: 'Banded Glute Kickback', aliases: [] },
  { slug: slugifyName('Banded Lateral Walk'), name: 'Banded Lateral Walk', aliases: [] },
  { slug: slugifyName('Banded Pull-Apart'), name: 'Banded Pull-Apart', aliases: [] },
  { slug: slugifyName('Banded Row'), name: 'Banded Row', aliases: [] },
  { slug: slugifyName('Cat-Cow'), name: 'Cat-Cow', aliases: ['cat cow'] },
  { slug: slugifyName('Deep Squat Hold'), name: 'Deep Squat Hold', aliases: [] },
  { slug: slugifyName('Shoulder Dislocates'), name: 'Shoulder Dislocates', aliases: [] },
  { slug: slugifyName("World's Greatest Stretch"), name: "World's Greatest Stretch", aliases: [] },
];

/**
 * The rules-engine catalog (36 entries) with **default-safe canonical names**
 * taken from the rules engine's display names — these are the exact names the
 * rules engine emits, so the resolver can resolve rules output by name. Each is
 * a distinct system entry; no aliasing to seed names is asserted.
 */
export const RULES_CATALOG: readonly ExerciseCatalogEntry[] = [
  { slug: slugifyName('Resistance Band Row'), name: 'Resistance Band Row', aliases: [] },
  { slug: slugifyName('Resistance Band Squat'), name: 'Resistance Band Squat', aliases: [] },
  { slug: slugifyName('Dumbbell Floor Press'), name: 'Dumbbell Floor Press', aliases: [] },
  { slug: slugifyName('Kettlebell Deadlift'), name: 'Kettlebell Deadlift', aliases: [] },
  { slug: slugifyName('Cable Row'), name: 'Cable Row', aliases: [] },
  { slug: slugifyName('Supported Split Squat'), name: 'Supported Split Squat', aliases: [] },
  { slug: slugifyName('Bodyweight Good Morning'), name: 'Bodyweight Good Morning', aliases: [] },
  { slug: slugifyName('Bodyweight Calf Raise'), name: 'Bodyweight Calf Raise', aliases: [] },
  { slug: slugifyName('Tempo Bodyweight Squat'), name: 'Tempo Bodyweight Squat', aliases: [] },
  { slug: slugifyName('Dumbbell Curl'), name: 'Dumbbell Curl', aliases: [] },
  { slug: slugifyName('Resistance Band Lateral Raise'), name: 'Resistance Band Lateral Raise', aliases: [] },
  { slug: slugifyName('Brisk Cardio Machine'), name: 'Brisk Cardio Machine', aliases: ['cardio machine'] },
  { slug: slugifyName('Jump Rope Intervals'), name: 'Jump Rope Intervals', aliases: ['jump-rope', 'jump rope'] },
  { slug: slugifyName('Low-Impact Step Jack'), name: 'Low-Impact Step Jack', aliases: ['step jack'] },
  { slug: slugifyName('Supported Relaxation'), name: 'Supported Relaxation', aliases: ['supported relaxation'] },
  { slug: slugifyName('Diaphragmatic Breathing'), name: 'Diaphragmatic Breathing', aliases: [] },
  { slug: slugifyName('Standing Calf Raise'), name: 'Standing Calf Raise', aliases: [] },
  { slug: slugifyName('Bodyweight Squat'), name: 'Bodyweight Squat', aliases: ['squat'] },
  { slug: slugifyName('Glute Bridge'), name: 'Glute Bridge', aliases: ['glute bridge'] },
  { slug: slugifyName('Forearm Plank Hold'), name: 'Forearm Plank Hold', aliases: ['forearm plank'] },
  { slug: slugifyName('Incline Push-Up'), name: 'Incline Push-Up', aliases: ['incline pushup'] },
  { slug: slugifyName('Bird Dog'), name: 'Bird Dog', aliases: [] },
  { slug: slugifyName('Dead Bug'), name: 'Dead Bug', aliases: [] },
  // 'Cat Cow' is the rules-engine display spelling of the same movement as the
  // seed's 'Cat-Cow' — the seed entry carries it as an alias, so it is NOT
  // listed again here (keeps slugs unique).
  { slug: slugifyName('Open Book Rotation'), name: 'Open Book Rotation', aliases: [] },
  { slug: slugifyName('March in Place'), name: 'March in Place', aliases: [] },
  { slug: slugifyName('Standing Hip Hinge Drill'), name: 'Standing Hip Hinge Drill', aliases: [] },
  { slug: slugifyName('Seated Band Row Hold'), name: 'Seated Band Row Hold', aliases: [] },
  { slug: slugifyName('Pull-Up Bar Scapular Hold'), name: 'Pull-Up Bar Scapular Hold', aliases: [] },
  { slug: slugifyName('Standing Glute Squeeze'), name: 'Standing Glute Squeeze', aliases: [] },
  { slug: slugifyName('Side-Lying Leg Lift'), name: 'Side-Lying Leg Lift', aliases: ['side-lying leg lift'] },
  { slug: slugifyName('Supine Arm Reach'), name: 'Supine Arm Reach', aliases: [] },
  { slug: slugifyName('Ankle Rock'), name: 'Ankle Rock', aliases: [] },
  { slug: slugifyName('Standing Chest Opener'), name: 'Standing Chest Opener', aliases: [] },
  { slug: slugifyName('Seated Hamstring Stretch'), name: 'Seated Hamstring Stretch', aliases: [] },
];

/**
 * The library demo catalog — the page-level exercise list (`id` in the page API).
 * These are demo entries with their own id namespace; they are NOT merged into
 * the canonical seed catalog (no evidence they are the same exercises), but
 * their ids are tracked so the resolver never guesses across them.
 */
export const LIBRARY_CATALOG: readonly ExerciseCatalogEntry[] = [
  { slug: s('push-ups'), name: 'Push-Ups', aliases: ['push-up', 'pushups'] },
  { slug: s('squats'), name: 'Squats', aliases: ['squat'] },
  { slug: s('glute-bridge'), name: 'Glute Bridge', aliases: ['glute bridge'] },
  { slug: s('lunges'), name: 'Lunges', aliases: ['lunge'] },
  { slug: s('burpees'), name: 'Burpees', aliases: ['burpee'] },
  { slug: s('jumping-jacks'), name: 'Jumping Jacks', aliases: ['jumping jack'] },
  { slug: s('mountain-climbers'), name: 'Mountain Climbers', aliases: ['mountain-climber'] },
  { slug: s('plank'), name: 'Plank', aliases: ['plank hold'] },
  { slug: s('hip-mobility'), name: 'Hip Mobility', aliases: ['hip mobility'] },
  { slug: s('yoga-flow'), name: 'Yoga Flow', aliases: ['yoga flow'] },
];

/**
 * The canonical catalogue assembled for resolver use — the union of the
 * seed (40) + rules (36) catalog sets. `LIBRARY_CATALOG` is kept separate
 * because it is demo data with an independent id namespace; it is exposed for
 * vocabulary analysis only and intentionally excluded from the primary
 * resolver catalog to avoid lib/exercise depending on a page-level list.
 */
export const CANONICAL_CATALOG: readonly ExerciseCatalogEntry[] = [
  ...SEED_CATALOG,
  ...RULES_CATALOG,
];

/**
 * Exhaustive index of every recognized name/slug in the canonical catalog —
 * used by tests to prove slogs/aliases are unique within a vocabulary and to
 * keep the resolver's lookup source complete.
 */
export const exerciseCatalogIndex: ReadonlyArray<ExerciseCatalogEntry> = CANONICAL_CATALOG;