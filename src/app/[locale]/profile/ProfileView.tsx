'use client';

import {useState, type ReactNode} from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {
  ChevronRight,
  CircleHelp,
  LifeBuoy,
  Loader2,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Sun,
  Target,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import {useTheme, type Theme} from '@/components/providers/ThemeProvider';
import {createBrowserSupabaseClient} from '@/lib/supabase';
import {AppShell} from '@/components/layout/AppShell';

/**
 * ProfileView — the user's profile & settings screen, styled after the iOS
 * Settings app (Apple HIG): inset grouped cards on a grouped background,
 * hairline separators, SF-style typography, safe-area aware and fully RTL /
 * dark-mode aware through the `apple-*` design tokens.
 *
 * Renders inside the platform `AppShell`, so the existing navigation chrome
 * (desktop sidebar / mobile pill nav / iOS tab bar / Android nav bar) wraps
 * the screen on every platform. The shell owns the page title/subtitle and
 * renders an accessible Back control pointing at the dashboard — a
 * deterministic, safe fallback that never depends on browser history.
 *
 * Owns all interactivity:
 *   - Language toggle (next-intl locale switch, keeps the current path)
 *   - Appearance toggle (ThemeProvider `useTheme`)
 *   - Logout (Supabase auth, guarded for unconfigured environments)
 */

export interface ProfileUser {
  email: string;
  name: string | null;
  fitnessGoal: string | null;
  fitnessLevel: string | null;
}

const LOCALES = ['en', 'fa'] as const;
type AppLocale = (typeof LOCALES)[number];

/** Normalizes stored goal values (see `userService.QuizAnswers`) to message keys. */
const GOAL_KEYS: Record<string, string> = {
  strength: 'strength',
  fat_loss: 'fat_loss',
  fatloss: 'fat_loss',
  flexibility: 'flexibility',
  functional_fitness: 'functional_fitness',
};

const LEVEL_KEYS = ['beginner', 'intermediate', 'advanced'] as const;

const THEME_OPTIONS: {key: Theme; icon: LucideIcon}[] = [
  {key: 'light', icon: Sun},
  {key: 'dark', icon: Moon},
  {key: 'system', icon: Monitor},
];

/** Focus ring used inside inset cards (ring-inset so it is not clipped). */
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apple-blue';

export function ProfileView({user}: {user: ProfileUser | null}) {
  const t = useTranslations('Profile');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const {theme, setTheme} = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  /** Switch locale while staying on the same path (e.g. /en/profile → /fa/profile). */
  function switchLocale(next: AppLocale) {
    if (next === locale) return;
    const prefix = `/${locale}`;
    const rest = pathname.startsWith(prefix)
      ? pathname.slice(prefix.length)
      : pathname;
    router.replace(rest === '' ? `/${next}` : `/${next}${rest}`);
  }

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // No Supabase session/config — still return to the start screen so the
      // user can sign in again.
    }
    router.replace(`/${locale}`);
    router.refresh();
  }

  return (
    <AppShell title={t('title')} subtitle={t('subtitle')} backHref={`/${locale}/dashboard`}>
      {/* Full-bleed grouped background (bleeds to the shell main's padding so
          the iOS-settings look survives inside the platform chrome, in both
          light & dark). */}
      <div className="-mx-4 min-h-dvh bg-apple-grouped-background px-4 pb-8 sm:-mx-6 sm:px-6 md:-mx-10 md:px-10">
        {/* Content column — comfortable reading width on every breakpoint. */}
        <div className="mx-auto w-full max-w-md sm:max-w-lg md:max-w-xl">
          {user ? <ProfileSummaryCard user={user} /> : <SignedOutCard />}

          {/* User Info */}
          {user ? (
            <Section title={t('sections.userInfo')}>
              <div className="divide-y divide-apple-separator">
                <InfoRow
                  icon={Mail}
                  chip="text-apple-blue"
                  label={t('userInfo.email')}
                  value={user.email}
                />
                <InfoRow
                  icon={Target}
                  chip="text-apple-orange"
                  label={t('userInfo.goal')}
                  value={goalLabel(t, user.fitnessGoal)}
                />
                <InfoRow
                  icon={TrendingUp}
                  chip="text-apple-purple"
                  label={t('userInfo.level')}
                  value={levelLabel(t, user.fitnessLevel)}
                />
              </div>
            </Section>
          ) : null}

          {/* Preferences */}
          <Section title={t('sections.preferences')}>
            <div className="divide-y divide-apple-separator">
              <PreferenceRow label={t('preferences.language')}>
                <Segmented
                  ariaLabel={t('preferences.language')}
                  options={LOCALES.map((code) => ({
                    key: code,
                    label: t(`preferences.languageOptions.${code}`),
                  }))}
                  value={locale}
                  onChange={(code) => switchLocale(code as AppLocale)}
                />
              </PreferenceRow>
              <PreferenceRow label={t('preferences.appearance')}>
                <Segmented
                  ariaLabel={t('preferences.appearance')}
                  options={THEME_OPTIONS.map(({key, icon}) => ({
                    key,
                    icon,
                    label: t(`preferences.themeOptions.${key}`),
                  }))}
                  value={theme}
                  onChange={setTheme}
                />
              </PreferenceRow>
            </div>
          </Section>

          {/* Support */}
          <Section title={t('sections.support')}>
            <div className="divide-y divide-apple-separator">
              <LinkRow
                href={`mailto:${t('support.contactValue')}`}
                icon={LifeBuoy}
                chip="text-apple-blue"
                label={t('support.contact')}
                value={t('support.contactValue')}
              />
              <LinkRow
                href={`/${locale}/faq`}
                icon={CircleHelp}
                chip="text-apple-teal"
                label={t('support.faq')}
              />
            </div>
          </Section>

          {/* Account */}
          {user ? (
            <Section title={t('sections.account')}>
              <button
                type="button"
                onClick={handleLogout}
                disabled={signingOut}
                className={[
                  'flex w-full items-center justify-center gap-2 px-4 py-4 text-[15px] font-semibold text-apple-red transition-colors touch-manipulation',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apple-red',
                  signingOut
                    ? 'cursor-wait opacity-60'
                    : 'hover:bg-apple-fill active:bg-apple-fill-secondary',
                ].join(' ')}
              >
                {signingOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
                )}
                {signingOut ? t('logout.signingOut') : t('logout.label')}
              </button>
            </Section>
          ) : null}

          <footer className="mt-8 text-center text-xs text-apple-label-tertiary">
            {t('footer')}
          </footer>
        </div>
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/** Header row: avatar + name + email (shown when signed in). */
function ProfileSummaryCard({user}: {user: ProfileUser}) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-apple-separator bg-apple-grouped-background-secondary p-5 shadow-apple-sm sm:p-6">
      <div
        aria-hidden="true"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-apple-blue to-apple-purple text-lg font-bold text-white shadow-apple-glow sm:h-16 sm:w-16 sm:text-xl"
      >
        {initialsOf(user)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold tracking-tight sm:text-xl">
          {user.name?.trim() || user.email}
        </p>
        <p className="mt-0.5 truncate text-sm text-apple-label-secondary" dir="auto">
          {user.email}
        </p>
      </div>
    </div>
  );
}

/** Graceful fallback when the page is rendered without a session. */
function SignedOutCard() {
  const t = useTranslations('Profile');
  return (
    <div className="rounded-3xl border border-apple-separator bg-apple-grouped-background-secondary p-6 text-center shadow-apple-sm">
      <UserRound className="mx-auto h-9 w-9 text-apple-label-tertiary" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-bold tracking-tight">
        {t('unauthenticated.title')}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-apple-label-secondary">
        {t('unauthenticated.message')}
      </p>
    </div>
  );
}

/** Inset grouped card with an uppercase section header (iOS Settings style). */
function Section({title, children}: {title: string; children: ReactNode}) {
  return (
    <section aria-label={title} className="mt-6">
      <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-apple-label-secondary sm:px-5">
        {title}
      </h2>
      <div className="mt-1.5 overflow-hidden rounded-2xl border border-apple-separator bg-apple-grouped-background-secondary shadow-apple-sm sm:rounded-3xl">
        {children}
      </div>
    </section>
  );
}

/** Icon + label + value row (e.g. Email / Goal / Level). */
function InfoRow({
  icon: Icon,
  chip,
  label,
  value,
}: {
  icon: LucideIcon;
  chip: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-apple-fill ${chip}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-[15px] text-apple-label-secondary">{label}</span>
      <span
        className="ms-auto min-w-0 truncate text-[15px] font-medium text-apple-label"
        dir="auto"
      >
        {value}
      </span>
    </div>
  );
}

/** Tappable row for links (Contact / FAQ) with a chevron. */
function LinkRow({
  href,
  icon: Icon,
  chip,
  label,
  value,
}: {
  href: string;
  icon: LucideIcon;
  chip: string;
  label: string;
  value?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 transition-colors touch-manipulation hover:bg-apple-fill active:bg-apple-fill-secondary sm:px-5 ${FOCUS_RING}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-apple-fill ${chip}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-[15px] text-apple-label">{label}</span>
      {value ? (
        <span
          className="ms-auto min-w-0 truncate text-[15px] text-apple-label-secondary"
          dir="auto"
        >
          {value}
        </span>
      ) : null}
      <ChevronRight
        className="h-4 w-4 shrink-0 text-apple-label-tertiary rtl:rotate-180"
        aria-hidden="true"
      />
    </Link>
  );
}

/** Label + inline control (segmented control) row for preferences. */
function PreferenceRow({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3.5 sm:px-5">
      <span className="text-[15px] text-apple-label">{label}</span>
      <div className="ms-auto w-full min-w-48 sm:w-auto sm:min-w-0">{children}</div>
    </div>
  );
}

/** iOS-style segmented control (radiogroup). Full-width on mobile, inline on sm+. */
function Segmented<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: {key: T; label: string; icon?: LucideIcon}[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex w-full gap-1 rounded-xl bg-apple-fill p-1 sm:w-auto"
    >
      {options.map(({key, label, icon: Icon}) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={[
              'flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors touch-manipulation sm:flex-none',
              FOCUS_RING,
              active
                ? 'bg-apple-grouped-background-secondary text-apple-label shadow-sm'
                : 'text-apple-label-secondary hover:text-apple-label',
            ].join(' ')}
          >
            {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initialsOf(user: ProfileUser): string {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function goalLabel(t: (key: string) => string, goal: string | null): string {
  if (!goal) return t('notSet');
  const key = GOAL_KEYS[goal.trim().toLowerCase()];
  return key ? t(`goals.${key}`) : goal;
}

function levelLabel(t: (key: string) => string, level: string | null): string {
  if (!level) return t('notSet');
  const key = level.trim().toLowerCase();
  return (LEVEL_KEYS as readonly string[]).includes(key)
    ? t(`levels.${key}`)
    : level;
}
