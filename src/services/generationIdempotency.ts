/**
 * Prisma-backed idempotency ledger for `POST /api/generate-program`.
 *
 * Model: `ProgramGenerationRequest` — one row per (userId, Idempotency-Key).
 *
 * State machine:
 *   - `beginIdempotentGeneration` claims the key (creates an IN_PROGRESS row)
 *     or classifies the retry:
 *       · SUCCEEDED            → `replay` (exact cached 200 response),
 *       · fresh IN_PROGRESS    → `in_progress` (predictable 409),
 *       · same key, other body → `conflict` (409, client error),
 *       · FAILED / stale       → atomic reclaim → `claimed` (fresh attempt).
 *   - Persistence finalizes the row to SUCCEEDED in the SAME transaction that
 *     creates the Program (`persistProgramForUserWithIdempotency` in
 *     `src/services/programService.ts`), so a persisted program and a
 *     replayable record can never diverge.
 *   - `markIdempotentGenerationFailed` flips a claimed IN_PROGRESS row to
 *     FAILED so retries re-execute instead of hanging on 409 forever.
 *
 * Concurrency is delegated to the database: the `@@unique([userId,
 * idempotencyKey])` constraint makes duplicate creation impossible, and the
 * claim `updateMany` is atomic — exactly one request owns a key.
 *
 * All functions accept an explicit Prisma client for tests; they default to
 * the shared singleton for the API route. No secrets are stored or read.
 */
import {GenerationRequestStatus, Prisma, PrismaClient} from '@prisma/client';

import {requestHashOf} from '../lib/ai/idempotency';
import {prisma} from '../lib/prisma';

/** Minimal client surface the ledger needs (works with both PrismaClient and
 * `Prisma.TransactionClient`-style delegates). */
export type GenerationRequestStore = Pick<PrismaClient, 'programGenerationRequest'>;

/** How long a SUCCEEDED record stays replayable before lazy cleanup drops it. */
export const IDEMPOTENCY_RECORD_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * How long an IN_PROGRESS row may live before it is considered stale and
 * reclaimable. The AI budget is 45 s and persistence is bounded below 10 s
 * (see `src/lib/timeout.ts`), so 2 minutes is a generous upper bound for a
 * live request — a longer-lived IN_PROGRESS row means the holder crashed.
 */
export const IN_PROGRESS_STALE_MS = 120_000;

export type IdempotencyOutcome =
  | {kind: 'claimed'; record: {id: string}}
  | {kind: 'replay'; responsePayload: Prisma.JsonValue}
  | {kind: 'in_progress'}
  | {kind: 'conflict'};

export interface BeginIdempotentOptions {
  /** Override the DB client (tests). Defaults to the shared singleton. */
  client?: GenerationRequestStore;
  /** Clock override (tests). Defaults to `Date.now()`. */
  now?: number;
  /** Retention override (tests). Defaults to `IDEMPOTENCY_RECORD_TTL_MS`. */
  recordTtlMs?: number;
  /** Staleness override (tests). Defaults to `IN_PROGRESS_STALE_MS`. */
  staleMs?: number;
}

/**
 * Claims `idempotencyKey` for `userId` — or classifies the retry. Returns the
 * outcome (see the state machine above). The returned record id must be passed
 * to `persistProgramForUserWithIdempotency` on success (which finalizes it) or
 * to `markIdempotentGenerationFailed` on any failure.
 */
export async function beginIdempotentGeneration(
  userId: string,
  idempotencyKey: string,
  requestBody: unknown,
  options: BeginIdempotentOptions = {},
): Promise<IdempotencyOutcome> {
  const client = options.client ?? prisma;
  const now = options.now ?? Date.now();
  const requestHash = requestHashOf(requestBody);
  const staleBefore = new Date(now - (options.staleMs ?? IN_PROGRESS_STALE_MS));

  // Lazy retention: drop ledger rows that are long past replay-ability so the
  // table cannot grow without bound. Best-effort — never fail the request.
  await client.programGenerationRequest
    .deleteMany({
      where: {updatedAt: {lt: new Date(now - (options.recordTtlMs ?? IDEMPOTENCY_RECORD_TTL_MS))}},
    })
    .catch(() => {});

  const existing = await client.programGenerationRequest.findUnique({
    where: {userId_idempotencyKey: {userId, idempotencyKey}},
  });

  if (existing) {
    // The key is immutable once bound to a body — a different body is always a
    // client conflict, regardless of the record's status.
    if (existing.requestHash !== requestHash) return {kind: 'conflict'};

    if (existing.status === GenerationRequestStatus.SUCCEEDED) {
      return existing.responsePayload != null
        ? {kind: 'replay', responsePayload: existing.responsePayload}
        : {kind: 'in_progress'};
    }

    const isStaleInProgress =
      existing.status === GenerationRequestStatus.IN_PROGRESS && existing.updatedAt < staleBefore;
    const reclaimable = existing.status === GenerationRequestStatus.FAILED || isStaleInProgress;

    if (!reclaimable) {
      // Fresh IN_PROGRESS row — a live request owns this key right now.
      return {kind: 'in_progress'};
    }

    // Atomic claim: exactly one concurrent retry wins this `updateMany`; the
    // OR guard re-checks the row's status so a winner that already flipped the
    // row (or a fresh owner that appeared) is never double-claimed.
    const claim = await client.programGenerationRequest.updateMany({
      where: {
        id: existing.id,
        OR: [
          {status: GenerationRequestStatus.FAILED},
          {status: GenerationRequestStatus.IN_PROGRESS, updatedAt: {lt: staleBefore}},
        ],
      },
      data: {status: GenerationRequestStatus.IN_PROGRESS},
    });
    return claim.count === 1
      ? {kind: 'claimed', record: {id: existing.id}}
      : {kind: 'in_progress'};
  }

  try {
    const record = await client.programGenerationRequest.create({
      data: {
        userId,
        idempotencyKey,
        requestHash,
        status: GenerationRequestStatus.IN_PROGRESS,
      },
    });
    return {kind: 'claimed', record: {id: record.id}};
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      throw error;
    }
    // Lost the create race to a concurrent request with the same key. Re-read
    // once and classify — never loop.
    const winner = await client.programGenerationRequest.findUnique({
      where: {userId_idempotencyKey: {userId, idempotencyKey}},
    });
    if (!winner) return {kind: 'in_progress'};
    if (winner.requestHash !== requestHash) return {kind: 'conflict'};
    if (winner.status === GenerationRequestStatus.SUCCEEDED && winner.responsePayload != null) {
      return {kind: 'replay', responsePayload: winner.responsePayload};
    }
    return {kind: 'in_progress'};
  }
}

/**
 * Flips a claimed IN_PROGRESS row to FAILED so a retry with the same key
 * re-executes. Only IN_PROGRESS rows are flipped — a row that somehow already
 * reached SUCCEEDED keeps its replayable payload.
 */
export async function markIdempotentGenerationFailed(
  recordId: string,
  options: {client?: GenerationRequestStore} = {},
): Promise<void> {
  const client = options.client ?? prisma;
  await client.programGenerationRequest.updateMany({
    where: {id: recordId, status: GenerationRequestStatus.IN_PROGRESS},
    data: {status: GenerationRequestStatus.FAILED},
  });
}
