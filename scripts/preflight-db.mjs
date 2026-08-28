#!/usr/bin/env node
/**
 * preflight-db.mjs — DB volume writability preflight for the runner image.
 *
 * WHY (AUTH-FIX-01 root cause, 2026-08-28):
 *   Production ran the app container as `nextjs` (uid 100) against a SQLite
 *   volume owned by root:root (app.db 0644, /data 0755). Every DB write then
 *   failed with SQLite `attempt to write a readonly database`:
 *     - real OTP requests failed at the PhoneOtp ledger write (503
 *       `provider_error` → real users could not log in);
 *     - post-login user sync failed at the User create (500 on
 *       /api/program/current, broken /en/history RSC);
 *   while reads still worked and HTTP/browser smoke stayed green — the app
 *   silently ran read-only for hours.
 *
 * This preflight runs in the runner image BEFORE `node server.js` and exits
 * non-zero with an actionable message when the SQLite volume is not writable,
 * so a misdeployed volume fails at boot instead of serving a broken app.
 *
 * Semantics:
 *   - `DATABASE_URL=file:/data/app.db` (or any `file:` URL): the resolved
 *     path must be writable. When the DB file already exists it must be
 *     writable; SQLite also needs a writable parent directory for journal /
 *     WAL sidecar files, so a create/delete probe file is attempted too.
 *   - `DATABASE_URL` that is NOT a `file:` URL (e.g. a future Postgres
 *     provider): skipped — nothing to check locally.
 *
 * Dependency-free (node:fs / node:path only) so it ships with the standalone
 * runner without an extra build step.
 */
import {accessSync, constants, existsSync, openSync, closeSync, unlinkSync} from 'node:fs';
import {dirname, isAbsolute, join} from 'node:path';

/** Strip the `file:` prefix from a DATABASE_URL, or null when not file-based. */
export function resolveDbFilePath(databaseUrl = process.env.DATABASE_URL ?? '') {
  if (typeof databaseUrl !== 'string') return null;
  const trimmed = databaseUrl.trim();
  if (!trimmed.startsWith('file:')) return null;
  const path = trimmed.slice('file:'.length);
  return path || null;
}

/** True when the DB file (or its parent dir for a missing file) is writable. */
export function isDbVolumeWritable(dbPath) {
  const dir = dirname(dbPath);
  if (!isAbsolute(dbPath)) {
    // Relative `file:./dev.db` — resolve against cwd like Prisma does.
    return isDirWritable(dir);
  }
  if (existsSync(dbPath)) {
    try {
      accessSync(dbPath, constants.R_OK | constants.W_OK);
    } catch {
      return false;
    }
    return isDirWritable(dir); // journal/WAL sidecars land in the same dir
  }
  return isDirWritable(dir);
}

/** Probe-write a temporary file in `dir`; true when create+delete succeeds. */
export function isDirWritable(dir) {
  const probe = join(dir, `.apex-write-probe-${process.pid}-${Date.now()}`);
  try {
    const fd = openSync(probe, 'wx');
    closeSync(fd);
    unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

/** Full check: returns { ok, message? } — message only when unusable. */
export function checkDbWritable(databaseUrl = process.env.DATABASE_URL) {
  const dbPath = resolveDbFilePath(databaseUrl);
  if (dbPath === null) {
    return {ok: true}; // non-file provider — nothing to preflight locally
  }
  if (isDbVolumeWritable(dbPath)) {
    return {ok: true};
  }
  const uid = typeof process.getuid === 'function' ? process.getuid() : '?';
  return {
    ok: false,
    message:
      `SQLite DB volume is NOT writable by user ${uid}: "${dbPath}". ` +
      'Every DB write (OTP ledger, user sync, program save) fails with ' +
      '"attempt to write a readonly database". Fix on the host: ' +
      'chown -R 100:101 <volume-mount>  (the compose migrate service does ' +
      'this automatically: chown -R 100:101 /data).',
  };
}

// CLI entry — runs when executed directly (Docker CMD wrapper).
const isDirectRun =
  typeof process.argv[1] === 'string' &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href.replace(/\/\//, 'file:///');
if (isDirectRun) {
  const result = checkDbWritable();
  if (result.ok) {
    console.log('[preflight] DB volume writable:', resolveDbFilePath() ?? 'non-file provider');
  } else {
    console.error('[preflight] FAILED:', result.message);
    process.exit(1);
  }
}
