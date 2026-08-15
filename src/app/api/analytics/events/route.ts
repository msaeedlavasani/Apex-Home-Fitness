import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

/**
 * POST /api/analytics/events
 * --------------------------
 * First-party ingestion endpoint for client-side analytics events (see
 * `@/services/analyticsEvents`). Validates the batch and writes each event
 * to the structured server log under the `analytics` scope — a persistence
 * layer (Supabase/Postgres table, warehouse, ...) can be added here later
 * without touching the client.
 *
 * Payload:  { events: [{ name, properties, ts, sessionId, locale?, url? }] }
 * Responds: 204 No Content on success, 4xx on malformed payloads.
 */

const log = createLogger({ scope: 'analytics' });

const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENTS = 50;
const MAX_STRING_LENGTH = 500;

interface IncomingEvent {
  name?: unknown;
  properties?: unknown;
  ts?: unknown;
  sessionId?: unknown;
  locale?: unknown;
  url?: unknown;
}

/** Deep-sanity a value so one bad event can never blow up the logs. */
function sanitizeValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  if (Array.isArray(value)) {
    if (depth > 3) return '[array]';
    return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    if (depth > 3) return '[object]';
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

function isValidEvent(raw: unknown): raw is IncomingEvent {
  if (raw === null || typeof raw !== 'object') return false;
  const event = raw as IncomingEvent;
  return (
    typeof event.name === 'string' &&
    event.name.length > 0 &&
    event.name.length <= 200 &&
    (event.properties === undefined || event.properties === null || typeof event.properties === 'object') &&
    (event.sessionId === undefined || typeof event.sessionId === 'string') &&
    (event.locale === undefined || typeof event.locale === 'string') &&
    (event.url === undefined || typeof event.url === 'string')
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'unsupported media type' }, { status: 415 });
    }

    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'payload too large' }, { status: 413 });
    }

    const body: unknown = JSON.parse(text);
    const rawEvents: unknown =
      Array.isArray(body) ? body : (body as { events?: unknown } | null)?.events;

    if (!Array.isArray(rawEvents)) {
      return NextResponse.json({ error: 'expected an array of events' }, { status: 400 });
    }

    const events = rawEvents.slice(0, MAX_EVENTS).filter(isValidEvent);

    for (const event of events) {
      log.info('event', {
        name: event.name,
        sessionId: event.sessionId,
        locale: event.locale,
        url: event.url,
        ts: event.ts,
        properties: sanitizeValue(event.properties),
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    log.warn('analytics ingestion failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }
}
