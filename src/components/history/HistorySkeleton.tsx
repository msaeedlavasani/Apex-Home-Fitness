import React from 'react';
import type {HistoryTranslator} from './HistorySummary';

export interface HistorySkeletonProps {
  /** Localized loading label (e.g. `History.loading`). */
  t: HistoryTranslator;
  /** Accessible label for the live region (defaults to the loading text). */
  label?: string;
}

/**
 * History loading skeleton — mirrors the 2×2 summary-card grid plus a wide
 * placeholder block. Wrapped in a `role="status"` live region with visually
 * hidden loading text so assistive tech announces the pending state, while
 * the pulsing placeholders stay `aria-hidden`.
 */
export function HistorySkeleton({t, label}: HistorySkeletonProps) {
  return (
    <div role="status" aria-label={label ?? t('loading')}>
      <p className="sr-only">{t('loading')}</p>
      <div className="grid grid-cols-2 gap-3" aria-hidden="true">
        {Array.from({length: 4}).map((_, index) => (
          <div key={index} className="glass animate-pulse rounded-2xl p-4">
            <div className="h-3 w-20 rounded-full bg-apex-fill" />
            <div className="mt-3 h-5 w-24 rounded-full bg-apex-fill" />
          </div>
        ))}
      </div>
      <div className="glass animate-pulse mt-3 h-24 rounded-2xl" aria-hidden="true" />
    </div>
  );
}

export default HistorySkeleton;
