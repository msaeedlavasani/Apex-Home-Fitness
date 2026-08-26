import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';

import {ProfileView, type ProfileUser} from './ProfileView';

/**
 * /[locale]/profile — the user's profile & settings screen (Apple HIG).
 *
 * This page is a thin server component: it resolves the signed-in user's
 * profile (email / goal / level) through `userService` and hands it to the
 * client `ProfileView`, which owns all interactivity (language switch, theme
 * switch, logout).
 *
 * `force-dynamic` keeps this page server-rendered per request so auth cookies
 * are always evaluated fresh — the profile view must never ship as a stale
 * static prerender of a signed-in state.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Profile'});
  return {title: t('metaTitle')};
}

export default async function ProfilePage() {
  // Best-effort profile fetch. If Supabase/Prisma are not configured or there
  // is no session, the view falls back to a graceful signed-out state while
  // Preferences & Support stay fully usable.
  let user: ProfileUser | null = null;
  try {
    const {getCurrentUserProfile} = await import('@/services/userService');
    const {resolveAvatarUrl} = await import('@/services/avatarStorage');
    const profile = await getCurrentUserProfile();
    user = {
      email: profile.profileEmail ?? profile.email,
      authEmail: profile.email,
      weightHistory: profile.weightEntries ?? [],
      name: profile.name,
      // The verified phone used to sign in (canonical `+98…` form).
      phone: profile.phone ?? null,
      // Legacy rows carry a data URL (returned as-is); storage rows resolve
      // to a fresh signed URL. null when signing fails — never an error.
      avatarUrl: await resolveAvatarUrl(profile.avatarUrl),
      fitnessGoal: profile.fitnessGoal ?? null,
      fitnessLevel: profile.fitnessLevel ?? null,
      heightCm: profile.heightCm ?? null,
      weightKg: profile.weightKg ?? null,
    };
  } catch {
    user = null;
  }

  return <ProfileView user={user} />;
}
