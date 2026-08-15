import {AppShell} from '@/components/layout/AppShell';
import {getTranslations} from 'next-intl/server';

export default async function AnalyticsPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Nav'});

  return (
    <AppShell title={t('analytics')}>
      <div className="p-6 text-center">
        <p className="text-slate-500">Analytics charts and insights will appear here.</p>
      </div>
    </AppShell>
  );
}
