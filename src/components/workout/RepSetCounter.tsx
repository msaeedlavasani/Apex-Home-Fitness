'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useHaptic } from '@/hooks/useHaptic';

export type CounterSize = 'md' | 'lg';

export interface RepSetCounterProps {
  /** Short label shown under the value, e.g. "Reps" / "Sets". */
  label: string;
  /** Current value. */
  value: number;
  /** Called with the next value whenever the user taps +/−. */
  onChange: (next: number) => void;
  /** Inclusive lower bound (default 0). The − button disables at this value. */
  min?: number;
  /** Inclusive upper bound (default 999). The + button disables at this value. */
  max?: number;
  /** Step size (default 1). */
  step?: number;
  /** `md` (default) compact; `lg` extra-large for workout screens. */
  size?: CounterSize;
  /** Haptic tap feedback on every +/− press. Default true. */
  haptics?: boolean;
  /** Accessible labels for the − / + buttons (localize these). */
  decreaseAriaLabel?: string;
  increaseAriaLabel?: string;
  /** Extra classes on the group. */
  className?: string;
}

const SIZE_CLASSES: Record<CounterSize, { button: string; value: string; digit: string }> = {
  md: {
    button: 'h-14 w-14 sm:h-16 sm:w-16',
    value: 'min-h-14 px-3 sm:min-h-16 sm:px-4',
    digit: 'text-4xl sm:text-5xl',
  },
  lg: {
    button: 'h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]',
    value: 'min-h-16 px-4 sm:min-h-[4.5rem] sm:px-6',
    digit: 'text-5xl sm:text-6xl',
  },
};

/**
 * RepSetCounter
 * -------------
 * Large, thumb-friendly − / value / + stepper for counting reps or sets.
 *
 *   - Touch targets are ≥ 56px (HIG) and up to 72px, with
 *     `touch-manipulation` and `select-none` for native-feeling taps —
 *     comfortably above the 44pt HIG and 48dp Material 3 minimums.
 *   - Surfaces and text use the Apex semantic tokens (`--apex-fill`,
 *     `--apex-text`, `--apex-text-secondary`) and the focus ring uses
 *     `--apex-focus-ring` (DESIGN_SYSTEM.md §2.3/§5), so the control is
 *     Light/Dark aware on iOS, Android (TWA) and Web.
 *   - Optional haptic tick on every press via `useHaptic`.
 *   - Bounds are enforced and mirrored to the UI (disabled + opacity), and
 *     the live value is announced through `<output aria-live="polite">`.
 *   - Flexbox follows the document direction, so the layout mirrors itself
 *     automatically in RTL (Persian).
 */
export function RepSetCounter({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  size = 'md',
  haptics = true,
  decreaseAriaLabel,
  increaseAriaLabel,
  className,
}: RepSetCounterProps) {
  const { trigger: haptic } = useHaptic({ enabled: haptics });
  const s = SIZE_CLASSES[size];

  const atMin = value <= min;
  const atMax = value >= max;

  const decrement = () => {
    if (atMin) return;
    onChange(value - step);
    haptic('countdown');
  };

  const increment = () => {
    if (atMax) return;
    onChange(value + step);
    haptic('countdown');
  };

  const buttonClass = cn(
    'flex touch-manipulation select-none items-center justify-center rounded-full',
    'bg-[color:var(--apex-fill)] text-[color:var(--apex-text)]',
    'transition-transform duration-150 ease-out active:scale-90',
    'hover:bg-[color:var(--apex-fill)] focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-[color:var(--apex-focus-ring)] focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[color:var(--app-background)]',
    'disabled:pointer-events-none disabled:opacity-35',
    s.button
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex w-full items-center justify-center gap-3 sm:gap-4', className)}
    >
      <button
        type="button"
        onClick={decrement}
        disabled={atMin}
        aria-label={decreaseAriaLabel ?? `${label} −`}
        className={buttonClass}
      >
        <Minus className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={3} aria-hidden="true" />
      </button>

      <output
        aria-live="polite"
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl',
          'bg-[color:var(--apex-fill)] text-[color:var(--apex-text)]',
          s.value
        )}
      >
        <span className={cn('font-black leading-none tabular-nums tracking-tighter', s.digit)}>
          {value}
        </span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--apex-text-secondary)] sm:text-xs">
          {label}
        </span>
      </output>

      <button
        type="button"
        onClick={increment}
        disabled={atMax}
        aria-label={increaseAriaLabel ?? `${label} +`}
        className={buttonClass}
      >
        <Plus className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  );
}

export default RepSetCounter;
