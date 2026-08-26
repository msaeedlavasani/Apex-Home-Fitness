import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CANONICAL_CATALOG,
  RULES_CATALOG,
  SEED_CATALOG,
  LIBRARY_CATALOG,
  indexCatalogEntries,
  normalizeExerciseName,
  resolveExercise,
  resolveWithAmbiguity,
  slugifyName,
  type ExerciseCatalogEntry,
  type ExerciseId,
} from '../src/lib/exercise';

/**
 * Exercise-domain invariants (S02-A):
 *  - catalog preconditions: unique slugs, no empty names/slugs, aliases are
 *    normalized and unambiguous;
 *  - strict resolver: exact slug/name/alias resolve, unknown → UNRESOLVED,
 *    multiple → AMBIGUOUS, no fuzzy matching, order-independence;
 *  - unknown input preserved; resolver never mutates catalog.
 */

/** Slug → entry for uniqueness checks. */
function slugs(entries: readonly ExerciseCatalogEntry[]): Map<string, ExerciseCatalogEntry> {
  const map = new Map<string, ExerciseCatalogEntry>();
  for (const e of entries) {
    assert.ok(e.slug.length > 0, `empty slug in ${e.name}`);
    assert.ok(e.name.length > 0, `empty name for slug ${e.slug}`);
    assert.ok(!map.has(e.slug), `duplicate slug in a single catalog: ${e.slug}`);
    map.set(e.slug, e);
  }
  return map;
}

test('seed catalog: every entry has a unique slug and a non-empty name', () => {
  const seen = slugs(SEED_CATALOG);
  assert.equal(seen.size, SEED_CATALOG.length);
});

test('rules catalog: every entry has a unique slug and a non-empty name', () => {
  const seen = slugs(RULES_CATALOG);
  assert.equal(seen.size, RULES_CATALOG.length);
});

test('library catalog: every entry has a unique slug and a non-empty name', () => {
  const seen = slugs(LIBRARY_CATALOG);
  assert.equal(seen.size, LIBRARY_CATALOG.length);
});

test('aliases within a catalog are normalized-deterministic and do not collide with canonical names', () => {
  // Normalize every canonical name + alias in each catalog and assert no
  // normalized key maps to two different entries within the same list.
  for (const catalog of [SEED_CATALOG, RULES_CATALOG, LIBRARY_CATALOG]) {
    const owner: Record<string, ExerciseCatalogEntry> = {};
    for (const entry of catalog) {
      const nameKeys = [entry.name, ...(entry.aliases ?? [])];
      for (const raw of nameKeys) {
        const n = normalizeExerciseName(raw);
        if (owner[n] && owner[n] !== entry) {
          assert.fail(`normalized name/alias collision "${n}" between "${owner[n].name}" and "${entry.name}"`);
        }
        owner[n] = entry;
      }
    }
  }
});

test('slugifyName produces a stable, lowercase, dash-separated slug', () => {
  assert.equal(slugifyName('Push-Up'), 'push-up');
  assert.equal(slugifyName('Mountain Climbers'), 'mountain-climbers');
  assert.equal(slugifyName("World's Greatest Stretch"), 'world-s-greatest-stretch');
});

test('CANONICAL_CATALOG is the union of seed + rules and keeps unique slugs', () => {
  assert.equal(CANONICAL_CATALOG.length, SEED_CATALOG.length + RULES_CATALOG.length);
  const seen = new Set<string>();
  for (const e of CANONICAL_CATALOG) {
    assert.ok(!seen.has(e.slug), `duplicate slug in union: ${e.slug}`);
    seen.add(e.slug);
  }
});

// --- normalization -----------------------------------------------------------

test('normalizeExerciseName is deterministic and explainable', () => {
  assert.equal(normalizeExerciseName('  Push-Up '), 'push-up');
  assert.equal(normalizeExerciseName('  Mountain   Climbers '), 'mountain climbers');
  // hyphen separator is preserved, so "Push-Up" and "Push Up" do NOT silently
  // conflate.
  assert.notEqual(normalizeExerciseName('Push-Up'), normalizeExerciseName('Push Up'));
  // apostrophe style is normalized.
  assert.equal(normalizeExerciseName("World's Greatest Stretch"), "world's greatest stretch");
  assert.equal(normalizeExerciseName('World\u2019s Greatest Stretch'), "world's greatest stretch");
});

// --- resolver -----------------------------------------------------------------

test('resolver: exact slug resolves', () => {
  const r = resolveWithAmbiguity({ kind: 'slug', slug: slugifyName('dead-bug') }, CANONICAL_CATALOG);
  assert.equal(r.status, 'RESOLVED');
  assert.equal(r.entry?.slug, 'dead-bug');
});

test('resolver: canonical name resolves via normalized name', () => {
  const r = resolveWithAmbiguity({ kind: 'name', name: '  DEAD BUG ' }, CANONICAL_CATALOG);
  assert.equal(r.status, 'RESOLVED');
  assert.equal(r.entry?.slug, 'dead-bug');
});

test('resolver: alias resolves', () => {
  // 'burpee' is an alias of seed 'Burpee'.
  const r = resolveWithAmbiguity({ kind: 'name', name: 'burpee' }, CANONICAL_CATALOG);
  assert.equal(r.status, 'RESOLVED');
  assert.equal(r.entry?.slug, 'burpee');
});

test('resolver: unknown name returns UNRESOLVED and preserves the normalized input', () => {
  const r = resolveWithAmbiguity({ kind: 'name', name: 'Flag Semaphore Drill' }, CANONICAL_CATALOG);
  assert.equal(r.status, 'UNRESOLVED');
  assert.equal(r.failureReason, 'NO_MATCH');
  assert.equal(r.normalizedInput, 'flag semaphore drill');
});

test('resolver: returns AMBIGUOUS when two distinct entries match the same normalized input', () => {
  // Look up a name that maps to more than one distinct catalog entry.
  // We assert the resolver surfaces AMBIGUOUS rather than choosing by order.
  const ambiguous = resolveWithAmbiguity(
    { kind: 'name', name: 'Kettlebell Deadlift' },
    [
      { slug: slugifyName('Kettlebell Deadlift'), name: 'Kettlebell Deadlift', aliases: [] },
      { slug: slugifyName('Kettlebell Deadlift 2'), name: 'Kettlebell Deadlift', aliases: [] },
    ],
  );
  assert.equal(ambiguous.status, 'AMBIGUOUS');
  assert.equal(ambiguous.failureReason, 'AMBIGUOUS');
  assert.ok(ambiguous.ambiguous && ambiguous.ambiguous.length === 2);
});

test('resolver: no fuzzy matching — a near-miss does not resolve', () => {
  // "Plank Hold" is in the catalog, "Plank" is an alias; a beyond-pause name
  // must stay UNRESOLVED.
  const r = resolveWithAmbiguity({ kind: 'name', name: 'Pllank' }, CANONICAL_CATALOG);
  assert.equal(r.status, 'UNRESOLVED');
});

test('resolver: does not mutate the catalog or rely on order', () => {
  const catalog = [
    { slug: slugifyName('Push-Up'), name: 'Push-Up', aliases: [] },
    { slug: slugifyName('Squat'), name: 'Squat', aliases: [] },
  ];
  const before = catalog.map((e) => `${e.slug}:${e.name}`).join('|');
  resolveWithAmbiguity({ kind: 'name', name: 'Push-Up' }, catalog);
  const after = catalog.map((e) => `${e.slug}:${e.name}`).join('|');
  assert.equal(before, after);

  // Reversed order gives the same result for an exact name that maps to one
  // entry.
  const reversed = [...catalog].reverse();
  const r = resolveWithAmbiguity({ kind: 'name', name: 'Push-Up' }, reversed);
  assert.equal(r.status, 'RESOLVED');
  assert.equal(r.entry?.slug, 'push-up');
});

test('indexCatalogEntries: aliases resolve, duplicate-alias between distinct entries reports via resolveWithAmbiguity', () => {
  const catalog: ExerciseCatalogEntry[] = [
    { slug: slugifyName('Alpha'), name: 'Alpha', aliases: ['shared'] },
    { slug: slugifyName('Beta'), name: 'Beta', aliases: ['shared'] },
  ];
  const resolved = resolveWithAmbiguity({ kind: 'name', name: 'shared' }, catalog);
  assert.equal(resolved.status, 'AMBIGUOUS');
  assert.deepEqual(resolved.ambiguous, ['alpha', 'beta']);
});

test('resolver: id lookup requires an explicit index and never invents ids', () => {
  // No idIndex supplied → UNRESOLVED.
  const id = 'cid_1' as ExerciseId;
  const noIndex = resolveExercise(
    { kind: 'id', id },
    { byNormalizedName: new Map(), bySlug: new Map() },
  );
  assert.equal(noIndex.status, 'UNRESOLVED');

  // With an explicit idIndex → RESOLVED.
  const index = indexCatalogEntries(CANONICAL_CATALOG);
  const idIndex = new Map<ExerciseId, ExerciseCatalogEntry>([[id, RULES_CATALOG[0]]]);
  const withIndex = resolveExercise({ kind: 'id', id }, index, idIndex);
  assert.equal(withIndex.status, 'RESOLVED');
  assert.equal(withIndex.entry, RULES_CATALOG[0]);
});