/**
 * Idempotency contract for `POST /api/generate-program`.
 *
 * Client contract: an optional `Idempotency-Key` request header. When present
 * it must match `IDEMPOTENCY_KEY_PATTERN` (8–64 chars of `[A-Za-z0-9_-]`); the
 * server then guarantees that retries — and concurrent duplicates — of the
 * same key + body never persist a second program:
 *   - the first request runs and records the outcome,
 *   - a retry after success replays the exact 200 response body,
 *   - a concurrent duplicate gets a predictable 409 while work is in flight,
 *   - reusing a key with a different body is rejected as a conflict,
 *   - a failed attempt can be retried with the same key (fresh attempt).
 *
 * All helpers here are pure (no I/O, no secrets) so the contract is fully
 * unit-testable without a database.
 */
import {createHash} from 'node:crypto';

/** Canonical request-header name. Lookups are case-insensitive in fetch. */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

export const IDEMPOTENCY_KEY_MIN_LENGTH = 8;
export const IDEMPOTENCY_KEY_MAX_LENGTH = 64;

/** Allowed charset: URL-safe alphanumerics plus `-` / `_`. */
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/** Stable machine-readable codes returned to clients (see docs/AI_API.md). */
export const IDEMPOTENCY_CODES = {
  INVALID_KEY: 'INVALID_IDEMPOTENCY_KEY',
  IN_PROGRESS: 'IDEMPOTENCY_IN_PROGRESS',
  CONFLICT: 'IDEMPOTENCY_CONFLICT',
} as const;

export type IdempotencyCode = (typeof IDEMPOTENCY_CODES)[keyof typeof IDEMPOTENCY_CODES];

/** Whether `key` satisfies the client contract for an Idempotency-Key header. */
export function isValidIdempotencyKey(key: string | null | undefined): boolean {
  return typeof key === 'string' && IDEMPOTENCY_KEY_PATTERN.test(key);
}

/** Stable, data-free 400 error message for an invalid header value. */
export function idempotencyKeyErrorMessage(): string {
  return `Invalid ${IDEMPOTENCY_KEY_HEADER} header. Use ${IDEMPOTENCY_KEY_MIN_LENGTH}-${IDEMPOTENCY_KEY_MAX_LENGTH} characters of [A-Za-z0-9_-].`;
}

/**
 * Canonical, key-order-independent JSON serialization: object keys are sorted
 * recursively so two payloads with identical content hash identically no
 * matter how the client ordered the fields.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
  return `{${entries.join(',')}}`;
}

/**
 * Deterministic fingerprint of a validated request body. Equal inputs (in any
 * key order) hash equal; different inputs hash differently. Built on
 * `node:crypto` SHA-256 — no secrets involved.
 */
export function requestHashOf(body: unknown): string {
  return createHash('sha256').update(canonicalJson(body)).digest('hex');
}
