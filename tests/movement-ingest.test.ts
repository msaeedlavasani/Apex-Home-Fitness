import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  FREE_EXERCISE_DB_SNAPSHOT,
  buildMovementObject,
  canonicalEntryJson,
  isValidContentHash,
  isValidProvenanceRecord,
  parseFreeExerciseDbDocument,
  resolveIdentity,
  runIngestion,
  upstreamMovementId,
  type FreeExerciseDbEntry,
  type MovementProvenanceRecord,
} from '../src/lib/movement';

/**
 * MG-04 ingestion-pipeline invariants:
 *  - parsing is fail-closed (malformed records rejected with errors);
 *  - identity is FAIL-CLOSED: exact name/alias match → RESOLVED; multiple
 *    candidates → AMBIGUOUS (surfaced, never guessed — the S02-E lesson);
 *    no match → UNRESOLVED (preserved, never dropped);
 *  - every built MovementObject conforms to the MG-01 contract with MG-03
 *    provenance (pinned per-entry URL, Unlicense, sha256 content hash,
 *    confidence); no media field (data-only posture);
 *  - taxonomy enrichment uses ONLY the MG-02 closed vocabulary; unknown
 *    terms surface in the report;
 *  - the pipeline is deterministic (stable content hashes across runs);
 *  - dry-run writes nothing and reports every deferred stage.
 */

const FIXTURE_PATH = new URL('../src/lib/movement/ingest-fixtures/free-exercise-db-sample.json', import.meta.url).pathname;
const FIXTURE = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as {
  _fixture: { source: string; license: string; pinned_commit: string };
  exercises: FreeExerciseDbEntry[];
};

function parsedFixture() {
  // The parser consumes the RAW exercise array (the fixture object wrapper is
  // metadata only). See parseFreeExerciseDbDocument contract.
  const { document, errors } = parseFreeExerciseDbDocument(JSON.stringify(FIXTURE.exercises));
  assert.ok(document, `fixture must parse (errors: ${errors.join('; ')})`);
  return { document, errors };
}

const INC = '2026-09-01T12:00:00.000Z';

test('fixture: curated sample from the pinned snapshot parses cleanly', () => {
  assert.equal(FIXTURE._fixture.license, 'Unlicense');
  assert.equal(FIXTURE._fixture.pinned_commit, FREE_EXERCISE_DB_SNAPSHOT.commit);
  const { document, errors } = parsedFixture();
  assert.deepEqual(errors, []);
  assert.equal(document.exercises.length, FIXTURE.exercises.length);
  assert.ok(document.exercises.length >= 30, 'fixture must be a substantial sample');
});

test('parse: malformed records are rejected with explicit errors (fail-closed)', () => {
  const malformed = '[{"id":"ok","name":"Fine","instructions":["step"]},{"id":123,"name":"Bad"},{"id":"no-name"},{"id":"bad-instr","name":"X","instructions":"not-an-array"}]';
  const { document, errors } = parseFreeExerciseDbDocument(malformed);
  assert.ok(document);
  assert.equal(document.exercises.length, 1, 'only the valid record passes');
  assert.equal(errors.length, 3, 'three malformed records surface as errors');
});

test('parse: non-JSON / non-array documents fail closed', () => {
  assert.equal(parseFreeExerciseDbDocument('not json').document, null);
  const asObject = parseFreeExerciseDbDocument('{"exercises":[]}');
  assert.equal(asObject.document, null);
  assert.ok(asObject.errors[0].includes('array'));
});

test('identity: exact canonical name resolves to the canonical slug', () => {
  const hit = resolveIdentity('Bodyweight Squat');
  assert.equal(hit.status, 'RESOLVED');
  assert.equal(String(hit.canonicalSlug), 'bodyweight-squat');
});

test('identity: exact alias match resolves to its canonical owner', () => {
  // 'Pushups' is a canonical alias of the seed 'Push-Up' entry.
  const hit = resolveIdentity('Pushups');
  assert.equal(hit.status, 'RESOLVED');
  assert.equal(String(hit.canonicalSlug), 'push-up');
});

test('identity FAIL-CLOSED (S02-E lesson): a name with multiple canonical owners is AMBIGUOUS, never guessed', () => {
  // SYNTHETIC regression fixture mirroring the Production S02-E row: the
  // alias 'side-lying leg lift' is declared on BOTH the seed 'Side Kick
  // (Side Leg Lifts)' entry AND the rules 'Side-Lying Leg Lift' entry, so a
  // source record by that name must surface AMBIGUOUS — exactly as the
  // S02-E classifier did. Synthetic because the pinned snapshot genuinely
  // lacks this name (verified 2026-09-01).
  const synthetic: FreeExerciseDbEntry = {
    id: 'synthetic-side-lying-leg-lift',
    name: 'Side-Lying Leg Lift',
    category: 'strength',
    equipment: 'body only',
    force: null,
    level: 'beginner',
    mechanic: null,
    primaryMuscles: ['abductors'],
    secondaryMuscles: [],
    instructions: ['Lie on your side.'],
  };
  const resolution = resolveIdentity(synthetic.name);
  assert.equal(resolution.status, 'AMBIGUOUS', 'colliding alias ownership must surface, never guess');
  const candidates = (resolution.candidates ?? []).map(String).sort();
  assert.deepEqual(candidates, ['side-kick-side-leg-lifts', 'side-lying-leg-lift']);

  const { object } = buildMovementObject(synthetic, { ingestedAt: INC });
  assert.equal(String(object.id), upstreamMovementId(synthetic.id));
});

test('identity: unmatched upstream names are UNRESOLVED and preserved (never dropped)', () => {
  assert.equal(resolveIdentity('Zero-G Unknown Movement 3000').status, 'UNRESOLVED');
  // Side-Lying Floor Stretch genuinely exists upstream and is NOT in our catalog.
  assert.equal(resolveIdentity('Side-Lying Floor Stretch').status, 'UNRESOLVED');
});

test('pipeline: every record becomes an MG-01-conformant MovementObject with MG-03 provenance', () => {
  const { document } = parsedFixture();
  const report = runIngestion(document, { ingestedAt: INC });
  assert.equal(report.entriesInput, document.exercises.length);
  assert.equal(report.objects.length, document.exercises.length, 'no record is dropped');
  for (const object of report.objects) {
    const provenance = object.provenance as MovementProvenanceRecord;
    assert.ok(object.id, 'id required');
    assert.ok(object.slug, 'slug required');
    assert.ok(object.name.en.length > 0, 'name.en required');
    assert.equal(provenance.sourceKind, 'UPSTREAM_IMPORT');
    assert.equal(provenance.license, 'Unlicense');
    assert.ok(provenance.sourceRef!.includes(FREE_EXERCISE_DB_SNAPSHOT.commit), 'provenance pins the snapshot commit');
    assert.ok(provenance.contentHash && isValidContentHash(provenance.contentHash), 'sha256 content hash required');
    assert.equal(provenance.ingestedAt, INC);
    assert.equal(isValidProvenanceRecord(provenance), true, 'provenance passes every MG-03 gate');
    assert.equal(object.media, undefined, 'DATA-ONLY posture: media must be absent');
    assert.equal(object.versioning.catalogVersion, 1);
    assert.equal(object.versioning.changeNote, `free-exercise-db@${FREE_EXERCISE_DB_SNAPSHOT.commit}`);
  }
});

test('pipeline: resolved entries carry verified confidence; others default to upstream confidence', () => {
  const { document } = parsedFixture();
  const pushups = document.exercises.find((e) => e.name === 'Pushups');
  assert.ok(pushups);
  const { object } = buildMovementObject(pushups, { ingestedAt: INC });
  assert.equal(object.provenance.confidence, 0.95, 'exact canonical match = verified evidence');
  const stretch = buildMovementObject(
    { id: 'x', name: 'Totally Unknown', category: null, equipment: null, force: null, level: null, mechanic: null, primaryMuscles: [], secondaryMuscles: [], instructions: [] },
    { ingestedAt: INC },
  );
  assert.equal(stretch.object.provenance.confidence, 0.7, 'unmatched upstream default = sourceKind confidence');
});

test('pipeline: taxonomy enrichment uses ONLY MG-02 vocabulary; unknowns surface', () => {
  const { document } = parsedFixture();
  const report = runIngestion(document, { ingestedAt: INC });
  const crunches = report.objects.find((o) => o.name.en === 'Crunches');
  assert.ok(crunches?.taxonomy, 'Crunches should carry taxonomy');
  assert.deepEqual(
    (crunches.taxonomy?.primaryMuscles ?? []).map(String),
    ['core'],
    'upstream "abdominals" maps to MG-02 "core"',
  );
  assert.deepEqual((crunches.taxonomy?.movementPatterns ?? []).map(String), ['isolation']);

  const expert = report.objects.find((o) => o.name.en === 'Barbell Squat To A Bench');
  assert.equal(expert?.taxonomy?.difficulty, 'advanced', 'upstream "expert" maps to MG-02 "advanced"');

  const bands = report.objects.find((o) => o.name.en === 'Calf Raises - With Bands');
  assert.deepEqual((bands?.taxonomy?.equipment ?? []).map(String), ['resistance-band'], 'upstream "bands" maps to resistance-band');

  // Unmapped source terms surface in the report (fail-closed, never guessed).
  const issues = report.issues.unknownTaxonomyTerms;
  assert.ok(issues.length > 0, 'unmapped terms (e.g. equipment:medicine ball, muscle:neck) must surface');
  assert.ok(issues.includes('equipment:medicine ball') || issues.some((t) => t.startsWith('equipment:')), 'unmapped equipment surfaces');
  assert.ok(issues.some((t) => t.startsWith('muscle:')), 'unmapped muscles surface');
});

test('pipeline: natural dataset overlap resolves; ambiguity/unresolved are counted in the report', () => {
  const { document } = parsedFixture();
  const report = runIngestion(document, { ingestedAt: INC });
  assert.ok(report.counts.resolved >= 4, `expected several exact matches, got ${report.counts.resolved}`);
  assert.ok(report.counts.unresolved >= 20, `most upstream records do not map 1:1 yet, got ${report.counts.unresolved}`);
  assert.equal(report.counts.ambiguous, 0, 'no natural ambiguous collisions in the curated sample');
  assert.equal(report.counts.imagesSkipped, 0, 'fixture records carry no image paths (data-only)');
  assert.deepEqual(report.deferredStages, {
    relationshipEnrichment: 'MG-06',
    localizationModel: 'MG-07',
    mediaManagement: 'MG-07',
  });
});

test('pipeline: deterministic — same input yields identical content hashes', () => {
  const { document } = parsedFixture();
  const first = runIngestion(document, { ingestedAt: INC });
  const second = runIngestion(document, { ingestedAt: INC });
  assert.deepEqual(first.objects.map((o) => o.provenance.contentHash), second.objects.map((o) => o.provenance.contentHash));
  assert.equal(canonicalEntryJson(document.exercises[0]), canonicalEntryJson(document.exercises[0]));
});

test('pipeline: per-entry source refs are stable and auditable', () => {
  const { document } = parsedFixture();
  const report = runIngestion(document, { ingestedAt: INC });
  const refs = report.objects.map((o) => (o.provenance as MovementProvenanceRecord).sourceRef!);
  assert.equal(new Set(refs).size, report.objects.length, 'every entry has its own pinned per-file source URL');
  for (const ref of refs) {
    assert.ok(ref.includes('/exercises/'), 'per-entry file ref');
    assert.ok(!ref.includes('images'), 'data-only: no image refs');
  }
});