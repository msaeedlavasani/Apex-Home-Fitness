'use client';

import {useState, type ReactNode} from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {ChevronRight, CircleHelp, LifeBuoy, Loader2, LogOut, Mail, Monitor, Moon, Pencil, Save, Sun, Target, TrendingUp, UserRound, type LucideIcon} from 'lucide-react';
import {useTheme, type Theme} from '@/components/providers/ThemeProvider';
import {createBrowserSupabaseClient} from '@/lib/supabase';
import {AppShell} from '@/components/layout/AppShell';

export interface ProfileUser {
  email: string;
  authEmail?: string;
  name: string | null;
  fitnessGoal: string | null;
  fitnessLevel: string | null;
  heightCm: number | null;
  weightKg: number | null;
  weightHistory?: Array<{id: string; weightKg: number; recordedAt: Date | string}>;
}

const LOCALES = ['en', 'fa'] as const;
type AppLocale = (typeof LOCALES)[number];
const GOAL_KEYS = ['strength', 'fat_loss', 'flexibility', 'functional_fitness'] as const;
const LEVEL_KEYS = ['beginner', 'intermediate', 'advanced'] as const;
const THEME_OPTIONS: {key: Theme; icon: LucideIcon}[] = [
  {key: 'light', icon: Sun}, {key: 'dark', icon: Moon}, {key: 'system', icon: Monitor},
];
const FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apple-blue';

export function ProfileView({user}: {user: ProfileUser | null}) {
  const t = useTranslations('Profile');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const {theme, setTheme} = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState(false);

  function switchLocale(next: AppLocale) {
    if (next === locale) return;
    const prefix = `/${locale}`;
    const rest = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname;
    router.replace(rest === '' ? `/${next}` : `/${next}${rest}`);
  }

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const response = await fetch('/api/auth/logout', {method: 'POST'});
      if (!response.ok) throw new Error('logout route failed');
    } catch {
      try { await createBrowserSupabaseClient().auth.signOut(); } catch { /* best effort */ }
    }
    router.replace(`/${locale}/quiz`);
    router.refresh();
  }

  return (
    <AppShell title={t('title')} subtitle={t('subtitle')} backHref={`/${locale}/dashboard`}>
      <div className="-mx-4 min-h-dvh bg-apple-grouped-background px-4 pb-8 sm:-mx-6 sm:px-6 md:-mx-10 md:px-10">
        <div className="mx-auto w-full max-w-md sm:max-w-lg md:max-w-xl">
          {user ? <ProfileSummaryCard user={user} onEdit={() => {setProfileError(false); setEditing(true);}} editLabel={t('edit')} /> : <SignedOutCard />}
          {user && editing ? (
            <ProfileEditor
              user={user}
              saving={savingProfile}
              error={profileError}
              labels={{
                title: t('editTitle'), save: t('saveChanges'), cancel: t('cancel'),
                name: t('fields.name'), email: t('fields.email'), height: t('fields.height'), weight: t('fields.weight'),
                goal: t('userInfo.goal'), level: t('userInfo.level'), weightHistory: t('weightHistory.title'),
                error: t('editError'),
                goals: Object.fromEntries(GOAL_KEYS.map((id) => [id, t(`goals.${id}`)])),
                levels: Object.fromEntries(LEVEL_KEYS.map((id) => [id, t(`levels.${id}`)])),
              }}
              onCancel={() => setEditing(false)}
              onSaved={() => {setEditing(false); router.refresh();}}
              onSavingChange={setSavingProfile}
              onError={() => setProfileError(true)}
            />
          ) : null}

          {user ? (
            <Section title={t('sections.userInfo')}>
              <div className="divide-y divide-apple-separator">
                <InfoRow icon={Mail} chip="text-apple-blue" label={t('userInfo.email')} value={user.email || t('notSet')} />
                <InfoRow icon={Target} chip="text-apple-orange" label={t('userInfo.goal')} value={goalLabel(t, user.fitnessGoal)} />
                <InfoRow icon={TrendingUp} chip="text-apple-purple" label={t('userInfo.level')} value={levelLabel(t, user.fitnessLevel)} />
              </div>
            </Section>
          ) : null}

          {user?.weightHistory?.length ? (
            <Section title={t('weightHistory.title')}>
              <div className="divide-y divide-apple-separator">
                {user.weightHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between px-4 py-3 text-[15px] sm:px-5">
                    <span className="text-apple-label-secondary" dir="auto">{new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {dateStyle: 'medium'}).format(new Date(entry.recordedAt))}</span>
                    <strong className="text-apple-label" dir="ltr">{entry.weightKg} {t('weightHistory.unit')}</strong>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          <Section title={t('sections.preferences')}>
            <div className="divide-y divide-apple-separator">
              <PreferenceRow label={t('preferences.language')}>
                <Segmented ariaLabel={t('preferences.language')} options={LOCALES.map((code) => ({key: code, label: t(`preferences.languageOptions.${code}`)}))} value={locale} onChange={(code) => switchLocale(code as AppLocale)} />
              </PreferenceRow>
              <PreferenceRow label={t('preferences.appearance')}>
                <Segmented ariaLabel={t('preferences.appearance')} options={THEME_OPTIONS.map(({key, icon}) => ({key, icon, label: t(`preferences.themeOptions.${key}`)}))} value={theme} onChange={setTheme} />
              </PreferenceRow>
            </div>
          </Section>

          <Section title={t('sections.support')}>
            <div className="divide-y divide-apple-separator">
              <LinkRow href={`mailto:${t('support.contactValue')}`} icon={LifeBuoy} chip="text-apple-blue" label={t('support.contact')} value={t('support.contactValue')} />
              <LinkRow href={`/${locale}/faq`} icon={CircleHelp} chip="text-apple-teal" label={t('support.faq')} />
            </div>
          </Section>

          {user ? (
            <Section title={t('sections.account')}>
              <button type="button" onClick={handleLogout} disabled={signingOut} className={`flex w-full items-center justify-center gap-2 px-4 py-4 text-[15px] font-semibold text-apple-red transition-colors touch-manipulation ${FOCUS_RING} ${signingOut ? 'cursor-wait opacity-60' : 'hover:bg-apple-fill active:bg-apple-fill-secondary'}`}>
                {signingOut ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <LogOut className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />}
                {signingOut ? t('logout.signingOut') : t('logout.label')}
              </button>
            </Section>
          ) : null}
          <footer className="mt-8 text-center text-xs text-apple-label-tertiary">{t('footer')}</footer>
        </div>
      </div>
    </AppShell>
  );
}

function ProfileSummaryCard({user, onEdit, editLabel}: {user: ProfileUser; onEdit: () => void; editLabel: string}) {
  return <div className="flex items-center gap-4 rounded-3xl border border-apple-separator bg-apple-grouped-background-secondary p-5 shadow-apple-sm sm:p-6"><div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-apple-blue to-apple-purple text-lg font-bold text-white shadow-apple-glow sm:h-16 sm:w-16 sm:text-xl">{initialsOf(user)}</div><div className="min-w-0 flex-1"><p className="truncate text-lg font-bold tracking-tight sm:text-xl">{user.name?.trim() || user.email || user.authEmail}</p><p className="mt-0.5 truncate text-sm text-apple-label-secondary" dir="auto">{user.email || user.authEmail}</p></div><button type="button" onClick={onEdit} aria-label={editLabel} className={`rounded-xl p-2 text-apple-blue hover:bg-apple-fill ${FOCUS_RING}`}><Pencil className="h-5 w-5" aria-hidden="true" /></button></div>;
}

type EditorLabels = {title: string; save: string; cancel: string; name: string; email: string; height: string; weight: string; goal: string; level: string; weightHistory: string; error: string; goals: Record<string, string>; levels: Record<string, string>};
function ProfileEditor({user, labels, saving, error, onCancel, onSaved, onSavingChange, onError}: {user: ProfileUser; labels: EditorLabels; saving: boolean; error: boolean; onCancel: () => void; onSaved: () => void; onSavingChange: (saving: boolean) => void; onError: () => void}) {
  const [email, setEmail] = useState(user.email);
  const [name, setName] = useState(user.name ?? '');
  const [heightCm, setHeightCm] = useState(user.heightCm?.toString() ?? '');
  const [weightKg, setWeightKg] = useState(user.weightKg?.toString() ?? '');
  const [fitnessGoals, setFitnessGoals] = useState<string[]>(user.fitnessGoal?.split(',').map((value) => value.trim()).filter(Boolean) ?? []);
  const [fitnessLevel, setFitnessLevel] = useState(user.fitnessLevel?.toLowerCase() ?? 'beginner');

  function toggleGoal(goal: string) { setFitnessGoals((current) => current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]); }
  async function save() {
    onSavingChange(true);
    try {
      const response = await fetch('/api/profile', {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, name, heightCm: heightCm ? Number(heightCm) : null, weightKg: weightKg ? Number(weightKg) : null, fitnessGoal: fitnessGoals, fitnessLevel})});
      if (!response.ok) throw new Error('profile update failed');
      onSaved();
    } catch { onError(); } finally { onSavingChange(false); }
  }
  return <section aria-label={labels.title} className="mt-5 rounded-3xl border border-apple-separator bg-apple-grouped-background-secondary p-5 shadow-apple-sm"><h2 className="text-base font-bold">{labels.title}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label={labels.email}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input-apple mt-1" dir="ltr" /></Field><Field label={labels.name} className="sm:col-span-2"><input value={name} onChange={(event) => setName(event.target.value)} className="input-apple mt-1" /></Field><Field label={labels.height}><input type="number" min="80" max="260" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} className="input-apple mt-1" /></Field><Field label={labels.weight}><input type="number" min="25" max="400" step="0.1" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} className="input-apple mt-1" /></Field><fieldset className="sm:col-span-2"><legend className="text-sm text-apple-label-secondary">{labels.goal}</legend><div className="mt-2 grid grid-cols-2 gap-2">{Object.entries(labels.goals).map(([id, label]) => <label key={id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${fitnessGoals.includes(id) ? 'border-apple-blue bg-apple-blue/15 text-apple-label' : 'border-apple-separator text-apple-label-secondary hover:bg-apple-fill'}`}><input type="checkbox" checked={fitnessGoals.includes(id)} onChange={() => toggleGoal(id)} className="h-4 w-4" />{label}</label>)}</div></fieldset><Field label={labels.level}><select value={fitnessLevel} onChange={(event) => setFitnessLevel(event.target.value)} className="input-apple mt-1">{Object.entries(labels.levels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field></div>{error ? <p role="alert" className="mt-3 text-sm text-apple-red">{labels.error}</p> : null}<div className="mt-4 flex gap-2"><button type="button" onClick={onCancel} disabled={saving} className="flex-1 rounded-xl border border-apple-separator px-4 py-3 font-semibold">{labels.cancel}</button><button type="button" onClick={() => void save()} disabled={saving || name.trim().length < 2 || fitnessGoals.length === 0} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-apple-blue px-4 py-3 font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}{labels.save}</button></div></section>;
}

function Field({label, children, className = ''}: {label: string; children: ReactNode; className?: string}) { return <label className={className}><span className="text-sm text-apple-label-secondary">{label}</span>{children}</label>; }
function SignedOutCard() { const t = useTranslations('Profile'); const locale = useLocale(); return <div className="rounded-3xl border border-apple-separator bg-apple-grouped-background-secondary p-6 text-center shadow-apple-sm"><UserRound className="mx-auto h-9 w-9 text-apple-label-tertiary" aria-hidden="true" /><h2 className="mt-3 text-lg font-bold tracking-tight">{t('unauthenticated.title')}</h2><p className="mt-1 text-sm leading-relaxed text-apple-label-secondary">{t('unauthenticated.message')}</p><Link href={`/${locale}/auth/login?force=1`} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-apple-blue px-5 py-2.5 text-[15px] font-semibold text-white hover:opacity-90">{t('unauthenticated.signIn')}</Link></div>; }
function Section({title, children}: {title: string; children: ReactNode}) { return <section aria-label={title} className="mt-6"><h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-apple-label-secondary sm:px-5">{title}</h2><div className="mt-1.5 overflow-hidden rounded-2xl border border-apple-separator bg-apple-grouped-background-secondary shadow-apple-sm sm:rounded-3xl">{children}</div></section>; }
function InfoRow({icon: Icon, chip, label, value}: {icon: LucideIcon; chip: string; label: string; value: string}) { return <div className="flex items-center gap-3 px-4 py-3 sm:px-5"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-apple-fill ${chip}`}><Icon className="h-4 w-4" aria-hidden="true" /></span><span className="text-[15px] text-apple-label-secondary">{label}</span><span className="ms-auto min-w-0 text-end text-[15px] font-medium leading-snug text-apple-label" dir="auto">{value}</span></div>; }
function LinkRow({href, icon: Icon, chip, label, value}: {href: string; icon: LucideIcon; chip: string; label: string; value?: string}) { return <Link href={href} className={`flex items-center gap-3 px-4 py-3 transition-colors touch-manipulation hover:bg-apple-fill sm:px-5 ${FOCUS_RING}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-apple-fill ${chip}`}><Icon className="h-4 w-4" aria-hidden="true" /></span><span className="text-[15px] text-apple-label">{label}</span>{value ? <span className="ms-auto min-w-0 truncate text-[15px] text-apple-label-secondary" dir="auto">{value}</span> : null}<ChevronRight className="h-4 w-4 shrink-0 text-apple-label-tertiary rtl:rotate-180" aria-hidden="true" /></Link>; }
function PreferenceRow({label, children}: {label: string; children: ReactNode}) { return <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3.5 sm:px-5"><span className="text-[15px] text-apple-label">{label}</span><div className="ms-auto w-full min-w-48 sm:w-auto sm:min-w-0">{children}</div></div>; }
function Segmented<T extends string>({ariaLabel, options, value, onChange}: {ariaLabel: string; options: {key: T; label: string; icon?: LucideIcon}[]; value: T; onChange: (key: T) => void}) { return <div role="radiogroup" aria-label={ariaLabel} className="flex w-full gap-1 rounded-xl bg-apple-fill p-1 sm:w-auto">{options.map(({key, label, icon: Icon}) => <button key={key} type="button" role="radio" aria-checked={key === value} onClick={() => onChange(key)} className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors touch-manipulation sm:flex-none ${FOCUS_RING} ${key === value ? 'bg-apple-grouped-background-secondary text-apple-label shadow-sm' : 'text-apple-label-secondary hover:text-apple-label'}`}>{Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}{label}</button>)}</div>; }
function initialsOf(user: ProfileUser): string { const source = user.name?.trim() || user.email || '?'; const parts = source.split(/[\s._-]+/).filter(Boolean); return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : source.slice(0, 2).toUpperCase(); }
function goalLabel(t: (key: string) => string, goal: string | null): string { if (!goal) return t('notSet'); const values = goal.split(',').map((item) => item.trim()).filter(Boolean).map((item) => GOAL_KEYS.includes(item as typeof GOAL_KEYS[number]) ? t(`goals.${item}`) : item); return values.join('، '); }
function levelLabel(t: (key: string) => string, level: string | null): string { if (!level) return t('notSet'); const key = level.trim().toLowerCase(); return LEVEL_KEYS.includes(key as typeof LEVEL_KEYS[number]) ? t(`levels.${key}`) : level; }
