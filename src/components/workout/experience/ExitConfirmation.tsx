'use client';

import React from 'react';
import {Button} from '@/components/ui/platform';

export interface ExitConfirmationProps {
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation surface for the orchestration-owned EXIT_REQUESTED state. */
export function ExitConfirmation({
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ExitConfirmationProps) {
  return (
    <div
      data-workout-v2-exit-confirmation=""
      role="dialog"
      aria-modal="true"
      aria-labelledby="workout-v2-exit-title"
      className="absolute inset-x-4 bottom-6 z-30 mx-auto max-w-md rounded-2xl border border-[color:var(--apex-border)] bg-[color:var(--apex-surface)] p-5 text-center shadow-xl sm:inset-x-auto sm:bottom-8"
    >
      <h2 id="workout-v2-exit-title" className="text-lg font-bold text-[color:var(--apex-text)]">{title}</h2>
      <p className="mt-2 text-sm text-[color:var(--apex-text-secondary)]">{description}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button type="button" variant="text" tone="primary" size="sm" onClick={onCancel}>{cancelLabel}</Button>
        <Button type="button" variant="filled" tone="destructive" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  );
}

export default ExitConfirmation;
