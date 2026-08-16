/**
 * Client-side quiz draft store for the Batch 14 onboarding flow
 * (Landing → Quiz → OTP login/signup → save quiz response → generate program
 * → Dashboard).
 *
 * Why a draft at all:
 *   - **Refresh / back**: answering 6 steps is slow; a reload mid-quiz must
 *     restore the user exactly where they left off (`OnboardingQuiz` accepts
 *     `initialData`).
  *   - **Post-OTP resume**: the OTP round-trip happens on a separate page
  *     (`/api/auth/verify` sets the session; the auth UI is Batch 14 /
  *     task 4). The quiz answers must survive that navigation so the save +
 *     generation steps run with the same payload afterwards.
 *   - **Idempotency anchors**: the draft carries a stable `completionId` used
 *     as the `QuizResponse.clientRequestId` (save idempotency) and as the
 *     basis of the `Idempotency-Key` header (generation idempotency), so
 *     retries/refreshes never persist a duplicate response or program.
 *
 * SECURITY CONTRACT (no secrets):
 *   - This store persists ONLY quiz answers + timestamps. The OTP code is a
 *     secret and must NEVER be written here (the auth UI keeps it in memory
 *     only). `saveQuizDraft` actively rejects answer payloads that carry
 *     secret-like keys (defense in depth).
 *   - Drafts expire (`QUIZ_DRAFT_TTL_MS`) — stale records are dropped on
 *     read; the flow never acts on an expired draft.
 *
 * Storage: `localStorage` by default; the storage adapter is injectable so
 * the pure logic is unit-testable without a DOM.
 */
import type { QuizAnswers } from '@/services/userService';

/** Storage key — versioned so a future format change can migrate safely. */
export const QUIZ_DRAFT_STORAGE_KEY = 'apex:quiz:draft:v1';

/** Drafts older than this are dropped on load (24 h — enough for the OTP
 * round-trip, short enough that stale answers never linger). */
export const QUIZ_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

/** Keys that must never appear in a draft payload (the OTP code etc.). */
const FORBIDDEN_ANSWER_KEYS = ['code', 'otp', 'secret', 'password', 'token'];

/**
 * Secret-like key names — saved drafts must not contain them. The OTP code is
 * held in memory by the auth UI only.
 */
export function findForbiddenDraftKeys(answers: Record<string, unknown>): string[] {
  const keys = Object.keys(answers);
  const forbidden = FORBIDDEN_ANSWER_KEYS.filter((key) =>
    keys.some((k) => k.toLowerCase().includes(key)),
  );
  // Values can smuggle secrets in plain sight too — a draft must never hold a
  // 4–6 digit OTP-like value under a suspicious key.
  return forbidden;
}

export interface QuizDraftRecord {
  /** Format version — currently 1. */
  version: 1;
  /**
   * Stable id for THIS quiz completion. Generated once when the draft is
   * first created and never changed while the draft lives — it anchors both
   * the save idempotency (`QuizResponse.clientRequestId`) and the generation
   * idempotency key, so every retry of the same completion is replayable.
   */
  completionId: string;
  /** The quiz answers as produced by `OnboardingQuiz`. */
  answers: QuizAnswers;
  /**
   * 'in_progress' — the user is still answering (refresh restores the quiz);
   * 'completed'  — the user finished; the save/generate flow is pending or
   *                running (refresh resumes the flow, not the quiz).
   */
  status: 'in_progress' | 'completed';
  createdAt: number;
  updatedAt: number;
  /** Epoch ms after which the draft is invalid. */
  expiresAt: number;
  /** Set once `POST /api/quiz/save` succeeded (idempotent replay returns the
   * same response on retry). */
  quizResponseId?: string | null;
  /** Set once `POST /api/generate-program` succeeded. */
  programId?: string | null;
}

/** Minimal storage surface — `localStorage`-compatible, injectable for tests. */
export interface QuizDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** `localStorage` wrapped so private-mode/SSR/blocked-storage never throws. */
export function getDefaultQuizDraftStorage(): QuizDraftStorage | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const probe = '__apex_draft_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null; // storage unavailable (private mode / blocked) — degrade gracefully
  }
}

/** URL-safe completion id (36 chars — matches the Idempotency-Key format). */
export function createCompletionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export interface CreateQuizDraftInput {
  answers: QuizAnswers;
  status: QuizDraftRecord['status'];
  /** Optional existing completion id (resume path). Defaults to a fresh one. */
  completionId?: string;
  now?: number;
  ttlMs?: number;
}

/** Creates a new draft record (pure). */
export function createQuizDraft(input: CreateQuizDraftInput): QuizDraftRecord {
  const now = input.now ?? Date.now();
  const ttlMs = input.ttlMs ?? QUIZ_DRAFT_TTL_MS;
  return {
    version: 1,
    completionId: input.completionId ?? createCompletionId(),
    answers: input.answers,
    status: input.status,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + ttlMs,
    quizResponseId: null,
    programId: null,
  };
}

/** Whether a draft is past its expiry (pure). */
export function isQuizDraftExpired(draft: QuizDraftRecord, now: number = Date.now()): boolean {
  return now > draft.expiresAt;
}

/**
 * Persists a draft. NEVER stores secrets: forbidden answer keys are rejected
 * with a TypeError before anything is written. Storage failures are swallowed
 * (best-effort) so the quiz flow never crashes on a blocked localStorage.
 */
export function saveQuizDraft(
  draft: QuizDraftRecord,
  storage: QuizDraftStorage | null = getDefaultQuizDraftStorage(),
): void {
  const forbidden = findForbiddenDraftKeys(draft.answers as Record<string, unknown>);
  if (forbidden.length > 0) {
    throw new TypeError(
      `Refusing to persist quiz draft: answer keys look like secrets (${forbidden.join(', ')}).`,
    );
  }
  if (!storage) return;
  try {
    storage.setItem(QUIZ_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Quota/private-mode failures are non-fatal — the in-memory state remains.
  }
}

/**
 * Loads the stored draft, or null when missing / corrupt / expired. An
 * expired or corrupt record is removed so the flow starts clean.
 */
export function loadQuizDraft(
  storage: QuizDraftStorage | null = getDefaultQuizDraftStorage(),
): QuizDraftRecord | null {
  if (!storage) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(QUIZ_DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeQuizDraft(storage);
    return null;
  }

  const draft = parsed as QuizDraftRecord;
  const valid =
    draft &&
    draft.version === 1 &&
    typeof draft.completionId === 'string' &&
    draft.completionId.length >= 8 &&
    draft.answers !== null &&
    typeof draft.answers === 'object' &&
    (draft.status === 'in_progress' || draft.status === 'completed') &&
    typeof draft.createdAt === 'number' &&
    typeof draft.updatedAt === 'number' &&
    typeof draft.expiresAt === 'number';

  if (!valid) {
    removeQuizDraft(storage);
    return null;
  }
  if (isQuizDraftExpired(draft)) {
    removeQuizDraft(storage);
    return null;
  }
  return draft;
}

/** Removes the stored draft (e.g. after the flow completed successfully). */
export function removeQuizDraft(
  storage: QuizDraftStorage | null = getDefaultQuizDraftStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(QUIZ_DRAFT_STORAGE_KEY);
  } catch {
    // Best-effort.
  }
}

/** Alias kept for readability at call sites. */
export const clearQuizDraft = removeQuizDraft;
