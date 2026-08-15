/**
 * errorTracking.ts — Sentry placeholder / lightweight error tracking client.
 *
 * Goal: crash-worthy errors are captured on the client AND the server from
 * day one, without forcing a Sentry SDK install or a DSN on day one.
 *
 * Upgrade path (real Sentry)
 * --------------------------
 * 1. Install the SDK:            npm i @sentry/nextjs
 * 2. Set the DSN:
 *      - client / edge:          NEXT_PUBLIC_SENTRY_DSN=https://...@o1.ingest.sentry.io/...
 *      - server (Node):          SENTRY_DSN=https://...@o1.ingest.sentry.io/...
 *    (both can live in .env — see `.env.example`)
 * 3. Restart the app. When the SDK module is resolvable AND a DSN is set,
 *    this module delegates to the real Sentry SDK (`@sentry/browser` on the
 *    client, `@sentry/node` on the server). Otherwise it falls back to a
 *    console reporter so errors are never silently dropped.
 *
 * Why a "placeholder"?
 * --------------------
 * The SDK module name is resolved at runtime (a non-literal `import()`), so
 * the build never tries to bundle a package that may not be installed. When
 * the SDK is missing or no DSN is configured, captures are logged through
 * `@/lib/logger` with the same structured shape — giving teams working log
 * output in dev and a drop-in Sentry switch later.
 *
 * Usage
 * -----
 *   // Client components / page code:
 *   import { errorTracker } from '@/lib/errorTracking';
 *   try { ... } catch (err) { errorTracker.captureException(err, { context: { page: '/dashboard' } }); }
 *
 *   // Server (route handlers, server actions):
 *   errorTracker.captureException(err);
 *   errorTracker.captureMessage('payment.webhook.missing-signature', { level: 'warning' });
 *
 *   // Global hooks:
 *   - client: <MonitoringProvider /> (mounted in the root layout) installs
 *     `window.onerror` / `unhandledrejection` listeners.
 *   - server: `src/instrumentation.ts` initializes the tracker at boot.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger({ scope: 'errorTracking' });

// ---------------------------------------------------------------------------
// Public API surface (mirrors the Sentry browser/node SDK subset we use)
// ---------------------------------------------------------------------------

export type CaptureLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface CaptureContext {
  /** Arbitrary structured data attached to the event (surfaces in Sentry). */
  context?: Record<string, unknown>;
  /** Extra key/value strings (Sentry "tags"). */
  tags?: Record<string, string>;
  /** Associated user (id/email). Set globally with `setUser` normally. */
  user?: { id?: string; email?: string; username?: string };
}

export interface ErrorTrackerOptions {
  /** Override the DSN (defaults to env vars, see file header). */
  dsn?: string;
  /** Release identifier, e.g. the git SHA (defaults to `process.env.NEXT_PUBLIC_RELEASE`). */
  release?: string;
  /** Optional SDK module name to load (defaults per runtime, see header). */
  sdkModule?: string;
}

/**
 * Minimal structural contract for the real Sentry SDKs. Kept local so the
 * build never needs the package installed to type-check.
 */
interface SentryLike {
  init?: (options: Record<string, unknown>) => void;
  captureException?: (error: unknown, context?: unknown) => string | undefined;
  captureMessage?: (message: string, level?: CaptureLevel, context?: unknown) => string | undefined;
  setUser?: (user: { id?: string; email?: string; username?: string } | null) => void;
  setTag?: (key: string, value: string) => void;
  setContext?: (key: string, context: unknown) => void;
  addBreadcrumb?: (breadcrumb: Record<string, unknown>) => void;
  flush?: (timeout?: number) => Promise<boolean>;
}

export type TrackingMode = 'sentry' | 'console' | 'disabled';

// ---------------------------------------------------------------------------
// Tracker
// ---------------------------------------------------------------------------

class ErrorTracker {
  private sdk: SentryLike | null = null;
  private mode: TrackingMode = 'disabled';
  private initialized = false;
  private installing = false;
  /** Captures that happened before init() — replayed once an SDK is ready. */
  private pending: Array<() => void> = [];
  private user: { id?: string; email?: string; username?: string } | null = null;
  private tags: Record<string, string> = {};
  private contexts: Record<string, unknown> = {};

  get isInitialized(): boolean {
    return this.initialized;
  }

  /** 'sentry' = real SDK active · 'console' = fallback reporter · 'disabled' = not initialized. */
  getMode(): TrackingMode {
    return this.mode;
  }

  /**
   * Initialize the tracker (idempotent). Resolves the DSN from `options.dsn`
   * or the runtime-appropriate env var. Without a DSN the tracker stays in
   * "console" mode: captures are structured-logged and buffered so a later
   * hot init (e.g. after async SDK load) can replay them.
   */
  async init(options: ErrorTrackerOptions = {}): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const dsn =
      options.dsn ??
      (typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_SENTRY_DSN
        : process.env.SENTRY_DSN);

    if (!dsn) {
      this.mode = 'console';
      log.info('error tracking active in console mode (no DSN configured)');
      return;
    }

    try {
      const moduleName =
        options.sdkModule ??
        (typeof window !== 'undefined'
          ? '@sentry/browser'
          : process.env.NEXT_RUNTIME === 'edge'
            ? '@sentry/nextjs'
            : '@sentry/node');

      // Non-literal import specifier: TypeScript does not resolve it (no
      // type error when the package is absent) and webpack leaves it for
      // runtime instead of trying to bundle a missing module.
      const sdk = (await import(/* webpackIgnore: true */ moduleName)) as SentryLike;
      if (typeof sdk.init !== 'function') {
        throw new Error(`"${moduleName}" does not expose init() — unexpected SDK shape`);
      }

      sdk.init({
        dsn,
        environment: process.env.NODE_ENV ?? 'development',
        release: options.release ?? process.env.NEXT_PUBLIC_RELEASE,
        // Tune in prod; 0.1 keeps volume low for a lightweight setup.
        tracesSampleRate: 0.1,
      });

      this.sdk = sdk;
      this.mode = 'sentry';

      // Replay state + pending captures captured before the SDK was ready.
      if (this.user) sdk.setUser?.(this.user);
      for (const [key, value] of Object.entries(this.tags)) sdk.setTag?.(key, value);
      for (const [key, value] of Object.entries(this.contexts)) sdk.setContext?.(key, value);
      const pending = this.pending;
      this.pending = [];
      for (const replay of pending) replay();

      log.info('error tracking initialized with Sentry SDK', { moduleName });
    } catch (error) {
      // SDK missing or failed to load — never crash the app over telemetry.
      this.mode = 'console';
      log.warn('Sentry SDK unavailable — falling back to console reporter', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Capture an exception (an `Error` or any thrown value). */
  captureException(error: unknown, ctx: CaptureContext = {}): void {
    if (this.sdk) {
      this.sdk.captureException?.(error, {
        ...(ctx.context ? { extra: ctx.context } : {}),
        ...(ctx.tags ? { tags: ctx.tags } : {}),
        ...(ctx.user ? { user: ctx.user } : {}),
      });
      return;
    }

    const capture = () => {
      log.error('captured exception', {
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
        ...(ctx.context ?? {}),
        ...(ctx.tags ?? {}),
      });
    };

    if (this.initialized || this.installing) capture();
    else this.pending.push(capture);
  }

  /** Capture a non-exception message at a given severity. */
  captureMessage(message: string, level: CaptureLevel = 'info', ctx: CaptureContext = {}): void {
    if (this.sdk) {
      this.sdk.captureMessage?.(message, level, {
        ...(ctx.context ? { extra: ctx.context } : {}),
        ...(ctx.tags ? { tags: ctx.tags } : {}),
        ...(ctx.user ? { user: ctx.user } : {}),
      });
      return;
    }

    const capture = () => {
      log[level === 'warning' ? 'warn' : level === 'info' || level === 'debug' ? 'info' : 'error'](
        `captured message: ${message}`,
        { ...(ctx.context ?? {}), ...(ctx.tags ?? {}) },
      );
    };

    if (this.initialized || this.installing) capture();
    else this.pending.push(capture);
  }

  /** Identify the current user on subsequent captures (null clears). */
  setUser(user: { id?: string; email?: string; username?: string } | null): void {
    this.user = user;
    this.sdk?.setUser?.(user);
  }

  /** Attach a key/value tag to subsequent captures. */
  setTag(key: string, value: string): void {
    this.tags[key] = value;
    this.sdk?.setTag?.(key, value);
  }

  /** Attach a named context block to subsequent captures. */
  setContext(key: string, value: unknown): void {
    this.contexts[key] = value;
    this.sdk?.setContext?.(key, value);
  }

  /** Record a breadcrumb on the active SDK (no-op in console mode). */
  addBreadcrumb(breadcrumb: Record<string, unknown>): void {
    this.sdk?.addBreadcrumb?.(breadcrumb);
  }

  /** Force-flush buffered events to the SDK (mainly useful for tests). */
  async flush(timeoutMs = 2000): Promise<boolean> {
    if (this.sdk && typeof this.sdk.flush === 'function') {
      return this.sdk.flush(timeoutMs);
    }
    return true;
  }
}

/** App-wide singleton — import this everywhere. */
export const errorTracker = new ErrorTracker();

// ---------------------------------------------------------------------------
// Convenience init / wiring helpers
// ---------------------------------------------------------------------------

/** Initialize the tracker for the current runtime (idempotent). */
export function initErrorTracking(options?: ErrorTrackerOptions): Promise<void> {
  return errorTracker.init(options);
}

/**
 * Client-only: install global window error listeners so uncaught exceptions
 * and unhandled promise rejections reach the tracker. Idempotent; safe to
 * call from <MonitoringProvider /> on every mount.
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;
  if ((window as unknown as { __apexErrorHandlersInstalled?: boolean }).__apexErrorHandlersInstalled) {
    return;
  }
  (window as unknown as { __apexErrorHandlersInstalled?: boolean }).__apexErrorHandlersInstalled = true;

  window.addEventListener('error', (event) => {
    errorTracker.captureException(event.error ?? event.message, {
      context: { source: 'window.onerror', filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorTracker.captureException(event.reason, {
      context: { source: 'unhandledrejection' },
    });
  });

  log.info('global client error handlers installed');
}

/**
 * Server/edge-only: initialize the tracker at process boot (called from
 * `src/instrumentation.ts`). Attaches Node process-level listeners when
 * running on the Node runtime (never on edge).
 */
export async function initServerMonitoring(): Promise<void> {
  await errorTracker.init();

  const runtime =
    typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge' ? 'edge' : 'server';
  errorTracker.setTag('runtime', runtime);

  if (runtime === 'server' && typeof process !== 'undefined') {
    const nodeVersion = typeof process !== 'undefined' ? process.version : undefined;
    if (nodeVersion) errorTracker.setTag('nodeVersion', nodeVersion);

    process.on('uncaughtException', (error) => {
      errorTracker.captureException(error, { context: { source: 'uncaughtException' } });
    });
    process.on('unhandledRejection', (reason) => {
      errorTracker.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
        context: { source: 'unhandledRejection' },
      });
    });
  }

  log.info('server monitoring initialized', { mode: errorTracker.getMode(), runtime });
}
