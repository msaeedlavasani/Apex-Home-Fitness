'use client';

import React, {useEffect, useId, useRef} from 'react';
import {X} from 'lucide-react';
import {cn} from '@/lib/cn';

/**
 * ExerciseDetailsSheet — the More → Exercise Details surface (§28–§34).
 *
 * PRODUCTION-CANDIDATE LAW (§2): this is an Experience-layer overlay —
 * route-independent, fixture-independent, driven entirely by the resolved
 * fields the shell passes. It is NOT an orchestration state; opening it
 * never sequences the session (§31/§32 — the shell pauses/resumes the
 * countdown through the authority).
 *
 * Design System gap (§28): the canonical platform kit (Button, Card,
 * TextField, …) ships no dialog/sheet primitive, so per §28 this is the
 * SMALLEST production-quality local surface — documented as a gap, NOT
 * declared a new global canonical component. Canonical tokens, radii and
 * focus treatment are used throughout.
 *
 * Responsive behavior (§28): compact bottom-sheet on mobile; constrained
 * centered modal on sm+ — the SAME information architecture, and IDENTICAL
 * geometry between Dark and Light at the same viewport (§34: theme is
 * token-level only).
 *
 * Close paths (§31): explicit accessible Close control (≥44px), Escape
 * where appropriate (desktop), initial focus enters the surface, focus
 * returns to the More control after close (shell), closing preserves
 * countdown/music/theme state.
 */

export interface ExerciseDetailsFieldData {
  label: string;
  value: string;
}

export interface ExerciseDetailsSheetProps {
  /** Localized accessible title ("Exercise Details"). */
  title: string;
  /** Localized Close label. */
  closeLabel: string;
  /** Resolved detail fields (already localized; absent fields omitted upstream). */
  fields: readonly ExerciseDetailsFieldData[];
  onClose: () => void;
  className?: string;
}

export function ExerciseDetailsSheet({title, closeLabel, fields, onClose, className}: ExerciseDetailsSheetProps) {
  const titleId = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);

  // §31: Escape closes (desktop-appropriate); focus enters the surface.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    surfaceRef.current?.querySelector<HTMLButtonElement>('[data-workout-v2-details-close]')?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      data-workout-v2-details-overlay=""
      className="absolute inset-0 z-30 flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
    >
      <div
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-workout-v2-details=""
        className={cn(
          'card-surface w-full rounded-t-3xl px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:max-w-md sm:rounded-3xl sm:pb-6',
          'border border-[color:var(--apex-border)] shadow-xl',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 id={titleId} className="text-base font-bold text-[color:var(--apex-text)]">
            {title}
          </h3>
          <button
            type="button"
            data-workout-v2-details-close="true"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
            className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full text-[color:var(--apex-text)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)] hover:bg-[color:var(--apex-fill)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <dl className="mt-3 divide-y divide-[color:var(--apex-border)]">
          {fields.map((field) => (
            <div key={field.label} className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-[color:var(--apex-text-secondary)]">{field.label}</dt>
              <dd className="text-sm font-semibold text-[color:var(--apex-text)]">{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default ExerciseDetailsSheet;
