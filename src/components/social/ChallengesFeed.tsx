'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Activity,
  CalendarDays,
  Dumbbell,
  Flame,
  Share2,
  Timer,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  Button,
  Card,
  SegmentedControl,
  type SegmentedOption,
} from '@/components/ui/platform';
import { SocialShare, type WorkoutShareResult } from './SocialShare';
import { cn } from '@/lib/cn';

/**
 * ChallengesFeed
 * --------------
 * The interactive "Challenges" community feed shell.
 *
 * Layout (top → bottom):
 *   1. A share CTA card embedding <SocialShare> so the user can post their
 *      latest workout result straight from the feed.
 *   2. A platform-native <SegmentedControl> to filter the feed
 *      (Active / All / Joined).
 *   3. The feed itself: platform <Card>s with challenge icon, title,
 *      difficulty badge, goal progress bar, participants, days-left and a
 *      Join/Joined toggle.
 *   4. A localized empty state when a filter has no matches.
 *
 * Challenge data is sample content (mirroring the WEEK_PLAN pattern in the
 * dashboard) — swap for a real Challenges API / Prisma model once the social
 * data layer is wired up. Every user-facing string is bilingual (en / fa)
 * through the `Challenges` next-intl namespace; surfaces use the Apex
 * design tokens so the shell renders natively on iOS, Android and Web and
 * adapts to RTL and Light/Dark automatically.
 */

type FeedTab = 'active' | 'all' | 'joined';
type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface Challenge {
  id: string;
  /** Key into messages `Challenges.items.<id>.*`. */
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  difficulty: Difficulty;
  /** Goal units (sessions, push-ups, minutes…). */
  goal: number;
  /** The user's current progress toward `goal`. */
  progress: number;
  participants: number;
  daysLeft: number;
  joined: boolean;
  /** Finished challenges only show in the "All" tab. */
  completed?: boolean;
}

/** Sample feed content — swap for live data when the API lands. */
const SAMPLE_CHALLENGES: Challenge[] = [
  {
    id: 'hiitSprint',
    titleKey: 'hiitSprint',
    descriptionKey: 'hiitSprint',
    icon: Flame,
    difficulty: 'intermediate',
    goal: 12,
    progress: 5,
    participants: 1240,
    daysLeft: 21,
    joined: true,
  },
  {
    id: 'pushUpProgression',
    titleKey: 'pushUpProgression',
    descriptionKey: 'pushUpProgression',
    icon: Dumbbell,
    difficulty: 'beginner',
    goal: 200,
    progress: 140,
    participants: 890,
    daysLeft: 4,
    joined: true,
  },
  {
    id: 'morningMobility',
    titleKey: 'morningMobility',
    descriptionKey: 'morningMobility',
    icon: Activity,
    difficulty: 'beginner',
    goal: 5,
    progress: 2,
    participants: 460,
    daysLeft: 6,
    joined: false,
  },
  {
    id: 'sevenDayStreak',
    titleKey: 'sevenDayStreak',
    descriptionKey: 'sevenDayStreak',
    icon: Zap,
    difficulty: 'advanced',
    goal: 7,
    progress: 3,
    participants: 2105,
    daysLeft: 5,
    joined: false,
  },
  {
    id: 'plankMarathon',
    titleKey: 'plankMarathon',
    descriptionKey: 'plankMarathon',
    icon: Timer,
    difficulty: 'intermediate',
    goal: 5,
    progress: 5,
    participants: 320,
    daysLeft: 2,
    joined: true,
    completed: true,
  },
];

/** Difficulty → workout-state tone (DESIGN_SYSTEM.md §5). */
const DIFFICULTY_TONE: Record<Difficulty, { soft: string; text: string }> = {
  beginner: {
    soft: 'bg-[color:var(--apex-state-success-soft)]',
    text: 'text-[color:var(--apex-state-success-text)]',
  },
  intermediate: {
    soft: 'bg-[color:var(--apex-state-rest-soft)]',
    text: 'text-[color:var(--apex-state-rest-text)]',
  },
  advanced: {
    soft: 'bg-[color:var(--apex-state-alert-soft)]',
    text: 'text-[color:var(--apex-state-alert-text)]',
  },
};

export function ChallengesFeed() {
  const t = useTranslations('Challenges');

  const [tab, setTab] = useState<FeedTab>('active');

  // Join state lives in the component so tapping Join toggles instantly
  // (persistence hooks up to the user service / API later).
  const [joinedIds, setJoinedIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      SAMPLE_CHALLENGES.filter((c) => c.joined).map((c) => [c.id, true]),
    ),
  );

  const toggleJoin = (id: string) =>
    setJoinedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const visibleChallenges = useMemo(() => {
    switch (tab) {
      case 'active':
        return SAMPLE_CHALLENGES.filter((c) => !c.completed);
      case 'all':
        return SAMPLE_CHALLENGES;
      case 'joined':
        return SAMPLE_CHALLENGES.filter((c) => joinedIds[c.id]);
    }
  }, [tab, joinedIds]);

  // Demo workout result for the share CTA — replace with the last completed
  // session (WorkoutSession / offline exercise logs) when wired up.
  const demoResult: WorkoutShareResult = useMemo(
    () => ({
      title: t('demo.workoutTitle'),
      badge: t('completed'),
      durationSeconds: 30 * 60,
      calories: 280,
      totalSets: 6,
      completedSets: 6,
      totalExercises: 6,
    }),
    [t],
  );

  const tabOptions: SegmentedOption<FeedTab>[] = [
    { value: 'active', label: t('tabs.active') },
    { value: 'all', label: t('tabs.all') },
    { value: 'joined', label: t('tabs.joined') },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* ---- Share CTA ---- */}
      <Card variant="tonal" size="md">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-apex-primary text-apex-on-primary shadow-sm">
            <Share2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold leading-snug text-[color:var(--apex-text)]">
              {t('shareCard.title')}
            </h2>
            <p className="mt-0.5 text-[13px] leading-snug text-[color:var(--apex-text-secondary)]">
              {t('shareCard.description')}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <SocialShare result={demoResult} />
        </div>
      </Card>

      {/* ---- Feed header + filter ---- */}
      <section aria-label={t('feedTitle')}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--apex-text-secondary)]">
            <Trophy className="h-4 w-4 text-[color:var(--apex-primary-text)]" aria-hidden="true" />
            {t('feedTitle')}
          </h2>
        </div>

        <SegmentedControl
          aria-label={t('tabsLabel')}
          options={tabOptions}
          value={tab}
          onChange={setTab}
        />

        {/* ---- Feed ---- */}
        <div className="mt-4 space-y-3.5">
          {visibleChallenges.length === 0 ? (
            <Card variant="outlined" size="lg" className="text-center">
              <Trophy
                className="mx-auto h-10 w-10 text-[color:var(--apex-text-secondary)]"
                aria-hidden="true"
              />
              <h3 className="mt-3 text-[17px] font-semibold text-[color:var(--apex-text)]">
                {t('empty.title')}
              </h3>
              <p className="mt-1 text-sm text-[color:var(--apex-text-secondary)]">
                {t('empty.description')}
              </p>
            </Card>
          ) : (
            visibleChallenges.map((challenge) => {
              const isJoined = joinedIds[challenge.id] === true;
              const tone = DIFFICULTY_TONE[challenge.difficulty];
              const pct = Math.min(100, Math.round((challenge.progress / challenge.goal) * 100));
              const Icon = challenge.icon;

              return (
                <Card key={challenge.id} variant="glass" size="md">
                  {/* Header: icon + title + difficulty / completed badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--apex-primary-soft)]">
                        <Icon
                          className="h-5 w-5 text-[color:var(--apex-primary-text)]"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-[17px] font-semibold leading-snug text-[color:var(--apex-text)]">
                          {t(`items.${challenge.titleKey}.title`)}
                        </h3>
                        <span
                          className={cn(
                            'mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            tone.soft,
                            tone.text,
                          )}
                        >
                          {t(`difficulty.${challenge.difficulty}`)}
                        </span>
                      </div>
                    </div>
                    {challenge.completed && (
                      <span className="shrink-0 rounded-full bg-[color:var(--apex-state-success-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--apex-state-success-text)]">
                        {t('completed')}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-3 text-sm leading-relaxed text-[color:var(--apex-text-secondary)]">
                    {t(`items.${challenge.descriptionKey}.description`)}
                  </p>

                  {/* Goal progress */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-medium text-[color:var(--apex-text-secondary)]">
                      <span>
                        {t('meta.progress', {
                          done: Math.min(challenge.progress, challenge.goal),
                          total: challenge.goal,
                        })}
                      </span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t(`items.${challenge.titleKey}.title`)}
                      className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[color:var(--apex-fill)]"
                    >
                      <div
                        className="h-full rounded-full bg-apex-primary transition-[width] duration-300 ease-apple-ease"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer: meta + join action */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--apex-text-secondary)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('meta.participants', { count: challenge.participants })}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('meta.daysLeft', { count: challenge.daysLeft })}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={isJoined ? 'tonal' : 'filled'}
                      onClick={() => toggleJoin(challenge.id)}
                    >
                      {isJoined ? t('joined') : t('join')}
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

export default ChallengesFeed;
