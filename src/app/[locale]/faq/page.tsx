import type {Metadata} from 'next';
import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {ChevronDown, Mail} from 'lucide-react';

import {AppShell} from '@/components/layout/AppShell';

/**
 * FAQ route (e.g. /en/faq, /fa/faq) — reached from Profile → Support.
 *
 * Server component following the app shell conventions of the other pushed
 * screens (see workout/page.tsx): it resolves the localized title/subtitle
 * for the current locale, renders the platform-aware AppShell with a back
 * control pointing at `/profile`, and lists the FAQ as native `<details>`
 * disclosures — accessible, keyboard-friendly and RTL-safe without any
 * client JavaScript.
 *
 * Content lives entirely in the `Faq.*` message namespace so the two
 * locales stay in lockstep (see tests/faq-messages.test.ts).
 */

/** FAQ item ids — keys into messages `Faq.items.*` (shared by both locales). */
const FAQ_ITEM_KEYS = ['whatIs', 'cost', 'equipment', 'injury', 'offline', 'support'] as const;
type FaqItemKey = (typeof FAQ_ITEM_KEYS)[number];

/** Focus ring used on interactive rows (ring-inset so it is not clipped). */
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apex-focus-ring';

export async function generateMetadata({
  params,
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Faq'});
  return {title: t('metaTitle')};
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Faq'});

  return (
    <AppShell title={t('title')} subtitle={t('subtitle')} backHref={`/${locale}/profile`}>
      <div className="mx-auto w-full max-w-md px-4 pt-2 sm:max-w-lg md:max-w-xl">
        {/* FAQ list — inset grouped card (Apple HIG) with hairline separators. */}
        <div className="divide-y divide-apex-border overflow-hidden rounded-2xl border border-apex-border bg-apex-card shadow-apple-sm sm:rounded-3xl">
          {FAQ_ITEM_KEYS.map((key) => (
            <FaqItem
              key={key}
              question={t(`items.${key}.question`)}
              answer={t(`items.${key}.answer`)}
            />
          ))}
        </div>

        {/* Still need help? — direct line to support. */}
        <section aria-label={t('contact.title')} className="mt-6">
          <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-apex-text-secondary sm:px-5">
            {t('contact.title')}
          </h2>
          <div className="mt-1.5 overflow-hidden rounded-2xl border border-apex-border bg-apex-card shadow-apple-sm sm:rounded-3xl">
            <Link
              href={`mailto:${t('contact.email')}`}
              className={`flex items-center gap-3 px-4 py-3 transition-colors touch-manipulation hover:bg-apex-fill active:bg-apex-fill sm:px-5 ${FOCUS_RING}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-apex-primary-soft text-apex-primary">
                <Mail className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-[15px] text-apex-text-primary">{t('contact.email')}</span>
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

/** One FAQ entry — native disclosure (`<details>`), styled like an iOS cell. */
function FaqItem({question, answer}: {question: string; answer: string}) {
  return (
    <details className="group">
      <summary
        className={`flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3.5 transition-colors touch-manipulation hover:bg-apex-fill [&::-webkit-details-marker]:hidden sm:px-5 ${FOCUS_RING}`}
      >
        <span className="flex-1 text-[15px] font-medium leading-snug text-apex-text-primary">
          {question}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-apex-text-tertiary transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="px-4 pb-4 sm:px-5">
        <p className="text-[15px] leading-relaxed text-apex-text-secondary">{answer}</p>
      </div>
    </details>
  );
}
