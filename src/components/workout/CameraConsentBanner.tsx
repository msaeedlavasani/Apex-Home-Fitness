'use client';

import {useCallback, useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Card, Button, Switch} from '@/components/ui/platform';
import {ConsentEntity, type ConsentScope} from '@/lib/workout/consentEntity';

export interface CameraConsentBannerProps {
  /** Available scopes for this workout (filtered to relevant movements). */
  scopes: readonly ConsentScope[];
  /** Consent version (bump when consent terms change). */
  version: number;
  /** Fired when the user changes consent. */
  onConsentChange: (snapshot: {consented: boolean; scopes: readonly ConsentScope[]; version: number}) => void;
  /** Fired when the user explicitly chooses to start without camera. */
  onStartWithoutCamera?: () => void;
  className?: string;
}



export function CameraConsentBanner({
  scopes,
  version,
  onConsentChange,
  onStartWithoutCamera,
  className,
}: CameraConsentBannerProps) {
  const t = useTranslations('CameraConsent');
  const entity = useMemo(() => new ConsentEntity(), []);
  const [enabledScopes, setEnabledScopes] = useState<ConsentScope[]>([]);

  const handleScopeToggle = useCallback((scope: ConsentScope, checked: boolean) => {
    setEnabledScopes((prev) => {
      const next = checked ? [...prev, scope] : prev.filter((s) => s !== scope);
      const snapshot = entity.grant(next, version);
      onConsentChange({
        consented: snapshot.consented,
        scopes: snapshot.scopes,
        version: snapshot.version,
      });
      return next;
    });
  }, [entity, version, onConsentChange]);

  const handleGrant = useCallback(() => {
    const snapshot = entity.grant(enabledScopes, version);
    onConsentChange({
      consented: snapshot.consented,
      scopes: snapshot.scopes,
      version: snapshot.version,
    });
  }, [entity, enabledScopes, version, onConsentChange]);

  const handleRevokeAndStartWithoutCamera = useCallback(() => {
    entity.revoke();
    onConsentChange({consented: false, scopes: [], version});
    onStartWithoutCamera?.();
  }, [entity, version, onConsentChange, onStartWithoutCamera]);

  const hasSelection = enabledScopes.length > 0;

  return (
    <Card variant="tonal" size="md" className={className} role="region" aria-label={t('bannerTitle')}>
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-apex-text">{t('bannerTitle')}</h3>
          <p className="mt-1 text-sm text-apex-text-secondary">{t('bannerDescription')}</p>
        </div>

        <div className="flex flex-col gap-3">
          {scopes.map((scope) => (
            <Switch
              key={scope}
              label={t(scope)}
              description={t('scopeDescription')}
              checked={enabledScopes.includes(scope)}
              onCheckedChange={(checked) => handleScopeToggle(scope, checked)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="filled"
            tone="primary"
            onClick={handleGrant}
            disabled={!hasSelection}
            className="w-full sm:w-auto"
          >
            {t('enableCamera')}
          </Button>
          <Button
            variant="tonal"
            onClick={handleRevokeAndStartWithoutCamera}
            className="w-full sm:w-auto"
          >
            {t('startWithoutCamera')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
