/**
 * syncService — uploads offline-completed workout exercises to Supabase.
 *
 * Flow
 * ----
 * The workout player logs every completed set via `queueCompletedExercise`.
 * The record is persisted to the IndexedDB outbox (`exerciseLogs` in
 * `src/lib/offline/db.ts`) with `synced = 0` — this makes it durable even if
 * the app is killed mid-workout. Whenever the device has connectivity
 * (navigator.onLine, the window `online` event, or a visibilitychange back to
 * the foreground) `syncPendingWorkoutData` drains the outbox and upserts rows
 * into the Supabase `workout_exercise_logs` table. Rows are keyed by `id`, so
 * retries after a network blip are idempotent.
 *
 * Failure handling is deterministic: every failure is classified by
 * `classifySyncError` as retryable (network/timeout, 5xx, 429, Postgres
 * connection/resource codes — retried on the next cycle) or permanent (4xx,
 * validation/constraint/auth codes — flagged `giveUp` so the row is never
 * retried again). `src/lib/offline/db.ts` additionally caps the number of
 * attempts per row (`MAX_SYNC_ATTEMPTS`), so the outbox can never spin
 * forever on a broken row.
 *
 * Integration with `src/services/userService.ts`
 * ---------------------------------------------
 * `userService.ts` is a server-only module (Prisma + request-scoped Supabase
 * client) and must never be imported from client code. This service keeps the
 * same identity contract instead:
 *
 *   - `getCurrentUserId()` resolves the authenticated user through the browser
 *     Supabase client — `supabase.auth.getUser()` → `user.id`.
 *   - That exact id is what `userService.syncUserWithSupabase()` persists as
 *     the Prisma `User.id`, and what this service writes as `user_id` on every
 *     synced row.
 *
 * So: offline → `userId` namespaces the IndexedDB outbox; online →
 * `user_id` lands in Supabase; server code (Route Handlers / Server Actions
 * backed by `userService` + Prisma) can join those rows back to the app user
 * with a plain `where: { id: user_id }` lookup.
 *
 * Usage (Client Component)
 * ------------------------
 *   import { queueCompletedExercise, startSyncMonitor } from '@/services/syncService';
 *
 *   useEffect(() => {
 *     const stop = startSyncMonitor({ onStatusChange: (s) => setSyncStatus(s) });
 *     return stop;
 *   }, []);
 *
 *   // ...in the engine's onSetComplete / onWorkoutComplete handlers:
 *   await queueCompletedExercise({
 *     sessionId, exerciseId, exerciseName,
 *     exerciseOrder, setNumber, actualReps, durationSeconds,
 *   });
 */

import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
  countPendingExerciseLogs,
  enqueueExerciseLog,
  generateId,
  getPendingExerciseLogs,
  markExerciseLogsFailed,
  markExerciseLogsSynced,
  type ExerciseLogRecord,
} from '@/lib/offline/db';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Supabase table the outbox is uploaded to (see supabase/migrations). */
const SYNC_TABLE = 'workout_exercise_logs';

/** Max rows uploaded in one request. */
const SYNC_BATCH_SIZE = 100;

/** How often the monitor retries while online (ms). */
const DEFAULT_RETRY_INTERVAL_MS = 60_000;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class SyncServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncServiceError';
  }
}

/** Whether a sync failure should be retried on the next cycle. */
export type SyncErrorKind = 'retryable' | 'permanent';

export interface SyncErrorClassification {
  kind: SyncErrorKind;
  /** `true` → keep the row queued for the next sync cycle. */
  retryable: boolean;
  /** Normalized error message (best effort). */
  message: string;
}

/** HTTP statuses worth retrying (timeouts, rate limits, 5xx). */
const RETRYABLE_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/** Message patterns that indicate a network/transport-level failure. */
const NETWORK_ERROR_PATTERN =
  /failed to fetch|networkerror|fetch failed|econnreset|econnrefused|econnaborted|etimedout|eai_again|timeout|aborted|interrupted|internet disconnected|offline/i;

/** Postgres/Supabase error codes that are safe to retry (connection, resources). */
const RETRYABLE_PG_CODE = /^08|^53/i;

/** Postgres/Supabase error codes that are permanent (data, constraint, auth, privilege, syntax). */
const PERMANENT_PG_CODE = /^(22|23|28|3d|42)/i;

/**
 * Deterministically classifies a sync failure as retryable or permanent.
 *
 * - Retryable: transport/network errors (browser `TypeError` from fetch,
 *   DNS/connection resets, timeouts/aborts), HTTP 408/425/429/5xx, Postgres
 *   connection (08*) and resource (53*) codes.
 * - Permanent: HTTP 4xx (except 408/425/429), Postgres data (22*), integrity
 *   (23*), auth (28*), catalog (3D*) and syntax/privilege (42*) codes.
 * - Unknown failures default to retryable — the outbox must never silently
 *   drop user workout data on an unclassified error.
 */
export function classifySyncError(err: unknown): SyncErrorClassification {
  const anyErr = err as { message?: unknown; status?: unknown; code?: unknown } | null;
  const message =
    typeof anyErr?.message === 'string'
      ? anyErr.message
      : err instanceof Error
        ? err.message
        : String(err);

  // Transport-level failures (browser fetch throws TypeError; Node fetch
  // throws TypeError/FetchError with these messages).
  if (err instanceof TypeError || NETWORK_ERROR_PATTERN.test(message)) {
    return { kind: 'retryable', retryable: true, message };
  }

  // HTTP status (Supabase REST / fetch Response status).
  const status = typeof anyErr?.status === 'number' ? anyErr.status : undefined;
  if (status != null) {
    if (RETRYABLE_HTTP_STATUS.has(status)) return { kind: 'retryable', retryable: true, message };
    if (status >= 400 && status < 500) return { kind: 'permanent', retryable: false, message };
    if (status >= 500) return { kind: 'retryable', retryable: true, message };
  }

  // Postgres/Supabase error codes (e.g. PostgrestError.code = '23505').
  const code = typeof anyErr?.code === 'string' ? anyErr.code : undefined;
  if (code) {
    if (RETRYABLE_PG_CODE.test(code)) return { kind: 'retryable', retryable: true, message };
    if (PERMANENT_PG_CODE.test(code)) return { kind: 'permanent', retryable: false, message };
  }

  return { kind: 'retryable', retryable: true, message };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Payload logged by the workout player when a set is completed. */
export interface CompletedExerciseInput {
  /** Local session id — groups all sets of one workout session. */
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  /** 0-based position of the exercise inside the workout. */
  exerciseOrder: number;
  /** 1-based set number within the exercise. */
  setNumber: number;
  /** Actual sets performed (defaults to 1). */
  actualSets?: number | null;
  /** Actual reps performed (optional). */
  actualReps?: number | null;
  /** Seconds spent on the set (0 when not tracked). */
  durationSeconds?: number | null;
  /** Epoch ms the set was completed (defaults to now). */
  completedAt?: number;
  /** Explicit user id (skips an auth round-trip when already known). */
  userId?: string;
}

export interface SyncResult {
  attempted: number;
  synced: number;
  failed: number;
  errors: string[];
}

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
}

export interface SyncMonitorOptions {
  /** Called whenever the status changes (connectivity, sync results). */
  onStatusChange?: (status: SyncStatus) => void;
  /** Retry cadence while online, in ms (default 60s). */
  retryIntervalMs?: number;
}

// ---------------------------------------------------------------------------
// Module state (client singleton)
// ---------------------------------------------------------------------------

let syncing = false;
let lastSyncAt: number | null = null;
let lastError: string | null = null;

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? false : navigator.onLine !== false;
}

// ---------------------------------------------------------------------------
// Auth (client-side twin of userService.getSupabaseAuthUser)
// ---------------------------------------------------------------------------

/**
 * Resolves the current Supabase auth user id — the same id `userService.ts`
 * uses as the Prisma `User.id`. Throws {@link SyncServiceError} when the user
 * is not signed in.
 */
export async function getCurrentUserId(): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new SyncServiceError(error?.message ?? 'Authentication required to sync workout data.');
  }
  return data.user.id;
}

// ---------------------------------------------------------------------------
// Outbox API
// ---------------------------------------------------------------------------

/**
 * Queues a completed exercise set in the IndexedDB outbox and, when the
 * device is online, kicks off an immediate upload. Never throws on network
 * failures — the record stays queued for the next sync cycle.
 *
 * @returns the durable outbox record (already persisted locally).
 */
export async function queueCompletedExercise(input: CompletedExerciseInput): Promise<ExerciseLogRecord> {
  const userId = input.userId ?? (await getCurrentUserId());

  const record: ExerciseLogRecord = {
    id: generateId(),
    userId,
    sessionId: input.sessionId,
    exerciseId: input.exerciseId,
    exerciseName: input.exerciseName,
    exerciseOrder: input.exerciseOrder,
    setNumber: input.setNumber,
    actualSets: input.actualSets ?? 1,
    actualReps: input.actualReps ?? null,
    durationSeconds: input.durationSeconds ?? 0,
    completedAt: input.completedAt ?? Date.now(),
    synced: 0,
    syncAttempts: 0,
    lastSyncError: null,
    syncedAt: null,
  };

  await enqueueExerciseLog(record);

  // Best-effort immediate flush — failures are swallowed; the monitor and
  // the next queue call retry.
  if (isOnline()) {
    void syncPendingWorkoutData(userId).catch(() => {});
  }

  return record;
}

// ---------------------------------------------------------------------------
// Sync engine
// ---------------------------------------------------------------------------

/**
 * Maps an outbox record to the Supabase row shape (snake_case columns).
 *
 * The mapping is deterministic and always carries `id` — the idempotency
 * key for the `upsert(..., { onConflict: 'id' })` used by
 * `syncPendingWorkoutData`, so retrying a row whose server-side insert
 * already succeeded never duplicates data.
 */
export function toSupabaseRow(row: ExerciseLogRecord): Record<string, unknown> {
  return {
    id: row.id,
    user_id: row.userId,
    session_id: row.sessionId,
    exercise_id: row.exerciseId,
    exercise_name: row.exerciseName,
    exercise_order: row.exerciseOrder,
    set_number: row.setNumber,
    actual_sets: row.actualSets,
    actual_reps: row.actualReps,
    duration_seconds: row.durationSeconds,
    completed_at: new Date(row.completedAt).toISOString(),
  };
}

/**
 * Uploads all pending outbox rows to Supabase. Idempotent — rows upsert on
 * `id`, so re-syncing after a partial failure never duplicates data.
 *
 * Failures are classified via {@link classifySyncError}: transient failures
 * leave the rows queued for the next cycle; permanent rejections flag the
 * rows as `giveUp` so the outbox stops retrying them (see
 * `src/lib/offline/db.ts`).
 *
 * @param userId optional override — resolves the current user when omitted.
 */
export async function syncPendingWorkoutData(userId?: string): Promise<SyncResult> {
  const offline = { attempted: 0, synced: 0, failed: 0, errors: [] as string[] };

  if (!isOnline()) return offline;
  if (syncing) return offline;

  const ownerId = userId ?? (await getCurrentUserId());
  const pending = await getPendingExerciseLogs(ownerId, SYNC_BATCH_SIZE);
  if (pending.length === 0) return offline;

  syncing = true;
  try {
    const rows = pending.map(toSupabaseRow);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from(SYNC_TABLE).upsert(rows, { onConflict: 'id' });

    if (error) {
      const cls = classifySyncError(error);
      lastError = cls.message;
      // Permanent rejections (4xx / validation / auth) are flagged giveUp so
      // they are never retried; transient failures stay queued.
      await markExerciseLogsFailed(
        pending.map((row) => row.id),
        cls.message,
        { giveUp: !cls.retryable },
      );
      return { attempted: pending.length, synced: 0, failed: pending.length, errors: [cls.message] };
    }

    lastSyncAt = Date.now();
    lastError = null;
    await markExerciseLogsSynced(
      pending.map((row) => row.id),
      lastSyncAt,
    );
    return { attempted: pending.length, synced: pending.length, failed: 0, errors: [] };
  } catch (err) {
    const cls = classifySyncError(err);
    lastError = cls.message;
    await markExerciseLogsFailed(
      pending.map((row) => row.id),
      cls.message,
      { giveUp: !cls.retryable },
    );
    return { attempted: pending.length, synced: 0, failed: pending.length, errors: [cls.message] };
  } finally {
    syncing = false;
  }
}

// ---------------------------------------------------------------------------
// Connectivity monitor
// ---------------------------------------------------------------------------

/**
 * Starts the sync monitor: flushes the outbox when the browser comes online,
 * when the tab becomes visible again, and on a fixed retry cadence while
 * online. Returns a cleanup function for `useEffect`.
 */
export function startSyncMonitor(options: SyncMonitorOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}; // SSR — nothing to monitor.
  }

  const { onStatusChange, retryIntervalMs = DEFAULT_RETRY_INTERVAL_MS } = options;
  let stopped = false;

  const notify = async (): Promise<void> => {
    if (stopped || !onStatusChange) return;
    try {
      onStatusChange(await getSyncStatus());
    } catch {
      // Status reporting is best-effort.
    }
  };

  const flush = async (): Promise<void> => {
    if (stopped || !isOnline()) return;
    try {
      await syncPendingWorkoutData();
    } catch {
      // Retried by the interval / next connectivity event.
    }
    await notify();
  };

  const handleOnline = (): void => {
    void flush();
  };

  const handleVisibility = (): void => {
    if (document.visibilityState === 'visible') void flush();
  };

  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibility);
  const intervalId = window.setInterval(() => {
    void flush();
  }, retryIntervalMs);

  // Report the initial status so the UI can render the badge immediately.
  void notify();

  return () => {
    stopped = true;
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibility);
    window.clearInterval(intervalId);
  };
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/** Snapshot of connectivity + outbox state, for badges / banners in the UI. */
export async function getSyncStatus(): Promise<SyncStatus> {
  let pendingCount = 0;
  try {
    pendingCount = await countPendingExerciseLogs();
  } catch {
    // Not in a browser context yet.
  }
  return {
    online: isOnline(),
    syncing,
    pendingCount,
    lastSyncAt,
    lastError,
  };
}
