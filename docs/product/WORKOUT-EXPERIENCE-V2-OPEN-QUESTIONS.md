# Workout Experience V2 — Open Product & Architecture Questions

> **STATUS: OPEN QUESTIONS — FOR PRODUCT OWNER DISCUSSION**
>
> These questions must be answered (or explicitly deferred) by the product owner
> before a Technical Specification is written. Nothing here is decided; do not
> treat any option as a chosen direction.

Related: [WORKOUT-EXPERIENCE-V2.md](./WORKOUT-EXPERIENCE-V2.md) — the product
vision this document supports.

---

## 1. Exercise Execution

- Which exercises should be **TIMED** (e.g. Side-Lying Leg Lift, 45 s)?
- Which should remain **REP_BASED** (e.g. Squat, 12 reps)?
- Which should be **HOLD** (e.g. Plank, 30 s)?
- Can some rep-based exercises be converted to approximate durations for
  Beginner Mode? What is the safety/quality threshold for conversion?
- How should **cadence** be defined (reps per minute? seconds per rep?),
  and who owns that data (Exercise Media Library metadata)?
- How should **unilateral left/right** exercises work (e.g. Side-Lying Leg Lift
  per side)?
- Should left/right sides be **separate timeline intervals** (two work phases +
  implicit side switch), and does the rest between sides count as REST?
- Should the engine expose an execution type per exercise (TIMED / REP_BASED /
  HOLD) or derive it at runtime from available fields (duration vs reps)?
- How should warmup/cooldown blocks (present in generated `weekly_schedule`)
  be treated in the Session Timeline — as exercises, PREPARE phases, or omitted?

## 2. Timing

- Default **PREPARE** duration?
- Default **REST** duration (current engine default is 30 s when missing)?
- Default **TRANSITION** duration?
- Should individual Programs override the defaults (program-level vs
  exercise-level vs session-level configuration)?
- Countdown length (3-2-1?) and before which phases (workout start, every set,
  every rest end, every transition)?
- Should the countdown be visual only, audio only, or both?

## 3. Automatic Progression

- Which phases should auto-advance (work → rest → work → transition)?
- Are there cases where user confirmation is required (e.g. equipment setup,
  changing into a lying position, injury check)?
- What happens when an exercise requires **equipment setup** — a longer
  TRANSITION, a "ready?" prompt, or auto-continue regardless?
- Should rest be skippable/extendable without breaking auto-advance?

## 4. User Controls

- **Pause** behavior: engine-level pause (already implemented) — any change needed?
- **Skip** behavior: skip current set, current exercise, or whole workout?
- **Restart Set**: should this exist, and does it re-count the skipped work?
- **Extend Rest / Reduce Rest**: which increments (e.g. ±15 s)?
- **Exit Workout**: confirm dialog? Save partial progress?
- **Resume after Exit**: resume from exact remaining time, or from the start of
  the interrupted set?
- How should **accidental Skip** be handled (undo window, confirm, or no undo)?
- Does exiting a timed workout mid-set mark the set complete, partial, or skipped?

## 5. Visual Guidance

- Which technology: Lottie, WebM, MP4, animated SVG, GIF, or a mixed strategy?
- Preload strategy: preload the next exercise's demo during rest/transition?
- Offline/PWA caching: precache all demos, cache-on-first-use, or streaming?
- Fallback when media is unavailable: static poster, instructions text, or both?
- Should demos show the movement continuously or phase-by-phase (prep / up / down)?

## 6. Exercise Media Production

- Where do demonstrations come from — human video, animation, a licensed
  exercise library, internally produced assets, or community/partner content?
- How are media assets mapped to **canonical exercises** (id/slug) vs the current
  `Exercise.name @unique`?
- What happens when an AI-generated program names an exercise with no media
  asset (fallback content, nearest-match, or no demo)?
- Are thumbnails/posters required for every exercise, and who maintains them?

## 7. Audio

- Simple sounds, Persian voice, English voice, or both?
- TTS (browser TTS / server TTS) vs pre-recorded prompts vs synthesized cues?
- Mute and volume: per-workout, global, or quick-toggle on the player?
- Which cues are essential vs optional (announcement, countdown, time remaining,
  rest end, next exercise, completion)?
- Audio when the phone is **locked/backgrounded**: what should be allowed, given
  browser background-audio and lock-screen constraints?

## 8. Recovery

- Page refresh behavior (current: restore "today's workout" snapshot, paused)?
- Browser background behavior (current: wall-clock catch-up on return)?
- PWA close/reopen behavior?
- Session **expiration**: how long may an interrupted session be resumed?
  One day? Until the same workout is attempted again?
- Resume from exact remaining time, or from the beginning of the interrupted set?
- Cross-device recovery: is IndexedDB (per-device) enough, or should snapshots
  sync to the server?
- Does the "today's workout" snapshot conflict with a *new* attempt of the same
  plan on the same day (replay vs restart)?

## 9. Screen Behavior

- Keep screen awake during the workout (Screen Wake Lock)?
- Fullscreen on the workout page (Focus Mode)?
- Orientation handling (lock landscape/portrait, or ignore)?
- Mobile-first layout + tablet layout?
- Should Focus Mode hide the AppShell navigation entirely?

## 10. Accessibility

- Reduced motion: static poster fallback (already implemented in AnimationPlayer)?
- Captions/subtitles for voice cues?
- High contrast and large countdown (largely present via tokens)?
- Hearing-impaired users: are haptic + visual cues sufficient for all phase changes?
- Visually impaired users: what should the screen reader announce (phase, timer,
  exercise, next phase)?
- Haptic cues where supported (Vibration API already implemented)?

## 11. Program Compatibility

- How should old rep-only Programs behave — automatic conversion, manual rep
  mode, or an explicit per-exercise choice?
- Where should execution metadata live: Program, ProgramExercise, Exercise
  (media library), or Session configuration?
- Should existing Programs be **enriched at runtime** (defaults + media lookup)
  rather than migrated?
- How do `weeklySchedule` warmup/cooldown entries map into the timeline for old
  programs that lack them?

## 12. Workout Completion

- What defines a **completed workout** (all sets of all exercises, regardless of
  skips)?
- What defines a **completed set** (timer elapsed / all reps logged / manually
  confirmed)?
- How should **skipped exercises** be stored and counted (completed: false,
  skipped flag, or excluded)?
- How should **partial workouts** be stored (currently: only `complete` is
  persisted server-side; abandoned sessions are invisible to analytics)?
- How should **completion percentage** work (sets completed / sets planned,
  weighted by duration)?
- Should a timed set record `actualSets`/`actualReps` (current schema fields) or
  new duration-based fields?

---

## 13. Additional Questions Discovered from the Codebase

These arise from reading the actual implementation and are not covered above:

- **Canonical exercise identity:** `Exercise.name` is `@unique` and the session
  API resolves exercises **by name**. V2 media/execution metadata needs a stable
  id. Should the canonical key be a new slug/id, and how are AI-generated names
  mapped to it?
- **Session persistence for non-catalog exercises:** the session API returns 422
  when exercise names don't match `Exercise` rows, and the workout page swallows
  the failure. Should V2 persist sessions for exercises outside the catalog
  (fallback plans, AI-generated names), e.g. free-text exercise rows or a
  shadow catalog?
- **Rep counting for timed sets:** the `RepSetCounter` is the primary interaction
  today. For TIMED exercises, is manual rep counting still wanted, optional, or
  removed?
- **Engine open-ended sets:** when `durationSeconds` is missing the engine
  counts up with manual advance. Should V2 keep this as the default for legacy
  programs, or always synthesize a duration?
- **`autoAdvance` granularity:** today it is a single boolean. Should
  auto-advance be per-phase-type (auto WORK→REST, but confirm TRANSITION)?
- **Pause semantics vs server session:** the server session only knows
  `startedAt`/`completedAt`. If the user pauses 20 minutes, should the paused
  time be excluded from `durationSeconds`?
- **Offline snapshot ↔ program linkage:** `buildWorkoutStateRecord` hardcodes
  `programId: null`. Should offline snapshots record the program/schedule version
  so recovery can validate against plan changes?
- **Analytics for partial workouts:** currently only `completedAt` sessions
  count. Should V2 emit new events (e.g. `workout_abandoned`, `set_completed`,
  `exercise_skipped`) and new analytics inputs?
- **Dashboard preview heuristics:** duration/calories are estimated
  (`exercises × 5 min`, `× 7 kcal/min`). Should the Workout Preview compute these
  from actual per-exercise durations when available?
- **Media field placement:** where does the demo URL live (`Exercise` media
  library vs `ProgramExercise` override vs runtime enrichment), given the
  `weeklySchedule` JSON already carries per-exercise fields?
- **Voice/audio when tab hidden:** the current countdown ticks rely on a 1 s
  interval + lifecycle catch-up. If V2 adds time-remaining announcements, how are
  they scheduled without timer drift, and do they need to work while the tab is
  backgrounded/locked?
- **Timer display precision:** the engine advances in whole seconds. Is
  sub-second precision needed for countdowns, or is 1 s granularity acceptable
  (the wall-clock remainder is preserved but not displayed)?
