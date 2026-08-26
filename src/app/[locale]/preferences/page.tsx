'use client';

import {useEffect, useState} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import Link from 'next/link';
import {AppShell} from '@/components/layout/AppShell';
import {PreferencesEditor, type PreferenceLabels} from '@/components/dashboard/PreferencesEditor';
import {WEEKDAY_VALUES} from '@/lib/ai/restDays';
import type {GenerateProgramInput} from '@/lib/ai/requestSecurity';

const STYLE_IDS = ['yoga', 'hiit', 'calisthenics', 'pilates', 'mobility', 'isometric', 'resistance_band', 'animal_flow'];
const EQUIPMENT_IDS = ['none', 'pull_up_bar', 'bands', 'dumbbells', 'barbell', 'kettlebells', 'bench', 'cable_machine', 'jump_rope'];
const REST_DAY_IDS = [...WEEKDAY_VALUES];

type ProfileResponse = {
  quizCompleted: boolean;
  preferences: {exerciseStyles: string[]; equipment: string[]; restDays: string[]};
  generationInput?: GenerateProgramInput | null;
};

export default function PreferencesPage() {
  const t = useTranslations('Preferences');
  const locale = useLocale();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/profile')
      .then(async (response) => {
        if (!response.ok) throw new Error('profile lookup failed');
        return await response.json() as ProfileResponse;
      })
      .then((response) => { if (!cancelled) setData(response); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const labels: PreferenceLabels = {
    title: t('title'),
    save: t('save'),
    saved: t('saved'),
    generating: t('generating'),
    generated: t('generated'),
    error: t('error'),
    generationError: t('generationError'),
    stylesTitle: t('styles.title'),
    equipmentTitle: t('equipment.title'),
    restDaysTitle: t('restDays.title'),
    restDaysSubtitle: t('restDays.subtitle'),
    styles: Object.fromEntries(STYLE_IDS.map((id) => [id, t(`styles.${id}`)])),
    equipment: Object.fromEntries(EQUIPMENT_IDS.map((id) => [id, t(`equipment.${id}`)])),
    restDays: Object.fromEntries(REST_DAY_IDS.map((id) => [id, t(`restDays.${id}`)])),
  };

  return (
    <AppShell title={t('pageTitle')} subtitle={t('pageSubtitle')} backHref={`/${locale}/profile`}>
      <div className="mx-auto w-full max-w-md px-4 sm:max-w-lg md:max-w-xl">
        {loading ? <p role="status" className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">{t('loading')}</p> : null}
        {!loading && !data ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
            <h2 className="text-lg font-bold text-amber-950">{t('authTitle')}</h2>
            <p className="mt-2 text-sm text-amber-800">{t('authBody')}</p>
            <Link href={`/${locale}/auth/login?force=1`} className="mt-5 inline-flex rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white">{t('authCta')}</Link>
          </section>
        ) : null}
        {!loading && data && !data.quizCompleted ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
            <h2 className="text-lg font-bold text-amber-950">{t('quizTitle')}</h2>
            <p className="mt-2 text-sm text-amber-800">{t('quizBody')}</p>
            <Link href={`/${locale}/quiz`} className="mt-5 inline-flex rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white">{t('quizCta')}</Link>
          </section>
        ) : null}
        {!loading && data?.quizCompleted ? <PreferencesEditor labels={labels} initial={data.preferences} /> : null}
      </div>
    </AppShell>
  );
}
