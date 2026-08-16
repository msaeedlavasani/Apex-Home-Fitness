import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';

import {LoginForm} from '@/components/auth/LoginForm';

/**
 * /[locale]/auth/login — phone → OTP request screen (public).
 *
 * Thin server component: localized metadata + the client `LoginForm` which
 * owns phone validation, the request-code call and the hand-off to the verify
 * step (via sessionStorage, keeping the phone number out of the URL).
 *
 * `force-dynamic` mirrors the Profile page convention: auth pages must always
 * be server-rendered per request so middleware redirects (signed-in users are
 * bounced to the dashboard) can't race a static prerender.
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

export default function AuthLoginPage() {
  return <LoginForm />;
}
