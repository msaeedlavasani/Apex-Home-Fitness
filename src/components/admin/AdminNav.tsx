'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

const NAV_ITEMS = [
  {href: '/admin/dashboard', label: 'Overview'},
  {href: '/admin/users', label: 'Users'},
  {href: '/admin/programs', label: 'Workout Plans'},
  {href: '/admin/exercises', label: 'Exercises'},
  {href: '/admin/operations', label: 'Operations'},
  {href: '/admin/sessions', label: 'Admin / Sessions'},
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="flex flex-wrap gap-2 border-b border-apex-border pb-3">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-apex-primary-soft text-apex-primary-text'
                : 'text-apex-text-secondary hover:bg-apex-card hover:text-apex-text-primary'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}