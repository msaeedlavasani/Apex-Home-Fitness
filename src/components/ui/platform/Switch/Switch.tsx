'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { usePlatform } from '../context/PlatformProvider';
import type { Platform } from '../lib/platform';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Row label (left of the switch). */
  label?: ReactNode;
  /** Secondary description under the label. */
  description?: ReactNode;
  /** Force a platform variant (defaults to the provider value). */
  platform?: Platform;
}

const TRACK: Record<Platform, (checked: boolean) => string> = {
  ios: (checked) =>
    cn(
      'relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ease-apple-ease',
      checked ? 'bg-apex-state-success' : 'bg-apex-state-idle'
    ),
  android: (checked) =>
    cn(
      'relative inline-flex h-8 w-[52px] shrink-0 rounded-full border-2 transition-colors duration-200 ease-material-standard',
      checked
        ? 'border-apex-primary bg-apex-primary'
        : 'border-apex-border bg-apex-surface'
    ),
  web: (checked) =>
    cn(
      'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-apple-ease',
      checked ? 'bg-apex-primary' : 'bg-apex-fill'
    ),
};

const KNOB: Record<Platform, (checked: boolean) => string> = {
  ios: (checked) =>
    cn(
      'absolute left-0.5 top-0.5 h-[27px] w-[27px] rounded-full bg-apex-on-primary shadow-md',
      'transition-transform duration-200 ease-apple-ease group-active:scale-90',
      checked ? 'translate-x-5' : 'translate-x-0'
    ),
  android: (checked) =>
    cn(
      'absolute left-1 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full',
      'transition-all duration-200 ease-material-emphasized group-active:scale-90',
      checked
        ? 'translate-x-6 bg-apex-on-primary shadow-elevation-1'
        : 'translate-x-0 bg-apex-state-idle'
    ),
  web: (checked) =>
    cn(
      'absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-apex-on-primary shadow-md',
      'transition-transform duration-200 ease-apple-ease group-hover:scale-105 group-active:scale-95',
      checked ? 'translate-x-5' : 'translate-x-0'
    ),
};

const SwitchImpl = forwardRef<HTMLButtonElement, SwitchProps & { platform: Platform }>(
  function SwitchImpl(
    { platform, checked, onCheckedChange, label, description, disabled, className, ...rest },
    ref
  ) {
    return (
      <div className={cn('flex w-full items-center justify-between gap-3', className)}>
        {(label != null || description != null) && (
          <div className="min-w-0">
            {label != null && (
              <div className="text-[17px] leading-snug text-apex-text-primary">{label}</div>
            )}
            {description != null && (
              <div className="mt-0.5 text-[13px] leading-snug text-apex-text-secondary">
                {description}
              </div>
            )}
          </div>
        )}
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onCheckedChange?.(!checked)}
          className={cn(
            'group relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)]',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-background)]',
            disabled && 'cursor-not-allowed opacity-40'
          )}
          {...rest}
        >
          <span className={TRACK[platform](checked)}>
            <span className={KNOB[platform](checked)} />
          </span>
        </button>
      </div>
    );
  }
);

/** Platform-aware switch — resolves the platform from <PlatformProvider>. */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(props, ref) {
  const { platform } = usePlatform();
  return <SwitchImpl ref={ref} {...props} platform={props.platform ?? platform} />;
});

/** Apple HIG (iOS) switch — pinned (green track, 51×31 geometry). */
export const IosSwitch = forwardRef<HTMLButtonElement, SwitchProps>(function IosSwitch(props, ref) {
  return <SwitchImpl ref={ref} {...props} platform="ios" />;
});

/** Material 3 (Android) switch — pinned (outline track, primary fill). */
export const AndroidSwitch = forwardRef<HTMLButtonElement, SwitchProps>(function AndroidSwitch(
  props,
  ref
) {
  return <SwitchImpl ref={ref} {...props} platform="android" />;
});

/** Custom responsive (Web) switch — pinned (brand accent). */
export const WebSwitch = forwardRef<HTMLButtonElement, SwitchProps>(function WebSwitch(props, ref) {
  return <SwitchImpl ref={ref} {...props} platform="web" />;
});

export default Switch;
