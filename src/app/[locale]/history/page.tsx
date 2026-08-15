import {AppShell} from '@/components/layout/AppShell';
import {getTranslations} from 'next-intl/server';

export default async function HistoryPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Nav'});

  return (
    <AppShell title={t('history')}>
      <div className="p-6 text-center">
        <p className="text-slate-500">Your workout history will appear here.</p>
      </div>
    </AppShell>
  );
}
