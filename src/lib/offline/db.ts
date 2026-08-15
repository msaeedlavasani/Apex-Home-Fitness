/**
 * Offline caching layer for workout data — IndexedDB via Dexie.
 *
 * Stores three things per authenticated user:
 *
 *   1. `activePrograms` — the user's active program (the payload fetched from
 *      the server / `POST /api/generate-program`), cached so workouts can be
 *      started and run without a connection.
 *   2. `workoutStates`   — "today's workout" snapshots (phase, current
 *      exercise/set, elapsed time, per-exercise completion). Persisted on
 *      every meaningful engine transition so a page refresh or a lost
 *      connection never loses progress.
 *   3. `exerciseLogs`    — a durable outbox of completed exercise sets waiting
 *      to be uploaded to Supabase. `syncService.ts` drains this queue the
 *      moment the device is back online.
 *
 * Identity contract (integration with `src/services/userService.ts`):
 * every record is namespaced by `userId`, which is the Supabase auth user id
 * (`supabase.auth.getUser()` → `user.id`). `userService.ts` persists the
 * Prisma `User` with that exact id (see `syncUserWithSupabase`), so offline
 * rows and server-side rows trace back to the same user. Because keys embed
 * the user id, multiple accounts on one device never collide and records
 * survive a sign-out / sign-in cycle.
 *
 * All functions are browser-only. They are safe to import from Client
 * Components and other client services; calling them during SSR throws a
 * clear error instead of silently failing.
 */

import Dexie, { type EntityTable } from 'dexie';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Exercise as stored inside an offline workout snapshot. Mirrors the
 * `WorkoutExercise` shape consumed by `useWorkoutEngine` (see
 * `src/components/workout/useWorkoutEngine.ts`), extended with completion
 * tracking so "today's workout" can be resumed exactly where it stopped.
 */
export interface OfflineExercise {
  id: string;
  /** Display name (localized by the caller, or a translation key). */
  name: string;
  /** Number of working sets for this exercise. */
  sets: number;
  /** Target repetitions per set (informational). */
  reps?: number | null;
  /** Working time per set in seconds (null = open-ended set). */
  durationSeconds?: number | null;
  /** Rest time after each set in seconds (null = no rest). */
  restSeconds?: number | null;
  /** Whether every set of this exercise has been completed. */
  completed: boolean;
  /** Actual sets performed so far (filled while logging). */
  actualSets?: number | null;
  /** Actual reps performed so far (filled while logging). */
  actualReps?: number | null;
}

/**
 * The user's active program, cached for offline sessions. `program` carries
 * the full program payload (Prisma `Program` shape or the AI-generated JSON
 * from `POST /api/generate-program`) — the app casts it to its own type on
 * read.
 */
export interface ActiveProgramRecord {
  /** Primary key — the Supabase auth user id (same id Prisma `User.id` uses). */
  userId: string;
  program: unknown;
  savedAt: number;
}

/** Mirrors the phase union of `useWorkoutEngine`. */
export type WorkoutPhaseKey = 'READY' | 'EXERCISING' | 'RESTING' | 'COMPLETED';

/**
 * "Today's workout" snapshot. One row per `userId + local date`, so re-opening
 * the app on the same day resumes the exact state of the session.
 */
export interface WorkoutStateRecord {
  /** Composite primary key: `${userId}:${dateKey}`. */
  workoutKey: string;
  userId: string;
  /** Local calendar day, `YYYY-MM-DD`. */
  dateKey: string;
  /** The program this session belongs to, if any. */
  programId: string | null;
  exercises: OfflineExercise[];
  phase: WorkoutPhaseKey;
  currentExerciseIndex: number;
  currentSet: number;
  completedSets: number;
  totalSets: number;
  /** Seconds spent in the current phase at the last write — restores a mid-countdown phase exactly. */
  phaseElapsedSeconds: number;
  /** Total active workout time in seconds at the last write. */
  totalElapsedSeconds: number;
  /** Whether the phase timer was counting at the last write (pause/resume history). */
  isRunning: boolean;
  /** Epoch ms when the workout was started (null until `start()`). */
  startedAt: number | null;
  /** Epoch ms when the workout was completed (null until finished). */
  completedAt: number | null;
  isComplete: boolean;
  /** Epoch ms of the last write. */
  updatedAt: number;
}

/**
 * A single completed exercise set queued for upload to Supabase (the sync
 * outbox). `synced` flips to `1` only after the row was accepted by
 * Supabase — until then it is retried by `syncService.ts`.
 */
export interface ExerciseLogRecord {
  id: string;
  userId: string;
  /** Local session id — groups all logs of one workout session. */
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  /** 0-based position of the exercise inside the workout. */
  exerciseOrder: number;
  /** 1-based set number within the exercise. */
  setNumber: number;
  actualSets: number;
  actualReps: number | null;
  /** Seconds spent on this set (0 when not tracked). */
  durationSeconds: number;
  /** Epoch ms when the set was completed. */
  completedAt: number;
  /** 0 = pending upload, 1 = confirmed by Supabase. */
  synced: 0 | 1;
  syncAttempts: number;
  lastSyncError: string | null;
  /** Epoch ms when Supabase confirmed the upload. */
  syncedAt: number | null;
}

// ---------------------------------------------------------------------------
// Database definition
// ---------------------------------------------------------------------------

const DATABASE_NAME = 'apex-home-fitness';
// v2: `WorkoutStateRecord` gained `phaseElapsedSeconds` and `isRunning`
// (per-phase countdown position + pause/resume history). The schema is
// otherwise unchanged, so existing stores/records are preserved as-is;
// records written before v2 simply lack the new fields, which restore to 0 /
// paused (see `hydrateFromRecord` in `workoutPersistence.ts`).
const DATABASE_VERSION = 2;

const offlineDb = new Dexie(DATABASE_NAME) as Dexie & {
  activePrograms: EntityTable<ActiveProgramRecord, 'userId'>;
  workoutStates: EntityTable<WorkoutStateRecord, 'workoutKey'>;
  exerciseLogs: EntityTable<ExerciseLogRecord, 'id'>;
};

offlineDb.version(DATABASE_VERSION).stores({
  activePrograms: 'userId, savedAt',
  workoutStates: 'workoutKey, userId, dateKey, updatedAt',
  exerciseLogs: 'id, userId, sessionId, exerciseId, synced, completedAt, syncAttempts',
});

export { offlineDb };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fails fast with a clear message when called outside the browser. */
function assertBrowserContext(): void {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    throw new Error(
      '[offline-db] IndexedDB is only available in the browser. ' +
        'Do not call offline caching functions during server-side rendering.',
    );
  }
}

/**
 * Local calendar day as `YYYY-MM-DD` (the key used for "today's workout").
 * Uses local time on purpose — a workout belongs to the day the user did it.
 */
export function dateKeyFor(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Composite key used for a user's workout snapshot on a given date. */
export function workoutKeyFor(userId: string, dateKey: string): string {
  return `${userId}:${dateKey}`;
}

/** Client-generated id (uuid when available, deterministic-ish fallback). */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Active program cache
// ---------------------------------------------------------------------------

/** Caches the user's active program for offline use (upsert). */
export async function saveActiveProgram(userId: string, program: unknown): Promise<void> {
  assertBrowserContext();
  await offlineDb.activePrograms.put({ userId, program, savedAt: Date.now() });
}

/** Returns the user's cached active program, or `undefined` when absent. */
export async function getActiveProgram(userId: string): Promise<ActiveProgramRecord | undefined> {
  assertBrowserContext();
  return offlineDb.activePrograms.get(userId);
}

/** Removes the cached active program (e.g. when the user switches program). */
export async function clearActiveProgram(userId: string): Promise<void> {
  assertBrowserContext();
  await offlineDb.activePrograms.delete(userId);
}

// ---------------------------------------------------------------------------
// Today's workout state
// ---------------------------------------------------------------------------

/** Persists a workout snapshot for `userId` + `dateKey` (upsert). */
export async function saveWorkoutState(
  userId: string,
  dateKey: string,
  state: Omit<WorkoutStateRecord, 'workoutKey' | 'userId' | 'dateKey' | 'updatedAt'>,
): Promise<WorkoutStateRecord> {
  assertBrowserContext();
  const record: WorkoutStateRecord = {
    ...state,
    workoutKey: workoutKeyFor(userId, dateKey),
    userId,
    dateKey,
    updatedAt: Date.now(),
  };
  await offlineDb.workoutStates.put(record);
  return record;
}

/** Loads a workout snapshot for `userId` + `dateKey`. */
export async function getWorkoutState(
  userId: string,
  dateKey: string,
): Promise<WorkoutStateRecord | undefined> {
  assertBrowserContext();
  return offlineDb.workoutStates.get(workoutKeyFor(userId, dateKey));
}

/** Convenience: today's snapshot for the user. */
export async function getTodayWorkoutState(
  userId: string,
): Promise<WorkoutStateRecord | undefined> {
  return getWorkoutState(userId, dateKeyFor());
}

/** Convenience: persist today's snapshot (upsert). */
export async function saveTodayWorkoutState(
  userId: string,
  state: Omit<WorkoutStateRecord, 'workoutKey' | 'userId' | 'dateKey' | 'updatedAt'>,
): Promise<WorkoutStateRecord> {
  return saveWorkoutState(userId, dateKeyFor(), state);
}

/**
 * Applies a partial patch to a saved workout snapshot and returns the
 * refreshed record. Used by the workout player to persist incremental
 * progress (phase changes, completed sets, elapsed time).
 */
export async function updateWorkoutState(
  userId: string,
  dateKey: string,
  patch: Partial<Omit<WorkoutStateRecord, 'workoutKey' | 'userId' | 'dateKey'>>,
): Promise<WorkoutStateRecord | undefined> {
  assertBrowserContext();
  const key = workoutKeyFor(userId, dateKey);
  const current = await offlineDb.workoutStates.get(key);
  if (!current) return undefined;
  const updated: WorkoutStateRecord = { ...current, ...patch, updatedAt: Date.now() };
  await offlineDb.workoutStates.put(updated);
  return updated;
}

/** Clears a workout snapshot (e.g. after a completed workout was synced). */
export async function clearWorkoutState(userId: string, dateKey: string): Promise<void> {
  assertBrowserContext();
  await offlineDb.workoutStates.delete(workoutKeyFor(userId, dateKey));
}

// ---------------------------------------------------------------------------
// Sync outbox — completed exercise sets awaiting upload to Supabase
// ---------------------------------------------------------------------------

/** Adds a completed set to the sync outbox (not yet uploaded). */
export async function enqueueExerciseLog(log: ExerciseLogRecord): Promise<void> {
  assertBrowserContext();
  await offlineDb.exerciseLogs.put(log);
}

/** Returns pending (unsynced) logs for a user, oldest first, capped at `limit`. */
export async function getPendingExerciseLogs(
  userId: string,
  limit = 100,
): Promise<ExerciseLogRecord[]> {
  assertBrowserContext();
  const rows = await offlineDb.exerciseLogs
    .where('synced')
    .equals(0)
    .and((row) => row.userId === userId)
    .limit(limit)
    .toArray();
  return rows.sort((a, b) => a.completedAt - b.completedAt);
}

/** Number of logs still waiting to be uploaded (all users). */
export async function countPendingExerciseLogs(): Promise<number> {
  assertBrowserContext();
  return offlineDb.exerciseLogs.where('synced').equals(0).count();
}

/** Marks logs as confirmed by Supabase. */
export async function markExerciseLogsSynced(ids: string[], syncedAt: number): Promise<void> {
  assertBrowserContext();
  await offlineDb.transaction('rw', offlineDb.exerciseLogs, async () => {
    for (const id of ids) {
      const row = await offlineDb.exerciseLogs.get(id);
      if (!row) continue;
      await offlineDb.exerciseLogs.put({
        ...row,
        synced: 1,
        syncedAt,
        lastSyncError: null,
      });
    }
  });
}

/**
 * Records a failed upload attempt: bumps `syncAttempts`, stores the error and
 * keeps `synced = 0` so the row is retried on the next sync cycle.
 */
export async function markExerciseLogsFailed(ids: string[], error: string): Promise<void> {
  assertBrowserContext();
  await offlineDb.transaction('rw', offlineDb.exerciseLogs, async () => {
    for (const id of ids) {
      const row = await offlineDb.exerciseLogs.get(id);
      if (!row) continue;
      await offlineDb.exerciseLogs.put({
        ...row,
        synced: 0,
        syncAttempts: row.syncAttempts + 1,
        lastSyncError: error.slice(0, 500),
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Account-level cleanup
// ---------------------------------------------------------------------------

/**
 * Removes every offline record belonging to a user. Intended for account
 * deletion / "clear my data" flows. Normal sign-out should NOT call this —
 * keeping the data lets the user re-authenticate and sync what was queued.
 */
export async function clearUserData(userId: string): Promise<void> {
  assertBrowserContext();
  await offlineDb.transaction(
    'rw',
    offlineDb.activePrograms,
    offlineDb.workoutStates,
    offlineDb.exerciseLogs,
    async () => {
      await offlineDb.activePrograms.delete(userId);
      await offlineDb.workoutStates.where('userId').equals(userId).delete();
      await offlineDb.exerciseLogs.where('userId').equals(userId).delete();
    },
  );
}

export default offlineDb;
