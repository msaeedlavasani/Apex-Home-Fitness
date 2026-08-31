/**
 * Admin Console shared primitives (ADMIN-DS-02).
 *
 * Pure presentational, server-safe (no hooks / event handlers), tokens-only:
 * every class reads apex CSS custom properties from globals.css, so
 * Light/Dark mode flips automatically. These primitives replace the
 * copy-pasted section/stat/table/empty-state markup across the six console
 * pages with behavior-neutral rendering, and carry the accessibility hooks
 * (table caption + column scope) in one place.
 */
import React from 'react';
import type {ReactNode} from 'react';

import {cn} from '@/lib/cn';

/** Card surface used by every admin read-only section. */
export function AdminPageSection({children, className}: {children: ReactNode; className?: string}) {
  return (
    <section className={cn('rounded-3xl border border-apex-border bg-apex-card p-6 shadow-apple-sm', className)}>
      {children}
    </section>
  );
}

/** Section title + optional description + optional count badge. */
export function AdminSectionHeader({
  title,
  description,
  count,
}: {
  title: string;
  description?: string;
  count?: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-apex-text-secondary">{description}</p> : null}
      </div>
      {count != null ? <AdminBadge>{count}</AdminBadge> : null}
    </div>
  );
}

/** Small soft-count pill (e.g. row counts). */
export function AdminBadge({children, className}: {children: ReactNode; className?: string}) {
  return (
    <span
      className={cn(
        'rounded-full bg-apex-primary-soft px-3 py-1 text-xs font-semibold text-apex-primary-text',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Overview stat tile (label + large value). */
export function AdminStat({label, value, className}: {label: string; value: number | string; className?: string}) {
  return (
    <div className={cn('rounded-2xl border border-apex-border bg-apex-card p-5 shadow-apple-sm', className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-apex-text-secondary">{label}</p>
      <p className="mt-2 text-3xl font-bold text-apex-text-primary">{value}</p>
    </div>
  );
}

export interface AdminTableColumn {
  label: string;
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Read-only admin table with an accessible caption and `scope="col"` headers.
 * `minWidth` is applied inline (Tailwind cannot JIT-generate dynamic values).
 */
export function AdminTable({
  caption,
  minWidth = 720,
  columns,
  children,
  className,
}: {
  caption: string;
  minWidth?: number;
  columns: AdminTableColumn[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="mt-4 w-full text-left text-sm" style={{minWidth}} aria-label={caption}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-apex-border text-xs uppercase tracking-wide text-apex-text-secondary">
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={cn('py-2 pr-4', column.align === 'right' && 'text-right', column.className)}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-apex-border">{children}</tbody>
      </table>
    </div>
  );
}

/** Consistent empty-list message (spacing opt-in via className). */
export function AdminEmptyState({message, className}: {message: string; className?: string}) {
  return <p className={cn('text-sm text-apex-text-secondary', className)}>{message}</p>;
}