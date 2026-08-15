/**
 * analyticsEvents.ts — lightweight analytics event tracking (client-side).
 *
 * Tracks critical user actions (workout started, quiz finished, ...) and
 * ships them to the first-party ingestion endpoint `POST /api/analytics/events`,
 * where they are validated and written to the server logs via `@/lib/logger`
 * (ready to be persisted/forwarded later without touching the client).
 *
 * Transport
 * ---------
 * - `navigator.sendBeacon` is preferred — reliable during page unload and
 *   PWA backgrounding.
 * - Falls back to `fetch(..., { method: 'POST', keepalive: true })`.
 * - Events are queued in memory while offline and flushed on the next
 *   `online` event / `visibilitychange` to hidden (the beacon pattern).
 *   The queue is capped (100 events, oldest dropped) so it can never grow
 *   unbounded.
 *
 * Server-side events (route handlers / server actions) are intentionally
 * NOT tracked here — use `logger.info('analytics.event', {...})` directly,
 * or this module's sibling server path once persistence exists.
 *
 * Usage
 * -----
 *   import { trackEvent, ANALYTICS_EVENTS } from '@/services/analyticsEvents';
 *   trackEvent(ANALYTICS_EVENTS.WORKOUT_STARTED, { exercises: 6, sets: 12 });
 */

import { createLogger } from '@/lib/logger';

const log = createLogger({ scope: 'analytics' });

// ---------------------------------------------------------------------------
// Event catalog
// ---------------------------------------------------------------------------

/** Canonical event names — keep in sync with any downstream schema. */
export const ANALYTICS_EVENTS = {
  /** User tapped the "Start Workout" CTA on the dashboard. */
  WORKOUT_START_CLICKED: 'workout_start_clicked',
  /** The workout actually began (Start pressed in the workout player). */
  WORKOUT_STARTED: 'workout_started',
  /** Onboarding quiz finished (final step submitted). */
  QUIZ_COMPLETED: 'quiz_completed',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export interface AnalyticsEvent {
  /** Event name, e.g. `workout_started`. */
  name: string;
  /** Structured properties describing the event. */
  properties: Record<string, unknown>;
  /** ISO-8601 timestamp of when the event happened on the client. */
  ts: string;
  /** Stable id for this browser session (sessionStorage-backed). */
  sessionId: string;
  /** Current app locale (`en` | `fa`). */
  locale?: string;
  /** Page URL where the event occurred. */
  url?: string;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const ENDPOINT = '/api/analytics/events';
const MAX_QUEUE = 100;
const SESSION_STORAGE_KEY = 'apex_analytics_session';

const queue: AnalyticsEvent[] = [];
let sessionId: string | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersInstalled = false;

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      sessionId = existing;
      return existing;
    }
    const fresh = createId();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, fresh);
    sessionId = fresh;
    return fresh;
  } catch {
    // sessionStorage unavailable (privacy mode) — fall back to an in-memory id.
    sessionId = createId();
    return sessionId;
  }
}

function getLocale(): string {
  try {
    return document.documentElement.lang || 'en';
  } catch {
    return 'en';
  }
}

function installLifecycleListeners(): void {
  if (listenersInstalled || typeof window === 'undefined') return;
  listenersInstalled = true;

  window.addEventListener('online', () => {
    log.debug('browser back online — flushing analytics queue');
    void flushAnalytics();
  });

  // Flush when the page is hidden (tab switch / app background) — beacons
  // are the only transport guaranteed to still fire here.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushAnalytics();
  });
}

function scheduleFlush(delayMs = 750): void {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushAnalytics();
  }, delayMs);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Track an analytics event. No-op on the server (client-side tracking only).
 * Safe to call from any click handler, effect or async continuation.
 */
export function trackEvent(
  name: AnalyticsEventName | string,
  properties: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return;

  const event: AnalyticsEvent = {
    name,
    properties,
    ts: new Date().toISOString(),
    sessionId: getSessionId(),
    locale: getLocale(),
    url: window.location.href,
  };

  queue.push(event);
  if (queue.length > MAX_QUEUE) queue.shift(); // never grow unbounded

  log.debug('event queued', { name, propertyKeys: Object.keys(properties) });

  installLifecycleListeners();
  scheduleFlush();
}

/**
 * Flush queued events to `/api/analytics/events` (sendBeacon → fetch
 * keepalive). Returns true when every event was handed to the network.
 * Exported so tests / pagehide handlers can force a flush.
 */
export async function flushAnalytics(): Promise<boolean> {
  if (typeof window === 'undefined' || queue.length === 0) return true;
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const events = queue.splice(0, queue.length);
  const payload = JSON.stringify({ events });
  const blob = new Blob([payload], { type: 'application/json' });

  if (typeof navigator.sendBeacon === 'function') {
    const ok = navigator.sendBeacon(ENDPOINT, blob);
    if (ok) {
      log.debug('events flushed via beacon', { count: events.length });
      return true;
    }
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
    if (res.ok) {
      log.debug('events flushed via fetch', { count: events.length });
      return true;
    }
    // Non-2xx: server rejected the batch — drop it rather than retry-loop.
    log.warn('analytics ingestion rejected', { status: res.status, count: events.length });
    return true;
  } catch {
    // Offline / request failed — keep the batch for the next flush.
    queue.unshift(...events.slice(0, MAX_QUEUE));
    log.debug('analytics flush failed — events requeued', { count: events.length });
    return false;
  }
}

/** Number of events currently buffered (mainly useful for tests). */
export function getQueuedEventCount(): number {
  return queue.length;
}
