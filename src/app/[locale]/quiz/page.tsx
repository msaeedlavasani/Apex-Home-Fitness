'use client';

import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import Link from 'next/link';
import {useParams, useRouter} from 'next/navigation';
import {House} from 'lucide-react';

import OnboardingQuiz from '@/components/quiz/OnboardingQuiz';
import {LanguageSwitcher} from '@/components/layout/LanguageSwitcher';
import {t as quizT} from '@/components/quiz/i18n';
import {
  QUIZ_DRAFT_TTL_MS,
  clearQuizDraft,
  createQuizDraft,
  loadQuizDraft,
  saveQuizDraft,
  type QuizDraftRecord,
} from '@/lib/quiz/quizDraft';
import {checkQuizSession} from '@/lib/quiz/quizAuth';
import {
  buildGenerationInput,
  buildSaveResponsePayload,
  normalizeQuizAnswers,
  quizAuthHandoffUrl,
  quizGenerationIdempotencyKey,
} from '@/lib/quiz/quizFlow';
import {
  QuizApiError,
  generateProgramApi,
  saveQuizResponseApi,
} from '@/lib/quiz/quizApi';
import type {QuizAnswers} from '@/services/userService';

/**
 * Onboarding quiz route (e.g. /en/quiz, /fa/quiz) — Batch 14 / task 3.
 *
 * Owns the full product flow:
 *   Landing → Quiz → OTP login/signup → save quiz response → generate
 *   program → Dashboard.
 *
 * Lifecycle:
 *   - Draft: answers are autosaved (with 24 h expiry) on every selection
 *     change, so a refresh mid-quiz restores the exact position
 *     (`initialData`), and the completed answers survive the OTP round-trip.
 *     The draft NEVER contains the OTP code or any secret
 *     (`quizDraft.saveQuizDraft` rejects secret-like keys).
 *   - Completion: on the last step the draft is marked `completed` and the
 *     session is checked client-side (`checkQuizSession`, Supabase SSR or the
 *     mock `ahf_session` seam). Signed in → save + generate directly.
 *     Signed out → hand off to `/{locale}/auth/login?next=/{locale}/quiz`
 *     (the canonical auth UI); after verify the auth UI redirects back here
 *     and the boot effect resumes the flow with the stored draft.
 *   - Save: `POST /api/quiz/save` with `clientRequestId = draft.completionId`
 *     — idempotent, so retries/refreshes/replays return the SAME
 *     QuizResponse (never a duplicate).
 *   - Generate: `POST /api/generate-program` with the stable
 *     `Idempotency-Key: quiz-<completionId>` — retries replay the cached 200,
 *     never a second program.
 *   - Success clears the draft and replaces the URL with the dashboard.
 *
 * Failure handling: `auth` (session lost) → sign-in gate; `retryable`
 * (network/5xx/429/timeout/in-progress) → Try again button (idempotent);
 * `permanent` (400/409/422 / auth backend not configured) → Review answers /
 * Start over. The quiz Back button + refresh are covered by the draft.
 */
type Phase =
  | 'boot' // initial mount — reading the draft / resolving the session
  | 'quiz' // answering (fresh or restored mid-quiz)
  | 'saving' // POST /api/quiz/save in flight
  | 'generating' // POST /api/generate-program in flight
  | 'needs-auth' // completed draft but no session — sign-in gate
  | 'error'; // terminal (retryable or permanent)

type ErrorKind = 'retryable' | 'permanent';

export default function QuizPage() {
  const params = useParams<{locale: string}>();
  const router = useRouter();
  const locale = params?.locale ?? 'en';
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const [phase, setPhase] = useState<Phase>('boot');
  const [draft, setDraft] = useState<QuizDraftRecord | null>(null);
  const [restoredAnswers, setRestoredAnswers] = useState<QuizAnswers | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>('retryable');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Ref mirror of the draft so callbacks (autosave / completion) never read a
  // stale closure, and `saveQuizDraft` writes are side-effect free.
  const draftRef = useRef<QuizDraftRecord | null>(null);

  const t = (key: string, p?: Record<string, string | number>) =>
    quizT(key, p, (locale as 'en' | 'fa') || 'en');

  // ── Draft autosave (every selection change; refresh-safe) ──────────────
  const handleAnswersChange = useCallback((rawAnswers: object) => {
    const answers = rawAnswers as QuizAnswers;
    const now = Date.now();
    const prev = draftRef.current;
    const next: QuizDraftRecord = prev
      ? {
          ...prev,
          answers,
          status: 'in_progress',
          updatedAt: now,
          expiresAt: now + QUIZ_DRAFT_TTL_MS,
        }
      : createQuizDraft({answers, status: 'in_progress', now});
    draftRef.current = next;
    setDraft(next);
    saveQuizDraft(next);
  }, []);

  // ── Error classification for the completion steps ──────────────────────
  const handleCompletionError = useCallback(
    (err: unknown): void => {
      if (err instanceof QuizApiError && err.kind === 'auth') {
        setPhase('needs-auth');
        return;
      }
      if (err instanceof QuizApiError && err.kind === 'permanent') {
        setErrorKind('permanent');
        setErrorCode(err.code ?? null);
        setPhase('error');
        return;
      }
      // retryable / in_progress (backoff budget exhausted) / unknown.
      setErrorKind('retryable');
      setErrorCode(err instanceof QuizApiError ? (err.code ?? null) : null);
      setPhase('error');
    },
    [],
  );

  // ── Save → generate → dashboard (idempotent at every step) ─────────────
  const runCompletion = useCallback(
    async (d: QuizDraftRecord): Promise<void> => {
      setPhase('saving');
      try {
        const normalized = normalizeQuizAnswers(d.answers);
        const saved = await saveQuizResponseApi(
          buildSaveResponsePayload(normalized, d.completionId),
        );
        const withResponse: QuizDraftRecord = {
          ...d,
          quizResponseId: saved.quizResponse.id,
          status: 'completed',
          updatedAt: Date.now(),
        };
        draftRef.current = withResponse;
        setDraft(withResponse);
        saveQuizDraft(withResponse);
      } catch (err) {
        handleCompletionError(err);
        return;
      }

      setPhase('generating');
      try {
        const normalized = normalizeQuizAnswers(d.answers);
        const generated = await generateProgramApi(
          buildGenerationInput(normalized),
          quizGenerationIdempotencyKey(d.completionId),
        );
        const done: QuizDraftRecord = {
          ...(draftRef.current ?? d),
          programId: generated.program.id,
          updatedAt: Date.now(),
        };
        draftRef.current = done;
        saveQuizDraft(done);
        clearQuizDraft(); // success — the draft has served its purpose
        router.replace(`/${localeRef.current}/dashboard`);
      } catch (err) {
        handleCompletionError(err);
      }
    },
    [handleCompletionError, router],
  );

  // ── Boot: restore draft / resume completion (covers refresh + post-OTP) ─
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = loadQuizDraft();
      if (cancelled) return;

      if (!stored) {
        setPhase('quiz');
        return;
      }
      draftRef.current = stored;
      setDraft(stored);

      if (stored.status === 'in_progress') {
        setRestoredAnswers(stored.answers);
        setPhase('quiz');
        return;
      }

      // Completed draft — a refresh mid-flow or a post-OTP return. Resume the
      // completion with the stored answers (never loses them).
      const session = await checkQuizSession();
      if (cancelled) return;
      if (session.authenticated) {
        await runCompletion(stored);
      } else {
        setPhase('needs-auth');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Final submit: lock the draft, then save+generate or hand off to OTP ─
  const handleSubmit = useCallback(
    async (rawAnswers: object): Promise<void> => {
      let normalized: ReturnType<typeof normalizeQuizAnswers>;
      try {
        normalized = normalizeQuizAnswers(rawAnswers);
      } catch {
        return; // the quiz UI already validated — never persists junk
      }

      const now = Date.now();
      const prev = draftRef.current;
      const completed: QuizDraftRecord = prev
        ? {
            ...prev,
            answers: normalized,
            status: 'completed',
            updatedAt: now,
            expiresAt: now + QUIZ_DRAFT_TTL_MS,
          }
        : createQuizDraft({answers: normalized, status: 'completed', now});
      draftRef.current = completed;
      setDraft(completed);
      saveQuizDraft(completed);

      // Always hand the completed local draft to the OTP screen. This keeps
      // the account-selection boundary explicit: the verified phone becomes
      // the owner when the quiz resumes after auth, even if an old Supabase
      // session is still present in the browser.
      setPhase('needs-auth');
      router.push(quizAuthHandoffUrl(localeRef.current));
    },
    [router, runCompletion],
  );

  const backToQuiz = useCallback(() => {
    const current = draftRef.current;
    if (!current) return;
    const reopened: QuizDraftRecord = {
      ...current,
      status: 'in_progress',
      updatedAt: Date.now(),
    };
    draftRef.current = reopened;
    setDraft(reopened);
    saveQuizDraft(reopened);
    setRestoredAnswers(reopened.answers);
    setPhase('quiz');
  }, []);

  const startOver = useCallback(() => {
    clearQuizDraft();
    draftRef.current = null;
    setDraft(null);
    setRestoredAnswers(null);
    setErrorCode(null);
    setPhase('quiz');
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen min-h-dvh items-start justify-center bg-apex-surface py-6 text-apex-text-primary sm:py-10">
      <div className="w-full max-w-lg px-4">
        {/* Top bar — the quiz is a standalone flow, so it always offers a way
            back to the landing page and a language switch (no sidebar here). */}
        <header className="mb-6 flex items-center justify-between gap-3">
          <Link
            href={`/${locale}`}
            aria-label={t('quiz.header.home')}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-apex-primary transition-colors hover:bg-apex-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
          >
            <House className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {t('quiz.header.home')}
          </Link>
          <LanguageSwitcher />
        </header>

        {phase === 'quiz' ? (
          <OnboardingQuiz
            locale={locale as 'en' | 'fa'}
            initialData={restoredAnswers ?? undefined}
            onAnswersChange={handleAnswersChange}
            onSubmit={handleSubmit}
          />
        ) : null}

        {phase === 'boot' && draft?.status === 'completed' ? (
          <FlowCard
            title={t('quiz.flow.resume.title')}
            body={t('quiz.flow.resume.body')}
          />
        ) : null}

        {phase === 'saving' ? (
          <FlowCard title={t('quiz.flow.saving')} spinner />
        ) : null}

        {phase === 'generating' ? (
          <FlowCard title={t('quiz.flow.generating')} spinner />
        ) : null}

        {phase === 'needs-auth' ? (
          <FlowCard
            title={t('quiz.flow.needsAuth.title')}
            body={t('quiz.flow.needsAuth.body')}
            actions={
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => router.push(quizAuthHandoffUrl(locale))}
                  className="min-h-12 w-full rounded-xl px-5 py-3 text-base font-semibold text-apex-on-primary transition-colors hover:opacity-95 active:scale-[0.99]"
                  style={{background: 'var(--apex-gradient-brand)'}}
                >
                  {t('quiz.flow.needsAuth.cta')}
                </button>
                <button
                  type="button"
                  onClick={backToQuiz}
                  className="min-h-12 w-full rounded-xl border border-apex-border px-5 py-3 text-base font-medium text-apex-text-primary transition-colors hover:bg-apex-primary-soft"
                >
                  {t('quiz.flow.review')}
                </button>
              </div>
            }
          />
        ) : null}

        {phase === 'error' ? (
          <FlowCard
            title={t('quiz.flow.error.title')}
            body={
              errorCode === 'AI_CREDITS_UNAVAILABLE'
                ? t('quiz.flow.error.aiCreditsUnavailable')
                : errorCode === 'AUTH_BACKEND_NOT_CONFIGURED'
                  ? t('quiz.flow.error.authNotConfigured')
                  : errorKind === 'permanent'
                    ? t('quiz.flow.error.permanent')
                    : t('quiz.flow.error.retryable')
            }
            actions={
              <div className="flex flex-col gap-3">
                {errorKind === 'retryable' && draft ? (
                  <button
                    type="button"
                    onClick={() => void runCompletion(draft)}
                    className="min-h-12 w-full rounded-xl px-5 py-3 text-base font-semibold text-apex-on-primary transition-colors hover:opacity-95 active:scale-[0.99]"
                    style={{background: 'var(--apex-gradient-brand)'}}
                  >
                    {t('quiz.flow.retry')}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={backToQuiz}
                  className="min-h-12 w-full rounded-xl border border-apex-border px-5 py-3 text-base font-medium text-apex-text-primary transition-colors hover:bg-apex-primary-soft"
                >
                  {t('quiz.flow.review')}
                </button>
                <button
                  type="button"
                  onClick={startOver}
                  className="min-h-12 w-full rounded-xl px-5 py-3 text-base font-medium text-apex-text-secondary transition-colors hover:text-apex-text-primary"
                >
                  {t('quiz.flow.restart')}
                </button>
              </div>
            }
          />
        ) : null}
      </div>
    </main>
  );
}

function FlowCard({
  title,
  body,
  spinner,
  actions,
}: {
  title: string;
  body?: string;
  spinner?: boolean;
  actions?: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-3xl border border-apex-border bg-apex-card p-6 text-center shadow-sm"
    >
      {spinner ? (
        <div
          role="status"
          aria-live="polite"
          className="mx-auto mb-4 flex h-10 w-10 items-center justify-center"
        >
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-apex-primary border-t-transparent" />
        </div>
      ) : null}
      <h1 className="text-lg font-semibold text-apex-text-primary">{title}</h1>
      {body ? (
        <p className="mt-2 text-sm leading-relaxed text-apex-text-secondary">{body}</p>
      ) : null}
      {actions ? <div className="mt-6">{actions}</div> : null}
    </section>
  );
}
