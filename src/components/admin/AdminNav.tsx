'use client';

import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';

const NAV_ITEMS = [
  {href: '/admin/dashboard', label: 'overview'},
  {href: '/admin/users', label: 'users'},
  {href: '/admin/programs', label: 'programs'},
  {href: '/admin/exercises', label: 'exercises'},
  {href: '/admin/operations', label: 'operations'},
  {href: '/admin/sessions', label: 'sessions'},
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const t = useTranslations('admin.nav');
  const common = useTranslations('admin.common');

  return (
    <nav aria-label={common('adminLabel')} className="flex flex-wrap gap-2 border-b border-apex-border pb-3">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-background)] ${
              active
                ? 'bg-apex-primary-soft text-apex-primary-text'
                : 'text-apex-text-secondary hover:bg-apex-card hover:text-apex-text-primary'
            }`}
          >
            {t(item.label)}
          </Link>
        );
      })}
    </nav>
  );
}