import React from 'react';
import {History} from 'lucide-react';
import type {HistoryTranslator} from './HistorySummary';

export interface HistoryEmptyProps {
  /** Localized messages under the `History` namespace. */
  t: HistoryTranslator;
  /** Locale-prefixed href for the empty-state CTA (e.g. `/en/workout`). */
  ctaHref: string;
}

/**
 * History empty state — shown when the user has no completed sessions (or
 * when analytics are unavailable, e.g. not signed in). `role="status"` keeps
 * the state discoverable by assistive tech; the CTA is a plain anchor so it
 * works in any rendering context and stays keyboard-focusable.
 */
export function HistoryEmpty({t, ctaHref}: HistoryEmptyProps) {
  return (
    <div role="status" className="glass rounded-2xl p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-apex-primary-soft">
        <History className="h-6 w-6 text-apex-primary" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-apex-text-primary">
        {t('emptyState.title')}
      </h2>
      <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-apex-text-secondary">
        {t('emptyState.description')}
      </p>
      <a
        href={ctaHref}
        className="mt-5 inline-flex items-center justify-center rounded-2xl bg-apex-primary px-5 py-3 text-sm font-semibold text-apex-on-primary transition-colors hover:bg-apex-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
      >
        {t('emptyState.action')}
      </a>
    </div>
  );
}

export default HistoryEmpty;
