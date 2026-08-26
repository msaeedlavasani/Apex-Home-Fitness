'use client';

import Link from 'next/link';
import {useLocale} from 'next-intl';
import {Dumbbell} from 'lucide-react';

/**
 * BrandIcon — the Apex gradient mark (dumbbell on the brand gradient). Used
 * in the top header of every platform so the app is identifiable at a glance:
 * desktop corner, mobile top bar, iOS header row and Android app bar.
 */
export function BrandIcon({
  size = 'h-9 w-9',
  iconClass = 'h-5 w-5',
  href,
}: {
  /** Tailwind size classes for the outer square. */
  size?: string;
  /** Tailwind size classes for the dumbbell glyph. */
  iconClass?: string;
  /** When set, the mark links to this locale-prefixed path (e.g. dashboard). */
  href?: string;
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

  if (href) {
    return (
      <Link
        href={`/${locale}${href}`}
        aria-label="Apex Home Fitness"
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
      >
        {mark}
      </Link>
    );
  }
  return mark;
}
