/**
 * Snapshot format versioning (S-05) — pure contract, no side effects.
 *
 * `WorkoutStateRecord.snapshotVersion` is the FORMAT version of a persisted
 * workout snapshot (additive evolution only). It is DISTINCT from the
 * per-record `version` write counter (maintained by the db layer as the LWW
 * tie-breaker — see `conflictPolicy.ts`); the two must never be conflated.
 *
 * Version semantics:
 *   - 0 (legacy rows without the field): the pre-S-05 shape — same fields as
 *     v1 minus `snapshotVersion`; hydrates through the current path.
 *   - 1 (SNAPSHOT_VERSION): current shape.
 *   - > SNAPSHOT_VERSION (unknown-newer): written by a NEWER client. The
 *     contract is ADDITIVE-READ + NEVER-DESTRUCTIVELY-REWRITE: this client
 *     may still read the fields it understands, but it MUST NOT overwrite
 *     the record (an older client downgrading a newer snapshot would
 *     silently drop fields the newer client relies on).
 *
 * All functions are pure and framework-agnostic — unit-testable in Node
 * without React, IndexedDB or a DOM.
 */

import type {WorkoutStateRecord} from './db';

/** Current snapshot FORMAT version. Bump ONLY on additive format changes. */
export const SNAPSHOT_VERSION = 1;

/**
 * Human-readable summary of the versioning contract. Not consulted by the
 * functions; exists so tests and future code can assert the contract.
 */
export const SNAPSHOT_VERSIONING_CONTRACT = {
  /** Additive field evolution only; never a destructive migration. */
  evolution: 'additive',
  /** Unknown-newer snapshots are readable for known fields. */
  unknownNewerRead: 'additiveRead',
  /** Unknown-newer snapshots are never overwritten by an older client. */
  unknownNewerWrite: 'refuseOverwrite',
  /** Legacy rows without the field read as version 0. */
  legacyDefault: 0,
} as const;

/** Format version of a record; legacy rows without the field read as 0. */
export function snapshotVersionOf(record: {snapshotVersion?: number}): number {
  return record.snapshotVersion ?? 0;
}

/** True when the record was written by a newer client than this one. */
export function isUnknownNewerSnapshot(record: {snapshotVersion?: number}): boolean {
  return snapshotVersionOf(record) > SNAPSHOT_VERSION;
}

/** True when this client may overwrite the record (never downgrade). */
export function canOverwriteSnapshot(record: {snapshotVersion?: number}): boolean {
  return !isUnknownNewerSnapshot(record);
}

/** Type guard narrowing a record to one whose format this client owns. */
export function isKnownSnapshotVersion(record: {
  snapshotVersion?: number;
}): record is WorkoutStateRecord {
  return snapshotVersionOf(record) <= SNAPSHOT_VERSION;
}
