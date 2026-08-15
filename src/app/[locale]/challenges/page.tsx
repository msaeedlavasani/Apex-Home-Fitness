import {AppShell} from '@/components/layout/AppShell';
import {getTranslations} from 'next-intl/server';
import {ChallengesFeed} from '@/components/social';

/**
 * Challenges feed route (e.g. /en/challenges, /fa/challenges).
 *
 * Server component that owns the page shell: it resolves the localized
 * title / subtitle for the current locale and mounts the interactive
 * `ChallengesFeed` (share CTA + filterable feed) inside the platform-aware
 * AppShell. The feed's sample challenge data should be swapped for a real
 * Challenges API / Prisma model once the social data layer is wired up.
 */
export default async function ChallengesPage({
  params,
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Challenges'});

  return (
    <AppShell overline={t('overline')} title={t('title')} subtitle={t('subtitle')}>
      <div className="mx-auto w-full max-w-md px-4 pt-2 sm:max-w-lg md:max-w-xl">
        <ChallengesFeed />
      </div>
    </AppShell>
  );
}
