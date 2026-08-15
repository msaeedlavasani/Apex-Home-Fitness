import {z} from 'zod';
import {createRateLimitStore, type RateLimitStore} from './rateLimitStore';
import {REST_DAYS_SCHEMA} from './restDays';

/** Allowed goal ids (must stay in sync with the quiz's `GOAL_IDS`). */
const GOAL_VALUES = ['strength', 'fat_loss', 'flexibility', 'functional_fitness'] as const;

export type GoalId = (typeof GOAL_VALUES)[number];

/**
 * Multi-goal input: either a legacy single goal string or an array of
 * 1–4 unique goals. Always normalized to a canonical array so downstream
 * code (prompt, persistence, idempotency hashing) sees one shape.
 */
export const GOAL_SCHEMA = z
  .union([
    z.enum(GOAL_VALUES),
    z
      .array(z.enum(GOAL_VALUES))
      .min(1)
      .max(4)
      .refine((items) => new Set(items).size === items.length, 'Duplicate goals are not allowed'),
  ])
  .transform((value) => (Array.isArray(value) ? value : [value]));

export const GENERATE_PROGRAM_INPUT_SCHEMA = z
  .object({
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    goal: GOAL_SCHEMA,
    // Weekdays the user wants to keep workout-free (1–3). Optional for
    // backward compatibility — absent → no rest-day constraint (the route
    // treats it as []); an explicit empty array is rejected (min 1).
    restDays: REST_DAYS_SCHEMA.optional(),
    equipment: z
      .array(
        z.enum([
          'none',
          'pull_up_bar',
          'bands',
          'dumbbells',
          'barbell',
          'kettlebells',
          'bench',
          'cable_machine',
          'jump_rope',
        ]),
      )
      .min(1)
      .max(9)
      .refine((items) => new Set(items).size === items.length, 'Duplicate equipment is not allowed')
      .refine((items) => !items.includes('none') || items.length === 1, 'None cannot be combined with equipment'),
    limitations: z
      .array(z.enum(['none', 'knee', 'lower_back', 'shoulder', 'wrist', 'ankle', 'hip', 'neck']))
      .max(8)
      .refine((items) => new Set(items).size === items.length, 'Duplicate limitations are not allowed')
      .refine((items) => !items.includes('none') || items.length === 1, 'None cannot be combined with limitations'),
    limitationsDetails: z.string().trim().max(1000).default(''),
  })
  .strict();

export type GenerateProgramInput = z.infer<typeof GENERATE_PROGRAM_INPUT_SCHEMA>;

const WINDOW_MS = 60_000;
const IP_WINDOW_LIMIT = 5;
const USER_WINDOW_LIMIT = 3;
const DAILY_USER_LIMIT = 10;
const DAILY_WINDOW_MS = 86_400_000;

/**
 * How long the per-user concurrency lock lives before auto-expiring.
 * AI generation is capped at `AI_GENERATION_TIMEOUT_MS` (45 s); the lock adds
 * a buffer for persistence so a crashed instance cannot block a user forever.
 */
export const CONCURRENCY_LOCK_TTL_MS = 60_000;

const LOCK_KEY_PREFIX = 'ai-generation:concurrent:';

export type SecurityRejection = 'ip_rate_limit' | 'user_rate_limit' | 'daily_limit' | 'concurrent_request';

// Store singleton — created lazily so importing this module never reads env.
let store: RateLimitStore | null = null;

/** Returns the active rate-limit store (created once from env on first use). */
export function getRateLimitStore(): RateLimitStore {
  if (!store) store = createRateLimitStore();
  return store;
}

/** Test hook: swap in an isolated store (e.g. a fresh in-memory store). */
export function setRateLimitStoreForTesting(next: RateLimitStore): void {
  store = next;
}

/** Test hook: drop the store so the next call rebuilds it from env. */
export function resetRateLimitStoreForTesting(): void {
  store = null;
}

// Per-process token registry. Acquire and release always happen within a
// single HTTP request handled by one instance, so a local map is sufficient —
// it never needs to be shared.
const lockTokens = new Map<string, string>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Enforces IP / user / daily windows and the per-user concurrency lock through
 * the configured shared store. Returns `null` when the request may proceed.
 *
 * Ordering is preserved from the in-memory implementation: IP, then user, then
 * daily counters are consumed before the concurrency lock, so a request
 * rejected with `concurrent_request` still consumes one slot from each window.
 */
export async function acquireGenerationSlot(userId: string, ip: string, now = Date.now()): Promise<SecurityRejection | null> {
  const active = getRateLimitStore();

  const ipCheck = await active.incrementWindow(`ip:${ip}`, WINDOW_MS, IP_WINDOW_LIMIT, now);
  if (!ipCheck.allowed) return 'ip_rate_limit';

  const userCheck = await active.incrementWindow(`user:${userId}`, WINDOW_MS, USER_WINDOW_LIMIT, now);
  if (!userCheck.allowed) return 'user_rate_limit';

  const day = new Date(now).toISOString().slice(0, 10);
  const dailyCheck = await active.incrementWindow(`daily:${day}:${userId}`, DAILY_WINDOW_MS, DAILY_USER_LIMIT, now);
  if (!dailyCheck.allowed) return 'daily_limit';

  const token = await active.acquireLock(`${LOCK_KEY_PREFIX}${userId}`, CONCURRENCY_LOCK_TTL_MS, now);
  if (token === null) return 'concurrent_request';

  lockTokens.set(userId, token);
  return null;
}

/** Releases the concurrency lock acquired by `acquireGenerationSlot`. */
export async function releaseGenerationSlot(userId: string): Promise<void> {
  const token = lockTokens.get(userId);
  lockTokens.delete(userId);
  if (token !== undefined) {
    await getRateLimitStore().releaseLock(`${LOCK_KEY_PREFIX}${userId}`, token);
  }
}

export const AI_GENERATION_TIMEOUT_MS = 45_000;

export const MEDICAL_DISCLAIMER =
  'This program is for general informational and educational purposes only and is not medical advice, diagnosis, or treatment. Consult a qualified healthcare professional before exercising if you have an injury, medical condition, are pregnant, or have concerning symptoms. Stop immediately and seek medical care for chest pain, severe shortness of breath, dizziness, numbness, weakness, or sharp/worsening pain.';

const HIGH_RISK_PATTERN = /(?:chest\s+pain|shortness\s+of\s+breath|difficulty\s+breathing|heart\s+(?:disease|condition)|cardiac|pregnan|severe\s+pain|pain\s*(?:7|8|9|10)\s*\/\s*10|بیهوش|تنگی\s*نفس|درد\s*قفسه\s*سینه|بیماری\s*قلبی|باردار|درد\s*(?:شدید|۱۰|10))/i;

export function hasHighRiskDisclosure(details: string): boolean {
  return HIGH_RISK_PATTERN.test(details);
}

export function securityMessage(reason: SecurityRejection): string {
  switch (reason) {
    case 'daily_limit':
      return 'Daily program generation limit reached. Please try again tomorrow.';
    case 'concurrent_request':
      return 'A program is already being generated. Please wait for it to finish.';
    default:
      return 'Too many requests. Please wait a moment and try again.';
  }
}
