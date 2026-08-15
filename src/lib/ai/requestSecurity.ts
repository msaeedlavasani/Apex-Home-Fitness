import {z} from 'zod';

export const GENERATE_PROGRAM_INPUT_SCHEMA = z
  .object({
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    goal: z.enum(['strength', 'fat_loss', 'flexibility', 'functional_fitness']),
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

interface Counter {
  count: number;
  resetAt: number;
}

const ipCounters = new Map<string, Counter>();
const userCounters = new Map<string, Counter>();
const dailyCounters = new Map<string, Counter>();
const activeUsers = new Set<string>();

function pruneExpired(counterMap: Map<string, Counter>, now: number): void {
  counterMap.forEach((counter, key) => {
    if (counter.resetAt <= now) counterMap.delete(key);
  });
}

function consume(counterMap: Map<string, Counter>, key: string, limit: number, now: number): boolean {
  pruneExpired(counterMap, now);
  const current = counterMap.get(key);
  if (!current || current.resetAt <= now) {
    counterMap.set(key, {count: 1, resetAt: now + WINDOW_MS});
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function consumeDaily(key: string, now: number): boolean {
  pruneExpired(dailyCounters, now);
  const day = new Date(now).toISOString().slice(0, 10);
  const dailyKey = `${day}:${key}`;
  const current = dailyCounters.get(dailyKey);
  if (!current) {
    dailyCounters.set(dailyKey, {count: 1, resetAt: now + 86_400_000});
    return true;
  }
  if (current.count >= DAILY_USER_LIMIT) return false;
  current.count += 1;
  return true;
}

export type SecurityRejection = 'ip_rate_limit' | 'user_rate_limit' | 'daily_limit' | 'concurrent_request';

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export function acquireGenerationSlot(userId: string, ip: string, now = Date.now()): SecurityRejection | null {
  if (!consume(ipCounters, ip, IP_WINDOW_LIMIT, now)) return 'ip_rate_limit';
  if (!consume(userCounters, userId, USER_WINDOW_LIMIT, now)) return 'user_rate_limit';
  if (!consumeDaily(userId, now)) return 'daily_limit';
  if (activeUsers.has(userId)) return 'concurrent_request';
  activeUsers.add(userId);
  return null;
}

export function releaseGenerationSlot(userId: string): void {
  activeUsers.delete(userId);
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
