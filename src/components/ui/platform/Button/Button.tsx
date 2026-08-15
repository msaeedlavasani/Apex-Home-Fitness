'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { usePlatform } from '../context/PlatformProvider';
import type { Platform } from '../lib/platform';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';
export type ButtonTone = 'primary' | 'destructive';
export type ButtonSize = 'xl' | 'lg' | 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style, mapped to the platform idiom:
   * - iOS:  filled / tinted / outlined / plain
   * - M3:   filled / tonal / outlined / text
   * - Web:  filled / soft / outlined / ghost
   */
  variant?: ButtonVariant;
  /** Color role. `primary` = brand coral, `destructive` = system red. */
  tone?: ButtonTone;
  /** `xl` is the large, single-hand CTA (56 px, full-width on mobile). */
  size?: ButtonSize;
  /** Leading icon — replaced by a spinner while `loading`. */
  icon?: ReactNode;
  /** Trailing icon / chevron. */
  trailingIcon?: ReactNode;
  /** Show a spinner and disable the button. */
  loading?: boolean;
  /** Stretch to the container width (mobile-first on web). */
  fullWidth?: boolean;
  /** Force a platform variant (defaults to the provider value). */
  platform?: Platform;
}

const BASE =
  'group relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap ' +
  'transition-all duration-200 ' +
  'disabled:pointer-events-none disabled:opacity-40 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-background)]';

/** Typography + motion per platform. */
const PLATFORM_STYLE: Record<Platform, { font: string; ease: string }> = {
  ios: { font: 'font-semibold', ease: 'ease-apple-ease' },
  android: { font: 'font-medium', ease: 'ease-material-emphasized' },
  web: { font: 'font-semibold', ease: 'ease-apple-ease' },
};

/**
 * Size map. `xl` = the large single-hand CTA:
 * - iOS: 56 pt capsule (full-width friendly)
 * - M3:   56 dp (extended-button scale, 20 dp corners)
 * - Web:  full-width on mobile, auto width from `sm:` up
 */
const SIZES: Record<Platform, Record<ButtonSize, string>> = {
  ios: {
    xl: 'h-14 min-w-16 px-8 text-[17px] rounded-full',
    lg: 'h-[50px] min-w-14 px-6 text-[17px] rounded-full',
    md: 'h-11 min-w-12 px-4 text-[15px] rounded-[14px]',
    sm: 'h-9 min-w-10 px-3 text-[13px] rounded-[10px]',
  },
  android: {
    xl: 'h-14 min-w-16 px-8 text-base rounded-[20px]',
    lg: 'h-12 min-w-14 px-6 text-sm rounded-[20px]',
    md: 'h-10 min-w-12 px-4 text-sm rounded-[20px]',
    sm: 'h-8 min-w-10 px-3 text-xs rounded-lg',
  },
  web: {
    xl: 'h-14 min-w-16 w-full px-8 text-base rounded-2xl sm:w-auto',
    lg: 'h-12 min-w-14 w-full px-6 text-[15px] rounded-xl sm:w-auto',
    md: 'h-11 min-w-12 px-4 text-sm rounded-xl',
    sm: 'h-9 min-w-10 px-3 text-xs rounded-lg',
  },
};

/**
 * Variant × tone per platform. Every color resolves to a CSS custom property,
 * so Light/Dark mode flips automatically with the `.dark` class.
 */
const VARIANTS: Record<Platform, Record<ButtonVariant, Record<ButtonTone, string>>> = {
  ios: {
    filled: {
      primary:
        'bg-apex-primary text-apex-on-primary shadow-sm active:bg-apex-primary-active active:scale-[0.98]',
      destructive: 'bg-apple-red text-white shadow-sm active:brightness-90 active:scale-[0.98]',
    },
    tonal: {
      primary: 'bg-apex-primary-soft text-apex-primary-text active:bg-apex-primary-soft-strong',
      destructive: 'bg-apple-red/10 text-apple-red active:bg-apple-red/20',
    },
    outlined: {
      primary:
        'border border-apple-separator bg-transparent text-apex-primary-text active:bg-apex-primary-soft',
      destructive: 'border border-apple-red/40 bg-transparent text-apple-red active:bg-apple-red/10',
    },
    text: {
      primary: 'bg-transparent text-apex-primary-text active:bg-apex-primary-soft',
      destructive: 'bg-transparent text-apple-red active:bg-apple-red/10',
    },
  },
  android: {
    filled: {
      primary: 'bg-material-primary text-material-on-primary shadow-elevation-1 active:shadow-none',
      destructive: 'bg-material-error text-material-on-error shadow-elevation-1 active:shadow-none',
    },
    tonal: {
      primary: 'bg-material-secondary-container text-material-on-secondary-container',
      destructive: 'bg-material-error-container text-material-on-error-container',
    },
    outlined: {
      primary:
        'border border-material-outline bg-transparent text-material-primary active:bg-material-primary/10',
      destructive:
        'border border-material-error bg-transparent text-material-error active:bg-material-error/10',
    },
    text: {
      primary: 'bg-transparent text-material-primary active:bg-material-primary/10',
      destructive: 'bg-transparent text-material-error active:bg-material-error/10',
    },
  },
  web: {
    filled: {
      primary:
        'bg-apex-primary text-apex-on-primary shadow-md hover:bg-apex-primary-hover hover:shadow-lg hover:-translate-y-px active:bg-apex-primary-active active:translate-y-0 active:scale-[0.98]',
      destructive:
        'bg-apple-red text-white shadow-md hover:brightness-95 hover:shadow-lg hover:-translate-y-px active:brightness-90 active:translate-y-0 active:scale-[0.98]',
    },
    tonal: {
      primary: 'bg-apex-primary-soft text-apex-primary-text hover:bg-apex-primary-soft-strong',
      destructive: 'bg-apple-red/10 text-apple-red hover:bg-apple-red/15',
    },
    outlined: {
      primary:
        'border-2 border-apex-border bg-transparent text-apex-primary-text hover:border-apex-primary hover:text-apex-primary',
      destructive: 'border-2 border-apple-red/40 bg-transparent text-apple-red hover:border-apple-red',
    },
    text: {
      primary: 'bg-transparent text-apex-primary-text hover:bg-apex-primary-soft',
      destructive: 'bg-transparent text-apple-red hover:bg-apple-red/10',
    },
  },
};

function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
    />
  );
}

function buildClasses(
  platform: Platform,
  variant: ButtonVariant,
  tone: ButtonTone,
  size: ButtonSize,
  fullWidth?: boolean
): string {
  return cn(
    BASE,
    PLATFORM_STYLE[platform].font,
    PLATFORM_STYLE[platform].ease,
    SIZES[platform][size],
    VARIANTS[platform][variant][tone],
    fullWidth && 'w-full'
  );
}

interface ButtonImplProps extends ButtonProps {
  platform: Platform;
}

const ButtonImpl = forwardRef<HTMLButtonElement, ButtonImplProps>(function ButtonImpl(
  {
    platform,
    variant = 'filled',
    tone = 'primary',
    size = 'lg',
    icon,
    trailingIcon,
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buildClasses(platform, variant, tone, size, fullWidth), className)}
      {...rest}
    >
      {/* M3 state layer: text color at 12 % opacity on press (Android) */}
      {platform === 'android' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-current opacity-0 transition-opacity duration-200 group-active:opacity-10"
        />
      )}
      {loading ? <Spinner /> : icon}
      {children}
      {trailingIcon && !loading && trailingIcon}
    </button>
  );
});

/** Platform-aware button — resolves the platform from <PlatformProvider>. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const { platform } = usePlatform();
  return <ButtonImpl ref={ref} {...props} platform={props.platform ?? platform} />;
});

/** Apple HIG (iOS) variant — pinned. */
export const IosButton = forwardRef<HTMLButtonElement, ButtonProps>(function IosButton(props, ref) {
  return <ButtonImpl ref={ref} {...props} platform="ios" />;
});

/** Material 3 (Android) variant — pinned. */
export const AndroidButton = forwardRef<HTMLButtonElement, ButtonProps>(
  function AndroidButton(props, ref) {
    return <ButtonImpl ref={ref} {...props} platform="android" />;
  }
);

/** Custom responsive (Web) variant — pinned. */
export const WebButton = forwardRef<HTMLButtonElement, ButtonProps>(function WebButton(props, ref) {
  return <ButtonImpl ref={ref} {...props} platform="web" />;
});

export default Button;
