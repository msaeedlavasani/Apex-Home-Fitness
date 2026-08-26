import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {
  ArrowRight,
  Check,
  Dumbbell,
  Flame,
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
    <main className="min-h-dvh overflow-hidden bg-apex-surface text-apex-text-primary">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href={`/${locale}`}
          aria-label={t('eyebrow')}
          className="flex items-center gap-2 rounded-full text-sm font-semibold text-apex-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-apex-on-primary shadow-apple-sm" style={{background: 'var(--apex-gradient-brand)'}}>
            <Dumbbell className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">{t('eyebrow')}</span>
        </Link>
        <LanguageSwitcher />
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-14 pt-8 sm:px-8 sm:pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-16 lg:pb-20 lg:pt-16">
        <section className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-apex-primary-border bg-apex-primary-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-apex-primary-text">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('eyebrow')}</span>
          </div>
          <h1 className="mt-6 max-w-xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl sm:leading-[1.02]">
            {t('title')}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-apex-text-secondary sm:text-lg sm:leading-8">
            {t('description')}
          </p>
          <div className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/${locale}/quiz`}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-apex-on-primary shadow-apple-lg transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-apex-surface active:translate-y-0"
              style={{background: 'var(--apex-gradient-brand)'}}
            >
              {t('start')}
              <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
            </Link>
            <Link
              href={`/${locale}/auth/login?next=/${locale}/dashboard`}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-apex-border bg-apex-card px-6 py-3.5 font-semibold text-apex-text-primary transition-colors hover:bg-apex-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
            >
              {t('signIn')}
            </Link>
            </div>
            <span className="text-sm text-apex-text-secondary">{t('planMeta')}</span>
          </div>


          <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-sm text-apex-text-secondary">
            {[
            t('proofPersonalized'),
            t('proofHomeFirst'),
            t('proofBilingual'),
          ].map((label) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-apex-state-success" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
        </section>

        <section aria-label={t('featuresLabel')} className="relative min-w-0">
          <div className="relative overflow-hidden rounded-[2rem] border border-apex-border bg-apex-card p-5 shadow-apple-lg sm:p-7">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-apex-primary-soft" aria-hidden="true" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-apex-primary-text">{t('sessionLabel')}</p>
                <h2 className="mt-2 text-2xl font-bold">{t('sessionTitle')}</h2>
              </div>
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl p-2 shadow-apple-sm" style={{background: 'var(--apex-gradient-brand)'}}>
                <Image
                  src="/icons/icon-192x192-maskable.png"
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-xl"
                  priority
                />
              </div>
            </div>

            <div className="relative mt-7 grid grid-cols-3 gap-2 border-y border-apex-border py-4 text-center">
              <div>
                <p className="text-xl font-bold">28</p>
                <p className="mt-1 text-xs text-apex-text-secondary">{t('minutes')}</p>
              </div>
              <div className="border-x border-apex-border">
                <p className="text-xl font-bold">8</p>
                <p className="mt-1 text-xs text-apex-text-secondary">{t('exercises')}</p>
              </div>
              <div>
                <p className="text-xl font-bold">240</p>
                <p className="mt-1 text-xs text-apex-text-secondary">{t('calories')}</p>
              </div>
            </div>

            <div className="relative mt-5 flex items-center gap-3 rounded-2xl bg-apex-surface p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-apex-primary-soft text-apex-primary">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t('sessionBuiltTitle')}</p>
                <p className="mt-0.5 text-xs text-apex-text-secondary">{t('sessionBuiltBody')}</p>
              </div>
              <span className="text-xs font-semibold text-apex-state-success">{t('ready')}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {FEATURES.map(({icon: Icon, titleKey, bodyKey}) => (
              <div key={titleKey} className="flex gap-3 rounded-2xl border border-apex-border bg-apex-card/70 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-apex-primary-soft text-apex-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">{t(titleKey)}</h2>
                  <p className="mt-1 text-xs leading-5 text-apex-text-secondary">{t(bodyKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
