import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTENT_HASH_ALGORITHM,
  MOVEMENT_PROVENANCE_VERSION,
  classifyLicense,
  contentHashOf,
  evidenceConfidence,
  isLicenseImportable,
  isValidConfidence,
  isValidContentHash,
  isValidProvenanceRecord,
  licenseRequiresAttribution,
  recordProvenance,
  sha256Hex,
  sourceKindConfidence,
  validateProvenanceRecord,
  type MovementProvenanceRecord,
  type SourceProvenanceInput,
} from '../src/lib/movement';
import type { MovementConfidence, MovementProvenance } from '../src/lib/movement/types';

/**
 * MG-03 provenance-contract invariants:
 *  - hash contract: sha256, hex, deterministic, validated strictly;
 *  - license rules: permissive + attribution are importable; copyleft,
 *    share-alike, non-commercial, no-derivatives, and unknown are NOT
 *    (fail-closed — never import on an unknown license);
 *  - confidence model: source-kind defaults and fail-closed evidence bands
 *    (ambiguous ⇒ low), always within [0, 1];
 *  - record builder: hardened MovementProvenanceRecord with ISO-8601
 *    ingestedAt (injectable) and deterministic contentHash;
 *  - validation is FAIL-CLOSED: missing refs, bad confidence, missing or
 *    non-importable upstream licenses, and malformed hashes all surface as
 *    explicit errors — never silently accepted.
 */

// ---------------------------------------------------------------------------
// Hash contract
// ---------------------------------------------------------------------------

test('hash contract: sha256 hex output is deterministic and lowercase', () => {
  const first = sha256Hex('canonical content');
  const second = sha256Hex('canonical content');
  assert.equal(first, second, 'sha256 must be deterministic');
  assert.match(first, /^[0-9a-f]{64}$/, 'sha256 is a 64-char lowercase hex digest');
  assert.equal(contentHashOf('x').algorithm, 'sha256');
  assert.equal(contentHashOf('x').value, sha256Hex('x'));
});

test('hash contract: different content produces different digests', () => {
  assert.notEqual(sha256Hex('a'), sha256Hex('b'));
  assert.equal(CONTENT_HASH_ALGORITHM, 'sha256');
});

test('hash contract: isValidContentHash rejects malformed values', () => {
  assert.equal(isValidContentHash(sha256Hex('ok')), true);
  assert.equal(isValidContentHash(''), false);
  assert.equal(isValidContentHash('abc'), false);
  assert.equal(isValidContentHash('A'.repeat(64)), false, 'uppercase hex must be rejected');
  assert.equal(isValidContentHash('g'.repeat(64)), false, 'non-hex chars must be rejected');
});

// ---------------------------------------------------------------------------
// License compatibility
// ---------------------------------------------------------------------------

test('license rules: permissive licenses are importable', () => {
  for (const license of ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC', '0BSD', 'Unlicense', 'CC0-1.0']) {
    assert.equal(classifyLicense(license), 'permissive', `${license} should be permissive`);
    assert.equal(isLicenseImportable(license), true, `${license} should be importable`);
  }
});

test('license rules: attribution licenses are importable and require attribution', () => {
  for (const license of ['CC-BY-4.0', 'CC-BY-3.0']) {
    assert.equal(classifyLicense(license), 'attribution', `${license} should be attribution`);
    assert.equal(isLicenseImportable(license), true, `${license} should be importable`);
    assert.equal(licenseRequiresAttribution(license), true, `${license} requires attribution`);
  }
});

test('license rules: copyleft/share-alike/non-commercial/no-derivatives are NOT importable', () => {
  for (const license of [
    'GPL-2.0',
    'GPL-3.0',
    'AGPL-3.0',
    'LGPL-3.0',
    'MPL-2.0',
    'CC-BY-SA-4.0',
    'CC-BY-NC-4.0',
    'CC-BY-NC-SA-4.0',
    'CC-BY-ND-4.0',
  ]) {
    assert.equal(classifyLicense(license), 'restrictive', `${license} should be restrictive`);
    assert.equal(isLicenseImportable(license), false, `${license} must NOT be importable`);
  }
});

test('license rules: unknown/missing licenses fail closed (not importable)', () => {
  assert.equal(classifyLicense(undefined), 'unknown');
  assert.equal(classifyLicense(''), 'unknown');
  assert.equal(classifyLicense('Made Up License 3000'), 'unknown');
  assert.equal(isLicenseImportable(undefined), false);
  assert.equal(isLicenseImportable('Made Up License 3000'), false);
});

test('license rules: matching is case/space-insensitive', () => {
  assert.equal(classifyLicense('mit'), 'permissive');
  assert.equal(classifyLicense('  MIT  '), 'permissive');
  assert.equal(classifyLicense('apache 2.0'), 'permissive');
  assert.equal(classifyLicense('cc by 4.0'), 'attribution');
  assert.equal(classifyLicense('Agpl-3.0'), 'restrictive');
});

// ---------------------------------------------------------------------------
// Confidence model
// ---------------------------------------------------------------------------

test('confidence: source-kind defaults are ordered and within [0, 1]', () => {
  const controlled = sourceKindConfidence('SOURCE_CONTROLLED');
  const curated = sourceKindConfidence('CURATED');
  const imported = sourceKindConfidence('UPSTREAM_IMPORT');
  const seed = sourceKindConfidence('LEGACY_SEED');
  assert.ok(controlled >= curated && curated >= imported && imported >= seed, 'default confidence must be ordered');
  for (const c of [controlled, curated, imported, seed]) {
    assert.equal(isValidConfidence(c), true);
  }
});

test('confidence: ambiguous evidence maps to the fail-closed LOW band', () => {
  assert.ok(evidenceConfidence('ambiguous') < evidenceConfidence('unverified'));
  assert.ok(evidenceConfidence('unverified') < evidenceConfidence('partial'));
  assert.ok(evidenceConfidence('partial') < evidenceConfidence('verified'));
  assert.equal(isValidConfidence(evidenceConfidence('ambiguous')), true);
});

test('confidence: isValidConfidence rejects out-of-range or non-numeric values', () => {
  assert.equal(isValidConfidence(0), true);
  assert.equal(isValidConfidence(1), true);
  assert.equal(isValidConfidence(-0.1), false);
  assert.equal(isValidConfidence(1.1), false);
  assert.equal(isValidConfidence(Number.NaN), false);
  assert.equal(isValidConfidence(Number.POSITIVE_INFINITY), false);
});

// ---------------------------------------------------------------------------
// Record builder
// ---------------------------------------------------------------------------

test('record builder: hardened record carries source, ISO-8601 timestamp, and deterministic hash', () => {
  const input: SourceProvenanceInput = {
    sourceKind: 'UPSTREAM_IMPORT',
    sourceRef: 'https://example.org/movements.json',
    license: 'CC-BY-4.0',
    content: JSON.stringify({ name: 'Bodyweight Squat' }),
    ingestedAt: '2026-09-01T00:00:00.000Z',
  };
  const record = recordProvenance(input);
  assert.equal(record.sourceKind, 'UPSTREAM_IMPORT');
  assert.equal(record.sourceRef, 'https://example.org/movements.json');
  assert.equal(record.license, 'CC-BY-4.0');
  assert.equal(record.ingestedAt, '2026-09-01T00:00:00.000Z');
  assert.equal(record.contentHash, sha256Hex(input.content ?? ''));
  // Deterministic: rebuilding with the same content yields the same hash.
  assert.equal(record.contentHash, recordProvenance(input).contentHash);
  // Hardened record is assignable where the MG-01 baseline is expected.
  const baseline: MovementProvenance = record;
  assert.equal(baseline.confidence, sourceKindConfidence('UPSTREAM_IMPORT'));
});

test('record builder: ingestedAt defaults to a valid ISO-8601 now, confidence defaults from kind', () => {
  const record = recordProvenance({ sourceKind: 'LEGACY_SEED', sourceRef: 'prod:seed' });
  assert.ok(!Number.isNaN(Date.parse(record.ingestedAt)), 'ingestedAt must be ISO-8601 parseable');
  assert.equal(record.confidence, sourceKindConfidence('LEGACY_SEED'));
});

// ---------------------------------------------------------------------------
// Fail-closed validation
// ---------------------------------------------------------------------------

test('validation: a complete importable record passes', () => {
  const record = recordProvenance({
    sourceKind: 'UPSTREAM_IMPORT',
    sourceRef: 'https://example.org/catalog.json',
    license: 'CC-BY-4.0',
    content: '{ "x": 1 }',
  });
  assert.deepEqual(validateProvenanceRecord(record), []);
  assert.equal(isValidProvenanceRecord(record), true);
});

test('validation: missing sourceRef fails closed', () => {
  const record: MovementProvenanceRecord = {
    sourceKind: 'SOURCE_CONTROLLED',
    sourceRef: '',
    confidence: 1,
    ingestedAt: '2026-09-01T00:00:00.000Z',
  };
  const errors = validateProvenanceRecord(record);
  assert.ok(errors.some((e) => e.includes('sourceRef')), 'missing sourceRef must surface');
  assert.equal(isValidProvenanceRecord(record), false);
});

test('validation: out-of-range confidence fails closed', () => {
  const record: MovementProvenanceRecord = {
    sourceKind: 'CURATED',
    sourceRef: 'docs/curation',
    confidence: 7 as MovementConfidence,
    ingestedAt: '2026-09-01T00:00:00.000Z',
  };
  const errors = validateProvenanceRecord(record);
  assert.ok(errors.some((e) => e.includes('confidence')), 'bad confidence must surface');
});

test('validation: UPSTREAM_IMPORT without a license fails closed', () => {
  const record = recordProvenance({ sourceKind: 'UPSTREAM_IMPORT', sourceRef: 'https://example.org/x.json' });
  const errors = validateProvenanceRecord(record);
  assert.ok(errors.some((e) => e.includes('license')), 'missing upstream license must surface');
});

test('validation: UPSTREAM_IMPORT with a non-importable license fails closed', () => {
  const record = recordProvenance({
    sourceKind: 'UPSTREAM_IMPORT',
    sourceRef: 'https://example.org/x.json',
    license: 'GPL-3.0',
  });
  const errors = validateProvenanceRecord(record);
  assert.ok(errors.some((e) => e.includes('GPL-3.0') && e.includes('not importable')), 'restrictive license must surface');
  assert.equal(isValidProvenanceRecord(record), false);
});

test('validation: malformed contentHash fails closed', () => {
  const record: MovementProvenanceRecord = {
    sourceKind: 'SOURCE_CONTROLLED',
    sourceRef: 'src/lib/exercise/catalog.ts',
    confidence: 1,
    contentHash: 'not-a-hash',
    ingestedAt: '2026-09-01T00:00:00.000Z',
  };
  const errors = validateProvenanceRecord(record);
  assert.ok(errors.some((e) => e.includes('contentHash')), 'malformed hash must surface');
});

test('validation: non-upstream records do not require a license (source-controlled is internal)', () => {
  const record = recordProvenance({ sourceKind: 'SOURCE_CONTROLLED', sourceRef: 'src/lib/exercise/catalog.ts' });
  assert.deepEqual(validateProvenanceRecord(record), []);
  assert.equal(MOVEMENT_PROVENANCE_VERSION, 1);
});