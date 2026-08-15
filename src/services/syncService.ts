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

/** Maps an outbox record to the Supabase row shape (snake_case columns). */
function toSupabaseRow(row: ExerciseLogRecord): Record<string, unknown> {
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
      lastError = error.message;
      await markExerciseLogsFailed(
        pending.map((row) => row.id),
        error.message,
      );
      return { attempted: pending.length, synced: 0, failed: pending.length, errors: [error.message] };
    }

    lastSyncAt = Date.now();
    lastError = null;
    await markExerciseLogsSynced(
      pending.map((row) => row.id),
      lastSyncAt,
    );
    return { attempted: pending.length, synced: pending.length, failed: 0, errors: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    lastError = message;
    await markExerciseLogsFailed(
      pending.map((row) => row.id),
      message,
    );
    return { attempted: pending.length, synced: 0, failed: pending.length, errors: [message] };
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
