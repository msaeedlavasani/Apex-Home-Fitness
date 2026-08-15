/**
 * logger.ts — structured logging utility for client, server and edge.
 *
 * One API across every runtime of the app:
 *
 *   import { logger } from '@/lib/logger';
 *   logger.info('program.generated', { userId, programId, exercises: 12 });
 *   logger.error('ai.generate.failed', { error, mode });
 *
 * Behavior
 * --------
 * - Runtime-aware: `client` (browser), `edge` (Next.js middleware/edge
 *   functions) and `server` (Node.js route handlers / server components).
 * - Structured: every entry is a JSON object `{ ts, level, scope, runtime,
 *   msg, ...ctx }`. In development it is pretty-printed for humans; in
 *   production it is emitted as a single JSON line, ready for log
 *   aggregation (CloudWatch, Datadog, pino transports, ...).
 * - Redaction: values under sensitive keys (`password`, `token`, `secret`,
 *   `authorization`, `cookie`, `apiKey`, ...) are replaced with
 *   `[REDACTED]` — recursively, including nested objects and arrays.
 * - Error reporting: use `errorTracker.captureException(err)` from
 *   `@/lib/errorTracking` for crash-worthy errors (it logs through this
 *   logger too, so nothing is lost when Sentry is not configured).
 *
 * This module is isomorphic (no node-only or browser-only top-level API),
 * so it can be imported from Client Components, Server Components, Route
 * Handlers, middleware and instrumentation — always with the same surface.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type Runtime = 'client' | 'edge' | 'server';

/** Arbitrary structured fields attached to a log entry. */
export type LogContext = Record<string, unknown>;

export interface LoggerOptions {
  /** Minimum level that is actually emitted (default: 'debug'). */
  level?: LogLevel;
  /** Namespace shown in every entry, e.g. 'analytics' or 'workout.player'. */
  scope?: string;
  /**
   * Pretty-print instead of single-line JSON. Defaults to
   * `process.env.NODE_ENV !== 'production'`, i.e. pretty in dev/test.
   */
  pretty?: boolean;
}

export interface LogEntry {
  /** ISO-8601 timestamp of the entry. */
  ts: string;
  level: LogLevel;
  scope: string;
  runtime: Runtime;
  msg: string;
  ctx?: LogContext;
}

export interface Logger {
  readonly scope: string;
  debug: (msg: string, ctx?: LogContext) => void;
  info: (msg: string, ctx?: LogContext) => void;
  warn: (msg: string, ctx?: LogContext) => void;
  error: (msg: string, ctx?: LogContext) => void;
  /** Derive a namespaced child logger, e.g. `logger.child('analytics')`. */
  child: (scope: string) => Logger;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/** Keys whose values must never be written to logs. */
const SENSITIVE_KEY_RE =
  /(password|passwd|pwd|secret|token|authorization|auth|cookie|api[_-]?key|private[_-]?key|access[_-]?token|refresh[_-]?token|session[_-]?id)/i;

/** Truncate very long string values so a single entry stays small. */
const MAX_STRING_LENGTH = 2000;

function redactValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY_RE.test(key)) return '[REDACTED]';
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]`
      : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactValue(v, k);
    }
    return out;
  }
  return value;
}

function errorToPlain(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { value: error };
}

/** Flatten `ctx` so Error instances become serializable, then redact. */
function sanitizeContext(ctx: LogContext | undefined): LogContext | undefined {
  if (!ctx) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (v instanceof Error) {
      out[k] = errorToPlain(v);
    } else {
      out[k] = redactValue(v, k);
    }
  }
  return out;
}

/**
 * Resolve the runtime this module is executing in.
 * Order matters: `process` exists in browser bundles too (Next polyfills it).
 */
export function detectRuntime(): Runtime {
  if (typeof window !== 'undefined') return 'client';
  if (typeof process !== 'undefined' && process.env?.NEXT_RUNTIME === 'edge') {
    return 'edge';
  }
  return 'server';
}

function isDev(): boolean {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  return true;
}

function consoleFn(level: LogLevel): (...args: unknown[]) => void {
  switch (level) {
    case 'debug':
      return console.debug.bind(console);
    case 'info':
      return console.info.bind(console);
    case 'warn':
      return console.warn.bind(console);
    case 'error':
      return console.error.bind(console);
  }
}

/** Human-friendly, single-line formatting used in dev. */
function formatPretty(entry: LogEntry): string {
  const scope = entry.scope ? `[${entry.scope}]` : '';
  const ctx = entry.ctx ? ` ${JSON.stringify(entry.ctx)}` : '';
  return `${entry.ts} ${entry.level.toUpperCase().padEnd(5)} ${entry.runtime} ${scope} ${entry.msg}${ctx}`;
}

/** Compact single-line JSON used in production. */
function formatJson(entry: LogEntry): string {
  const base: LogEntry = {
    ts: entry.ts,
    level: entry.level,
    scope: entry.scope,
    runtime: entry.runtime,
    msg: entry.msg,
  };
  if (entry.ctx && Object.keys(entry.ctx).length > 0) {
    base.ctx = entry.ctx;
  }
  return JSON.stringify(base);
}

// ---------------------------------------------------------------------------
// Logger factory
// ---------------------------------------------------------------------------

export function createLogger(options: LoggerOptions = {}): Logger {
  const scope = options.scope ?? 'app';
  const minLevel = options.level ?? 'debug';
  const pretty = options.pretty ?? isDev();

  function write(level: LogLevel, msg: string, ctx?: LogContext): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      scope,
      runtime: detectRuntime(),
      msg,
      ctx: sanitizeContext(ctx),
    };

    const fn = consoleFn(level);
    try {
      if (pretty) {
        fn(formatPretty(entry));
      } else {
        fn(formatJson(entry));
      }
    } catch {
      // Logging must never throw and take the app down with it.
      fn(`[logger] failed to emit ${level} entry for "${msg}"`);
    }
  }

  return {
    scope,
    debug: (msg, ctx) => write('debug', msg, ctx),
    info: (msg, ctx) => write('info', msg, ctx),
    warn: (msg, ctx) => write('warn', msg, ctx),
    error: (msg, ctx) => write('error', msg, ctx),
    child: (childScope) => createLogger({ scope: childScope, level: minLevel, pretty }),
  };
}

/**
 * App-wide default logger. Derive scoped loggers with `logger.child(...)`
 * (e.g. `logger.child('workout')`) or create standalone ones with
 * `createLogger({ scope: 'analytics' })`.
 */
export const logger = createLogger();

/** Type helper for structured context objects. */
export type { LogContext as LoggerContext };
