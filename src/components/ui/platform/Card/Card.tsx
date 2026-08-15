'use client';

import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { usePlatform } from '../context/PlatformProvider';
import type { Platform } from '../lib/platform';

export type CardVariant = 'glass' | 'elevated' | 'tonal' | 'outlined' | 'solid';
export type CardSize = 'sm' | 'md' | 'lg';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /**
   * Surface style, mapped to the platform idiom:
   * - `glass`    → iOS: frosted glassmorphism · M3: surface-container-low + elev-1
   * - `elevated` → iOS: heavy glass · M3: surface-container-high + elev-3
   * - `tonal`    → tinted container (brand coral soft / M3 secondary-container)
   * - `outlined` → hairline border, transparent fill
   * - `solid`    → opaque surface (`card-surface` neutral class)
   */
  variant?: CardVariant;
  /** Inner padding scale. */
  size?: CardSize;
  /** Pressable / hoverable card (adds cursor, transitions, keyboard a11y). */
  interactive?: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Leading visual (icon / thumbnail / avatar). Rendered as-is. */
  icon?: ReactNode;
  /** Trailing actions slot (buttons, chevron, menu…). */
  actions?: ReactNode;
  /** Force a platform variant (defaults to the provider value). */
  platform?: Platform;
  as?: 'div' | 'article' | 'section' | 'li';
}

const RADII: Record<Platform, string> = {
  ios: 'rounded-[20px]', // 20 pt — soft continuous corners
  android: 'rounded-2xl', // 16 dp — M3 card shape (soft)
  web: 'rounded-2xl',
};

const SURFACES: Record<Platform, Record<CardVariant, string>> = {
  ios: {
    glass: 'glass',
    elevated: 'glass-strong',
    tonal: 'bg-apex-primary-soft border border-[color:color-mix(in_srgb,var(--apex-primary)_15%,transparent)] backdrop-blur-sm',
    outlined: 'border border-apex-border bg-transparent',
    solid: 'card-surface',
  },
  android: {
    glass: 'glass', // re-resolves to M3 surface-container-low + elev-1 under data-platform="material"
    elevated: 'glass-strong', // → surface-container-high + elev-3
    tonal: 'bg-apex-primary-soft border border-[color:color-mix(in_srgb,var(--apex-primary)_20%,transparent)]',
    outlined: 'border border-apex-border bg-transparent',
    solid: 'bg-apex-surface shadow-elevation-1',
  },
  web: {
    glass: 'glass',
    elevated: 'bg-apex-surface border border-apex-border shadow-apple-lg',
    tonal: 'bg-apex-primary-soft border border-[color:color-mix(in_srgb,var(--apex-primary)_20%,transparent)]',
    outlined: 'border-2 border-apex-border bg-transparent',
    solid: 'bg-apex-surface border border-apex-border shadow-apple',
  },
};

const INTERACTIVE: Record<Platform, string> = {
  ios: 'cursor-pointer transition-transform duration-200 ease-apple-ease active:scale-[0.98]',
  android:
    'cursor-pointer transition-all duration-200 ease-material-standard hover:shadow-elevation-2 active:scale-[0.99]',
  web: 'cursor-pointer transition-all duration-200 ease-apple-ease hover:-translate-y-0.5 hover:shadow-apple-lg active:translate-y-0 active:shadow-apple-sm',
};

const PADDING: Record<CardSize, string> = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

const CardImpl = forwardRef<any, CardProps & { platform: Platform }>(
  function CardImpl(
    {
      platform,
      variant = 'glass',
      size = 'md',
      interactive = false,
      title,
      subtitle,
      icon,
      actions,
      as: Tag = 'div',
      className,
      onKeyDown,
      children,
      ...rest
    },
    ref
  ) {
    const hasHeader = title != null || subtitle != null || icon != null || actions != null;
    const clickable = interactive && 'onClick' in rest;

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      if (clickable && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        (rest as { onClick?: (e: unknown) => void }).onClick?.(event);
      }
      onKeyDown?.(event);
    };

    return (
      <Tag
        ref={ref}
        className={cn(
          'relative',
          RADII[platform],
          SURFACES[platform][variant],
          interactive && INTERACTIVE[platform],
          className
        )}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? handleKeyDown : onKeyDown}
        {...rest}
      >
        {hasHeader && (
          <div className={cn('flex items-start gap-3', PADDING[size])}>
            {icon != null && <div className="shrink-0">{icon}</div>}
            {(title != null || subtitle != null) && (
              <div className="min-w-0 flex-1">
                {title != null && (
                  <div className="text-[17px] font-semibold leading-snug text-apex-text-primary">
                    {title}
                  </div>
                )}
                {subtitle != null && (
                  <div className="mt-0.5 text-[13px] leading-snug text-apex-text-secondary">
                    {subtitle}
                  </div>
                )}
              </div>
            )}
            {actions != null && <div className="shrink-0">{actions}</div>}
          </div>
        )}
        {children != null && (
          <div className={cn(PADDING[size], hasHeader && 'pt-3')}>{children}</div>
        )}
      </Tag>
    );
  }
);

/** Platform-aware card — resolves the platform from <PlatformProvider>. */
export const Card = forwardRef<HTMLElement, CardProps>(function Card(props, ref) {
  const { platform } = usePlatform();
  return <CardImpl ref={ref} {...props} platform={props.platform ?? platform} />;
});

/** Apple HIG (iOS) card — pinned to frosted glassmorphism. */
export const IosCard = forwardRef<HTMLElement, CardProps>(function IosCard(props, ref) {
  return <CardImpl ref={ref} {...props} platform="ios" />;
});

/** Material 3 (Android) card — pinned to tonal surface containers. */
export const AndroidCard = forwardRef<HTMLElement, CardProps>(function AndroidCard(props, ref) {
  return <CardImpl ref={ref} {...props} platform="android" />;
});

/** Custom responsive (Web) card — pinned. */
export const WebCard = forwardRef<HTMLElement, CardProps>(function WebCard(props, ref) {
  return <CardImpl ref={ref} {...props} platform="web" />;
});

export default Card;
