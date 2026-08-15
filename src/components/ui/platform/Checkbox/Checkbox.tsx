'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { usePlatform } from '../context/PlatformProvider';
import type { Platform } from '../lib/platform';

export interface CheckboxProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  /** Renders the tri-state dash (aria-checked="mixed"). */
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  /** Force a platform variant (defaults to the provider value). */
  platform?: Platform;
}

const CHECK_COLOR: Record<Platform, string> = {
  ios: 'text-white',
  android: 'text-material-on-primary',
  web: 'text-apex-on-primary',
};

const BOX: Record<Platform, (checked: boolean, indeterminate: boolean) => string> = {
  ios: (checked, indeterminate) =>
    cn(
      'flex h-[22px] w-[22px] items-center justify-center rounded-[6px] border-2 transition-colors duration-200 ease-apple-ease',
      checked || indeterminate
        ? 'border-apple-blue bg-apple-blue'
        : 'border-apple-gray-3 bg-transparent group-hover:border-apple-gray-2'
    ),
  android: (checked, indeterminate) =>
    cn(
      'flex h-5 w-5 items-center justify-center rounded-[3px] transition-colors duration-200 ease-material-standard',
      checked || indeterminate
        ? 'bg-material-primary'
        : 'border-2 border-material-outline group-hover:border-material-on-surface-variant'
    ),
  web: (checked, indeterminate) =>
    cn(
      'flex h-5 w-5 items-center justify-center rounded-md transition-all duration-200 ease-apple-ease',
      checked || indeterminate
        ? 'bg-apex-primary'
        : 'border-2 border-apex-border bg-apex-surface group-hover:border-apex-primary group-hover:ring-4 group-hover:ring-[color:var(--apex-focus-ring)]/30'
    ),
};

const CheckboxImpl = forwardRef<HTMLButtonElement, CheckboxProps & { platform: Platform }>(
  function CheckboxImpl(
    { platform, checked, indeterminate = false, onCheckedChange, label, description, disabled, className, ...rest },
    ref
  ) {
    return (
      <div className={cn('flex items-start gap-3', className)}>
        <button
          ref={ref}
          type="button"
          role="checkbox"
          aria-checked={indeterminate ? 'mixed' : checked}
          disabled={disabled}
          onClick={() => onCheckedChange?.(!checked)}
          className={cn(
            'group flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)]',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-background)]',
            disabled && 'cursor-not-allowed opacity-40'
          )}
          {...rest}
        >
          <span className={BOX[platform](checked, indeterminate)}>
            {indeterminate ? (
              <Minus className={cn('h-3.5 w-3.5', CHECK_COLOR[platform])} strokeWidth={3} />
            ) : checked ? (
              <Check className={cn('h-3.5 w-3.5', CHECK_COLOR[platform])} strokeWidth={3} />
            ) : null}
          </span>
        </button>
        {(label != null || description != null) && (
          <div className="min-w-0 pt-1.5">
            {label != null && (
              <div className="text-[17px] leading-snug text-apex-text">{label}</div>
            )}
            {description != null && (
              <div className="mt-0.5 text-[13px] leading-snug text-apex-text-secondary">
                {description}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

/** Platform-aware checkbox — resolves the platform from <PlatformProvider>. */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(props, ref) {
  const { platform } = usePlatform();
  return <CheckboxImpl ref={ref} {...props} platform={props.platform ?? platform} />;
});

/** Apple HIG (iOS) checkbox — pinned (rounded-square, system blue). */
export const IosCheckbox = forwardRef<HTMLButtonElement, CheckboxProps>(function IosCheckbox(
  props,
  ref
) {
  return <CheckboxImpl ref={ref} {...props} platform="ios" />;
});

/** Material 3 (Android) checkbox — pinned (2 dp corners, primary fill). */
export const AndroidCheckbox = forwardRef<HTMLButtonElement, CheckboxProps>(function AndroidCheckbox(
  props,
  ref
) {
  return <CheckboxImpl ref={ref} {...props} platform="android" />;
});

/** Custom responsive (Web) checkbox — pinned (brand accent, hover ring). */
export const WebCheckbox = forwardRef<HTMLButtonElement, CheckboxProps>(function WebCheckbox(
  props,
  ref
) {
  return <CheckboxImpl ref={ref} {...props} platform="web" />;
});

export default Checkbox;
