import {createNavigation} from 'next-intl/navigation';
import {routing} from './routing';

/**
 * Locale-aware client navigation primitives (next-intl shared-pathnames mode;
 * `createNavigation` is the next-intl v4 replacement for the removed
 * `createSharedPathnamesNavigation` — same shape, same members).
 *
 * `usePathname()` returns the pathname WITHOUT the locale prefix
 * (e.g. `/workout` on both `/en/workout` and `/fa/workout`), and
 * `useRouter().push(href, {locale})` re-prefixes it on navigation — exactly
 * what the global language switcher needs to swap locales while preserving
 * the current route (e.g. `/en/workout` → `/fa/workout`).
 */
export const {Link, redirect, usePathname, useRouter} = createNavigation(routing);
