# AHF — Architecture & Scale-Readiness Audit

`STATUS: AUDIT RECORD — NOT AN ARCHITECTURE DECISION — READ-ONLY EVIDENCE`
> **Provenance:** placed into the repository 2026-09-14 via `docs/spec-kit-adoption-stage-0` (Stage 0 of SPECKIT-ADOPTION-01; owner decisions D1/D4 approved — [`../governance/OWNER_DECISION_GATE.md`](../governance/OWNER_DECISION_GATE.md)). Content preserved as issued.
Task: AHF Autonomous Architecture Audit + Scale Readiness + Spec Kit Adoption Design
Audit reference: `origin/main` @ `ff1202c687889f0de9f340d38dbcbdb1687f9db5` (MAIN) and `prototype/workout-layout-blueprint` @ `a62a7ce2213c00ea27db8207597c818fec216235` (DEV)
Audit date: 2026-09-14 (Asia/Tehran). Method: static inspection of the git repository at `/Users/msl/Documents/GitHub/Apex-Home-Fitness` (no checkout, no mutation; working tree of the DEV branch left untouched, including its uncommitted changes).

Every material conclusion cites repository evidence. Inference is labeled. Insufficient evidence is marked `UNKNOWN / NEEDS OWNER DECISION`.

---

## 1. Executive Summary

Apex Home Fitness (AHF) is a bilingual (fa/en, RTL/LTR) home-fitness PWA: AI-assisted workout program generation, offline-capable workout execution, OTP auth, an admin console, and an on-device pose-observation capability — all deployed self-hosted on a single Docker host. It is built with Next.js 15.5 App Router + React 18 + TypeScript on Node 22, with Prisma 6 + SQLite as the server persistence plane and Supabase as the identity/session/avatar/offline-log plane.

The single most important overall finding: **the architecture is significantly healthier than its age suggests, and the dominant risk is not code coupling — it is (a) the deferred consolidation decisions around the two server data planes and (b) process scale**. The repository already carries an unusually mature governance system (21 ADRs, machine-validated task profiles, release gateways, documented authority hierarchy). Any new tooling — including GitHub Spec Kit — must plug into that system, not parallel it.

Key verdicts:

1. **No subsystem qualifies as MIGRATE NOW.** The product is pre-launch (OTP public launch is behind a Go/No-Go checklist, `docs/OTP_LAUNCH_READINESS.md`); there is no measured traffic pressure in evidence. Everything expensive is better handled as a trigger-bound ABSTRACT/KEEP decision. (MAIN)
2. **The most expensive deferred decision is SQLite→PostgreSQL** on the Prisma plane. It is correct to defer it now, but it must carry a written trigger, because every other scaling path (multi-instance, HA, managed hosting) passes through it. (MAIN)
3. **The second most expensive deferred decision is the Supabase identity coupling.** The seam already exists and is well-disciplined (`OtpService` seam, supabase-js confined to 9 known files, `User.id == Supabase auth id` contract); the repository itself has accepted (but deferred) the "Supabase coupling evaluation" as Architecture Principle 12. (MAIN)
4. **Node.js is not a credible bottleneck at any realistic scale of this product.** The workload is I/O-bound (SQLite file I/O, Supabase REST, AI provider HTTP, SSR). The first bottlenecks will be, in order: single-host topology → SQLite single-writer → AI provider latency/limits → Supabase plan limits. Bun/Go/Rust would add deployment-identity risk for no evidenced benefit. (MAIN)
5. **DEV branch (`prototype/workout-layout-blueprint`) introduces the first new runtime dependency since launch prep: `three` r180 + `@types/three`**, a shared `src/components/workout/MentorStage.tsx`, a CSP `connect-src blob:` loosening, and a 3.2k-line prototype inside an isolated `prototype/` namespace + route. It is exemplary prototype discipline, but it is a material architecture delta that must not merge without spec treatment (it is precisely the kind of work the proposed Spec Kit pilot would govern). (DEV)
6. **Production is 97 commits behind `main`.** All intervening work is documented as docs-only or CODE_NO_DEPLOY, but this gap is a deployment-identity fact the owner should see. (MAIN, `docs/CURRENT_STATE.md` + `git rev-list --count 4ada1dae..main`)
7. Doc drift exists at velocity: e.g., `docs/architecture/MODULARITY-AUDIT.md` says "React 19" while `package.json` pins `react ^18` (package.json is authoritative per `AGENTS.md` §1). Small, but it demonstrates why spec/status discipline needs machine support. (MAIN)

---

## 2. Repository Evidence Scope

Inspected (all via read-only git against `origin/main` unless tagged DEV):

- **Branch topology**: local branches `main`, `prototype/workout-layout-blueprint` (checked out, 19 ahead / 0 behind main, merge-base = main HEAD), `diagnostic/b2-3b-rest-handoff`, `fix/s03-rsc-render-regression`, `prototype/ahf-3d-mentor-baseline` (unmerged). Remote `origin = ssh://git@ssh.github.com:443/msaeedlavasani/Apex-Home-Fitness.git`.
- **Full file tree**: 568 files; 226 `.ts`, 139 `.md`, 85 `.tsx`, 15 `.sql`, 13 `.jsx`, 7 `.bin` (MoveNet weights), tests = 99 files (82 `*.test.*` + 17 `*.spec.*` Playwright).
- **Root configs**: `package.json`, `package-lock.json` (v3, ~305 KB), `.nvmrc` (22), `tsconfig.json`, `next.config.mjs`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.example`, `.eslintrc.json`.
- **CI**: `.github/workflows/ci.yml` (per-push: governance → guardrail → gateway tests → lint → typecheck → unit → build → targeted E2E) and `.github/workflows/ci-full-e2e.yml` (nightly/manual full suite).
- **Data**: `prisma/schema.prisma` (507 lines, 15 models, SQLite), 13 migrations, `supabase/migrations/0001_workout_exercise_logs.sql`.
- **Governance/docs**: `AGENTS.md`, `docs/INDEX.md`, `docs/governance/DOCUMENTATION-GOVERNANCE.md`, `docs/RELEASE_POLICY.md`, `docs/BRANCHING_POLICY.md`, `docs/CURRENT_STATE.md`, `docs/TASKS.md`, `docs/architecture/ARCHITECTURE-PRINCIPLES.md`, `docs/architecture/MODULARITY-AUDIT.md`, `docs/architecture/COUPLING-RISK-REGISTER.md`, `docs/AI_DEVELOPMENT_SYSTEM.md`, `docs/adr/0001–0021`, `scripts/governance-runtime.mjs`.
- **Source hotspots**: `src/middleware.ts`, `src/lib/prisma.ts`, `src/lib/supabase{,-server}.ts`, `src/lib/ai/provider.ts`, `src/app/api/generate-program/route.ts` (590 lines), `src/lib/ai/rateLimitStore.ts`, `src/lib/workout/sessionCore.ts` (243 lines), `src/components/workout/useWorkoutEngine.ts` (173), `src/components/workout/WorkoutPlayer.tsx` (643), `src/lib/offline/db.ts`, `src/services/syncService.ts` (449), `src/app/api/analytics/events/route.ts`, `src/lib/auth/*`, `src/lib/admin/auth.ts`.
- **DEV delta**: `git diff main...prototype/workout-layout-blueprint` (34 files, +3200/−1) plus the uncommitted rest-timing debug instrumentation in `src/app/[locale]/prototype/workout/page.tsx`.
- **History**: 265 commits on main, 2026-08-15 → 2026-09-08 (24 days), authors: msaeedlavasani (261) + freebuff-web[bot] (4).

Not inspected (out of scope / unavailable): Production host state (`sabtbrooker`), actual Supabase project plan/tier, real traffic metrics, gateway proof files (root-only on host). These are marked UNKNOWN where relevant.

### Branch scope table (required by task)

| Branch | Role | HEAD | vs main |
|---|---|---|---|
| `main` | MAIN — canonical baseline (production checkpoint `4ada1dae` + docs/CODE_NO_DEPLOY advances) | `ff1202c6` | — |
| `prototype/workout-layout-blueprint` | DEV — Workout V2 experience prototype | `a62a7ce` | 19 ahead / 0 behind; merge-base = `ff1202c6` |
| Production (documented) | Deployed source | `4ada1dae` (`CURRENT_STATE.md`) | 97 commits behind main |

DEV delta summary (34 files, +3200/−1): new route `src/app/[locale]/prototype/workout/{layout,page}.tsx`; 22 new files under `src/components/workout/prototype/` (WorkoutExperienceShell, StartStage, PrepareStage, RestStage, ExerciseIntroStage, CompleteStage, QuietCoach, SessionBar, MentorViewport, TrackingSkeletonOverlay, MovementFeedbackOverlay, WorkoutControls, WorkoutStateDebugControl, prototypeFlow, startWorkoutBridge, tracking, workoutState, workoutSession, …); **shared-namespace additions: `src/components/workout/MentorStage.tsx`, `public/prototype-assets/AHF_Mentor_Squat.glb`, `package.json` + `three@^0.180.0`/`@types/three`, `next.config.mjs` CSP `connect-src` += `blob:`, `.gitignore` += `/.tmp/`, `globals.css`, `docs/INDEX.md` + new `docs/architecture/WORKOUT-PROTOTYPE-VIEWPORT-CONFORMANCE.md`**. Uncommitted on DEV: REST_TIMING_TRACE T0/T1/T2 debug instrumentation behind `?restTimingDebug=1`.

---

## 3. Current Architecture Map (MAIN)

### 3.1 Frontend

- Next.js 15.5.23 App Router; React 18.3; TypeScript 5 strict (`tsconfig.json`: `strict: true`, target ES2017, `@/*` → `src/*`).
- Routing: `src/app/[locale]/*` (en/fa via next-intl 4.13.7; `src/i18n/routing.ts`; middleware composes locale routing + Supabase session refresh + route protection — `src/middleware.ts`). Admin lives outside the locale segment: `src/app/admin/*`.
- Component split: 52 files marked `'use client'`. RSC boundaries are used conventionally (pages mostly server; interactive islands client).
- UI systems (three, governed): Tailwind 3.4 + custom platform kit `src/components/ui/platform/*` (PlatformProvider with android/ios/web variants, primitive set) + MUI 9.3/Emotion restricted by machine-enforced allowlist to `MuiProvider.tsx` + `muiTheme.ts` (`scripts/governance-runtime.mjs` `MUI_ALLOWLIST`, KIT-FIRST rule in `AGENTS.md` §6) + a legacy JS quiz island `src/components/quiz/*.jsx` with internally duplicated domain logic (`restDays.js`, `exerciseStyles.js`, `theme.js`, `i18n.js` — repo's own R-03 in `COUPLING-RISK-REGISTER.md`).
- Design system governance: `docs/DESIGN_SYSTEM.md`, typography contract (fa→Vazirmatn, en→Inter, self-hosted fonts in `src/app/fonts/`), UI Conformance Gate, AHF Design Brain vNext P0 (`docs/architecture/AHF-DESIGN-BRAIN-VNEXT-P0.md`).

### 3.2 API / server boundaries

- Route handlers under `src/app/api/*`: `auth/request-code|verify|logout`, `admin/login|logout`, `generate-program`, `program/current`, `quiz/save`, `workout/session`, `profile`, `analytics/events`, `account/delete`, `monitor/sms-delivery`.
- Server-only discipline: `src/lib/supabase-server.ts` warns against client import; `userService` documented server-only; middleware does session refresh via `@supabase/ssr` `createServerClient`.
- Program generation: single 590-line route `src/app/api/generate-program/route.ts` — zod `ProgramSchema`, idempotency header + ledger (`src/lib/ai/idempotency.ts`, `ProgramGenerationRequest` model), rate limiting via `RateLimitStore` interface (`src/lib/ai/rateLimitStore.ts`: in-memory default + optional Upstash Redis REST store), concurrency slots + timeout + high-risk disclosure checks (`src/lib/ai/requestSecurity.ts`), provider resolution + classified fallback (`src/lib/ai/provider.ts`), deterministic rules engine fallback (`src/lib/ai/ruleBasedProgram.ts`), rest-day enforcement post-pass (`src/lib/ai/restDays.ts`), versioned prompts (`infra/ai/prompts/*.md`).

### 3.3 Data & persistence (three planes)

1. **Prisma 6.19 + SQLite** (server): models `User, AdminAccount, AdminSession, WeightEntry, Exercise, Movement, MovementRelationship, MovementMedia, Program, ProgramExercise, WorkoutSession, WorkoutSessionExercise, QuizResponse, ProgramGenerationRequest, PhoneOtp` (15) + 13 migrations. Singleton client `src/lib/prisma.ts`. Importers (all 10): 6 route handlers, 3 admin lib modules, `movementGraphStore`. Production DB is a Docker volume `apexhomefit_prod_db:/data` (`CURRENT_STATE.md`, `docker-compose.yml`).
2. **Supabase** (identity + storage + one Postgres table): auth (phone OTP, SMS.ir provider in live mode; `src/lib/auth/smsIrProvider.ts`, explicit mock for dev/CI that "never mints sessions" — `src/lib/auth/mockOtpService.ts`, `src/middleware.ts` header comment), session cookies via `@supabase/ssr`, private `avatars` Storage bucket (`src/services/avatarStorage.ts`), and `public.workout_exercise_logs` with RLS (client-side upserts of offline outbox — `supabase/migrations/0001_workout_exercise_logs.sql`, `src/services/syncService.ts`).
3. **Client (browser)**: Dexie/IndexedDB — `activePrograms`, `workoutStates` (snapshot versioning + LWW+monotonic-merge conflict policy, `src/lib/offline/conflictPolicy.ts`, `snapshotVersion.ts`), `exerciseLogs` durable outbox (attempt-capped). `syncService.ts` drains the outbox to Supabase when online; classification of retryable vs permanent sync errors.

**Identity contract (cross-plane)**: `Prisma User.id == Supabase auth user.id` — documented in `src/lib/offline/db.ts` and `src/services/syncService.ts`, implemented in `src/services/userService.ts` (`syncUserWithSupabase`). supabase-js imports are confined to exactly 11 src files (verified by grep): 2 wrapper modules (`src/lib/supabase.ts`, `src/lib/supabase-server.ts`) + 9 consumer files — `ProfileView.tsx`, `account/delete/route.ts`, `quizAuth.ts`, `middleware.ts`, `accountDeletionService.ts`, `avatarStorage.ts`, `phoneSessionService.ts`, `syncService.ts`, `userService.ts`.

### 3.4 Domain logic

- Pure session core: `src/lib/workout/sessionCore.ts` (243 lines, command/effect state machine) + thin React adapter `useWorkoutEngine.ts` (173) + `WorkoutPlayer.tsx` (643) — result of S03 stabilization (ADR-0002, ARCHITECTURE-STABILIZATION-PLAN).
- Movement Graph: pure modules `src/lib/movement/*` (ingest with fail-closed identity, taxonomy, provenance w/ sha256, relationships with cycle/dangling validation, localization/media manifest contract, reconcile) + persisted store `src/services/movementGraphStore.ts` + additive tables (MG-09, migration `20260901120000_add_movement_graph_tables`) — Production apply still owner-gated.
- Adaptive loop contracts: `src/lib/adaptive/*` (AL-03 input pipeline), `src/lib/outcomes/*` (AL-01), decision layer `buildAdaptiveDecision` (AL-04, ADR-0017) — pure, no runtime wiring yet.
- Observation: `src/lib/observation/*` (CP-02 signal model, CP-07 in-memory recorder), camera boundary `src/services/cameraService.ts` (on-device MoveNet/TF.js; models bundled same-origin at `public/models/movenet/`), two-layer consent `src/services/cameraConsentService.ts` + UI (`CameraConsentBanner`, `CameraTrackingIndicator`), privacy posture "raw video never leaves the device" (TS-01, ADR-0014/0021).
- Offline/workout persistence: `src/lib/offline/workoutPersistence.ts` + `workout/session` API route.

### 3.5 Auth

- User: phone OTP. Request/verify rate limits by phone+IP windows (env-tuned), `PhoneOtp` table, `OtpService` seam (`src/lib/auth/types.ts`), SMS.ir live provider, mock provider (dev/CI allowlist; `AUTH_OTP_MODE=mock`; production mock is an emergency mode with `AUTH_OTP_MOCK_IN_PRODUCTION` + allowlist — `.env.example`, `docs/OTP_LAUNCH_READINESS.md`).
- Admin: dedicated `AdminAccount`/`AdminSession` Prisma models, separate login/logout routes + provision script (`scripts/provision-admin.ts`, ADR-0004) — deliberately not Supabase-bound.

### 3.6 Deployment & operations

- Single-host Docker Compose: `migrate` service (runs `prisma migrate deploy`, chowns volume) + `app` (standalone Next server, port 3000), SQLite volume, fixed DNS 1.1.1.1/8.8.8.8 (documented Supabase DNS fragility from this host), default npm mirror `package-mirror.liara.ir` (Iran), digest-pinned `node:22-alpine` base, strict CSP/security headers in `next.config.mjs`, PWA (`public/service-worker.js`, `offline.html`, `manifest.json`) + TWA `assetlinks.json`.
- Production deploy gateway: root-owned `apex-deploy-gateway` daemon + unprivileged `apex-deploy` client over Unix socket; exact-SHA releases, fail-closed rejection of `command`/`db_change`/non-authoritative SHA; rollback snapshots verified; secret boundary root-only `.env` (`docs/CURRENT_STATE.md` "Gateway" section, `docs/PRODUCTION_DEPLOYMENT_GATEWAY.md`, `ops/deploy-gateway/`).
- Release policy: task not complete until Production checkpoint + post-deploy real-browser smoke (`docs/RELEASE_POLICY.md` RULE 1/6/7); immutable builds; build-time vs runtime config distinction; backup + rollback plan required before any deploy.
- CI: per-push fast lane (governance checks, unit, build, targeted E2E in mock/open modes); nightly full E2E; branch protection with `enforce_admins` + linear history (`docs/CURRENT_STATE.md` Notes).

### 3.7 Observability & analytics

- Structured logging `src/lib/logger.ts`; optional Sentry (`src/lib/errorTracking.ts`, DSN-gated; CSP allows `*.ingest.sentry.io`); `src/instrumentation.ts`; monitor endpoint `/api/monitor/sms-delivery`.
- First-party analytics events `POST /api/analytics/events` → validated, sanitized, **written to structured logs only** (no persistence table; the route comment explicitly anticipates a future persistence layer).

### 3.8 Testing strategy

- 82 unit/contract tests (`node:test` via tsx, `--test-concurrency=1`), 17 Playwright specs; targeted E2E lanes (`test:e2e:auth` mock mode, `test:e2e:smoke` open mode) per push; full suite nightly/manual. Golden-trace session tests (`tests/session-golden-trace.test.tsx`), effect-boundary tests, contract tests per domain. Known stale-expectation ledger: `docs/TEST-DEBT.md` (TD-01/TD-02 fixed 2026-09-01).
- Audit scripts without runtime deps: `audit:assets`, `audit:design`, `audit:lottie`; guardrail + governance runtime self-tests.

### 3.9 Localization

- next-intl; `en.json`/`fa.json` message catalogs; RTL via Vazirmatn + `dir` handling; movement-domain localization keys per MG-07; admin has its own locale/theme switchers. Both `/en` and `/fa` routes are protected rules (`AGENTS.md` §4).

### 3.10 What is NOT there (evidence-based absences)

- No queue/worker system, no background jobs, no cron inside the app.
- No Redis/cache layer by default (only the optional rate-limit store).
- No CDN configuration (media posture is self-hosted/DATA-ONLY; demo streams are external `mux.dev`/google sample buckets per R-09/CSP comments).
- No metrics pipeline (no Prometheus/OTel); analytics is log-based.
- No multi-instance story active (in-memory slots/locks default).
- No Postgres on the Prisma plane.

---

## 4. Technology Inventory

| Domain | Technology | Version pin | Evidence |
|---|---|---|---|
| Framework | Next.js (App Router, standalone output) | 15.5.23 exact | `package.json`, `next.config.mjs` |
| UI runtime | React / React DOM | ^18 | `package.json` (⚠ `MODULARITY-AUDIT.md` says "React 19" — doc drift; package.json authoritative) |
| Language | TypeScript (strict) | ^5 | `tsconfig.json` |
| Runtime | Node.js | >=22 (`.nvmrc` 22; Docker `node:22-alpine` digest-pinned) | `package.json` engines |
| Package manager | npm, lockfile v3 | — | `package-lock.json`; Iran mirror default in compose |
| Styling | Tailwind CSS | ^3.4.1 | `package.json`, `infra/config/tailwind.config.js` |
| UI kit | platform kit + MUI/Emotion (allowlisted) | @mui/material ^9.3.1 | `src/components/ui/platform/`, `scripts/governance-runtime.mjs` |
| i18n | next-intl | 4.13.7 exact | `package.json` |
| ORM/DB | Prisma + SQLite | @prisma/client ^6.19.3; `provider = "sqlite"` | `prisma/schema.prisma` |
| Identity/SS | Supabase (@supabase/ssr ^0.12.4, supabase-js ^2.112.3) | — | `package.json`, `src/lib/supabase*.ts` |
| Client storage | Dexie (IndexedDB) | ^4.4.5 | `package.json`, `src/lib/offline/db.ts` |
| AI SDK | Vercel AI SDK `ai` ^4.3.19 + @ai-sdk/groq ^1.2.9 + @ai-sdk/openai ^1.3.24 | — | `package.json`, `src/lib/ai/provider.ts` |
| Validation | zod | ^3.25.76 | `package.json` |
| Media/video | hls.js ^1.7.0, lottie-react ^2.4.0 | — | `package.json` |
| 3D (DEV-ONLY) | three + @types/three r180 | ^0.180.0 | DEV `package.json` delta |
| Pose | MoveNet/TF.js models, same-origin | bundled artifacts | `public/models/movenet/`, `scripts/pose-measurement/` |
| Auth/SMS | SMS.ir REST + explicit mock | — | `src/lib/auth/smsIrProvider.ts`, `mockOtpService.ts` |
| Rate-limit store | In-memory (default) / Upstash Redis REST (opt-in) | — | `src/lib/ai/rateLimitStore.ts` |
| Monitoring | Structured logger; Sentry optional | — | `src/lib/logger.ts`, `src/lib/errorTracking.ts` |
| E2E | Playwright ^1.62 | — | `package.json`, `infra/config/playwright.config.ts` |
| Deploy | Docker Compose, standalone image, root-owned deploy gateway | digest-pinned base | `Dockerfile`, `docker-compose.yml`, `ops/deploy-gateway/` |

---

## 5. Dependency & Coupling Map

Direction is healthy and verified: **pages → components → services → lib → infra**; no domain→UI or infra→feature-UI inversions found beyond the two known type-only ones.

Import-spread evidence (grep on MAIN):

- `@/lib/prisma` imported by exactly 10 files (6 API routes, `lib/admin/{auth,console,provision}`, `services/movementGraphStore`) — **DB access is not scattered**; it is concentrated behind services + routes.
- supabase-js/@supabase imports confined to exactly 9 src files (+ the 2 client/server wrapper modules) — identity plane is contained.
- Known inversions (repo's own R-04, confirmed): `lib/ai/ruleBasedProgram.ts:5` imports types from `services/programService`; `lib/quiz/quizDraft.ts:30` imports a type from `services/userService`. Type-only; direction should be neutralized in a shared contract module when touched.

Coupling classification (LOW/MEDIUM/HIGH/CRITICAL), repo-specific:

| # | Area | Level | Evidence | Consequence | Replacement difficulty | Recommended boundary |
|---|---|---|---|---|---|---|
| C-1 | Identity contract across 3 planes (Prisma `User.id` == Supabase uid == Dexie namespace == `workout_exercise_logs.user_id`) | **HIGH** | `offline/db.ts` + `syncService.ts` header docs; `userService.syncUserWithSupabase`; RLS policies in `0001_workout_exercise_logs.sql` | Any identity-provider change touches auth, 9 supabase files, offline namespace, RLS, avatars, deletion service | HIGH (cross-plane, includes data) | Keep the seam: treat `userId` as opaque string; supabase-js stays in the 9 files; add `IdentityProvider` port only when Principle-12 evaluation triggers |
| C-2 | SQLite volume as server persistence | **HIGH** (operational, not code) | `prisma/schema.prisma` provider sqlite; compose volume; `CURRENT_STATE.md` DB identity | Single-writer; no horizontal read scaling; backup/HA bounded by host | MEDIUM (Prisma provider switch + migration history + ops) | Services-layer boundary already exists; prepare trigger-based Postgres runbook (see §9) |
| C-3 | Session core ↔ React adapter | LOW | `sessionCore.ts` pure (no React imports); `useWorkoutEngine.ts` thin adapter; ADR-0002 | — | — | Preserve purity (binding rule, ARCHITECTURE-PRINCIPLES §13.4) |
| C-4 | AI provider coupling | LOW | `resolveAiProvider` env-based; classified fallback; rules engine fallback; `RateLimitStore` port | Provider swap is config-level | LOW | Keep; do not add provider-specific logic outside `lib/ai` |
| C-5 | Quiz JS island duplication | MEDIUM | `components/quiz/*.jsx` re-implements restDays/styles/theme/i18n; hand-mirrored ids in `quizFlow.ts` + `requestSecurity.ts` (R-03/R-08) | Divergence risk; cannot consume TS contracts | MEDIUM (TS port, behavior parity required) | WHEN-TOUCHED TS port; single vocabulary source |
| C-6 | WorkoutPlayer fan-out | MEDIUM | imports audio, analytics, offline db, persistence, hooks, timers (R-05) | V2 additions enlarge a wide surface | MEDIUM | Session-state read-model boundary before V2 guidance features |
| C-7 | `MentorStage.tsx` + three.js entering shared namespace (DEV) | MEDIUM (DEV-ONLY) | DEV diff: shared `src/components/workout/MentorStage.tsx`, `three` in deps, CSP `connect-src blob:` | 3D runtime becomes a product-surface dependency before a spec exists; CSP loosening is global | LOW now / HIGH after merge | Keep prototype fully inside `prototype/` namespace until spec treatment; if adopted, isolate WebGL behind its own boundary (lazy chunk, capability check) |
| C-8 | Governance machinery coupling to docs paths | LOW | `governance-runtime.mjs` required-docs lists; UI allowlists | Doc moves break machine checks (by design) | LOW | Intentional; Spec Kit artifacts must register here, not bypass |
| C-9 | Analytics log-only ingestion | MEDIUM (at scale) | `analytics/events/route.ts` (log sink, sanitize, 64KB/50-event caps) | No queryable store; log volume grows with events | LOW-MEDIUM | Add persistence behind the same route when product needs event data |
| C-10 | Middleware doing session refresh + protection per request | LOW-MEDIUM | `src/middleware.ts` calls `supabase.auth.getUser()` on auth-relevant requests when configured | Adds Supabase RTT to navigations; Supabase outage degrades to signed-out (documented) | LOW | Acceptable; revisit if identity port happens |

Duplicated responsibilities: quiz island (above); `movenet` model binaries duplicated in `public/models/` and `scripts/pose-measurement/models/` (dev harness vs runtime — acceptable, but a size/consistency note).

Healthy boundaries worth naming (evidence): `OtpService` seam; `RateLimitStore` port; session core/adapter split; movement-graph pure modules vs `movementGraphStore`; zod contracts at all API edges; engine-version marker `AI_ENGINE_VERSION = 'rules-v2/provider-v1'`.

---

## 6. Scale-Readiness: 10x / 100x / 1000x

Baseline caveat (explicit): the repository contains **no measured traffic baseline** (no metrics pipeline; no user counts anywhere in docs). All multipliers below are relative to whatever current load is — UNKNOWN in absolute terms. "Unscalable" is not claimed anywhere; each item notes the mechanism and the fix.

### 6.1 Application architecture

| Dimension | 10x | 100x | 1000x | Mechanism / evidence |
|---|---|---|---|---|
| SSR/API throughput (Node) | OK | OK (vertical + a few instances) | Needs horizontal tier + load balancing; Node itself not the constraint | Workload is I/O-bound; Next standalone server is stateless apart from SQLite/limiter |
| SQLite (Prisma plane) | OK (low write concurrency) | **Wall**: single-writer lock contention; volume I/O; no second app instance against the same file safely for writes | Requires managed Postgres + pooling | `schema.prisma` sqlite; compose volume; Prisma SQLite concurrency limits |
| Supabase (auth, avatars, workout logs) | OK | Plan limits + region latency become visible (Iran egress!) | Probably replaced or mirrored; RLS-table analytics not enough | `0001_workout_exercise_logs.sql`; Principle 12 already flags reachability |
| AI generation path | OK with in-memory slots | Slots/locks must move to shared store (built: Redis REST store) + queueing desirable; provider rate limits dominate | Requires async job architecture (request → queue → poll/webhook); synchronous 590-line request route inadequate | `rateLimitStore.ts`; `requestSecurity.acquireGenerationSlot`; AI_ENGINE_VERSION |
| Rate limiting | In-memory OK (single instance) | Must enable `RATE_LIMIT_STORE=redis` before instance #2 | Same | `rateLimitStore.ts` header docs |
| Session/state | Stateless server (cookies + client Dexie) — good | OK | OK | Middleware refresh pattern; offline snapshots carry state client-side |
| Offline/sync outbox | OK | OK (per-device; idempotent upserts) | Conflict semantics may need server-side merge when multi-device editing grows | `conflictPolicy.ts` LWW+monotonic; `syncService` idempotent upsert |
| Analytics | Log sink OK | Log volume/query pain; no retention policy in repo | Needs event store/warehouse | `analytics/events/route.ts` |
| Background jobs / queues | none needed | Needed for AI generation + sync fan-out | Mandatory | No queue exists (§3.10) |
| Observability | Structured logs + optional Sentry OK | Need log aggregation + metrics baseline | Mandatory tracing/metrics | §3.10 absences |

### 6.2 Infrastructure capacity

| Dimension | 10x | 100x | 1000x | Evidence |
|---|---|---|---|---|
| Compute topology | Single host fine | 2+ instances or bigger host; gateway needs extension (currently exact-SHA single-host) | Multi-node/orchestrator; deploy gateway rework | `CURRENT_STATE.md` gateway; compose |
| DB capacity | SQLite volume OK | Backup windows, write locks, disk I/O | Managed Postgres + PITR | compose; RELEASE_POLICY backup rules |
| Media bandwidth | Tiny (self-hosted demo catalog; MoveNet ~few MB same-origin) | Video catalog (V2) will dominate bandwidth → CDN/object storage needed | Mandatory CDN; MG-07 manifest already anticipates self-hosted media with hash integrity | MG-07 docs; CSP media-src; R-09 |
| Uploads | Avatars only (Supabase Storage signed URLs) | OK (provider-side) | OK | `avatarStorage.ts` |
| 3D assets (DEV) | One GLB in `public/prototype-assets/` | Needs caching/compression discipline if adopted | CDN | DEV delta |
| CDN | absent | needed for models/videos | mandatory | §3.10 |
| Failure isolation | Single host = SPOF (documented rollback exists) | App-tier redundancy solves app SPOF; DB still SPOF | Full HA | gateway rollback evidence |
| Cost growth | negligible | Supabase plan + host upgrade + AI tokens | AI tokens + egress dominate | — |
| Operational complexity | High per-feature ceremony but simple topology | Medium | High | governance docs |

Honest assessment: at 10x of an unknown-but-small pre-launch baseline, **nothing in the current architecture blocks growth**. The architecture is already "scale-ready in shape" (stateless app, seams present); the missing pieces are capacity pieces (Postgres, shared limiter, queue, CDN), all of which have identified insertion points.

---

## 7. KEEP / ABSTRACT NOW / MIGRATE NOW / UNKNOWN Matrix

Definitions per task. "Expected scale trigger" = the evidence-backed condition at which the classification must be revisited.

| Subsystem | Classification | Current state (evidence) | Expected scale trigger | Consequence of delay | Cost now | Cost later | Migration difficulty | Recommended action | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Next.js 15 / React 18 / TS stack | **KEEP** | core of repo; CI/build green | — | — | — | — | — | none | HIGH |
| Node 22 runtime | **KEEP** | engines/.nvmrc/Docker pin | see §8 triggers | — | — | — | — | none | HIGH |
| npm + lockfile v3 | **KEEP** | mirror-aware Docker | — | — | — | — | — | none | HIGH |
| Prisma + SQLite | **KEEP** (boundary already abstract) | 10 importer files, services-layer discipline | Second app instance OR write contention OR managed-hosting move OR backup window pain | Each month of delay adds rows/migrations to move (13 migrations now) | ~0 | High (provider+ops switch) | MEDIUM | Write the trigger runbook now (docs-only); keep migrations additive | HIGH |
| Supabase identity/auth/storage | **ABSTRACT NOW** (keep implementation; enforce seam) | seam exists; 9-file confinement verified; Principle 12 accepted-evaluation-need/deferred | Supabase outage/reachability incident from Iran egress; plan/cost change; product need for local identity | Coupling deepens with each new supabase consumer | Low (discipline + doc) | High (cross-plane identity swap) | HIGH | Document the seam as a binding rule (identity stays opaque; new supabase imports require architecture note); schedule Principle-12 evaluation | HIGH |
| AI provider layer (groq/openai/rules) | **KEEP** | resolver + classified fallback + idempotency | Provider geo-block/price change (already survived Groq→OpenAI geo story in `.env.example`) | — | — | — | LOW | none | HIGH |
| Rate-limit store | **KEEP** (Redis activation = config) | `RedisRestRateLimitStore` built and tested | Before second app instance | Per-instance limiter inconsistency | 0 now; config later | — | LOW | Add to pre-scale checklist | HIGH |
| Offline/Dexie/sync | **KEEP** | bounded module + policy + tests | Multi-device write conflicts surface | — | — | — | — | none | HIGH |
| Session core (S03) | **KEEP** | pure core + adapter + golden traces | — | — | — | — | — | protect purity | HIGH |
| Movement Graph (MG-01..09) | **KEEP** (pending Production apply is owner-gated, existing item) | pure modules + additive tables | MG-09 Production apply decision (owner) | Runtime stays on JSON catalog | — | — | — | existing owner gate, not re-opened by this audit | HIGH |
| Observation/camera (CP-*) | **KEEP** | consent-gated, on-device, non-persistence posture | TS-02/legal + owner decisions (existing) | — | — | — | — | existing gates | HIGH |
| Quiz JS island | **KEEP / WHEN-TOUCHED** (repo's own R-03 urgency) | duplicated logic, stable | Next feature touching quiz | Divergence risk grows | 0 | MEDIUM | MEDIUM | TS port only when quiz is touched; single vocabulary source | HIGH |
| MUI presence | **KEEP** (restricted) | allowlist enforced by governance-runtime | When admin console needs the surface again | — | — | — | — | none | HIGH |
| Analytics (log sink) | **ABSTRACT NOW** (small) | route comment anticipates persistence | Product decisions needing event queries; 100x log volume | Data loss for analytics (logs rotate) | Small | MEDIUM | LOW-MEDIUM | Add table/warehouse behind same route when needed | MEDIUM |
| Deploy gateway + compose | **KEEP** | proven, hardened, rollback-verified | Multi-host topology | — | — | — | — | do not replace | HIGH |
| DEV: three.js / MentorStage / prototype route | **UNKNOWN / NEEDS OWNER DECISION** (product) — technically low blast radius while isolated | DEV-ONLY, isolated namespace, CSP loosened, new runtime dep | Merge decision | Un-managed adoption of 3D runtime into product | 0 (not on main) | Medium if merged ungoverned | LOW | Route through spec treatment (see Spec Kit design §Pilot) | HIGH on facts / product intent UNKNOWN |
| Media/demo catalog (mux demo streams) | **UNKNOWN** (product decision, repo's own R-09) | hardcoded demo arrays | V2 media library work | Wasted inventory build | 0 | — | — | existing S-06 decision covers catalog role; keep DATA-ONLY posture | MEDIUM |

**MIGRATE NOW count: 0.** This is a deliberate, evidence-based outcome (pre-launch; no measured pressure; all expensive paths have clean insertion points). Approving any MIGRATE NOW would contradict the project's own principles (bounded migration, evidence-before-migration).

---

## 8. Node.js vs Bun / Alternative Runtime (project-specific)

| Criterion | Node 22 (current) | Bun | Go / Rust (server alternative) |
|---|---|---|---|
| Install speed | npm ci + cache; fine in CI (cache configured) | faster in isolation | n/a |
| Dev startup | `next dev` standard | compat varies | n/a |
| Build speed | measured acceptable (CI not reported as slow) | possibly faster | n/a |
| Runtime throughput | I/O-bound workload; Node not the constraint | comparable or better in microbenchmarks — **synthetic, not evidence here** | high, but requires rewriting the app |
| Next.js compatibility | official, standalone output used by Docker | Next can run under Bun experimentally; standalone+`output` pipeline is Node-oriented; UNKNOWN interaction with `@supabase/ssr` cookies + Prisma engines | none (rewrite) |
| Prisma compatibility | native engines, supported | Prisma-on-Bun historically required workarounds; UNKNOWN for this schema | separate drivers |
| Ecosystem maturity | full | partial | n/a |
| Observability/debugging | known tooling | less battle-tested | different stack |
| Deployment complexity | proven (digest-pinned image, gateway proofs, Liara mirror) | new image + new lockfile + mirror compatibility UNKNOWN (`--replace-registry-host` is an npm flag; Bun mirror behavior needs verification) | high |
| Operational risk | lowest (current) | medium (unproven here) | high |

Answers required by task:

- **A. Is Node.js likely to be a real scale bottleneck here?** No. Evidence: the request path is I/O-bound (SQLite file ops, Supabase REST, AI provider HTTP, SSR render). No CPU-bound server workload exists; the only heavy compute (pose inference) is deliberately on-device. First-principles + repo evidence, no synthetic benchmarks used.
- **B. What will likely bottleneck first?** In order: (1) single-host topology (SPOF/capacity), (2) SQLite single-writer on the Prisma plane, (3) AI provider latency/limits in the synchronous generation route, (4) Supabase plan/region limits. None is the JS runtime.
- **C. Is Bun useful only as package manager/tooling?** Potentially, as a CI experiment only — but the measurable upside here is small (npm cache already configured), and it would introduce a second lockfile/mirror question for the Iran-mirror Docker path. Not recommended now; classify SAFE_TO_DEFER.
- **D. Would changing runtime now reduce future migration risk?** No. It would *add* risk to the most hardened part of the system (deployment identity: digest-pinned base, exact-SHA gateway releases, rollback proofs) while solving no evidenced problem.
- **E. Future evidence that would justify revisiting:** (1) measured CI/build-time pain; (2) Next.js + Prisma officially supporting Bun runtime in the exact standalone deployment shape used here; (3) emergence of a CPU-bound server workload (e.g., server-side media transcoding) — none currently planned; (4) a multi-instance tier where Bun's throughput materially changes instance count — still require mirror/lockfile verification first.

---

## 9. High-Risk "Expensive Later" Decisions (COST_LATER >> COST_NOW)

Only evidence-backed items. `TRIGGER_POINT` = the observable condition that should start the work.

| ID | Decision area | NOW_COST | LATER_COST | WHY_COST_GROWS | TRIGGER_POINT | RECOMMENDED_TIMING |
|---|---|---|---|---|---|---|
| E-1 | SQLite → PostgreSQL (Prisma plane) | ~0 (docs runbook only) | HIGH: provider switch, 13-migration history rebase, volume→managed DB move, backup/PITR design, gateway `db_change` path extension | Every migration and every row widens the data to move; ops habits crystallize around the volume | Second app instance; OR sustained write contention; OR hosting migration; OR backup-window pain | At trigger; additive, with the services boundary already in place |
| E-2 | Identity provider coupling (Supabase) | LOW (discipline + one rule doc) | HIGH: auth swap touches middleware, 9 supabase files, offline namespace, RLS policies, avatars, deletion flows | Each new feature that reads the Supabase user deepens assumptions | Principle-12 evaluation outcome; Supabase reachability incident; cost/plan change | After Principle-12 evaluation (already accepted, deferred) |
| E-3 | Dual outcome data planes (`WorkoutSession` in SQLite vs `workout_exercise_logs` in Supabase Postgres) | LOW (documented join contract by user id) | MEDIUM-HIGH: cross-plane analytics/joins require ETL or consolidation; conflict semantics multiply | Adaptive loop (AL-*) will eventually want server-side history analytics | When AL/ML loop needs server-side outcome aggregation | With E-1/E-2 triggers, or when the first cross-plane query is written |
| E-4 | Synchronous AI generation in request path | LOW now | MEDIUM: at scale must become queue+status; idempotency ledger already exists to build on | Moving from sync to async changes the client contract | Provider timeout/rate-limit pain at real traffic; multi-minute generations | After launch, with measured latency data |
| E-5 | Analytics event persistence | LOW | MEDIUM: log-only events cannot be backfilled or queried; early product-signals data is lost | Events accumulate only as logs | When product decisions need event data | Before the "measure growth" phase (pre-launch analytics is cheap) |
| E-6 | Deployment identity (single host + gateway) | 0 | MEDIUM: multi-host requires gateway extension/replacement; documented proofs don't transfer 1:1 | More hosts = more orchestration assumptions in runbooks | Second host decision | With real capacity needs |
| E-7 | DEV 3D (three.js) adoption into product surface | 0 (DEV-only) | MEDIUM: bundle impact, CSP posture, capability fallbacks become global concerns after merge | Post-merge removal is a product-visible change | The merge itself | Before merge — spec treatment (pilot candidate) |
| E-8 | Program JSON shapes in Prisma `Json` columns | 0 | LOW-MEDIUM: unqueryable internals if heavily queried later | JSON columns resist indexing/schema evolution | When server-side program analytics appear | With E-1 |

---

## 10. Safe-to-Defer Decisions (evidence-backed, with owners of timing)

1. **Redis rate-limit store activation** — pure config at the right moment (`RATE_LIMIT_STORE=redis` + env); code already tested (`tests/rate-limit-store.test.ts`). Defer until multi-instance or restart-persistence need.
2. **Bun/other runtime** — see §8; revisit triggers documented.
3. **Quiz TS port** — repo's own WHEN-TOUCHED urgency (R-03); do not spend now.
4. **MUI removal** — allowlist contains it; no action.
5. **CDN/object storage for media** — MG-07 contract anticipates it; insert when the real catalog exists (R-09 product decision first).
6. **Queue architecture for AI** — idempotency + slots make the later insertion mechanical; defer until measured.
7. **Log aggregation/metrics stack** — defer until multi-instance or incident-driven need; structured logging already in place.

---

## 11. Recommended Replacement Boundaries (if/when triggers fire)

- **Persistence**: the services layer is the boundary — no new direct `@/lib/prisma` imports outside the current 10 files; keep migrations strictly additive (already policy). Postgres switch then = schema provider change + ops work, not a code archaeology dig.
- **Identity**: `userId` as opaque string everywhere outside the 9 supabase files; a future `IdentityProvider` port should live next to `src/lib/auth/types.ts` (where the `OtpService` seam already proves the pattern).
- **AI**: everything provider-specific stays inside `src/lib/ai/provider.ts`; the rules engine is the permanent deterministic fallback (documented product behavior, not a stopgap — treat as a feature).
- **Media**: MG-07 manifest (hash integrity, self-hosted, fallbacks) is the boundary; keep DATA-ONLY posture until an owner decision changes it.
- **Session engine**: new state transitions go through `sessionCore.ts`, never the hook (binding rule, ARCHITECTURE-PRINCIPLES §13.4).
- **Prototype→product promotion** (DEV): anything leaving `src/components/workout/prototype/` must arrive with a spec, tests, and CSP review — currently only `MentorStage.tsx` sits outside the namespace.

---

## 12. Do-Not-Disturb List (do NOT change for modernization reasons)

1. **Deploy gateway + release policy** (exact-SHA, fail-closed, rollback proofs) — the most safety-critical asset in the repo. Evidence: `CURRENT_STATE.md` gateway section; `ops/deploy-gateway/`.
2. **Session core purity** — ADR-0002 + binding rule §13.4.
3. **Identity contract** `User.id == Supabase uid` across 3 planes — documented, tested, load-bearing. Changing it without a trigger breaks offline+sync+deletion simultaneously.
4. **Strict CSP/security headers** — `next.config.mjs` documents every relaxation; DEV's `connect-src blob:` addition must not leak to main without the same rigor.
5. **Digest-pinned base image + immutable build rules** — RELEASE_POLICY RULE 4.
6. **Dual-locale en/fa + RTL + typography contract** — product-defining (`AGENTS.md` §4/§6).
7. **Privacy posture** — raw video never leaves device; DATA-ONLY media; non-persistence default (TS-01/CP-04/ADR-0021).
8. **Offline conflict policy** (LWW + monotonic progress + attempt caps) — subtle and tested; rewriting it risks data loss.
9. **Fail-closed AI fallback classification** — unknown errors do NOT fall back (`provider.ts` docstring) — a safety property.
10. **Documentation governance** (authority hierarchy, one executable backlog, Find-Before-Create) — the system that keeps agent-driven development coherent.
11. **npm/Node 22 pinning + Liara mirror defaults** — deployment reality (Iran) is a constraint, not a smell.

Risk of unnecessary migration here is concrete: each of the above has documented incident lessons (`docs/PITFALLS/`, `PRODUCTION_INCIDENT_LEDGER.md`) behind it.

---

## 13. Recommended Pre-Scale Actions (cheap insurance, none urgent)

1. Write the **SQLite→Postgres trigger runbook** (docs-only): trigger conditions, provider-switch steps, gateway `db_change` interplay, backup/restore rehearsal. (This audit provides the skeleton.)
2. Add "**before second instance**" checklist item: activate `RATE_LIMIT_STORE=redis` (config-only).
3. Add an **identity-seam rule** to `AGENTS.md` §4 or ARCHITECTURE-PRINCIPLES: supabase-js imports remain confined to the audited file list (2 wrapper modules + 9 consumer files); additions require an architecture note. (Owner approval needed — it is a governance change.)
4. Decide the **analytics persistence** insertion before the growth-measurement phase (small route-level change later).
5. Capture **Supabase plan facts** (tier, limits, region) into `docs/ENVIRONMENT_CONTRACT.md` — currently UNKNOWN in-repo; owner-provided.
6. Rehearse **SQLite backup/restore** on the volume (release policy already demands verified backups before deploys; make the rehearsal a recorded checkpoint).
7. Keep the **production↔main gap** visible: 97 commits today, all documented as docs/CODE_NO_DEPLOY; consider a periodic production checkpoint task when owner authorizes a deploy.

All 7 are docs/config-level; none requires code change now.

---

## 14. Unknowns / Owner Decisions encountered

| # | Unknown | Why it matters | Where it must be decided |
|---|---|---|---|
| U-1 | Actual Supabase plan/tier/limits/region | 100x assessment for identity/logs plane | Owner (account facts), recorded in ENVIRONMENT_CONTRACT |
| U-2 | Current/expected traffic (any numbers) | Baseline for all "x" math | Owner |
| U-3 | DEV 3D mentor: product intent (prototype vs feature) | Determines whether three.js/CSP/MentorStage reach main | Owner (product) — Spec Kit pilot candidate |
| U-4 | Whether production checkpoint should be refreshed soon (97-commit gap) | Deployment identity freshness | Owner (existing release machinery, not a new decision) |
| U-5 | Already-pending owner gates (MG-09 Production apply; TS-03 deletion acceptance; CP-05 physical acceptance; dual compose file cleanup) | Pre-existing; this audit does not reopen them | Existing OWNER_DECISION_GATE records |

---

## 15. Evidence Appendix (key commands / citations)

- `git rev-parse main origin/main` → both `ff1202c6…` (local main = remote main).
- `git rev-list --left-right --count main...prototype/workout-layout-blueprint` → `0  19`; merge-base `ff1202c6…`; `git diff --stat main...prototype` → 34 files, +3200/−1; `git diff --name-only | grep -v prototype` → `.gitignore, docs/INDEX.md, docs/architecture/WORKOUT-PROTOTYPE-VIEWPORT-CONFORMANCE.md, next.config.mjs, package.json, package-lock.json, src/app/globals.css, src/components/workout/MentorStage.tsx`.
- `git diff main...prototype -- package.json` → adds `three@^0.180.0`, `@types/three@^0.180.0`. `next.config.mjs` delta → `connect-src` += `blob:`.
- `git rev-list --count 4ada1dae..main` → 97.
- `git grep -l "from '@/lib/prisma'" origin/main -- src/**` → 10 files. `git grep -l -E "from '@supabase/|from '@/lib/supabase" origin/main -- src/**` → 11 files (incl. 2 wrappers).
- `'use client'` files: 52. Tests: 82 `*.test.*`, 17 `*.spec.*`. Lockfile v3, ~305 KB.
- Working tree state preserved: `git status` shows only the pre-existing uncommitted modification to `src/app/[locale]/prototype/workout/page.tsx` (rest-timing debug instrumentation) — untouched by this audit.
- File reads (git show origin/main:…): listed in §2. All quotes verbatim from those reads.

**Verification statement**: no source/config/runtime changes; no dependencies installed; no lockfile touched; Spec Kit NOT initialized; no deployment, push, merge, checkout, or reset performed; the DEV working tree (including uncommitted changes) left exactly as found.
