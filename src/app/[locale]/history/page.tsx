import {Suspense} from 'react';
import {AppShell} from '@/components/layout/AppShell';
import {getTranslations} from 'next-intl/server';
import {getWorkoutAnalytics, type WorkoutAnalytics} from '@/services/analyticsService';
import {HistorySummary, type HistoryTranslator} from '@/components/history/HistorySummary';
import {HistorySkeleton} from '@/components/history/HistorySkeleton';
import {HistoryEmpty} from '@/components/history/HistoryEmpty';

/**
 * History route (e.g. /en/history, /fa/history).
 *
 * Server component owning the page shell: resolves the localized title /
 * subtitle and streams the data section inside a Suspense boundary — the
 * skeleton renders while `getWorkoutAnalytics` resolves, then the summary
 * cards (or the bilingual empty state when there is no data / the user is
 * not signed in) replace it. AppShell, RTL and no-data behavior are
 * preserved; auth/database failures degrade to the empty state instead of
 * erroring the page.
 */
export default async function HistoryPage({
  params,
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'History'});
  const tNav = await getTranslations({locale, namespace: 'Nav'});
  const translator = t as HistoryTranslator;

  return (
    <AppShell title={tNav('history')} subtitle={t('subtitle')}>
      <div className="mx-auto w-full max-w-md px-4 pt-2 sm:max-w-lg md:max-w-xl">
        <Suspense fallback={<HistorySkeleton t={translator} />}>
          <HistoryContent t={translator} ctaHref={`/${locale}/workout`} />
        </Suspense>
      </div>
    </AppShell>
  );
}

async function HistoryContent({
  t,
  ctaHref,
}: {
  t: HistoryTranslator;
  ctaHref: string;
}) {
  let analytics: WorkoutAnalytics | null = null;
  try {
    analytics = await getWorkoutAnalytics();
  } catch {
    // Unauthenticated request, missing Supabase/DB config or any other
    // backend failure — the page degrades to the empty state.
    analytics = null;
  }

  if (!analytics || analytics.totalSessions === 0) {
    return <HistoryEmpty t={t} ctaHref={ctaHref} />;
  }

  return <HistorySummary analytics={analytics} t={t} />;
}
