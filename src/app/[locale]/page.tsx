import type {Metadata} from 'next';
import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {ArrowRight, Dumbbell, ShieldCheck, Sparkles} from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Landing'});
  return {title: t('title'), description: t('description')};
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Landing'});

  return (
    <main className="flex min-h-dvh items-center bg-apex-surface px-5 py-12 text-apex-text-primary sm:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
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

        <section aria-label={t('eyebrow')} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-3xl border border-apex-border bg-apex-card p-6 shadow-sm">
            <Sparkles className="h-6 w-6 text-apex-primary" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">{t('title')}</h2>
            <p className="mt-2 text-sm leading-6 text-apex-text-secondary">{t('description')}</p>
          </div>
          <div className="rounded-3xl border border-apex-border bg-apex-card p-6 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-apex-state-success-text" aria-hidden="true" />
            <p className="mt-4 text-sm leading-6 text-apex-text-secondary">{t('description')}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
