import type {Metadata} from 'next';
import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {
  ArrowRight,
  Dumbbell,
  Sparkles,
  TrendingUp,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import {LanguageSwitcher} from '@/components/layout/LanguageSwitcher';

export async function generateMetadata({
  params,
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Landing'});
  return {title: t('title'), description: t('description')};
}

const FEATURES: Array<{
  icon: LucideIcon;
  titleKey: string;
  bodyKey: string;
}> = [
  {icon: Sparkles, titleKey: 'featureAiTitle', bodyKey: 'featureAiBody'},
  {icon: WifiOff, titleKey: 'featureOfflineTitle', bodyKey: 'featureOfflineBody'},
  {icon: TrendingUp, titleKey: 'featureProgressTitle', bodyKey: 'featureProgressBody'},
];

export default async function LandingPage({
  params,
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Landing'});

  return (
    <main className="flex min-h-dvh flex-col bg-apex-surface text-apex-text-primary">
      {/* Global language switcher header for the Landing page */}
      <header className="flex h-16 w-full items-center justify-end px-5 sm:px-8">
        <LanguageSwitcher />
      </header>

      <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 px-5 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center sm:px-8">
        <section>
          <div className="flex items-center gap-3 text-sm font-semibold text-apex-primary">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-apex-on-primary" style={{background: 'var(--apex-gradient-brand)'}}>
              <Dumbbell className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>{t('eyebrow')}</span>
          </div>
          <h1 className="mt-7 max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
            {t('title')}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-apex-text-secondary">
            {t('description')}
          </p>
          <Link
            href={`/${locale}/quiz`}
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl px-6 py-3 font-semibold text-apex-on-primary shadow-apple-glow transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
            style={{background: 'var(--apex-gradient-brand)'}}
          >
            {t('start')}
            <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </section>

        <section aria-label={t('featuresLabel')} className="grid gap-4">
          {FEATURES.map(({icon: Icon, titleKey, bodyKey}) => (
            <div
              key={titleKey}
              className="flex gap-4 rounded-3xl border border-apex-border bg-apex-card p-5 shadow-sm"
            >
              <span
                className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-apex-primary-soft text-apex-primary"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold">{t(titleKey)}</h2>
                <p className="mt-1 text-sm leading-6 text-apex-text-secondary">
                  {t(bodyKey)}
                </p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
