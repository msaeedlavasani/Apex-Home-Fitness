'use client';

import {useCallback} from 'react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/platform';
import {cn} from '@/lib/cn';

export interface CameraTrackingIndicatorProps {
  /** Whether camera tracking is currently active. */
  active: boolean;
  /** Fired when the user revokes consent / turns off tracking. */
  onRevoke: () => void;
  className?: string;
}

export function CameraTrackingIndicator({
  active,
  onRevoke,
  className,
}: CameraTrackingIndicatorProps) {
  const t = useTranslations('CameraConsent');

  const handleRevoke = useCallback(() => {
    onRevoke();
  }, [onRevoke]);

  if (!active) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl bg-apex-primary-soft px-4 py-3',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={t('trackingActive')}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-apex-primary opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-apex-primary" />
        </span>
        <span className="text-sm font-medium text-apex-text">{t('trackingActive')}</span>
      </div>
      <Button variant="text" size="sm" onClick={handleRevoke} aria-label={t('revokeConsent')}>
        {t('revokeConsent')}
      </Button>
    </div>
  );
}
