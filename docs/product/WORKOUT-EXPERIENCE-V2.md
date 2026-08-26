# Workout Experience V2 — Product Vision

> **STATUS: PRODUCT / UX VISION — NOT YET IMPLEMENTED**

This document registers the Workout Experience V2 product vision and the current
architecture analysis. It is a **vision and analysis artifact only**. No
implementation, schema change, dependency change, or production change is
authorized by this document. Implementation requires product decisions (see the
Open Questions document) followed by a technical specification.

- **Document purpose:** preserve the product vision, the analysis of the current
  implementation, and the structured gap/reuse analysis so product and
  engineering can discuss it without re-deriving it.
- **Current implementation status:** the existing workout experience is a
  "Workout Logger"-style guided timer (see below); V2 is a design direction, not
  yet implemented.
- **Relationship to the current workout experience:** V2 is a product evolution
  of the existing workout player. The current codebase already contains a
  headless, wall-clock-based workout engine, persistence and audio/haptic cues —
  V2 builds on those foundations rather than replacing them from scratch.
- **Related document:** [WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md](./WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md)
  — the structured list of open product/architecture questions that must be
  resolved with the product owner before any implementation.

---

## 1. Problem We Are Solving

The current Apex Home Fit workout execution page behaves more like a:

`Workout Logger`

than a guided workout experience.

The current interaction requires the user to:

- read the exercise name;
- already know how the exercise should be performed;
- count repetitions manually;
- register repetitions through UI controls;
- interact with buttons throughout the workout;
- manually progress through parts of the workout;
- repeatedly return attention to the screen.

This is especially problematic for beginner users.

A user who has never exercised before may see:

`Side-Lying Leg Lift`

and have no idea:

- what the exercise is;
- what position to take;
- how the movement should look;
- how fast it should be performed;
- what mistakes should be avoided.

The application should not assume prior exercise knowledge.

Additionally, the user should not need to behave like an operator of the software while exercising.

## 2. Core Product Principle

The central UX principle of Workout Experience V2 is:

> **One tap to start. Minimum interaction until finish.**

After the user presses `Start Workout`, Apex Home Fit should take responsibility
for guiding the workout session as much as possible. The user should primarily
**exercise** rather than **operate the application**.

## 3. Product Concept Shift

| Current Concept | Target Concept |
|---|---|
| `Workout Logger` — the user manages the workout flow; the application records what the user does | `Guided Workout Player` — Apex Home Fit manages sequencing, timing, sets, rest periods, transitions, countdowns, exercise guidance, progress, and completion; the user follows the workout |

## 4. Example Target Experience

Example exercise: **Side-Lying Leg Lift** — 3 Sets, Work 45 s, Rest 15 s.

The user presses `Start Workout` once. The system displays `3` `2` `1` `START`,
then automatically starts **SET 1** with `WORK — 00:45` while displaying a
looping visual demonstration. Near the end: `3` `2` `1`, then automatically
**REST `00:15`** showing `Next: Side-Lying Leg Lift — Set 2/3`. When rest
finishes: `3` `2` `1` `START`, and Set 2 begins automatically — no additional
Start button should normally be required. The sequence continues until all sets
are complete, then transitions automatically to the next exercise.

## 5. Workout Session Timeline

A workout should not behave as a collection of independent screens; it should
behave as an executable **Session Timeline**:

```
PREPARE → WORK → REST → WORK → REST → WORK → TRANSITION → NEXT EXERCISE → … → COMPLETE
```

The UI should represent the current state of this timeline. The UI should NOT
itself own the workout sequencing logic.

## 6. Workout Session Engine

V2 should eventually introduce a dedicated **Workout Session Engine**, logically
separate from both the Program Generator and the Workout Player UI. Its
responsibilities may include: converting a Program into an executable timeline;
determining current exercise; determining current set; controlling work, rest
and transition intervals; countdowns; pause/resume; skip behavior; completion;
session progress; recovery state.

This is currently a product/architecture direction. It is NOT implemented during
this task.

## 7. Program Generator vs Session Engine vs Workout Player

This separation is an important architectural principle.

- **Program Generator** answers *"What should the user do?"* (exercise, sets,
  reps, duration, rest, schedule).
- **Workout Session Engine** answers *"How should today's workout be executed
  over time?"* — it converts the Program into a Session Timeline.
- **Workout Player** answers *"How should the current session state be presented
  to the user?"*

Conceptually:

```
Program Generator → Program → Workout Session Engine → Session Timeline → Workout Player → User
```

## 8. Exercise Execution Types

The Session Engine should eventually support multiple execution types; at
minimum the architecture should consider:

- **PREPARE** — time to prepare before an interval begins.
- **TIMED WORK** — e.g. `Side-Lying Leg Lift — 45 sec`.
- **REP_BASED WORK** — e.g. `Squat — 12 reps`.
- **HOLD** — e.g. `Plank — 30 sec`.
- **REST** — rest between sets.
- **TRANSITION** — time to prepare for a different exercise.
- **COMPLETE** — workout finished.

The exact behavior of these types is NOT finalized yet.

## 9. Beginner-First Design

V2 must assume a user may be seeing an exercise for the first time. Therefore
**exercise name alone is insufficient**; the application should visually teach
the movement.

> **Show, don't just tell.**

## 10. Visual Exercise Guidance

Each exercise should eventually be capable of a visual demonstration. Candidate
formats: Lottie, WebM loop, MP4 loop, animated SVG, GIF where appropriate. The
final media technology has NOT been selected. The eventual decision should
consider visual quality, file size, loading speed, mobile performance,
bandwidth, caching, browser support, maintainability, accessibility. The
demonstration should preferably loop automatically; the user should not have to
press Play repeatedly.

## 11. Focus Mode

After workout start, the interface should enter a focused workout experience
prioritizing: exercise demonstration, exercise name, timer/repetition target,
current set, current phase, essential instruction, progress, next phase.
Non-essential navigation and dashboard UI should be reduced or removed.

> **Maximum attention on the movement. Minimum attention on the software.**

## 12. Conceptual Workout Screen

```text
Exercise 2 / 7

[ LOOPING EXERCISE DEMONSTRATION ]

Side-Lying Leg Lift
بالا آوردن پا در حالت پهلو

00:38

SET 2 / 3
WORK

لگن را ثابت نگه دار
پا را آرام بالا و پایین ببر

████████████████░░░░

Next:
Rest · 15 sec

Pause              Skip
```

This is conceptual UX only; exact layout/wording is not finalized.

## 13. Reduce Manual Interaction

Controls similar to `[-] 0 [+]` should not be the center of the workout
experience. The user should not normally need to manually increment every
repetition, start every set/rest, press Next after every interval, or trigger
every transition. Where practical, progression should be automatic.

## 14. Rep-Based Exercises

Not every exercise must become time-based; the architecture must support true
REP_BASED exercises. However, for Beginner Mode, investigate whether some
rep-based exercises can safely be translated into approximate timed intervals
(e.g. `12 reps` ≈ `40 sec work`). This conversion must NOT be arbitrary — it may
require Exercise metadata such as cadence, expected repetition duration,
difficulty, movement type. This remains an **OPEN PRODUCT DECISION**.

## 15. Rest Experience

REST should be part of the guided experience, potentially showing: remaining
rest time, current progress, next set, next exercise, preview of next exercise,
short preparation guidance. When REST reaches zero, the next appropriate phase
should normally begin automatically.

## 16. Transition Between Exercises

Changing exercises may require more preparation than resting between sets, so
`REST` and `TRANSITION` should be considered separate concepts. During
TRANSITION the app may show the next exercise, demonstration, setup instruction,
equipment requirement, body position, and a transition countdown, then begin the
next exercise automatically. Exact duration is an open decision.

## 17. Countdown

Countdowns should be considered for: workout start, set start, end of rest,
transition completion. Conceptually `3 → 2 → 1 → START`. Exact behavior and
audio/visual treatment remain open decisions.

## 18. Audio / Voice Coach

The experience should eventually support exercising without constantly watching
the screen. Potential cues: exercise announcement, countdown, start, time
remaining, set number, rest start, rest ending, next exercise, workout
completion (e.g. «آماده شو — حرکت بعدی: بالا آوردن پا از پهلو», «سه، دو، یک،
شروع», «پنج ثانیه باقی مانده», «استراحت — پانزده ثانیه», «ست دوم آماده»).
Possible future technologies: simple sound cues, browser TTS, Persian TTS,
pre-recorded voice prompts, other voice systems. No technology choice has been
finalized.

## 19. Workout Preview

Before entering Focus Mode, the user should be able to preview today's workout
(e.g. `18 minutes`, `6 exercises`, `15 sets`) and inspect each exercise
(demonstration, instructions, sets, reps/duration, preparation) before pressing
`Start Workout`.

## 20. Essential User Controls

Hands-free-first does NOT mean removing user control. At minimum, future design
should consider: Pause, Resume, Skip, Exit Workout. Possible additional
controls: Repeat instruction, Replay demonstration, Extend Rest, Reduce Rest,
Restart Set. These must not become mandatory interactions for normal progression.

## 21. Pause / Resume

Pause must pause the actual Session Engine state — not merely freeze a visual
timer. After Resume, the application must know current exercise, current set,
current phase, remaining time, overall progress. Exact persistence behavior
remains to be designed.

## 22. Session Recovery

The architecture should consider recovery if: the page refreshes; the browser
goes to background; the browser closes; the PWA closes; the connection
temporarily disappears; the device locks; the user returns shortly afterward.
Exact recovery rules are not finalized.

## 23. Timer Architecture

Future timer implementation should NOT rely purely on `setInterval → decrement
number` inside the UI. Timing should be based on actual timestamps/deadlines so
browser throttling, rendering delay, background tabs and temporary UI freezes do
not cause major timer drift. Exact technical implementation will be decided in
the Technical Specification phase.

## 24. Exercise Media Library

V2 will likely require an **Exercise Media Library**. Each exercise may contain
metadata such as: canonical exercise ID; Persian name; English name;
demonstration media; thumbnail; instructions; common mistakes; target muscles;
equipment; default cadence; approximate rep duration; beginner notes; safety
notes. This could become the basis for visual guidance, workout preview,
next-exercise preview, rep-to-duration conversion and beginner education. The
exact schema is not finalized.

## 25. Source Independence

V2 must not depend on how the Program was generated (Rules Engine, AI Provider,
coach-created, manual, future providers). The Workout Session Engine should
consume a normalized Program and must not need to know which generator produced it.

## 26. UX Philosophy

- **Beginner First** — assume no previous exercise knowledge.
- **Show, Don't Just Tell** — demonstrate movements visually.
- **Hands-Free by Default** — interaction during exercise is the exception, not the requirement.
- **Automatic Progression** — Work → Rest → Work → Transition progresses automatically where appropriate.
- **One Glance** — the user immediately understands what to do now, how much time remains, which set they are on, and what happens next.
- **Graceful Control** — Pause / Skip / Exit remain available.
- **Source Independent** — workout execution must not depend on AI vs Rules.
- **Focus First** — the workout UI should reduce distractions.

## 27. Product Goal

Apex Home Fit should not merely generate a workout plan. The intended experience:

> **Apex Home Fit accompanies and guides the user throughout the workout.**

A beginner should not receive a list of unfamiliar exercise names and then be
left alone to figure out how to perform them. The product should guide execution
from start to finish.

## 28. Core Vision in One Sentence

> **The user presses Start once; from that point Apex Home Fit guides the
> workout, demonstrates the movements, manages work/rest/transition timing
> automatically, and requires the minimum possible interaction until the session
> is complete.**

---

## Part 2 — Current Implementation Analysis

The analysis below is based on the actual codebase (verified by reading the
source at the time this document was written). Key files:

| Area | Files |
|---|---|
| Workout page | `src/app/[locale]/workout/page.tsx` |
| Workout player (UI) | `src/components/workout/WorkoutPlayer.tsx` |
| Workout engine (headless) | `src/components/workout/useWorkoutEngine.ts` |
| Wall-clock timing | `src/lib/workout/wallClock.ts` |
| Timer/counter/ring components | `src/components/workout/CountdownTimer.tsx`, `RepSetCounter.tsx`, `CircularProgressRing.tsx`, `workoutTokens.ts` |
| Animation player | `src/components/workout/AnimationPlayer.tsx` (`lottie-react` / native `<video>`) |
| Video player (library) | `src/components/video/VideoPlayer.tsx` (`hls.js` for `.m3u8`) |
| Offline persistence | `src/lib/offline/db.ts` (Dexie/IndexedDB), `workoutPersistence.ts`, `conflictPolicy.ts` |
| Program → workout mapping | `src/lib/programSchedule.ts`, `src/lib/workout/samplePlan.ts` |
| Session API | `src/app/api/workout/session/route.ts` |
| Program API | `src/app/api/program/current/route.ts` |
| Analytics | `src/services/analyticsService.ts`, `analyticsEvents.ts`, `gamificationService.ts` |
| Audio / haptics | `src/services/audioService.ts`, `src/hooks/useHaptic.ts`, `useReducedMotion.ts` |
| Data model | `prisma/schema.prisma` |
| Program generation | `src/lib/ai/prompts.ts`, `infra/ai/prompts/*.md`, `src/lib/ai/restDays.ts`, `src/lib/exerciseStyles.ts` |
| Tests | `tests/workout-engine.test.tsx`, `tests/workout-timer.test.ts`, `tests/workout-persistence.test.ts`, `tests/offline-conflict.test.ts`, `tests/program-schedule.test.ts`, `tests/workout-route.spec.ts` |
| Docs | `docs/ASSETS.md`, `docs/DESIGN_SYSTEM.md` |

### How the current workout experience operates (verified flow)

1. **Entry:** the dashboard (`src/app/[locale]/dashboard/page.tsx`) renders a
   weekly plan (from `GET /api/program/current` → `weeklySchedule` + `restDays`,
   or a static sample plan). "Start workout" links to `/[locale]/workout?day=<weekday>`.
2. **Plan resolution:** the workout page resolves today's (or the selected
   day's) session. With a program, `workoutExercisesFromSchedule` extracts the
   day's exercises and `generatedExerciseDefaults` normalizes them into
   `WorkoutExercise[]` (defaults: 3 sets, 30 s rest, open-ended duration when
   `duration_seconds` is missing). Without a program, a localized static
   fallback plan (`samplePlan.ts`) is used.
3. **Playback:** `WorkoutPlayer` drives `useWorkoutEngine` — a headless state
   machine with phases `READY → EXERCISING → RESTING → COMPLETED`. The engine:
   - runs a **wall-clock accumulator** (`wallClock.ts`) re-synced on
     `visibilitychange` / `pagehide` / `pageshow` / `focus`, so countdowns catch
     up exactly after backgrounding — the V2 "timestamp-based timing" concern is
     already solved in the current engine;
   - auto-advances timed phases when the countdown reaches zero
     (`autoAdvance`, default true); open-ended sets count up and require manual
     `Complete set`;
   - tracks `currentSet`, `completedSets`, `progress`;
   - emits a resumable snapshot on every transition (`onStateChange`).
4. **Interaction during the workout:** the user reads the exercise name, uses
   the `RepSetCounter` (`[-] 0 [+]` big stepper) to tally reps per set, and
   presses buttons: Start, Pause/Resume, Complete set, Skip rest, Previous/Next
   exercise, Restart. This is the "operator" interaction model V2 wants to move
   away from.
5. **Audio/haptics:** synthesized Web Audio cues (start/end chimes, countdown
   ticks in the last 3 s) and Vibration-API patterns — no TTS/voice.
6. **Persistence (offline):** every engine transition writes "today's workout"
   snapshot to IndexedDB (`workoutStates`, per user + local date, conflict-aware
   merge). On mount the player hydrates the snapshot if it still matches the
   loaded plan (restored paused).
7. **Persistence (server):** `POST /api/workout/session` `start` creates a
   `WorkoutSession` (only when every exercise name resolves to a Prisma
   `Exercise` row and, if a program exists, is linked to it); `complete` marks
   it completed with duration and a derived `actualSets`. Fallback/sample
   workouts typically do not resolve to `Exercise` rows, so their sessions are
   not persisted.
8. **Completion:** the COMPLETED phase shows a summary; analytics
   (`analyticsService`) count completed sessions, volume, streaks and estimated
   calories; gamification awards XP/badges; a client event `workout_started` is
   tracked.

### What already exists that V2 needs

- A headless, resumable workout engine with wall-clock timing and pause/resume
  at the engine level (not a UI-only timer).
- IndexedDB session recovery (per-device, per-day) with conflict policy.
- An `AnimationPlayer` supporting Lottie and video with looping, autoplay,
  reduced-motion and FPS fallbacks — **but it is not wired to any consumer** and
  `public/animations|videos|posters/` are documented but empty namespaces
  (`docs/ASSETS.md`).
- Synthesized sound cues, haptics, reduced-motion support, full EN/FA i18n + RTL.
- A normalized `WorkoutExercise[]` contract consumed by the engine — the seed of
  the "source-independent normalized Program".

## Part 3 — Current vs V2 Gap Analysis

| Area | Current State | V2 Direction | Gap |
|---|---|---|---|
| Workout progression | Engine auto-advances timed countdowns; rep/open-ended sets need manual Complete set; Next/Prev exercise jumps | Automatic Session Timeline (PREPARE→WORK→REST→TRANSITION→…) | Medium — engine exists; needs new phase types and automatic progression policies |
| Exercise guidance | Exercise name, reps/duration text only; no visual demonstration wired | Visual demonstration for every exercise | Large — AnimationPlayer exists but unwired; no media metadata |
| Set handling | Engine tracks sets; set dots per exercise; manual/timed completion | Session Engine-managed sets | Small — mostly present |
| Repetition handling | Manual `[-] 0 [+]` counter, reps informational, resets per set | Timed + rep-based execution with optional rep→duration conversion | Medium — rep entry stays manual; no cadence/rep-duration metadata |
| Rest | `RESTING` phase with `restSeconds`, skip, auto-advance; timer only | Automatic timed rest with next-set/exercise preview | Small — phase exists; preview content missing |
| Transition | None — Next/Prev exercise jumps immediately | Dedicated TRANSITION state with setup guidance | Large — concept missing entirely |
| Interaction | Buttons throughout + rep stepper (operator model) | Hands-free-first, minimum interaction | Large — behavioral change |
| Exercise media | Components ready (AnimationPlayer/VideoPlayer), no assets, no data fields | Exercise Media Library with canonical mapping | Large — data model + assets missing |
| Audio | Synthesized chimes/ticks; mute/volume APIs | Audio/voice coach (announcements, countdown, Persian TTS) | Medium — cues exist; voice guidance missing |
| Pause/resume | Engine-level pause of the wall-clock accumulator; snapshot persists paused | Engine-level pause (same intent) | Small — already aligned |
| Recovery | IndexedDB per-device snapshot, hydrate on mount, wall-clock catch-up | Session recovery incl. expiry/background/lock rules | Medium — solid foundation; rules/policies to define |
| Timer | Wall-clock accumulator, timestamp-based, lifecycle re-sync | Timestamp-based timing | None — already implemented |
| Preview | Dashboard day summary card (duration/exercises/calories heuristics) | Workout Preview with per-exercise demos/instructions | Medium — summary exists; drill-in preview missing |
| Focus Mode | Workout inside AppShell with full nav; no fullscreen/wake-lock | Focused Workout Player | Medium — UI mode missing |
| Countdown | 3-2-1 tick cues during final seconds of active phases | 3-2-1 START before workout/set/rest/transition starts | Medium — tick cues exist; pre-start countdown missing |
| Workout completion | COMPLETED phase, summary, server session, analytics, XP/badges | Defined completion semantics incl. partial/skipped sets | Small-Medium — completion exists; partial/skip semantics undefined |
| Source independence | Engine consumes normalized `WorkoutExercise[]` from AI/rules/sample | Same, via a Session Engine | None — contract already normalized |
| Localization/RTL | Full EN/FA i18n, RTL-aware player | Preserved | None |

## Part 4 — Reuse / Extend / Replace Analysis

| Component / path | Current responsibility | Classification | Reasoning | Dependencies / risks |
|---|---|---|---|---|
| `useWorkoutEngine` (`src/components/workout/useWorkoutEngine.ts`) | Headless workout state machine (READY/EXERCISING/RESTING/COMPLETED), wall-clock timer, pause/resume, hydrate | **EXTEND** | Core of the future Session Engine; needs PREPARE/TRANSITION phases, execution-type awareness, richer skip/exit semantics | All UI, persistence and tests depend on it; phase additions must stay backward compatible |
| `wallClock.ts` | Timestamp-based elapsed-time accumulator | **REUSE** | Already satisfies the V2 timer principle | None |
| `WorkoutPlayer.tsx` | Full localized player UI on top of the engine | **EXTEND** | Wires audio/haptics/persistence; needs Focus Mode, media slot, preview, countdown-to-start | Depends on engine API changes |
| `RepSetCounter.tsx` | Big +/− stepper for manual rep tally | **REPLACE (as center of interaction)** / REUSE (as optional fallback control) | V2 de-emphasizes operator counting; may remain for rep-based exercises or advanced mode | Trivial |
| `CountdownTimer.tsx`, `CircularProgressRing.tsx`, `workoutTokens.ts` | Timer/ring UI + design tokens | **REUSE** | Directly reusable for V2 phases | None |
| `AnimationPlayer.tsx` | Lottie/video renderer with reduced-motion + FPS fallbacks | **EXTEND** | Ready but has no consumer; needs wiring to exercise metadata, preload/caching strategy | No `animationSrc` field on `WorkoutExercise` today; assets missing |
| `VideoPlayer.tsx` (library) | HLS/native video player for the exercise Library | **REUSE / EXTEND** | Candidate for demo content; may need poster/CSP alignment with workout media | CSP allowlists |
| `offline/db.ts` + `conflictPolicy.ts` | IndexedDB cache + workout snapshots + sync outbox | **REUSE / EXTEND** | Solid recovery foundation; needs programId linkage (today hardcoded `null`) and possibly expiry | Browser-only; additive schema changes only |
| `workoutPersistence.ts` | Snapshot ↔ engine-state mapping | **REUSE / EXTEND** | Additive fields; `programId: null` hardcoded | Match `matchesPlan` semantics when plan shape grows |
| `programSchedule.ts` | Schedule → day plan / workout exercises with defaults | **REUSE / EXTEND** | Add V2 defaults (PREPARE/TRANSITION); keeps old program compatibility | Loosely-typed JSON fields |
| `samplePlan.ts` | Static fallback weekly plan | **REUSE** | Fallback path must keep working; could gain execution metadata | Localized names via `Library.exercises.*` |
| `api/workout/session/route.ts` | Start/complete server sessions | **EXTEND** | Needs partial/skipped-set recording, per-exercise actuals, maybe id-based exercise refs | Name-based exercise resolution 422s for unknown names |
| `api/program/current/route.ts` | Latest program + schedule | **REUSE** | — | — |
| `analyticsService.ts` / `analyticsEvents.ts` | Completed-session analytics + client events | **REUSE / EXTEND** | Partial workouts / new phase events may need new signals | Only completed sessions counted today |
| `gamificationService.ts` | XP/badges on completion | **REUSE** | — | Completion semantics must stay compatible |
| `audioService.ts` | Synthesized cues | **EXTEND** | Add TTS/voice layer later; mute/volume already exposed | AudioContext gesture rules |
| `useHaptic.ts`, `useReducedMotion.ts` | Haptics, reduced motion | **REUSE** | — | — |
| `Exercise` / `ProgramExercise` Prisma models | Exercise catalog + program prescriptions | **EXTEND** | V2 may want canonical id, media, cadence, execution-type metadata | Schema change = migration; must stay backward compatible |
| `WorkoutSession` / `WorkoutSessionExercise` | Completed/in-progress session records | **EXTEND** | Partial/skip semantics; FK to `Exercise` restricts unknown names | Historical data compatibility |

## Part 5 — Architectural Constraints (from the actual code)

- **Data model (BLOCKER for media/execution metadata):** `Exercise` has
  `name @unique`, `instructions Json`, `imageUrl`, `durationSeconds`, `reps`,
  `sets`, `restSeconds` — but **no canonical exercise ID, no media fields, no
  cadence / rep-duration / execution-type metadata**. `ProgramExercise` has
  `sets`/`reps`/`restSeconds` (nullable) but **no duration per program entry**
  and no media linkage.
- **Exercise identity is name-based (IMPORTANT):** the session API resolves
  exercises by name; AI-generated names may not exist as `Exercise` rows, so
  those workouts are played locally but not persisted as sessions (422 is
  swallowed by the page). V2's Media Library needs a canonical mapping story.
- **`weeklySchedule` is a loosely-typed `Json` (IMPORTANT):** parse-time
  defaults (`generatedExerciseDefaults`) compensate; V2 defaults must follow the
  same tolerant pattern.
- **Engine phase set is fixed (IMPORTANT):** no PREPARE/TRANSITION/HOLD
  semantics; `autoAdvance` is a global boolean, not a per-phase policy;
  open-ended sets require manual advance.
- **Rep counting is UI-owned (MINOR-IMPORTANT):** `repsDone` lives in
  `WorkoutPlayer` local state; the engine is not told about actual reps.
- **Offline snapshots do not link the program (MINOR):** `buildWorkoutStateRecord`
  hardcodes `programId: null`; recovery is per-device (IndexedDB), keyed by
  user + local date, no expiry policy.
- **Timer correctness is already solved (none):** wall-clock accumulator + lifecycle
  re-sync; tests cover background catch-up and auto-advance while hidden.
- **No screen-wake/fullscreen/orientation handling (MINOR):** relevant to Focus Mode.
- **Audio is synthesized cues only (IMPORTANT for voice coach):** no TTS/voice
  pipeline; background audio while locked is a browser/platform constraint.
- **Analytics only see completed sessions (IMPORTANT):** partial/abandoned
  workouts are invisible; `WorkoutSession.completedAt` gates everything.
- **Heuristics in dashboard preview (MINOR):** `durationMin = exercises × 5`,
  `calories = durationMin × 7` when not derived from data.

## Part 6 — Backward Compatibility Considerations

- Old Programs: `weeklySchedule` entries with missing `duration_seconds` /
  `rest_seconds` must keep working (tolerant defaults, open-ended sets).
- Historical `WorkoutSession`/`WorkoutSessionExercise` rows: analytics read
  `completedAt`, `completed`, `actualSets`, `actualReps` — V2 completion writes
  must keep producing these fields.
- Existing pages (dashboard, history, library) rely on current response shapes
  (`/api/program/current`, `/api/profile`, analytics payloads).
- IndexedDB snapshot records must stay additively compatible
  (`hydrateFromRecord` already tolerates pre-v2 records).
- The name-based exercise resolution in the session API should remain as a
  fallback when V2 introduces canonical IDs.
- Do NOT design migrations yet — this document only flags the constraints.

## Part 7 — Open Questions

See [WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md](./WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md)
for the full structured question list (exercise execution, timing, automatic
progression, user controls, visual guidance, media production, audio, recovery,
screen behavior, accessibility, program compatibility, workout completion, plus
codebase-derived questions).

## Part 8 — Scope Guards

This task and document:

- registered the vision only — **no implementation**;
- did not modify application source code, dependencies, schema, database, or
  production configuration;
- does not select final media technology, TTS, timing defaults, or any other
  subjective product decision.

Required safety state (verified at task end):

```
APPLICATION CODE CHANGED: NO
PRODUCTION CHANGED: NO
DATABASE CHANGED: NO
DEPENDENCIES CHANGED: NO
V2 IMPLEMENTATION STARTED: NO
```
