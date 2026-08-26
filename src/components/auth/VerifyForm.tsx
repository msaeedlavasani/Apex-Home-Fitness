'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {Loader2, RotateCcw, ShieldCheck} from 'lucide-react';

import {
  isCooldownError,
  requestErrorMessageKey,
  verifyErrorMessageKey,
  type AuthErrorMessageKey,
} from '@/lib/auth/errorKeys';
import {clearPendingOtp, readPendingOtp, writePendingOtp, type PendingOtp} from '@/lib/auth/pendingOtp';
import {maskPhone} from '@/lib/auth/phone';
import {postAuthDefaultPath, sanitizeRedirectPath} from '@/lib/auth/protect';
import {AuthShell} from './AuthShell';

const CODE_LENGTH = 6;

/**
 * VerifyForm — the OTP code entry step (canonical OTP contract).
 *
 * - Reads the pending flow state from sessionStorage (see `pendingOtp.ts`);
 *   without it the user is bounced back to login.
 * - Submits `{phone, code}` to `POST /api/auth/verify`; in secure mode the
 *   Supabase SSR session cookies are set by the service on the route's
 *   response, after which the form routes through the redirect allowlist.
 * - Six individual digit inputs: auto-advance, backspace-to-previous, Arrow
 *   navigation, 6-digit paste, Enter submits. Each input carries an explicit
 *   aria-label ("Digit n of 6") and the group is wrapped in a labelled
 *   `role="group"` — fully keyboard/screen-reader accessible.
 * - Resend cooldown: a countdown driven by `sentAt` + `resendAfterSeconds`
 *   (persisted, so it survives a refresh); resend re-requests a code and the
 *   countdown restarts from the server's `retryAfterSeconds` on success or
 *   `rate_limited`.
 * - In mock mode (`AUTH_OTP_MODE=mock`) the dev-only code is surfaced as a
 *   hint banner so local/E2E flows can complete without real SMS.
 * - Errors are mapped from the provider-agnostic `OtpErrorCode` union and
 *   rendered in an `aria-live` region.
 */
export function VerifyForm() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();

  const [pending, setPending] = useState<PendingOtp | null>(null);
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(''));
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'resending' | 'done'>('idle');
  const [error, setError] = useState<AuthErrorMessageKey | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const submittedRef = useRef(false);

  // ── Load pending flow state ─────────────────────────────────────────────
  useEffect(() => {
    const stored = readPendingOtp();
    if (!stored) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    setPending(stored);
    if (stored.devCode) {
      setNotice(t('devHint', {code: stored.devCode}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, router, t]);

  // Focus only after the pending state has rendered the six inputs.
  useEffect(() => {
    if (pending) inputsRef.current[0]?.focus();
  }, [pending]);

  // ── Resend countdown (driven by sentAt + resendAfterSeconds, survives refresh)
  useEffect(() => {
    if (!pending) return;
    const cooldown = Math.max(0, pending.resendAfterSeconds);
    let cancelled = false;
    const tick = () => {
      const elapsedSec = (Date.now() - pending.sentAt) / 1000;
      const remaining = Math.max(0, cooldown - Math.floor(elapsedSec));
      if (!cancelled) setSecondsLeft(remaining);
      if (remaining > 0) {
        window.setTimeout(tick, 250);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [pending, pending?.sentAt, pending?.resendAfterSeconds]);

  const focusIndex = useCallback((index: number) => {
    inputsRef.current[index]?.focus();
    inputsRef.current[index]?.select();
  }, []);

  const code = digits.join('');

  function setDigit(index: number, value: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (error) setError(null);
  }

  function handleChange(index: number, raw: string) {
    const clean = raw.replace(/\D/g, '');
    if (clean.length === 0) {
      setDigit(index, '');
      return;
    }
    // Paste of a full code fills all boxes at once.
    if (clean.length > 1) {
      const next = Array(CODE_LENGTH).fill('');
      for (let i = 0; i < CODE_LENGTH; i += 1) {
        next[i] = clean[i] ?? '';
      }
      setDigits(next);
      focusIndex(Math.min(clean.length, CODE_LENGTH) - 1);
      return;
    }
    setDigit(index, clean);
    if (index < CODE_LENGTH - 1) focusIndex(index + 1);
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && digits[index] === '' && index > 0) {
      event.preventDefault();
      focusIndex(index - 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusIndex(Math.max(0, index - 1));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusIndex(Math.min(CODE_LENGTH - 1, index + 1));
    } else if (event.key === 'Enter' && code.length === CODE_LENGTH) {
      event.preventDefault();
      handleVerify();
    }
  }

  function handlePaste(index: number, event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const clean = event.clipboardData.getData('text').replace(/\D/g, '');
    if (clean.length === 0) return;
    handleChange(index, clean);
  }

  // ── Verify ─────────────────────────────────────────────────────────────
  async function handleVerify() {
    if (!pending || code.length !== CODE_LENGTH || submittedRef.current) return;
    submittedRef.current = true;
    setStatus('verifying');
    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({phone: pending.phone, code}),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setStatus('idle');
        submittedRef.current = false;
        setError(verifyErrorMessageKey(data?.error));
        // Invalid codes reset so the user can retype; expired/blocked states
        // keep the digits for reference.
        if (data?.error === 'invalid_code' || data?.error === 'not_requested') {
          setDigits(Array(CODE_LENGTH).fill(''));
          focusIndex(0);
        }
        return;
      }

      setStatus('done');
      clearPendingOtp();
      const target = sanitizeRedirectPath(pending.next, locale) ?? postAuthDefaultPath(locale);
      router.replace(target);
      router.refresh();
    } catch {
      setStatus('idle');
      submittedRef.current = false;
      setError('generic');
    }
  }

  // ── Resend (re-requests a fresh code after the cooldown) ───────────────
  async function handleResend() {
    if (!pending || secondsLeft > 0 || status === 'resending') return;
    setStatus('resending');
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({phone: pending.phone}),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        retryAfterSeconds?: number;
        devCode?: string;
      } | null;

      if (!response.ok || !data?.ok) {
        // A cooldown/rate-limit error tells us exactly how long to wait —
        // restart the countdown instead of just failing.
        if (isCooldownError(data?.error) && typeof data?.retryAfterSeconds === 'number') {
          const updated: PendingOtp = {
            ...pending,
            sentAt: Date.now(),
            resendAfterSeconds: data.retryAfterSeconds,
            devCode: typeof data.devCode === 'string' ? data.devCode : null,
          };
          writePendingOtp(updated);
          setPending(updated);
        }
        setStatus('idle');
        setError(requestErrorMessageKey(data?.error));
        return;
      }

      const updated: PendingOtp = {
        ...pending,
        sentAt: Date.now(),
        resendAfterSeconds:
          typeof data.retryAfterSeconds === 'number' ? data.retryAfterSeconds : 60,
        devCode: typeof data.devCode === 'string' ? data.devCode : null,
      };
      writePendingOtp(updated);
      setPending(updated);
      setDigits(Array(CODE_LENGTH).fill(''));
      focusIndex(0);
      setNotice(updated.devCode ? t('devHint', {code: updated.devCode}) : t('codeSent'));
      setStatus('idle');
    } catch {
      setStatus('idle');
      setError('generic');
    }
  }

  function handleChangeNumber() {
    clearPendingOtp();
    const next = pending?.next;
    const query = next
      ? `?next=${encodeURIComponent(next)}&force=1`
      : '?force=1';
    router.push(`/${locale}/auth/login${query}`);
  }

  const canSubmit = code.length === CODE_LENGTH && status === 'idle';
  const canResend = secondsLeft === 0 && status === 'idle';

  return (
    <AuthShell
      title={t('verifyTitle')}
      subtitle={pending ? t('verifySubtitle', {phone: maskPhone(pending.phone)}) : ' '}
    >
      {pending ? (
        <>
          {/* OTP digits are always entered left-to-right, even on RTL pages —
              the code is read from the SMS as a number. `dir="ltr"` keeps the
              first digit on the left and the caret/digit order unambiguous. */}
          <div role="group" aria-label={t('codeLabel')} dir="ltr" className="flex justify-between gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={6}
                aria-label={t('codeDigitLabel', {n: index + 1})}
                aria-invalid={error === 'invalidCode' || undefined}
                aria-describedby={error ? 'auth-code-error' : undefined}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={(e) => handlePaste(index, e)}
                disabled={status === 'done'}
                className={[
                  'h-12 w-12 rounded-xl border bg-apex-surface text-center text-xl font-bold tabular-nums text-apex-text-primary outline-none transition-colors sm:h-14 sm:w-14',
                  'focus-visible:ring-2 focus-visible:ring-apex-focus-ring',
                  error === 'invalidCode'
                    ? 'border-apex-state-alert-border'
                    : 'border-apex-border focus:border-apex-primary',
                ].join(' ')}
              />
            ))}
          </div>

          {/* Error / notice region — announced politely to assistive tech. */}
          <div aria-live="polite" className="mt-4 min-h-5">
            {error ? (
              <p
                id="auth-code-error"
                role="alert"
                className="text-sm font-medium text-apex-state-alert-text"
              >
                {t(`errors.${error}`)}
              </p>
            ) : notice ? (
              <p className="rounded-lg border border-apex-primary/25 bg-apex-primary-soft px-3 py-2.5 text-center text-sm font-semibold text-apex-primary">
                {notice}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={!canSubmit}
            className={[
              'mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold text-apex-on-primary transition-colors touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring',
              !canSubmit ? 'cursor-not-allowed opacity-50' : 'hover:opacity-95 active:scale-[0.99]',
            ].join(' ')}
            style={{background: 'var(--apex-gradient-brand)'}}
          >
            {status === 'verifying' ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            )}
            {status === 'verifying' ? t('verifying') : t('verify')}
          </button>

          {/* Resend row with countdown */}
          <div className="mt-5 flex items-center justify-center gap-2 text-sm">
            {secondsLeft > 0 ? (
              <span className="tabular-nums text-apex-text-secondary" aria-live="polite">
                {t('resendIn', {seconds: secondsLeft})}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={!canResend}
                className={[
                  'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-medium text-apex-primary transition-colors touch-manipulation',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring',
                  !canResend ? 'cursor-not-allowed opacity-50' : 'hover:bg-apex-primary-soft',
                ].join(' ')}
              >
                <RotateCcw className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                {status === 'resending' ? t('resending') : t('resend')}
              </button>
            )}
          </div>

          <p className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={handleChangeNumber}
              className="inline-flex min-h-11 items-center rounded-lg px-2 font-medium text-apex-text-secondary underline decoration-apex-border underline-offset-4 transition-colors touch-manipulation hover:text-apex-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
            >
              {t('changePhone')}
            </button>
          </p>
        </>
      ) : (
        <p className="text-sm text-apex-text-secondary">
          <Link
            href={`/${locale}/auth/login`}
            className="font-medium text-apex-primary underline underline-offset-4"
          >
            {t('backToLogin')}
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
