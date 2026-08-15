'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Check,
  ClipboardCopy,
  Clock,
  Dumbbell,
  Flame,
  Share2,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { Button, Switch } from '@/components/ui/platform';
import { cn } from '@/lib/cn';

/**
 * SocialShare
 * -----------
 * A platform-aware "share your workout result" sheet.
 *
 * Renders a live preview of the share text (in the active locale), lets the
 * user toggle whether stats (duration · calories · sets) are included, and
 * exposes two actions:
 *   - **Share** → the Web Share API (`navigator.share`), which opens the
 *     native iOS / Android share sheet. Falls back to copying the text when
 *     the API is unavailable or the user cancels a native sheet.
 *   - **Copy**  → clipboard with a legacy `execCommand` fallback for older
 *     WebViews / non-secure contexts.
 *
 * Everything is bilingual (en / fa) via the `Social` next-intl namespace and
 * is built on the Apex Cross-Platform UI Kit (Button, Switch) + design
 * tokens, so it renders natively on iOS, Android and Web, flips with RTL and
 * adapts to Light/Dark automatically.
 *
 * Consumers pass the workout result (title, duration, calories, sets…);
 * the share payload is composed in the active locale at render time.
 */

export interface WorkoutShareResult {
  /** Workout / program display name (already localized by the caller). */
  title: string;
  /** Optional badge shown in the preview, e.g. "Completed" / "New PR". */
  badge?: string;
  /** Total session time in seconds. */
  durationSeconds: number;
  /** Estimated calories burned. */
  calories?: number;
  /** Total working sets in the session. */
  totalSets?: number;
  /** Completed sets (defaults to `totalSets` when omitted). */
  completedSets?: number;
  /** Number of exercises performed. */
  totalExercises?: number;
}

/** How the result was successfully shared. */
export type ShareMethod = 'native' | 'copy';

export interface SocialShareProps {
  /** The workout result to share. */
  result: WorkoutShareResult;
  /** Fired after a successful native share or clipboard copy. */
  onShared?: (method: ShareMethod) => void;
  /** Extra classes for the root element. */
  className?: string;
}

type ShareStatus = 'idle' | 'shared' | 'copied' | 'error';

/** Whole minutes for display, always at least 1 (avoids "0 min" for short sessions). */
function durationMinutes(totalSeconds: number): number {
  return Math.max(1, Math.round(totalSeconds / 60));
}

/** Legacy clipboard fallback for WebViews without the async Clipboard API. */
async function copyToClipboardLegacy(text: string): Promise<boolean> {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function SocialShare({ result, onShared, className }: SocialShareProps) {
  const t = useTranslations('Social');

  const [includeStats, setIncludeStats] = useState(true);
  const [status, setStatus] = useState<ShareStatus>('idle');
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showStatus = useCallback((next: ShareStatus) => {
    setStatus(next);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus('idle'), 2600);
  }, []);

  // Clear the transient status timer on unmount.
  useEffect(() => {
    return () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    };
  }, []);

  const minutes = useMemo(() => durationMinutes(result.durationSeconds), [result.durationSeconds]);

  /** The share payload, composed in the active locale (stats are optional). */
  const shareText = useMemo(() => {
    const lines = [t('shareText.header', { title: result.title })];
    if (includeStats) {
      const parts: string[] = [t('units.minutes', { count: minutes })];
      if (result.calories != null) {
        parts.push(t('units.calories', { count: result.calories }));
      }
      if (result.totalSets != null) {
        parts.push(t('units.sets', { count: result.totalSets }));
      }
      lines.push(parts.join(t('statsSeparator')));
    }
    lines.push(t('shareText.hashtag'));
    return lines.join('\n');
  }, [t, result, includeStats, minutes]);

  const copyText = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        return true;
      }
    } catch {
      // fall through to the legacy path
    }
    return copyToClipboardLegacy(shareText);
  }, [shareText]);

  const handleShare = useCallback(async () => {
    const canNative =
      typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    if (canNative) {
      try {
        await navigator.share({ title: result.title, text: shareText });
        showStatus('shared');
        onShared?.('native');
        return;
      } catch (error) {
        // The user dismissed the native sheet — treat as a deliberate cancel,
        // not a failure.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        // Otherwise fall through to the clipboard so sharing never dead-ends.
      }
    }
    const ok = await copyText();
    if (ok) {
      showStatus('copied');
      onShared?.('copy');
    } else {
      showStatus('error');
    }
  }, [result.title, shareText, copyText, showStatus, onShared]);

  const handleCopy = useCallback(async () => {
    const ok = await copyText();
    if (ok) {
      showStatus('copied');
      onShared?.('copy');
    } else {
      showStatus('error');
    }
  }, [copyText, showStatus, onShared]);

  const statusLabel =
    status === 'shared' ? t('shared') : status === 'copied' ? t('copied') : t('shareFailed');

  return (
    <div className={cn('space-y-4', className)}>
      {/* ---- Live preview of the share post ---- */}
      <div className="glass rounded-[20px] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--apex-text-secondary)]">
          {t('preview')}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--apex-primary-soft)]">
            <Trophy className="h-5 w-5 text-[color:var(--apex-primary-text)]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold leading-snug text-[color:var(--apex-text)]">
              {result.title}
            </p>
            {result.badge != null && (
              <span className="mt-1 inline-flex items-center rounded-full bg-[color:var(--apex-state-success-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--apex-state-success-text)]">
                {result.badge}
              </span>
            )}
          </div>
        </div>

        {includeStats && (
          <div className="mt-4 flex flex-wrap gap-2">
            <PreviewStat icon={Clock} value={t('units.minutes', { count: minutes })} />
            {result.calories != null && (
              <PreviewStat icon={Flame} value={t('units.calories', { count: result.calories })} />
            )}
            {result.totalSets != null && (
              <PreviewStat icon={Dumbbell} value={t('units.sets', { count: result.totalSets })} />
            )}
          </div>
        )}

        <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-[color:var(--apex-text-secondary)]">
          {shareText}
        </p>
      </div>

      {/* ---- Options ---- */}
      <Switch
        checked={includeStats}
        onCheckedChange={setIncludeStats}
        label={t('includeStats')}
        description={t('includeStatsDesc')}
      />

      {/* ---- Actions ---- */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button
          size="lg"
          fullWidth
          icon={<Share2 className="h-4 w-4" aria-hidden="true" />}
          onClick={handleShare}
        >
          {t('share')}
        </Button>
        <Button
          size="lg"
          variant="tonal"
          fullWidth
          icon={<ClipboardCopy className="h-4 w-4" aria-hidden="true" />}
          onClick={handleCopy}
        >
          {t('copy')}
        </Button>
      </div>

      {/* ---- Transient feedback (announced to screen readers) ---- */}
      <p
        role="status"
        aria-live="polite"
        className={cn(
          'min-h-[1.25rem] text-center text-[13px] font-medium',
          status === 'error'
            ? 'text-[color:var(--apex-state-alert-text)]'
            : 'text-[color:var(--apex-state-success-text)]',
          status === 'idle' && 'invisible',
        )}
      >
        {status !== 'idle' && (
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {statusLabel}
          </span>
        )}
      </p>
    </div>
  );
}

function PreviewStat({ icon: Icon, value }: { icon: LucideIcon; value: string }) {
  return (
    <div className="min-w-[92px] flex-1 rounded-xl bg-[color:var(--apex-fill)] px-2 py-2.5 text-center">
      <Icon className="mx-auto h-4 w-4 text-[color:var(--apex-text-secondary)]" aria-hidden="true" />
      <p className="mt-1 text-sm font-bold tabular-nums text-[color:var(--apex-text)]">{value}</p>
    </div>
  );
}

export default SocialShare;
