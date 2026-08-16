import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';

import {VerifyForm} from '@/components/auth/VerifyForm';

/**
 * /[locale]/auth/verify — OTP code entry screen (public).
 *
 * Reads the pending flow state (phone / next target) from sessionStorage in
 * the client `VerifyForm`; users who land here without a pending request are
 * sent back to login. Owns the 6-digit input, the resend countdown, inline
 * errors (aria-live) and the post-verify redirect (allowlisted).
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Auth'});
  return {title: t('metaTitle')};
}

export default function AuthVerifyPage() {
  return <VerifyForm />;
}
