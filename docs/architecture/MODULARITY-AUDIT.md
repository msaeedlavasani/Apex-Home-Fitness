# Codebase Modularity, Coupling & Reusability Audit

`STATUS: AUDIT RECORD — NOT AN ARCHITECTURE DECISION`

This document records the findings of the repository-wide modularity, coupling and
reusability audit. It is evidence and analysis only. It does NOT create rules, does
NOT define a target architecture, and does NOT authorize refactoring.

Companion documents:

- `docs/architecture/COUPLING-RISK-REGISTER.md` — ranked risks (audit record)
- `docs/architecture/CAPABILITY-INVENTORY-PROPOSAL.md` — candidate capability
  ownership model (proposed, non-authoritative)
- `docs/architecture/ARCHITECTURE-PRINCIPLES-PROPOSAL.md` — candidate principles
  for owner review

Governing baseline: `AGENTS.md` reuse-first rule (`reuse → extend → compose →
create`) is authoritative and is **extended**, never replaced, by any proposal
here. See `docs/governance/DOCUMENTATION-GOVERNANCE.md`.

---

## 1. Baseline

- Branch: `main`, HEAD `9442594` (audit started on a clean working tree).
- Framework: Next.js App Router (client/server components), React 19, TypeScript.
- State of the tree during audit: no application files were modified.
- Path aliases: `@/*` → `src/*` (and `@/...` throughout).
- Major dependencies: `@ai-sdk/groq`, `@ai-sdk/openai`, `ai`, `@supabase/ssr`,
  `@supabase/supabase-js`, `@prisma/client` (SQLite per schema), `dexie`
  (IndexedDB), `hls.js`, `lottie-react`, `next-intl`, `@mui/material` +
  Emotion, `lucide-react`, `zod`, `clsx` + `tailwind-merge`.
- Test structure: 55 files — Node `node:test` unit/integration tests
  (`tests/*.test.ts(x)`, run via `tsx`) + Playwright E2E (`tests/*.spec.ts`).
- Validation scripts: `typecheck` (`tsc --noEmit`), `lint` (eslint),
  `audit:assets`, `audit:design`, `audit:lottie`.

## 2. Domain Map (derived from code, not imposed)

| Domain | Owner files (primary) | Public surface |
|---|---|---|
| Auth / OTP / Session | `src/lib/auth/*`, `src/services/otpService.ts`, `src/services/phoneSessionService.ts`, `src/app/api/auth/*`, `src/middleware.ts` | `POST /api/auth/request-code`, `verify`, `logout`; `OtpService` seam (`src/lib/auth/types.ts`) |
| Quiz / Onboarding | `src/components/quiz/*` (JS), `src/lib/quiz/*` (TS), `src/app/api/quiz/save` | `POST /api/quiz/save`; `QUIZ_ANSWERS_SCHEMA`; draft store |
| Program Generation | `src/lib/ai/*` (provider, prompts, ruleBasedProgram, restDays, requestSecurity, idempotency, rateLimitStore), `src/services/programService.ts`, `src/services/generationIdempotency.ts`, `src/app/api/generate-program` | `POST /api/generate-program`; `ResolvedAiProvider`; `GenerationMetadata`; idempotency ledger |
| Program Schedule | `src/lib/programSchedule.ts`, `src/lib/weekCalendar.ts`, `src/app/api/program/current` | `GET /api/program/current` |
| Workout Session | `src/components/workout/*` (useWorkoutEngine, WorkoutPlayer, timers, AnimationPlayer, workoutTokens), `src/lib/workout/wallClock.ts` | headless engine hook; persistence via offline layer |
| Offline / Sync | `src/lib/offline/*` (db, workoutPersistence, conflictPolicy), `src/services/syncService.ts` | IndexedDB outbox; conflict policy; sync monitor |
| Analytics | `src/services/analyticsService.ts`, `src/services/analyticsEvents.ts`, `src/app/api/analytics/events` | `POST /api/analytics/events`; pure computation helpers |
| Gamification | `src/services/gamificationService.ts` | XP/level/streak/badge awarding (idempotent) |
| User / Profile | `src/services/userService.ts`, `src/services/avatarStorage.ts`, `src/app/api/profile` | `GET/PATCH /api/profile`; Supabase Storage avatars |
| Exercise / Media | `src/components/video/VideoPlayer.tsx`, `src/app/[locale]/library/*`, `src/components/workout/AnimationPlayer.tsx`, `src/lib/workout/samplePlan.ts`, `docs/ASSETS.md` | player components; **no canonical catalog backend** |
| UI / Design System | `src/components/ui/platform/*`, `src/components/providers/*`, `src/components/layout/*`, `src/hooks/*` | platform primitives; AppShell; platform/theme providers |
| Localization | `src/i18n.ts`, `src/i18n/navigation.ts`, `src/i18n/routing.ts`, message catalogs | next-intl routing + messages |
| Infra / Ops | `src/lib/prisma.ts`, `src/lib/supabase*.ts`, `src/lib/logger.ts`, `src/lib/errorTracking.ts`, `src/lib/timeout.ts`, `src/instrumentation.ts`, `src/app/api/monitor/*` | shared singletons and ops endpoints |

## 3. Dependency Structure (observed direction)

Healthy direction observed: **pages → components → services → lib → infra
(prisma/supabase/logger)**. Most imports follow it.

Violations / inversions:

1. `src/lib/ai/ruleBasedProgram.ts:5` imports **types** from
   `@/services/programService` (lib → services). The rules engine (a lib-level
   domain module) depends on a service-level type it does not own.
2. `src/lib/quiz/quizDraft.ts:30` imports **a type** from `@/services/userService`
   (lib → services). Type-only, but the direction is still inverted: the type
   should live in a shared contract module.
3. `src/components/quiz/*` (JS) depends on **nothing** from the app's TS services
   or libs — instead it re-implements `restDays`, `exerciseStyles`, `theme` and
   `i18n` internally (see Duplication, §7). This is isolation by duplication.

No `Domain → UI` or `Infrastructure → Feature UI` dependency was found.

## 4. Coupling Hotspots (see also the Risk Register)

| # | Hotspot | Type | Evidence | Impact |
|---|---|---|---|---|
| H-1 | Exercise identity is name/string-based | NAME-BASED + DATA | `workoutTokens.ts` maps **exercise names** → Lottie assets; `syncService.CompletedExerciseInput` carries `exerciseId` + `exerciseName` strings; `samplePlan.ts` and program models key exercises by name; library page catalog (`ExerciseLibraryPage.tsx`) is a hardcoded array with demo streams | V2 media library, rep→duration metadata, and cross-device sync all need a durable canonical exercise ID |
| H-2 | Quiz domain is a JavaScript island with duplicated domain logic | DUPLICATED CAPABILITY | `src/components/quiz/restDays.js` vs `src/lib/ai/restDays.ts`; `quiz/exerciseStyles.js` vs `src/lib/exerciseStyles.ts`; `quiz/theme.js` vs `src/components/providers/ThemeProvider.tsx` (its own barrel comment says the app-wide contract lives elsewhere); `quiz/i18n.js` vs next-intl | Two sources of truth for rest-day rules and exercise-style sets; JS side cannot consume TS contracts (schema in `src/lib/quiz/quizFlow.ts` mirrors quiz component ids by hand) |
| H-3 | WorkoutPlayer fan-out | UI/DOMAIN + CONTROL | `WorkoutPlayer.tsx` imports from 6+ directories: audioService, hooks, cn, analyticsEvents, offline/db, workoutPersistence, plus local engine/timers | The player wires engine + persistence + audio + analytics + haptics; V2 additions (voice coach, PREPARE/TRANSITION) will enlarge this surface unless the engine/player contract is extended deliberately |
| H-4 | `useWorkoutEngine.ts` (689 LOC) lives in `components/workout/` | UI/DOMAIN (location) | The engine is headless and imports only React + `wallClock` — excellent isolation — but it is physically a component-folder hook, so V2's "Session Engine" boundary will have to move or re-expose it | Engine logic is not importable from non-React code; a pure session-core is a V2 prerequisite |
| H-5 | Analytics/gamification size | LARGE SERVICE MODULES | `gamificationService.ts` 812 LOC, `analyticsService.ts` 743 LOC | Both are documented single-responsibility services with pure cores and idempotency guards — large but cohesive. Monitor for accretion; no action required now |
| H-6 | Client singleton module state | STATE OWNERSHIP | `syncService.ts` keeps `syncing/lastSyncAt/lastError` as module-level `let`; `audioService`/`useHaptic` similar in-memory state | Works, but state is invisible to React and reset on HMR; fine today, revisit when multi-surface (PWA background) sync lands |

## 5. God Component / God Module Detection

- `useWorkoutEngine.ts` (689 LOC) — **BORDERLINE**. Single responsibility
  (session state machine) and minimal deps, but large and physically in
  `components/`. The V2 Session Engine should decide whether this splits into a
  pure core + React adapter.
- `WorkoutPlayer.tsx` (485 LOC) — **NOT a god component**: it composes engine,
  timers, audio, haptics, analytics via separate modules; its own logic is
  presentation orchestration.
- `gamificationService.ts` / `analyticsService.ts` — **NOT god modules**:
  each is a documented, cohesive domain service (pure computations + one
  persistence/API seam + idempotency guards). Large but single-purpose.
- `OnboardingQuiz.jsx` (341 LOC) + `quiz/i18n.js` (349 LOC) — **BORDERLINE**:
  the quiz UI is a self-contained widget with its own i18n/theme plumbing.
  The problem is not size but isolation-by-duplication (H-2).

## 6. Under-Modularization vs Over-Abstraction

- **GOOD ABSTRACTION**: `lib/workout/wallClock.ts` (timestamp-based timing);
  `lib/offline/conflictPolicy.ts` (pure, documented, order-independent merge);
  `lib/auth/otp.ts` + `services/otpService.ts` (one secure core, two surfaces);
  `lib/ai/provider.ts` (provider resolution + error classification);
  `lib/ai/idempotency.ts` + `services/generationIdempotency.ts` (DB-backed
  idempotency state machine); `lib/quiz/quizFlow.ts` (pure validation mirror);
  `services/avatarStorage.ts` (minimal admin-client contract, legacy fallback);
  UI platform package (`components/ui/platform/` with per-primitive barrels).
- **UNDER-MODULARIZED**: no strong cases beyond H-3/H-4 (player fan-out, engine
  location). The workout persistence + engine + player triangle is the closest:
  persistence (`lib/offline/db.ts` 490 LOC) mixes generic IndexedDB helpers with
  workout-specific record shapes.
- **OVER-ABSTRACTED / PREMATURE**: none found with confidence. The `lib/auth`
  seam layers (types → otp core → otpService → providers) are justified by the
  mock/dev/CI + production dual-mode requirement and are heavily tested.
  `components/ui/platform/lib/platform.ts` + `usePlatform` is used by all three
  layouts — real reuse, not premature.
- **DUPLICATED ABSTRACTION**: the quiz-internal `theme.js` and `i18n.js` are
  fallbacks/placeholders duplicating app-wide contracts (ThemeProvider,
  next-intl). `restDays.js` / `exerciseStyles.js` duplicate `lib/ai/*` domain
  modules (H-2).
- **WRONG OWNER**: `ruleBasedProgram.ts` (rules engine) type-depends on
  `services/programService` — the program-shape contract should be owned by a
  shared lib contract, not the service that calls the provider.

## 7. Duplication Audit

HARMFUL:

- `quiz/restDays.js` ↔ `lib/ai/restDays.ts` — same domain rules, two
  implementations (one JS, one TS), two test suites (`rest-days*.test.*`).
- `quiz/exerciseStyles.js` ↔ `lib/exerciseStyles.ts` — same id set, two copies.
- `quiz/theme.js` ↔ `components/providers/ThemeProvider.tsx` — acknowledged in
  code as a "standalone fallback" while the app-wide contract lives elsewhere.
- `quiz/i18n.js` ↔ `src/i18n.ts` — placeholder translator vs next-intl.
- Quiz answer ids: `OnboardingQuiz.jsx` step ids are mirrored by hand in
  `lib/quiz/quizFlow.ts` schemas and `lib/ai/requestSecurity.ts` — a string
  contract maintained in three places.

INTENTIONAL / acceptable:

- `lib/ai/restDays.ts` vs `lib/programSchedule.ts` both reason about weekdays —
  different concerns (quiz constraint vs schedule rendering), share the weekday
  vocabulary via `WEEKDAY_VALUES`.
- Client `syncService` vs server `userService` identity resolution — deliberate
  client/server split of the same Supabase session contract (documented in
  `syncService.ts` header).
- Analytics route (structured logs) vs analyticsService (batching) — deliberate
  seam; persistence layer intentionally deferred.

## 8. Public vs Internal Module Boundaries

- **Clear public modules**: `components/ui/platform/index.ts` (barrels per
  primitive + one entry), `services/*` (documented contracts), `lib/ai/provider.ts`,
  `lib/offline/conflictPolicy.ts`, `lib/workout/wallClock.ts`.
- **Deep-import coupling**: none found (no `featureA/…/featureB/internal` style).
- **Accidental public internals**: `lib/offline/db.ts` exposes generic
  IndexedDB helpers alongside workout record types through one module; consumers
  (syncService, workoutPersistence, engine) import it directly. Fine today, but
  the module mixes generic store and workout-schema concerns.
- **Type-direction smell**: rules engine and quiz draft import service-owned
  types (see §3) — the *contracts* (program shape, quiz answers) lack a neutral
  home.

## 9. State Ownership Audit

| State | Canonical owner | Duplicates | Persistence | Notes |
|---|---|---|---|---|
| Auth session | Supabase SSR (cookies) | browser client mirror | Supabase | single authority (OTP docs + middleware) |
| Quiz draft | `lib/quiz/quizDraft.ts` | — | localStorage | TTL'd, secret-safe |
| Program (current) | DB `Program` via `programService` | client cache in `api/program/current` consumer | Prisma | — |
| Workout session | `useWorkoutEngine` in-memory | offline snapshot `workoutStates` (IndexedDB) | IndexedDB | snapshot = resumable copy; conflict policy LWW + monotonic merge |
| Workout log outbox | `exerciseLogs` (IndexedDB) | — | IndexedDB → Supabase | idempotent upsert on `id` |
| Analytics queue | `analyticsService` (memory + storage?) | — | structured server log | batching seam, persistence deferred |
| Gamification | DB `User.xp/level/badges` | derived UI state | Prisma | idempotent `xpAwarded` guard |

Findings: `MULTIPLE OWNERS` (workout session: engine memory + offline snapshot —
intentional and policy-governed); `UI-OWNED DOMAIN STATE` (the session engine is
a hook in `components/`); no `DERIVED STATE STORED AS PRIMARY` found
(analytics are computed, not stored — documented).

## 10. Data Contract Audit

- Strongly typed: Prisma schema ↔ services; zod schemas at API boundaries
  (`requestSecurity.ts`, `quizFlow.ts`); typed API payloads in `quizApi.ts`.
- Loosely typed: `QuizResponse.answers` is `Json`/`unknown`; `ExerciseLogRecord`
  ↔ Supabase row mapping in `syncService.toSupabaseRow` is a hand-written
  snake_case projection (single source today, but duplicated schema knowledge).
- String identity: exercises and workout tokens are name-keyed (H-1); the
  library catalog `Exercise` type is local to one page with demo streams.
- Normalization layers exist: `quizFlow.normalizeQuizAnswers`,
  `programService` normalize/persist, `wallClock` accumulation.

## 11. Side-Effect Boundary Audit

- **Well isolated**: OTP (SMS.ir adapter behind provider seam), session
  establishment (admin-client contract), avatar storage (minimal storage
  contract + legacy fallback), sync (outbox + classifier), analytics ingestion
  (route logs only), audio/haptics (thin services), idempotency ledger.
- **Boundary quality**: consistently good — side effects sit behind documented
  seams with injectable fakes for tests; server-only modules (`userService`,
  prisma, service-role clients) are kept out of client bundles.
- **To watch**: `useWorkoutEngine`/`WorkoutPlayer` invoke persistence + audio +
  analytics + haptics directly (H-3) — each call is to a seam, but the fan-out
  means a V2 voice coach or engine change touches the same component tree.

## 12. Reusability Grades (selected capabilities)

| Capability | Grade | Notes |
|---|---|---|
| Wall-clock timing (`wallClock.ts`) | **A** | pure, framework-agnostic, tested |
| Offline conflict resolution (`conflictPolicy.ts`) | **A** | pure + order-independent + tested |
| OTP lifecycle (`otpService` core) | **A** | provider-agnostic core, injectable sender |
| Analytics computation (`analyticsService`) | **A** | pure helpers reusable client/server |
| Audio cues (`audioService`) | **A** | thin, no domain knowledge |
| Haptics (`useHaptic`) | **A** | thin hook |
| Session persistence (`lib/offline/*`) | **B** | reusable, but shapes are workout-specific |
| Program generation provider abstraction (`provider.ts`) | **B** | clean, but coupled to program-shape types |
| Exercise media (`AnimationPlayer`, `VideoPlayer`) | **B** | component-ready; no catalog/ID layer to bind to |
| Workout session engine (`useWorkoutEngine`) | **C** | React hook; requires feature knowledge; needs pure-core extraction for V2 |
| Quiz onboarding widget | **D** | JS island with private i18n/theme — only reusable as a whole screen |

## 13. Future Feature Reuse Scenarios

- **Workout Experience V2**: can reuse wall-clock, persistence, conflict policy,
  audio, haptics, analytics, AnimationPlayer directly. Needs new: canonical
  exercise identity + media catalog binding, PREPARE/TRANSITION execution-type
  metadata, and a session-core separated from the React hook.
- **Workout Preview**: can reuse Program + Exercise + Media once a catalog/ID
  layer exists; blocked today by H-1 (name identity, hardcoded library catalog).
- **Voice Coach**: can consume session state **if** the engine exposes a stable
  state read-model; today it would have to reach into a component hook.
- **Coach-created programs**: program normalization is already source-agnostic
  (rules vs AI share the same persisted shape) — good. The gap is again
  canonical exercise ids for non-generated programs.
- **New AI provider**: `provider.ts` + `classifyAiGenerationError` make this
  additive (one more provider branch). Idempotency/fallback are provider-blind.
  Clean.
- **New analytics feature**: additive via `analyticsEvents` catalog + ingestion
  route; analytics never controls domain logic. Clean.

## 14. Testability

The existing pyramid is well supported: pure modules (wallClock, conflictPolicy,
otp core, provider, quiz flow/draft, idempotency, analytics computation,
programSchedule) are unit-tested in Node with no mocks; services use injectable
seams (sender, admin clients, storage, clock); E2E covers main flows, auth, quiz,
PWA/offline, RTL, focus, accessibility. Weakest areas: `useWorkoutEngine` and
`WorkoutPlayer` tests require React renderer + IndexedDB fakes (existing
`workout-engine.test.tsx`), i.e. UI-owned domain logic is harder to test in
isolation — another argument for a pure session core before V2.

## 15. Change Blast-Radius (representative)

| Change | Likely touched domains | Collateral risk |
|---|---|---|
| A. Add AI provider | `provider.ts`, `.env.example`, `RELEASING.md`, prompts? | Low — additive branch |
| B. Add exercise-media format | `AnimationPlayer`/`VideoPlayer`, library page, asset pipeline, ASSETS.md | Low-Med — no catalog layer to centralize |
| C. Add TRANSITION phase to sessions | engine state machine, player, persistence snapshot, conflict merge, tests | **High today** — engine is a React hook + persistence shapes are workout-specific; V2 pure-core + versioned snapshot would contain it |
| D. Change persistence provider | `lib/offline/db.ts`, `workoutPersistence`, syncService, engine call sites | Medium — provider is centralized but record shapes leak into engine/player |
| E. Add Voice Coach | engine state read-model, player, audioService | Medium-High — engine currently inside components/ |
| F. Add user-profile field | schema, userService, profile API, profile UI | Low — standard vertical slice |

## 16. Workout Domain Deep Dive

Already good (do not change):

- Wall-clock timing, offline persistence + conflict policy, idempotent sync
  outbox, analytics/gamification separation, audio/haptics as thin seams,
  AnimationPlayer/VideoPlayer as presentational components.
- The engine's decision to be headless and wall-clock based.

Needs extension before V2 (extension, not rewrite):

- A pure **session-core** (timeline state machine) separated from the React
  hook; the hook becomes an adapter.
- Execution-type metadata (TIMED / REP / HOLD / PREPARE / REST / TRANSITION)
  on program exercises, with backward-compatible defaults for rep-only data.
- A canonical **exercise identity** used by programs, workout logs, media tokens
  and the library catalog; name-keyed lookup is the root coupling (H-1).
- Versioned offline snapshot shape (legacy records already merge safely —
  `version` optional; keep that discipline).

Must be decoupled before V2:

- Player fan-out (H-3): give the player a stable session-state contract so
  guidance/audio additions don't thread through it.
- Engine location (H-4): the Session Engine must not live only inside a React
  hook.

Can safely wait until V2: media technology choice, voice/TTS, countdown
treatment, left/right handling — all Open Questions, no architecture blocker.

What should NOT change: the secure OTP stack, idempotency ledger, conflict
policy, sync outbox, analytics/gamification seams — all work well and are
heavily tested.

## 17. Modularity Scorecard (1–5; comparative diagnostic, not precision)

| Domain | Cohesion | Coupling | Reusability | Testability | Ownership clarity | Contract clarity | Change isolation |
|---|---|---|---|---|---|---|---|
| Auth/OTP/Session | 5 | 4 | 5 | 5 | 5 | 5 | 5 |
| Program Generation | 4 | 4 | 4 | 5 | 4 | 4 | 4 |
| Program Schedule | 4 | 4 | 4 | 5 | 4 | 4 | 4 |
| Quiz/Onboarding | 4 | **2** | **1** | 3 | **2** | **2** | **2** |
| Workout Session | 4 | 3 | **2** | 3 | **3** | **3** | **3** |
| Offline/Sync | 4 | 4 | 4 | 5 | 4 | 4 | 4 |
| Analytics | 5 | 4 | 5 | 5 | 5 | 5 | 5 |
| Gamification | 5 | 4 | 4 | 5 | 5 | 5 | 5 |
| User/Profile | 4 | 4 | 4 | 4 | 4 | 4 | 4 |
| Exercise/Media | 3 | **2** | **2** | 3 | **2** | **2** | **2** |
| UI/Design System | 5 | 4 | 5 | 4 | 5 | 5 | 5 |
| Infra/Ops | 5 | 4 | 4 | 4 | 4 | 4 | 4 |

Weakest domains: Quiz/Onboarding (JS island + duplication), Exercise/Media (no
canonical catalog/ID), Workout Session (engine inside UI layer).

## 18. Architecture Decisions Required (see Risk Register for full list)

- AD-1: Canonical exercise identity — new `Exercise` catalog keyed by stable id,
  name kept as display label only. ADR candidate: YES. (Blocks V2 + preview +
  media library.)
- AD-2: Session Engine boundary — extract pure timeline core from
  `useWorkoutEngine`. ADR candidate: YES.
- AD-3: Quiz domain migration path — port JS island to TS and collapse
  duplicated restDays/exerciseStyles/theme/i18n into app contracts. ADR
  candidate: YES (or fold into modularization plan).
- AD-4: Program/quiz contract home — move shared shapes (program, quiz answers)
  into a neutral contract module to fix lib→services type imports. ADR
  candidate: YES/NO (small).
- AD-5: Offline record separation — split generic IndexedDB store from
  workout-specific record shapes (DO WHEN TOUCHED, not urgent).

Product decisions exposed (not resolved): exercise-name vs id user-visible
behavior; whether the library catalog becomes a real feature (currently
sample/demo); V2 execution-type defaults (see WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md).

## 19. What This Audit Does NOT Do

- It does not authorize any refactor, extraction, rename or file move.
- It does not create a Component Registry, Dependency Map, or modularization
  backlog (those names are reserved for the post-decision phase).
- It does not resolve Workout Experience V2 Open Questions.
- It proposes principles and candidates only; acceptance requires owner review
  and, where marked, an ADR.
