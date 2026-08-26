'use client';

import {useState, type FormEvent} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {Loader2, Send} from 'lucide-react';

import {requestErrorMessageKey, type AuthErrorMessageKey} from '@/lib/auth/errorKeys';
import {normalizePhone} from '@/lib/auth/phone';
import {writePendingOtp} from '@/lib/auth/pendingOtp';
import {sanitizeRedirectPath} from '@/lib/auth/protect';
import {AuthShell} from './AuthShell';

/** Canonical request response — see POST /api/auth/request-code. */
interface RequestCodeResponse {
  ok: boolean;
  retryAfterSeconds?: number;
  devCode?: string;
  error?: string;
}

/**
 * LoginForm — the phone → request-code step (canonical OTP contract).
 *
 * - Validates an Iranian mobile number client-side (mirroring the server rule
 *   in `src/lib/auth/phone.ts`) before hitting `POST /api/auth/request-code`.
 * - On success stashes `{phone, next, sentAt, resendAfterSeconds, devCode}`
 *   in sessionStorage and navigates to the verify step — the phone never
 *   appears in the URL.
 * - `next` is read from the query string and sanitized against the redirect
 *   allowlist so the post-auth destination can never be an open redirect.
 * - Errors are mapped from the provider-agnostic `OtpErrorCode` union and
 *   rendered in an `aria-live` region; the input is marked `aria-invalid` and
 *   linked via `aria-describedby`.
 */
export function LoginForm() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<AuthErrorMessageKey | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError('invalidPhone');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({phone: normalized}),
      });
      const data = (await response.json().catch(() => null)) as
        | RequestCodeResponse
        | null;

      if (!response.ok || !data?.ok) {
        setError(requestErrorMessageKey(data?.error));
        return;
      }

      const next = sanitizeRedirectPath(searchParams.get('next'), locale);
      writePendingOtp({
        phone: normalized,
        next,
        sentAt: Date.now(),
        resendAfterSeconds:
          typeof data.retryAfterSeconds === 'number' ? data.retryAfterSeconds : 60,
        devCode: typeof data.devCode === 'string' ? data.devCode : null,
      });
      const forceAuth = searchParams.get('force') === '1';
      router.push(`/${locale}/auth/verify${forceAuth ? '?force=1' : ''}`);
    } catch {
      setError('generic');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title={t('loginTitle')} subtitle={t('loginSubtitle')}>
      <form onSubmit={handleSubmit} noValidate>
        <label
          htmlFor="auth-phone"
          className="block text-sm font-semibold text-apex-text-primary"
        >
          {t('phoneLabel')}
        </label>
        <input
          id="auth-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          required
          placeholder={t('phonePlaceholder')}
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error === 'invalidPhone' || undefined}
          aria-describedby={error ? 'auth-phone-error' : 'auth-phone-help'}
          className={[
            'mt-2 w-full rounded-xl border bg-apex-surface px-4 py-3 text-base tabular-nums tracking-wide text-apex-text-primary outline-none transition-colors',
            'placeholder:text-apex-text-tertiary',
            'focus-visible:ring-2 focus-visible:ring-apex-focus-ring',
            error === 'invalidPhone'
              ? 'border-apex-state-alert-border'
              : 'border-apex-border focus:border-apex-primary',
          ].join(' ')}
        />
        <p
          id="auth-phone-help"
          className="mt-1.5 text-xs leading-relaxed text-apex-text-secondary"
        >
          {t('phoneHelp')}
        </p>

        {error ? (
          <p
            id="auth-phone-error"
            role="alert"
            className="mt-2 flex items-center gap-1.5 text-sm font-medium text-apex-state-alert-text"
          >
            {t(`errors.${error}`)}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className={[
            'mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold text-apex-on-primary transition-colors touch-manipulation',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring',
            submitting
              ? 'cursor-wait opacity-70'
              : 'hover:opacity-95 active:scale-[0.99]',
          ].join(' ')}
          style={{background: 'var(--apex-gradient-brand)'}}
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
          )}
          {submitting ? t('sending') : t('continue')}
        </button>
      </form>
    </AuthShell>
  );
}
