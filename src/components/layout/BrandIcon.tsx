'use client';

import Link from 'next/link';
import {useLocale} from 'next-intl';
import {Dumbbell} from 'lucide-react';

/**
 * BrandIcon — the Apex gradient mark (dumbbell on the brand gradient), with
 * an optional wordmark. Used in the top header of every platform so the app
 * is identifiable at a glance. Headers place it on the START side — right in
 * the Persian (RTL) version, left in English (LTR) — with the name beside it.
 */
export function BrandIcon({
  size = 'h-9 w-9',
  iconClass = 'h-5 w-5',
  href,
  wordmark = false,
}: {
  /** Tailwind size classes for the outer square. */
  size?: string;
  /** Tailwind size classes for the dumbbell glyph. */
  iconClass?: string;
  /** When set, the mark links to this locale-prefixed path (e.g. dashboard). */
  href?: string;
  /** When true, the wordmark (“Apex Home Fitness”) renders next to the mark. */
  wordmark?: boolean;
}) {
  const locale = useLocale();
  const mark = (
    <span
      aria-hidden="true"
      className={`flex ${size} shrink-0 items-center justify-center rounded-xl text-apex-on-primary shadow-apple-glow`}
      style={{background: 'var(--apex-gradient-brand)'}}
    >
      <Dumbbell className={iconClass} />
    </span>
  );

  const name = wordmark ? (
    <span className="text-[15px] font-bold tracking-tight text-apex-text-primary">
      Apex <span className="text-apex-primary-text">Home Fitness</span>
    </span>
  ) : null;

  if (href) {
    return (
      <Link
        href={`/${locale}${href}`}
        aria-label="Apex Home Fitness"
        className={[
          'flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring',
          wordmark ? 'py-1' : '',
        ].join(' ')}
      >
        {mark}
        {name}
      </Link>
    );
  }
  return (
    <span className="flex items-center gap-2.5">
      {mark}
      {name}
    </span>
  );
}
