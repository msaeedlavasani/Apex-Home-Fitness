'use client';

import {
  forwardRef,
  useId,
  useState,
  type FocusEvent,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { usePlatform } from '../context/PlatformProvider';
import type { Platform } from '../lib/platform';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  /** Error message — switches the field into the error state. */
  error?: string;
  /** Helper text below the field (hidden while an error is shown). */
  helperText?: string;
  /** Leading adornment (icon / unit). */
  startAdornment?: ReactNode;
  /** Trailing adornment (unit, clear button…). */
  endAdornment?: ReactNode;
  /** Force a platform variant (defaults to the provider value). */
  platform?: Platform;
}

const INPUT_BASE =
  'w-full bg-transparent outline-none disabled:opacity-50 ' +
  'focus-visible:outline-none';

const TextFieldImpl = forwardRef<HTMLInputElement, TextFieldProps & { platform: Platform }>(
  function TextFieldImpl(
    {
      platform,
      label,
      error,
      helperText,
      startAdornment,
      endAdornment,
      className,
      id,
      onFocus,
      onBlur,
      onChange,
      ...rest
    },
    ref
  ) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const [focused, setFocused] = useState(false);
    const [hasText, setHasText] = useState(false);
    const float = focused || hasText;

    const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      onFocus?.(e);
    };
    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      onBlur?.(e);
    };
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      setHasText(e.target.value.length > 0);
      onChange?.(e);
    };

    const message = error ?? helperText;

    /* ── iOS (HIG): label above, rounded fill, focus ring ─────────────── */
    if (platform === 'ios') {
      return (
        <div className={cn('w-full', className)}>
          {label != null && (
            <label
              htmlFor={inputId}
              className="mb-1.5 block text-[13px] font-medium text-apex-text-secondary"
            >
              {label}
            </label>
          )}
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl bg-apex-fill px-4 transition-all duration-200',
              'focus-within:ring-2 focus-within:ring-[color:var(--apex-focus-ring)]',
              error && 'bg-apex-state-alert-soft ring-2 ring-[color:color-mix(in_srgb,var(--apex-state-alert)_50%,transparent)] focus-within:ring-[color:color-mix(in_srgb,var(--apex-state-alert)_60%,transparent)]'
            )}
          >
            {startAdornment != null && (
              <span className="shrink-0 text-apex-text-secondary">{startAdornment}</span>
            )}
            <input
              ref={ref}
              id={inputId}
              className={cn(
                INPUT_BASE,
                'h-11 text-[17px] text-apex-text-primary placeholder:text-apex-text-tertiary'
              )}
              aria-invalid={error ? true : undefined}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={handleChange}
              {...rest}
            />
            {endAdornment != null && (
              <span className="shrink-0 text-apex-text-secondary">{endAdornment}</span>
            )}
          </div>
          {message != null && (
            <p
              className={cn(
                'mt-1 text-[13px]',
                error ? 'font-medium text-apex-state-alert-text' : 'text-apex-text-secondary'
              )}
            >
              {message}
            </p>
          )}
        </div>
      );
    }

    /* ── Android (M3): filled field, floating label, underline ────────── */
    if (platform === 'android') {
      return (
        <div className={cn('w-full', className)}>
          <div
            className={cn(
              'group relative rounded-t-lg border-b-2 bg-apex-surface px-4 transition-colors duration-200',
              error
                ? 'border-apex-state-alert'
                : focused
                  ? 'border-apex-primary'
                  : 'border-apex-border'
            )}
          >
            {label != null && (
              <label
                htmlFor={inputId}
                className={cn(
                  'pointer-events-none absolute start-4 transition-all duration-200 ease-material-standard',
                  float
                    ? cn(
                        'top-1.5 text-[11px] font-medium',
                        error
                          ? 'text-apex-state-alert-text'
                          : focused
                            ? 'text-apex-primary-text'
                            : 'text-apex-text-secondary'
                      )
                    : 'top-1/2 -translate-y-1/2 text-base text-apex-text-secondary'
                )}
              >
                {label}
              </label>
            )}
            <div className="flex items-center gap-2 pb-1.5 pt-5">
              {startAdornment != null && (
                <span className="shrink-0 text-apex-text-secondary">{startAdornment}</span>
              )}
              <input
                ref={ref}
                id={inputId}
                className={cn(
                  INPUT_BASE,
                  'text-base text-apex-text-primary placeholder:text-apex-text-tertiary'
                )}
                aria-invalid={error ? true : undefined}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onChange={handleChange}
                {...rest}
              />
              {endAdornment != null && (
                <span className="shrink-0 text-apex-text-secondary">{endAdornment}</span>
              )}
            </div>
          </div>
          {message != null && (
            <p
              className={cn(
                'mt-1.5 px-4 text-xs',
                error ? 'text-apex-state-alert-text' : 'text-apex-text-secondary'
              )}
            >
              {message}
            </p>
          )}
        </div>
      );
    }

    /* ── Web (custom responsive): label above, bordered, hover/focus ring ─ */
    return (
      <div className={cn('w-full', className)}>
        {label != null && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-apex-text-secondary"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border bg-apex-surface px-4 shadow-sm transition-all duration-200',
            'focus-within:ring-4 focus-within:ring-[color:color-mix(in_srgb,var(--apex-focus-ring)_40%,transparent)]',
            error
              ? 'border-apex-state-alert focus-within:border-apex-state-alert focus-within:ring-[color:color-mix(in_srgb,var(--apex-state-alert)_20%,transparent)]'
              : 'border-apex-border focus-within:border-apex-primary'
          )}
        >
          {startAdornment != null && (
            <span className="shrink-0 text-apex-text-secondary">{startAdornment}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              INPUT_BASE,
              'h-12 text-base text-apex-text-primary placeholder:text-apex-text-tertiary'
            )}
            aria-invalid={error ? true : undefined}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            {...rest}
          />
          {endAdornment != null && (
            <span className="shrink-0 text-apex-text-secondary">{endAdornment}</span>
          )}
        </div>
        {message != null && (
          <p
            className={cn(
              'mt-1.5 text-[13px]',
              error ? 'font-medium text-apex-state-alert-text' : 'text-apex-text-secondary'
            )}
          >
            {message}
          </p>
        )}
      </div>
    );
  }
);

/** Platform-aware text field — resolves the platform from <PlatformProvider>. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  props,
  ref
) {
  const { platform } = usePlatform();
  return <TextFieldImpl ref={ref} {...props} platform={props.platform ?? platform} />;
});

/** Apple HIG (iOS) text field — pinned. */
export const IosTextField = forwardRef<HTMLInputElement, TextFieldProps>(function IosTextField(
  props,
  ref
) {
  return <TextFieldImpl ref={ref} {...props} platform="ios" />;
});

/** Material 3 (Android) text field — pinned (floating label). */
export const AndroidTextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function AndroidTextField(props, ref) {
    return <TextFieldImpl ref={ref} {...props} platform="android" />;
  }
);

/** Custom responsive (Web) text field — pinned. */
export const WebTextField = forwardRef<HTMLInputElement, TextFieldProps>(function WebTextField(
  props,
  ref
) {
  return <TextFieldImpl ref={ref} {...props} platform="web" />;
});

export default TextField;
