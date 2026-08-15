/**
 * Swappable rate-limit storage abstraction.
 *
 * `requestSecurity.ts` talks to this interface instead of process-local Maps,
 * so the same limits (IP / user / daily windows + per-user concurrency lock)
 * are enforced from a single shared store across multiple instances and
 * survive restarts.
 *
 * Implementations:
 * - `InMemoryRateLimitStore` — default local fallback. Keeps the previous
 *   per-process behavior (module-level Maps / Set) with zero configuration and
 *   no secrets. Fine for local development; NOT shared across instances.
 * - `RedisRestRateLimitStore` — production shared backend over an Upstash
 *   REST-compatible Redis API (atomic `INCR` + `EXPIRE ... NX`, `SET ... NX PX`
 *   locks, `EVAL` token-checked release). Enabled explicitly via
 *   `RATE_LIMIT_STORE=redis` with `REDIS_REST_URL` + `REDIS_REST_TOKEN` from
 *   the environment — never hard-coded, never committed.
 */
import {randomUUID} from 'node:crypto';

/** Result of an atomic fixed-window counter increment. */
export interface WindowCheckResult {
  /** True when the counter is still within `limit` after this increment. */
  allowed: boolean;
  /** Counter value after the increment (1-based). */
  count: number;
  /** Approximate absolute time (ms epoch) at which the window resets. */
  resetAt: number;
}

/**
 * Atomic operations required for multi-instance rate limiting.
 *
 * Every method must be safe to call concurrently from any number of app
 * instances. Implementations own the atomicity (a single-threaded in-memory
 * store, or atomic Redis commands) so callers never have to synchronize.
 */
export interface RateLimitStore {
  /**
   * Atomically increment a fixed-window counter for `key`.
   * Window = first increment + `windowMs` (set via EXPIRE-style expiry).
   */
  incrementWindow(key: string, windowMs: number, limit: number, now?: number): Promise<WindowCheckResult>;

  /**
   * Atomically acquire an exclusive lock for `key` (concurrency guard).
   * Returns a token that MUST be passed back to `releaseLock`. The lock
   * auto-expires after `ttlMs` even if the holder crashes.
   */
  acquireLock(key: string, ttlMs: number, now?: number): Promise<string | null>;

  /** Release a lock previously acquired with `token`. No-op for stale tokens. */
  releaseLock(key: string, token: string): Promise<void>;
}

/** Raised when the configured store cannot serve a request (e.g. Redis down). */
export class RateLimitStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitStoreError';
  }
}

interface CounterEntry {
  count: number;
  resetAt: number;
}

interface LockEntry {
  token: string;
  expiresAt: number;
}

/**
 * Single-process fallback store. Behaviorally identical to the pre-shared
 * storage implementation (lazily pruned fixed windows + exclusive set).
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, CounterEntry>();
  private readonly locks = new Map<string, LockEntry>();

  async incrementWindow(key: string, windowMs: number, limit: number, now = Date.now()): Promise<WindowCheckResult> {
    this.pruneExpired(now);
    const current = this.counters.get(key);
    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      this.counters.set(key, {count: 1, resetAt});
      return {allowed: true, count: 1, resetAt};
    }
    if (current.count >= limit) {
      return {allowed: false, count: current.count, resetAt: current.resetAt};
    }
    current.count += 1;
    return {allowed: true, count: current.count, resetAt: current.resetAt};
  }

  async acquireLock(key: string, ttlMs: number, now = Date.now()): Promise<string | null> {
    this.pruneExpiredLocks(now);
    const existing = this.locks.get(key);
    if (existing && existing.expiresAt > now) return null;
    const token = randomUUID();
    this.locks.set(key, {token, expiresAt: now + ttlMs});
    return token;
  }

  async releaseLock(key: string, token: string): Promise<void> {
    const current = this.locks.get(key);
    // Token check: a stale release (e.g. from a crashed/expired holder) must
    // never unlock a newer holder's lock.
    if (current?.token === token) this.locks.delete(key);
  }

  /** Test / teardown helper. */
  clear(): void {
    this.counters.clear();
    this.locks.clear();
  }

  private pruneExpired(now: number): void {
    this.counters.forEach((entry, key) => {
      if (entry.resetAt <= now) this.counters.delete(key);
    });
  }

  private pruneExpiredLocks(now: number): void {
    this.locks.forEach((entry, key) => {
      if (entry.expiresAt <= now) this.locks.delete(key);
    });
  }
}

/** Configuration for the Redis REST (Upstash-compatible) store. */
export interface RedisRestConfig {
  /** Base URL of the REST API, e.g. `https://xxxx.upstash.io`. */
  url: string;
  /** REST auth token (read from `REDIS_REST_TOKEN`) — never hard-coded. */
  token: string;
  /** Injectable fetch (tests). Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Per-request timeout so a slow/hung store fails fast instead of hanging. */
  timeoutMs?: number;
}

const RELEASE_LOCK_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

/**
 * Production shared store backed by an Upstash REST-compatible Redis API.
 *
 * Atomicity is delegated to the server:
 * - Windows: `INCR key` + `EXPIRE key <s> NX` (pipelined) — the first request
 *   starts the fixed window, later requests never extend it.
 * - Concurrency: `SET key token PX <ms> NX` — exactly one instance wins.
 * - Release: `EVAL` a Lua one-liner that deletes the key only when the token
 *   still matches, so an expired/stale holder cannot unlock a newer holder.
 *
 * Uses plain `fetch` — no extra dependency, no connection pool to manage.
 */
export class RedisRestRateLimitStore implements RateLimitStore {
  private readonly url: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(config: RedisRestConfig) {
    if (!config.url || !config.token) {
      throw new RateLimitStoreError('RedisRestRateLimitStore requires both url and token');
    }
    this.url = config.url.replace(/\/+$/, '');
    this.token = config.token;
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = config.timeoutMs ?? 2_000;
  }

  async incrementWindow(key: string, windowMs: number, limit: number, now = Date.now()): Promise<WindowCheckResult> {
    const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    const [rawCount] = await this.pipeline([
      ['INCR', key],
      ['EXPIRE', key, String(ttlSeconds), 'NX'],
    ]);
    const count = typeof rawCount === 'number' ? rawCount : Number.parseInt(String(rawCount), 10);
    if (!Number.isFinite(count)) {
      throw new RateLimitStoreError(`Unexpected INCR response for key "${key}"`);
    }
    return {allowed: count <= limit, count, resetAt: now + windowMs};
  }

  async acquireLock(key: string, ttlMs: number, _now = Date.now()): Promise<string | null> {
    const token = randomUUID();
    const [result] = await this.pipeline([
      ['SET', key, token, 'PX', String(Math.max(1, Math.round(ttlMs))), 'NX'],
    ]);
    return result === 'OK' ? token : null;
  }

  async releaseLock(key: string, token: string): Promise<void> {
    await this.pipeline([['EVAL', RELEASE_LOCK_SCRIPT, '1', key, token]]);
  }

  /** Runs a batched command pipeline; throws on HTTP or Redis errors. */
  private async pipeline(commands: string[][]): Promise<Array<string | number | null>> {
    const response = await this.fetchImpl(`${this.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
      cache: 'no-store',
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      throw new RateLimitStoreError(`Redis REST pipeline failed with HTTP ${response.status}`);
    }
    const results = (await response.json()) as Array<string | number | null | {error?: string}>;
    for (const result of results) {
      if (result && typeof result === 'object' && 'error' in result) {
        throw new RateLimitStoreError(`Redis command failed: ${String(result.error)}`);
      }
    }
    return results as Array<string | number | null>;
  }
}

/** Supported store kinds. `memory` is the default (no secrets required). */
export type RateLimitStoreKind = 'memory' | 'redis';

/** Subset of the environment consumed by {@link createRateLimitStore}. */
export interface RateLimitStoreEnv {
  RATE_LIMIT_STORE?: string;
  REDIS_REST_URL?: string;
  REDIS_REST_TOKEN?: string;
}

/**
 * Builds the store from explicit configuration. The production shared backend
 * is opt-in and explicit: without `RATE_LIMIT_STORE=redis` (+ credentials) the
 * local in-memory fallback is used, so local development needs no secrets.
 */
export function createRateLimitStore(env: RateLimitStoreEnv = process.env as RateLimitStoreEnv): RateLimitStore {
  const kind = (env.RATE_LIMIT_STORE ?? 'memory').trim().toLowerCase() as RateLimitStoreKind;
  if (kind === 'memory') return new InMemoryRateLimitStore();
  if (kind === 'redis') {
    const url = env.REDIS_REST_URL?.trim();
    const token = env.REDIS_REST_TOKEN?.trim();
    if (!url || !token) {
      throw new RateLimitStoreError(
        'RATE_LIMIT_STORE=redis requires REDIS_REST_URL and REDIS_REST_TOKEN (see .env.example)',
      );
    }
    return new RedisRestRateLimitStore({url, token});
  }
  throw new RateLimitStoreError(`Unknown RATE_LIMIT_STORE "${kind}" (expected "memory" or "redis")`);
}
