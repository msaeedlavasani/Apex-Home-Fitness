'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { usePlatform } from '../context/PlatformProvider';
import type { Platform } from '../lib/platform';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  /** Force a platform variant (defaults to the provider value). */
  platform?: Platform;
  'aria-label'?: string;
}

const CONTAINER: Record<Platform, string> = {
  ios: 'inline-flex w-full rounded-[10px] bg-apex-fill p-[3px]',
  android: 'inline-flex w-full rounded-full border border-apex-border p-1',
  web: 'inline-flex w-full rounded-full border border-apex-border bg-apex-surface p-1 shadow-sm',
};

const ITEM: Record<Platform, string> = {
  ios: cn(
    'flex flex-1 items-center justify-center gap-1.5 rounded-[7px] px-3 py-2 text-[13px] font-medium',
    'transition-all duration-200 ease-apple-ease text-apex-text-secondary',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)]'
  ),
  android: cn(
    'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium',
    'transition-all duration-200 ease-material-standard text-apex-text-primary',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)]'
  ),
  web: cn(
    'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium',
    'transition-all duration-200 ease-apple-ease text-apex-text-secondary hover:text-apex-text-primary',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)]'
  ),
};

const ITEM_SELECTED: Record<Platform, string> = {
  ios: 'bg-apex-card text-apex-text-primary shadow-sm',
  android: 'bg-apex-primary-soft text-apex-primary-text',
  web: 'bg-apex-primary text-apex-on-primary shadow-sm',
};

function SegmentedControlImpl<T extends string>({
  platform,
  options,
  value,
  onChange,
  disabled,
  className,
  ...rest
}: SegmentedControlProps<T> & { platform: Platform }) {
  return (
    <div role="radiogroup" className={cn(CONTAINER[platform], className)} {...rest}>
      {options.map((option) => {
        const selected = option.value === value;
        const itemDisabled = disabled || option.disabled;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={itemDisabled}
            onClick={() => !selected && onChange(option.value)}
            className={cn(ITEM[platform], selected && ITEM_SELECTED[platform], itemDisabled && 'pointer-events-none opacity-40')}
          >
            {option.icon}
            {option.label != null && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Platform-aware segmented control — resolves the platform from <PlatformProvider>. */
export function SegmentedControl<T extends string = string>(props: SegmentedControlProps<T>) {
  const { platform } = usePlatform();
  return <SegmentedControlImpl {...props} platform={props.platform ?? platform} />;
}

/** Apple HIG (iOS) segmented control — pinned (fill track, white pill). */
export function IosSegmentedControl<T extends string = string>(props: SegmentedControlProps<T>) {
  return <SegmentedControlImpl {...props} platform="ios" />;
}

/** Material 3 (Android) segmented buttons — pinned. */
export function AndroidSegmentedControl<T extends string = string>(
  props: SegmentedControlProps<T>
) {
  return <SegmentedControlImpl {...props} platform="android" />;
}

/** Custom responsive (Web) segmented control — pinned (brand pill). */
export function WebSegmentedControl<T extends string = string>(props: SegmentedControlProps<T>) {
  return <SegmentedControlImpl {...props} platform="web" />;
}

export default SegmentedControl;
