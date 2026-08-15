'use client';

/**
 * ExerciseLibraryPage — enhanced video library.
 * -------------------------------------------------
 * Browse the exercise catalog with search + category filters, then play any
 * exercise in a focused modal player powered by `<VideoPlayer>` (HLS via
 * hls.js, native fallback, high-visibility platform controls, offline
 * download placeholder).
 *
 * Follows the Apex Platform Design System: AppShell chrome, Card surfaces,
 * TextField, SegmentedControl, Button, Slider and brand tokens. Fully
 * bilingual (en / fa) through next-intl; RTL-safe (logical spacing).
 */

import {useEffect, useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Clock, Dumbbell, Play, Search, X} from 'lucide-react';
import {AppShell} from '@/components/layout/AppShell';
import {Button, Card, SegmentedControl, TextField} from '@/components/ui/platform';
import type {SegmentedOption} from '@/components/ui/platform';
import {VideoPlayer} from '@/components/video/VideoPlayer';
import {cn} from '@/lib/cn';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

type Category = 'all' | 'strength' | 'cardio' | 'mobility' | 'yoga';
type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface Exercise {
  id: string;
  /** Key into messages `Library.exercises.*`. */
  nameKey: string;
  category: Exclude<Category, 'all'>;
  difficulty: Difficulty;
  durationMin: number;
  /** Key into messages `Library.equipment.*`. */
  equipmentKey: string;
  videoSrc: string;
  videoType: 'hls' | 'mp4';
  poster?: string;
}

/* ------------------------------------------------------------------ *
 * Sample catalog — demo streams (public, CORS-enabled).
 * Swap `videoSrc` for real assets from your CMS / Supabase storage.
 * ------------------------------------------------------------------ */

const HLS_DEMO = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

const EXERCISES: Exercise[] = [
  {
    id: 'push-ups',
    nameKey: 'pushUps',
    category: 'strength',
    difficulty: 'beginner',
    durationMin: 8,
    equipmentKey: 'none',
    videoSrc: HLS_DEMO,
    videoType: 'hls',
  },
  {
    id: 'squats',
    nameKey: 'squats',
    category: 'strength',
    difficulty: 'beginner',
    durationMin: 10,
    equipmentKey: 'none',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    videoType: 'mp4',
    poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
  },
  {
    id: 'glute-bridge',
    nameKey: 'gluteBridge',
    category: 'strength',
    difficulty: 'beginner',
    durationMin: 8,
    equipmentKey: 'mat',
    videoSrc: HLS_DEMO,
    videoType: 'hls',
  },
  {
    id: 'lunges',
    nameKey: 'lunges',
    category: 'strength',
    difficulty: 'intermediate',
    durationMin: 12,
    equipmentKey: 'none',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    videoType: 'mp4',
    poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg',
  },
  {
    id: 'burpees',
    nameKey: 'burpees',
    category: 'cardio',
    difficulty: 'advanced',
    durationMin: 15,
    equipmentKey: 'none',
    videoSrc: HLS_DEMO,
    videoType: 'hls',
  },
  {
    id: 'jumping-jacks',
    nameKey: 'jumpingJacks',
    category: 'cardio',
    difficulty: 'beginner',
    durationMin: 6,
    equipmentKey: 'none',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    videoType: 'mp4',
    poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg',
  },
  {
    id: 'mountain-climbers',
    nameKey: 'mountainClimbers',
    category: 'cardio',
    difficulty: 'intermediate',
    durationMin: 10,
    equipmentKey: 'mat',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    videoType: 'mp4',
    poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg',
  },
  {
    id: 'plank',
    nameKey: 'plank',
    category: 'mobility',
    difficulty: 'beginner',
    durationMin: 5,
    equipmentKey: 'mat',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    videoType: 'mp4',
    poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg',
  },
  {
    id: 'hip-mobility',
    nameKey: 'hipMobility',
    category: 'mobility',
    difficulty: 'beginner',
    durationMin: 7,
    equipmentKey: 'mat',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    videoType: 'mp4',
    poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg',
  },
  {
    id: 'yoga-flow',
    nameKey: 'yogaFlow',
    category: 'yoga',
    difficulty: 'beginner',
    durationMin: 20,
    equipmentKey: 'mat',
    videoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    videoType: 'mp4',
    poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/WeAreGoingOnBullrun.jpg',
  },
];

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  beginner: 'bg-emerald-400/20 text-emerald-600 dark:text-emerald-300',
  intermediate: 'bg-amber-400/20 text-amber-600 dark:text-amber-300',
  advanced: 'bg-rose-400/20 text-rose-600 dark:text-rose-300',
};

const CATEGORY_GRADIENT: Record<Exclude<Category, 'all'>, string> = {
  strength: 'from-rose-500 to-orange-500',
  cardio: 'from-sky-500 to-indigo-500',
  mobility: 'from-emerald-500 to-teal-500',
  yoga: 'from-violet-500 to-fuchsia-500',
};

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

export default function ExerciseLibraryPage() {
  const t = useTranslations('Library');
  const td = useTranslations('Dashboard');

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [selected, setSelected] = useState<Exercise | null>(null);

  /* Close the player modal with the Escape key. */
  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const categoryOptions = useMemo<SegmentedOption<Category>[]>(() => {
    const values: Category[] = ['all', 'strength', 'cardio', 'mobility', 'yoga'];
    return values.map((value) => ({value, label: t(`categories.${value}`)}));
  }, [t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((exercise) => {
      const inCategory = category === 'all' || exercise.category === category;
      if (!inCategory) return false;
      if (!q) return true;
      const name = t(`exercises.${exercise.nameKey}`).toLowerCase();
      const equipment = t(`equipment.${exercise.equipmentKey}`).toLowerCase();
      const categoryLabel = t(`categories.${exercise.category}`).toLowerCase();
      return name.includes(q) || equipment.includes(q) || categoryLabel.includes(q);
    });
  }, [query, category, t]);

  return (
    <AppShell
      overline={t('overline')}
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <div className="mx-auto w-full max-w-md px-4 sm:max-w-lg md:max-w-4xl">
        {/* Search + filters */}
        <div className="sticky top-0 z-30 -mx-4 bg-[color:var(--app-background)] px-4 pb-3 pt-1 shadow-sm shadow-black/5 backdrop-blur-md">
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchLabel')}
            startAdornment={<Search className="h-4 w-4" aria-hidden="true" />}
            endAdornment={
              query ? (
                <button
                  type="button"
                  aria-label={t('clearSearch')}
                  onClick={() => setQuery('')}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-apex-fill text-apex-text-secondary transition-colors hover:bg-apex-primary-soft hover:text-apex-primary-text"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : undefined
            }
            className="mb-3"
          />

          <SegmentedControl
            options={categoryOptions}
            value={category}
            onChange={setCategory}
            aria-label={t('categoryLabel')}
          />
        </div>

        {/* Results count */}
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-apex-text-secondary" role="status">
          {t('resultsCount', {count: filtered.length})}
        </p>

        {/* Exercise grid */}
        {filtered.length > 0 ? (
          <ul className="mt-3 grid grid-cols-1 gap-4 pb-8 sm:grid-cols-2 md:grid-cols-3">
            {filtered.map((exercise) => {
              const name = t(`exercises.${exercise.nameKey}`);
              const categoryGradient = CATEGORY_GRADIENT[exercise.category];
              return (
                <li key={exercise.id}>
                  <Card
                    variant="glass"
                    interactive
                    onClick={() => setSelected(exercise)}
                    className="group h-full overflow-hidden p-0"
                    aria-label={t('openPlayer', {name})}
                  >
                    {/* Thumbnail placeholder (no external asset dependency) */}
                    <div className="relative flex aspect-video items-center justify-center overflow-hidden">
                      <div
                        className={cn(
                          'absolute inset-0 bg-gradient-to-br transition-transform duration-300 ease-apple-ease group-hover:scale-105',
                          categoryGradient
                        )}
                        aria-hidden="true"
                      />
                      <Dumbbell
                        className="relative h-10 w-10 text-white/70 drop-shadow-lg"
                        aria-hidden="true"
                      />
                      {/* Duration chip */}
                      <span className="absolute start-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {td('units.minutes', {count: exercise.durationMin})}
                      </span>
                      {/* HLS badge */}
                      <span className="absolute end-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                        {exercise.videoType === 'hls' ? 'HLS' : 'HD'}
                      </span>
                      {/* Play affordance */}
                      <span
                        className={cn(
                          'absolute inset-0 flex items-center justify-center bg-black/25 transition-opacity duration-200',
                          'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                        )}
                        aria-hidden="true"
                      >
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-apex-primary text-white shadow-xl ring-4 ring-white/30">
                          <Play className="h-6 w-6 translate-x-0.5 fill-current" />
                        </span>
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-start justify-between gap-2 p-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-semibold text-apex-text">{name}</h3>
                        <p className="mt-0.5 text-xs font-medium text-apex-text-secondary">
                          {t(`categories.${exercise.category}`)} ·{' '}
                          {t(`equipment.${exercise.equipmentKey}`)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          DIFFICULTY_BADGE[exercise.difficulty]
                        )}
                      >
                        {td(`difficulty.${exercise.difficulty}`)}
                      </span>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-3 pb-16 text-center">
            <Search className="h-10 w-10 text-apex-text-secondary/60" aria-hidden="true" />
            <p className="text-sm font-medium text-apex-text-secondary">
              {t('noResults', {query: query.trim()})}
            </p>
          </div>
        )}
      </div>

      {/* Focused player modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(`exercises.${selected.nameKey}`)}
          onClick={() => setSelected(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-3xl overflow-hidden rounded-3xl bg-black shadow-2xl ring-1 ring-white/15"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-white">
                  {t(`exercises.${selected.nameKey}`)}
                </h2>
                <p className="mt-0.5 text-xs font-medium text-white/60">
                  {td('units.minutes', {count: selected.durationMin})} ·{' '}
                  {t(`categories.${selected.category}`)} ·{' '}
                  {t(`equipment.${selected.equipmentKey}`)}
                </p>
              </div>
              <Button
                size="md"
                variant="text"
                icon={<X className="h-5 w-5" />}
                onClick={() => setSelected(null)}
                aria-label={t('player.close')}
                className="shrink-0 text-white hover:bg-white/10"
              >
                {t('player.close')}
              </Button>
            </div>

            {/* Player */}
            <VideoPlayer
              key={selected.id}
              src={selected.videoSrc}
              poster={selected.poster}
              title={t(`exercises.${selected.nameKey}`)}
              autoPlay
            />

            {/* Footer hints */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-[11px] font-medium text-white/50">
              <span>{t('player.shortcutSpace')}</span>
              <span>{t('player.shortcutMute')}</span>
              <span>{t('player.shortcutFullscreen')}</span>
              <span>{t('player.shortcutSeek')}</span>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
