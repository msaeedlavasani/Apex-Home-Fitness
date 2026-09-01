/**
 * MG-03 — Source / provenance contract.
 *
 * The audit trail for the self-hosting requirement (strategy §6): every
 * movement knowledge object must be traceable to its upstream sources. This
 * module hardens the MG-01 baseline `MovementProvenance` (kept unchanged in
 * `./types.ts` — closed work is not reopened) with:
 *
 *   - a source-identity contract (`SourceProvenanceInput` → ref URL + kind);
 *   - a content-hash contract (`ContentHash`, sha256, hex) for
 *     integrity/change detection;
 *   - a license-compatibility model (`classifyLicense`,
 *     `isLicenseImportable`) — permissive/attribution sources are importable;
 *     copyleft, share-alike, non-commercial, no-derivatives, and unknown
 *     licenses are NOT (fail-closed: never import on an unknown license);
 *   - a confidence assessment model (`sourceKindConfidence`,
 *     `evidenceConfidence`) — no/low evidence ⇒ low confidence (fail-closed,
 *     consistent with the S02-E identity-resolution lesson);
 *   - the hardened `MovementProvenanceRecord` (adds the ingestion timestamp)
 *     + `recordProvenance` builder; and
 *   - a fail-closed `validateProvenanceRecord`.
 *
 * Pure module: no Prisma, React, services. It uses `node:crypto` (sha256)
 * only — deterministic, side-effect-free.
 */

import { createHash } from 'node:crypto';

import type { MovementConfidence, MovementProvenance, MovementSourceKind } from './types';

/** Version of this provenance contract. */
export const MOVEMENT_PROVENANCE_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Content-hash contract
// ---------------------------------------------------------------------------

/** The only supported hash algorithm (content integrity, MG-03). */
export const CONTENT_HASH_ALGORITHM = 'sha256' as const;

export type ContentHashAlgorithm = typeof CONTENT_HASH_ALGORITHM;

/**
 * A content hash: algorithm + lowercase hex digest. `contentHash` on the
 * MG-01 provenance field is the hex string form of this contract.
 */
export interface ContentHash {
  algorithm: ContentHashAlgorithm;
  /** Lowercase hex sha256 digest of the canonical content string. */
  value: string;
}

/** Deterministic sha256 hex digest of a string (canonical content form). */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** Builds a `ContentHash` from canonical content. */
export function contentHashOf(content: string): ContentHash {
  return { algorithm: CONTENT_HASH_ALGORITHM, value: sha256Hex(content) };
}

/** True when a stored hash matches the sha256 hex contract (length + charset). */
export function isValidContentHash(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

// ---------------------------------------------------------------------------
// License-compatibility rules
// ---------------------------------------------------------------------------

/**
 * Compatibility class of a source license for import into the self-hosted
 * canonical catalog.
 *
 *   - `permissive`    — importable (MIT, Apache-2.0, BSD, ISC, 0BSD,
 *                        Unlicense, CC0-1.0, …). No attribution obligation.
 *   - `attribution`   — importable WITH attribution recorded
 *                        (CC-BY-3.0/4.0). The license must be persisted on
 *                        the provenance record.
 *   - `restrictive`   — NOT importable: copyleft/viral (GPL/AGPL/LGPL),
 *                        share-alike (CC-BY-SA), non-commercial
 *                        (CC-BY-NC[-SA]), no-derivatives (CC-BY-ND).
 *   - `unknown`       — NOT importable (fail-closed: never import on an
 *                        unrecognized/missing license).
 */
export type LicenseCompatibility = 'permissive' | 'attribution' | 'restrictive' | 'unknown';

/**
 * Canonical classification table. SPDX identifiers are matched
 * case-insensitively; `*` covers common variant spellings.
 */
export const LICENSE_CLASSIFICATIONS: ReadonlyArray<readonly [string, LicenseCompatibility]> = [
  // Permissive — importable
  ['MIT', 'permissive'],
  ['Apache-2.0', 'permissive'],
  ['Apache 2.0', 'permissive'],
  ['BSD-2-Clause', 'permissive'],
  ['BSD-3-Clause', 'permissive'],
  ['BSD-4-Clause', 'permissive'],
  ['0BSD', 'permissive'],
  ['ISC', 'permissive'],
  ['Zlib', 'permissive'],
  ['Unlicense', 'permissive'],
  ['CC0-1.0', 'permissive'],
  ['CC0', 'permissive'],
  ['Public Domain', 'permissive'],
  // Attribution — importable with attribution recorded on the record
  ['CC-BY-4.0', 'attribution'],
  ['CC-BY-3.0', 'attribution'],
  ['CC BY 4.0', 'attribution'],
  ['CC BY 3.0', 'attribution'],
  // Restrictive — NOT importable
  ['GPL-2.0', 'restrictive'],
  ['GPL-2.0-only', 'restrictive'],
  ['GPL-3.0', 'restrictive'],
  ['GPL-3.0-only', 'restrictive'],
  ['AGPL-3.0', 'restrictive'],
  ['LGPL-2.1', 'restrictive'],
  ['LGPL-3.0', 'restrictive'],
  ['MPL-2.0', 'restrictive'],
  ['CC-BY-SA-4.0', 'restrictive'],
  ['CC-BY-SA-3.0', 'restrictive'],
  ['CC-BY-NC-4.0', 'restrictive'],
  ['CC-BY-NC-SA-4.0', 'restrictive'],
  ['CC-BY-ND-4.0', 'restrictive'],
];

/** Standardized reference for "no license given" (not importable). */
export const UNKNOWN_LICENSE = 'UNKNOWN' as const;

/** Classifies a source license string (case-insensitive) for import rules. */
export function classifyLicense(license: string | undefined | null): LicenseCompatibility {
  if (!license || license.trim() === '') return 'unknown';
  const normalized = license.trim().replace(/\s+/g, ' ');
  for (const [id, classification] of LICENSE_CLASSIFICATIONS) {
    if (normalized.toLowerCase() === id.toLowerCase()) return classification;
  }
  return 'unknown';
}

/**
 * True when the license may be imported into the canonical catalog:
 * permissive always; attribution only (the record MUST persist the license —
 * enforced by `validateProvenanceRecord`); everything else fails closed.
 */
export function isLicenseImportable(license: string | undefined | null): boolean {
  const classification = classifyLicense(license);
  return classification === 'permissive' || classification === 'attribution';
}

/**
 * Attribution obligation: CC-BY class licenses must keep the license + a
 * source reference in the persisted record.
 */
export function licenseRequiresAttribution(license: string | undefined | null): boolean {
  return classifyLicense(license) === 'attribution';
}

// ---------------------------------------------------------------------------
// Confidence assessment model
// ---------------------------------------------------------------------------

/**
 * Source-kind → default confidence (0..1). Sources with no/low evidence fall
 * back to LOW — fail-closed, never inflated (S02-E lesson applied to
 * provenance).
 */
export function sourceKindConfidence(kind: MovementSourceKind): MovementConfidence {
  switch (kind) {
    case 'SOURCE_CONTROLLED':
      return 1;
    case 'CURATED':
      return 0.9;
    case 'UPSTREAM_IMPORT':
      return 0.7;
    case 'LEGACY_SEED':
      // Seed/legacy Production data is not canonical (strategy §5).
      return 0.5;
  }
}

/**
 * Evidence-driven confidence bands for the ingestion pipeline (MG-04):
 * stronger verification ⇒ higher confidence. `ambiguous` maps to the
 * fail-closed LOW band — ambiguity surfaces, confidence is never guessed.
 */
export type ProvenanceEvidence = 'verified' | 'partial' | 'unverified' | 'ambiguous';

export function evidenceConfidence(evidence: ProvenanceEvidence): MovementConfidence {
  switch (evidence) {
    case 'verified':
      return 0.95;
    case 'partial':
      return 0.7;
    case 'unverified':
      return 0.4;
    case 'ambiguous':
      return 0.2;
  }
}

/** True when confidence is a finite number within [0, 1]. */
export function isValidConfidence(confidence: MovementConfidence): boolean {
  return Number.isFinite(confidence) && confidence >= 0 && confidence <= 1;
}

// ---------------------------------------------------------------------------
// Hardened provenance record + builder
// ---------------------------------------------------------------------------

/**
 * The MG-03-hardened provenance record: the MG-01 baseline fields plus the
 * ingestion timestamp. Assignable wherever `MovementProvenance` is expected
 * (structural superset) — the MG-01 contract itself is unchanged.
 *
 * Conventions:
 *   - `sourceRef`   — stable upstream identifier (URL or canonical source ref);
 *   - `license`     — SPDX(-ish) identifier as classified above;
 *   - `contentHash` — sha256 hex of the canonical content string;
 *   - `confidence`  — 0..1 per the assessment model;
 *   - `ingestedAt`  — ISO-8601 UTC ingestion timestamp.
 */
export interface MovementProvenanceRecord extends MovementProvenance {
  ingestedAt: string;
}

/** Input contract for recording provenance of one movement knowledge object. */
export interface SourceProvenanceInput {
  sourceKind: MovementSourceKind;
  /** Stable upstream identifier: URL or canonical source reference. */
  sourceRef: string;
  /** SPDX(-ish) license identifier; REQUIRED for `UPSTREAM_IMPORT`. */
  license?: string;
  /** Canonical content whose sha256 becomes `contentHash` (optional). */
  content?: string;
  /** Explicit confidence; defaults from `sourceKindConfidence`. */
  confidence?: MovementConfidence;
  /** Injectable ingestion clock (ISO-8601); defaults to now. */
  ingestedAt?: string;
}

/**
 * Builds a hardened provenance record with a deterministic content hash and
 * an ISO-8601 ingestion timestamp. Does NOT validate (use
 * `validateProvenanceRecord` for the fail-closed gate).
 */
export function recordProvenance(input: SourceProvenanceInput): MovementProvenanceRecord {
  const record: MovementProvenanceRecord = {
    sourceKind: input.sourceKind,
    sourceRef: input.sourceRef,
    confidence: input.confidence ?? sourceKindConfidence(input.sourceKind),
    ingestedAt: input.ingestedAt ?? new Date().toISOString(),
  };
  if (input.license !== undefined) record.license = input.license;
  if (input.content !== undefined) record.contentHash = contentHashOf(input.content).value;
  return record;
}

// ---------------------------------------------------------------------------
// Fail-closed validation
// ---------------------------------------------------------------------------

/**
 * Validates a provenance record, returning explicit errors ([] = valid).
 * Fail-closed gates:
 *   - `sourceRef` must be a non-empty stable identifier/URL;
 *   - confidence must be a finite number in [0, 1];
 *   - `UPSTREAM_IMPORT` records MUST carry a license, and that license must
 *     be importable (permissive/attribution); attribution licenses demand the
 *     persisted record keep the license for traceability;
 *   - `contentHash`, when present, must match the sha256 hex contract.
 */
export function validateProvenanceRecord(record: MovementProvenance): readonly string[] {
  const errors: string[] = [];
  if (!record.sourceRef || record.sourceRef.trim() === '') {
    errors.push('sourceRef: stable upstream source reference is required');
  }
  if (!isValidConfidence(record.confidence)) {
    errors.push(`confidence: must be a finite number in [0, 1], got ${record.confidence}`);
  }
  if (record.contentHash !== undefined && !isValidContentHash(record.contentHash)) {
    errors.push('contentHash: must be a 64-char lowercase sha256 hex digest');
  }
  if (record.sourceKind === 'UPSTREAM_IMPORT') {
    if (!record.license || record.license.trim() === '') {
      errors.push('license: required for UPSTREAM_IMPORT sources');
    } else if (!isLicenseImportable(record.license)) {
      errors.push(`license: "${record.license}" is not importable (${classifyLicense(record.license)})`);
    }
  }
  return errors;
}

/** True when a provenance record passes every fail-closed gate. */
export function isValidProvenanceRecord(record: MovementProvenance): boolean {
  return validateProvenanceRecord(record).length === 0;
}