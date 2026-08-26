import {Suspense} from 'react';
import {AppShell} from '@/components/layout/AppShell';
import {getTranslations} from 'next-intl/server';
import {getWorkoutAnalytics, type WorkoutAnalytics} from '@/services/analyticsService';
import {getCurrentUserProfile} from '@/services/userService';
import {
  AnalyticsSummary,
  type AnalyticsTranslator,
} from '@/components/analytics/AnalyticsSummary';
import {AnalyticsCharts} from '@/components/analytics/AnalyticsCharts';
import {AnalyticsSkeleton} from '@/components/analytics/AnalyticsSkeleton';
import {AnalyticsEmpty} from '@/components/analytics/AnalyticsEmpty';

/**
 * Analytics route (e.g. /en/analytics, /fa/analytics).
 *
 * Server component owning the page shell: resolves the localized title /
 * subtitle and streams the data section inside a Suspense boundary — the
 * skeleton renders while `getWorkoutAnalytics` resolves, then the all-time
 * stat cards (or the bilingual empty state when there is no data / the user
 * is not signed in) replace it. AppShell, RTL and no-data behavior are
 * preserved; auth/database failures degrade to the empty state instead of
 * erroring the page.
 */
export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Analytics'});
  const tNav = await getTranslations({locale, namespace: 'Nav'});
  const translator = t as AnalyticsTranslator;

  return (
    <AppShell title={tNav('analytics')} subtitle={t('subtitle')}>
      <div className="mx-auto w-full max-w-md px-4 pt-2 sm:max-w-lg md:max-w-xl">
        <Suspense fallback={<AnalyticsSkeleton t={translator} />}>
          <AnalyticsContent t={translator} ctaHref={`/${locale}/workout`} locale={locale} />
        </Suspense>
      </div>
    </AppShell>
  );
}

async function AnalyticsContent({
  t,
  ctaHref,
  locale,
}: {
  t: AnalyticsTranslator;
  ctaHref: string;
  locale: string;
}) {
  let analytics: WorkoutAnalytics | null = null;
  let heightCm: number | null = null;
  let weightEntries: Array<{weightKg: number; recordedAt: Date | string}> = [];
  try {
    analytics = await getWorkoutAnalytics();
    // Height + weight history feed the BMI chart.
    const profile = await getCurrentUserProfile();
    heightCm = profile.heightCm;
    weightEntries = profile.weightEntries ?? [];
  } catch {
    // Unauthenticated request, missing Supabase/DB config or any other
    // backend failure — the page degrades to the empty state.
    analytics = null;
  }

  if (!analytics || analytics.totalSessions === 0) {
    return <AnalyticsEmpty t={t} ctaHref={ctaHref} />;
  }

  return (
    <>
      <AnalyticsSummary analytics={analytics} t={t} />
      <AnalyticsCharts
        weeklyTrend={analytics.weeklyTrend}
        heightCm={heightCm}
        weightEntries={weightEntries}
        locale={locale as 'en' | 'fa'}
        t={t}
      />
    </>
  );
}
