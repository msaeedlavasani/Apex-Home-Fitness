'use client';

import {usePathname} from 'next/navigation';
import {useLocale} from 'next-intl';
import {
  BarChart3,
  CircleUser,
  History,
  House,
  type LucideIcon,
} from 'lucide-react';
import type {ReactNode} from 'react';

export type AppSection = 'dashboard' | 'history' | 'analytics' | 'profile' | 'preferences';

export interface NavItem {
  section: AppSection;
  /** Key into messages `Nav.*`. */
  messageKey: string;
  icon: LucideIcon;
}

/**
 * Primary sections. The order drives the tab bar / navigation bar ordering,
 * so it is identical across all three platform layouts (consistent branding
 * + predictable native placement).
 */
export const APP_NAV: NavItem[] = [
  {section: 'dashboard', messageKey: 'home', icon: House},
  {section: 'history', messageKey: 'history', icon: History},
  {section: 'analytics', messageKey: 'analytics', icon: BarChart3},
  {section: 'profile', messageKey: 'profile', icon: CircleUser},
];

/** Absolute (locale-prefixed) href for a section, e.g. `/en/dashboard`. */
export function sectionPath(section: AppSection, locale: string): string {
  return `/${locale}/${section}`;
}

/** The section that owns the current pathname (drives active nav states). */
export function useActiveSection(): AppSection {
  const pathname = usePathname();
  const locale = useLocale();
  const rest = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
  if (rest === '/' || rest.startsWith('/dashboard')) return 'dashboard';
  if (rest.startsWith('/history')) return 'history';
  if (rest.startsWith('/analytics')) return 'analytics';
  // `/faq` is a pushed screen from Profile → Support, so the Profile tab
  // stays highlighted while it is open.
  if (rest.startsWith('/preferences')) return 'preferences';
  if (rest.startsWith('/profile') || rest.startsWith('/faq')) return 'profile';
  return 'dashboard';
}

/** Props shared by all three layout wrappers (see AppShell). */
export interface LayoutChromeProps {
  /** Large title (iOS) / AppBar title (Android) / page heading (web). */
  title?: string;
  /** Secondary line under the title. */
  subtitle?: string;
  /** Small uppercase eyebrow above the title (brand accent). */
  overline?: string;
  /** When set, a platform-native back control renders pointing here. */
  backHref?: string;
  children: ReactNode;
}
