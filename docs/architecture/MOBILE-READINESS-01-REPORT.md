# MOBILE-READINESS-01 — Audit Report

> **STATUS: EXECUTED 2026-09-01; findings RATIFIED 2026-09-01.**
> Audit only. **No mobile app built. No stack selected. No application or DB
> changes. No Production deployment.**
>
> Spec: [`MOBILE-READINESS-01.md`](MOBILE-READINESS-01.md)
> Guardrails: **RATIFIED / BINDING** — [`ARCHITECTURE-PRINCIPLES.md`](ARCHITECTURE-PRINCIPLES.md) §13,
> decision record [`../adr/0005-mobile-readiness-guardrails.md`](../adr/0005-mobile-readiness-guardrails.md).
> Decision items resolved: mobile triggers, HealthKit/Health Connect scope,
> technology-selection spike all **DEFERRED** until documented triggers; no
> stack selected. High-severity finding reconciled onto `S-04` (Session Core
> Contract Adoption) and promoted in [`../TASKS.md`](../TASKS.md).
> Backlog records: [`../TASKS.md`](../TASKS.md).

## 1. Method

Evidence was gathered by reading the actual source tree (`src/lib`,
`src/services`, `src/components/workout`, `src/app`, `src/i18n`, middleware,
offline layer) and the architecture/S03 session-core records. Every dimension
below cites concrete modules. No code, schema, or configuration was changed.

## 2. Findings by dimension

Classification legend: `CLIENT-AGNOSTIC NOW` / `WEB-SPECIFIC OK` /
`MOBILE BLOCKER (needs change)`.

### 1. Business logic ↔ Next.js/React UI coupling

| Evidence | Classification |
|---|---|
| `src/lib/workout/sessionContracts.ts` — PURE, framework-independent session contracts (S03); no React/Prisma/browser imports | CLIENT-AGNOSTIC NOW |
| `src/lib/workout/sessionCore.ts` — **the pure session core EXISTS and is runtime-active**: `useWorkoutEngine.ts` delegates to it (`createSessionCore`, `core.transition(command, now)`, `core.derive(state)`) — S03 extraction is CLOSED (reconciliation 2026-09-01) | CLIENT-AGNOSTIC NOW |
| `src/lib/workout/wallClock.ts`, `src/lib/workout/samplePlan.ts` — pure | CLIENT-AGNOSTIC NOW |
| `src/lib/offline/workoutPersistence.ts` — pure bridge (engine state ↔ IndexedDB records) that **still imports hook types** (`WorkoutEngineState`/`WorkoutExercise`/`WorkoutEngineHydrateInput` from `src/components/workout/useWorkoutEngine`) — the S-04 contract-adoption edge; `sessionContracts.ts` also carries a stale "do not import until the extraction wiring exists" note | MOBILE BLOCKER → mapped to `S-04` (PROMOTED; LOW-MEDIUM risk, behavior-preserving) |
| `src/services/*` — client services (analytics, sync, gamification, program, audio, avatarStorage, phoneSession) with one explicitly server-only module (`userService.ts`: Prisma + request-scoped Supabase, never imported from client) | CLIENT-AGNOSTIC NOW (client ones) / WEB-SPECIFIC OK (server-only) |
| `src/lib/offline/db.ts` — browser-only Dexie; clear SSR error, safe import boundary | WEB-SPECIFIC OK (portable equivalent exists) |

**Verdict:** domain logic is largely already service/pure-module based. The one
web lock-in with real cost is the engine living inside a React hook; S03's
session-core closure is the designed exit.

### 2. API / data-contract portability

| Evidence | Classification |
|---|---|
| Pure contract modules: `src/lib/workout/sessionContracts.ts`, `src/lib/exercise/contracts.ts`, `src/lib/ai/contracts.ts` | CLIENT-AGNOSTIC NOW |
| Route handlers / server actions under `src/app/api/` + RSC surfaces (e.g. `POST /api/generate-program`) | WEB-SPECIFIC OK (thin HTTP surface; a native client can call the same routes) |
| Supabase direct client (`src/lib/supabase.ts`) — browser client; `supabase-server.ts` — request-scoped | CLIENT-AGNOSTIC NOW (contract boundary) |
| Server-only imports enforced by module discipline (never from client graphs) | CLIENT-AGNOSTIC NOW (discipline already portable) |

**Verdict:** data contracts are portable today. Native clients would reuse the
same Supabase + route-handler surface; RSC-only surfaces are confined to
server components and do not leak into client contracts.

### 3. Authentication / session assumptions

| Evidence | Classification |
|---|---|
| Supabase SSR cookie flow (`@supabase/ssr`): browser client + server client + middleware refresh | WEB-SPECIFIC OK (cookie transport is web-native) |
| `src/lib/auth/mode.ts` — pure env reading, edge-safe; `hasSupabaseEnv()`, `otpAuthEnabled()` rollback switch | CLIENT-AGNOSTIC NOW (config logic portable) |
| Phone/OTP journey: `src/lib/auth/otp*.ts`, `phone.ts`, `smsIrProvider.ts`, `src/services/phoneSessionService.ts`; `pendingOtp.ts` uses `sessionStorage` | CLIENT-AGNOSTIC NOW (flow) / WEB-SPECIFIC OK (sessionStorage detail) |
| Admin auth (`src/lib/admin/auth.ts`, password provisioning) — server-side | CLIENT-AGNOSTIC NOW |
| `AUTH_OTP_MODE=mock` never mints sessions; fails honestly (503) | CLIENT-AGNOSTIC NOW (good pattern, portable) |

**Verdict:** the server auth contract is portable. A native client needs a
Supabase PKCE / deep-link / secure-storage flow instead of cookie transport —
a client-side change, not a server-contract change. No blocker on the server.

### 4. Browser-only storage / IndexedDB / localStorage

| Evidence | Classification |
|---|---|
| Dexie IndexedDB layer `src/lib/offline/db.ts` — 3 stores: `activePrograms`, `workoutStates`, `exerciseLogs` (outbox) | WEB-SPECIFIC OK — portable equivalent (SQLite/MMKV + native queue) exists; data shapes are plain JSON |
| `localStorage`: theme key (`ThemeProvider.tsx`, `'theme'`), platform override (`PlatformProvider.tsx`) | WEB-SPECIFIC OK — trivial key-value; abstract behind a KV contract |
| `sessionStorage`: pending-OTP flow (`src/lib/auth/pendingOtp.ts`) | WEB-SPECIFIC OK — trivial, flow-scoped |
| Service worker (`PWALoader.tsx` → `/service-worker.js`, prod-only) | WEB-SPECIFIC OK (no native equivalent needed) |

**Verdict:** no hard blocker. The three browser-storage touchpoints are small
and each has a direct native analog. The Dexie outbox design (idempotent
upserts keyed by id, attempt caps) maps directly onto a native sync queue.

### 5. Workout-session state portability

| Evidence | Classification |
|---|---|
| Pure session contracts (S03): `sessionContracts.ts` (canonical exercise identity, 10-field state, commands) | CLIENT-AGNOSTIC NOW |
| `conflictPolicy.ts` — deterministic LWW + monotonic version + canonical serialization; order-independent; explicitly designed for two devices | CLIENT-AGNOSTIC NOW (multi-device ready) |
| `workoutPersistence.ts` — pure engine↔record bridge | CLIENT-AGNOSTIC NOW |
| `useWorkoutEngine.ts` — the React **adapter** delegating to the pure core (S03 closure verified 2026-09-01); its exported types are the last hook-internal surface consumers bind to → S-04 mirrors them onto the canonical contract | CLIENT-AGNOSTIC NOW / residual = S-04 |

**Verdict:** the state model and conflict semantics are already client-agnostic
and multi-device safe. The remaining work is re-hosting the engine runtime
outside React — the designed S03 closure.

### 6. Media / video handling

| Evidence | Classification |
|---|---|
| `VideoPlayer.tsx` — HLS via `hls.js`, native HLS fallback (Safari/iPadOS), design-system controls, keyboard shortcuts | WEB-SPECIFIC OK (player shell) — native AVFoundation/ExoPlayer handle HLS natively |
| Offline download is a **placeholder, streaming-only for now** | MOBILE BLOCKER (only if offline media is a requirement; low priority otherwise) |
| `audioService.ts` — Web Audio API synthesized cues, no assets, SSR-safe no-ops | WEB-SPECIFIC OK — portable (native synth/asset playback) |
| `AnimationPlayer.tsx`, `animationFps.ts` | WEB-SPECIFIC OK (canvas/JS) — native equivalent needed later |

**Verdict:** DRM-free HLS means the media *sources* are portable; the player
shells are web-specific by nature. Offline media caching is the only gap, and
it is currently only a placeholder on web too.

### 7. Navigation assumptions

| Evidence | Classification |
|---|---|
| App Router under `src/app/[locale]/...`; routes: dashboard, workout, history, analytics, challenges, profile, preferences, quiz, faq, library, auth | WEB-SPECIFIC OK (framework navigation) |
| next-intl locale routing composed in `src/middleware.ts`; `next/link` throughout | WEB-SPECIFIC OK |
| Route protection allowlist `src/lib/auth/protect.ts` (isProtectedPath, sanitizeRedirectPath) — logic is locale/URL-agnostic | CLIENT-AGNOSTIC NOW (policy portable) |

**Verdict:** the screen inventory and protection policy are portable; the
routing *mechanism* is web-only by design. Native gets its own navigation
model; no blocker.

### 8. Offline / resume requirements

| Evidence | Classification |
|---|---|
| PWA service worker (prod-only), Dexie caches (active programs, workout states), outbox sync | WEB-SPECIFIC OK (mechanism) |
| `syncService.ts` — drains outbox on online/visibilitychange; idempotent, attempt-capped, deterministic error classification | CLIENT-AGNOSTIC NOW (policy/logic) |
| Workout resume = snapshot hydration (`workoutStates` + conflict policy) | CLIENT-AGNOSTIC NOW |

**Verdict:** offline/resume semantics are already designed client-agnostically;
native parity is a re-implementation against SQLite + background tasks, not a
redesign.

### 9. Notifications / background work

| Evidence | Classification |
|---|---|
| **No** Notification API, web push, or background-sync usage anywhere in `src/` | MOBILE BLOCKER (capability gap — not a web lock-in; a *missing* capability) |

**Verdict:** no current web notification/background story exists, so there is
nothing to untangle — but a future mobile app will require APNs/FCM and
background task design from day one. This is a **net-new capability**, not a
migration cost.

### 10. Localization / RTL portability

| Evidence | Classification |
|---|---|
| next-intl: `src/i18n/routing.ts` — locales `['en','fa']`, default `en`; middleware locale prefixing | WEB-SPECIFIC OK (mechanism) |
| Message catalogs (JSON) + `useTranslations`; Vazirmatn font; RTL dir handling | CLIENT-AGNOSTIC NOW (catalog content is portable JSON) |
| Admin console currently English-only (owner-confirmed) — ADMIN-DS-05 covers parity | (see ADMIN-DS-05) |

**Verdict:** message content is portable out of the box; only the loading
mechanism is web-specific. Localization/RTL is a non-blocker.

### 11. Shared design tokens vs platform-specific UI

| Evidence | Classification |
|---|---|
| Platform kit `src/components/ui/platform/*` (Apple HIG / Material 3 tokens) + `globals.css` tokens + `ThemeProvider` dark mode | CLIENT-AGNOSTIC NOW (token layer) |
| `PlatformProvider.tsx` — runtime platform switching persisted to localStorage | CLIENT-AGNOSTIC NOW (already multi-platform conscious) |
| Web-specific markup (divs, CSS layout) | WEB-SPECIFIC OK (rendering layer) |

**Verdict:** the token/theme layer was explicitly designed to render on both
iOS and Android; the web markup that consumes it is the only web-specific
part. Strong existing foundation.

### 12. HealthKit / Health Connect integration boundaries

| Evidence | Classification |
|---|---|
| Only reference: `docs/TRANSFORMATION_ROADMAP.md` — read-only weight/activity import. **No SDK, no implementation** | CLIENT-AGNOSTIC NOW (clean slate) |
| Natural attach points: workout metrics (`workout_exercise_logs`), user profile/weight records, program data | — |

**Verdict:** a clean boundary exists. The server-side contract (metrics
endpoints / Supabase tables) must stay platform-neutral so HealthKit and
Health Connect both write to the same schema. No existing code blocks this.

## 3. Must-become-client-agnostic NOW (smallest blocking set)

| # | Item | Blocker severity | Effort |
|---|---|---|---|
| 1 | **S-04 — Session Core Contract Adoption** — stabilize the canonical Session State contract and migrate player/persistence consumers off hook internals (reconciled: the S03 extraction itself is already closed) | MEDIUM (mapped from HIGH after reconciliation — extraction done; residual is the contract-adoption edge) | SMALL-MEDIUM |
| 2 | **KV-persistence contract** — abstract theme/platform/pending-OTP storage behind a tiny key-value interface with web + native impls | LOW | SMALL |
| 3 | **Outbox portability note** — keep `exerciseLogs` payloads plain-JSON (already true); document the native queue mapping | LOW | SMALL |
| 4 | **Auth: PKCE/deep-link note** — record the server contract's client-agnostic posture so the future native client's PKCE flow is a client-side addition only | LOW | DOCS |
| 5 | **Health-data contract decision** — declare the platform-neutral metrics schema before any native health SDK work | MEDIUM (when triggered) | DOCS + contract |

## 4. Stays-web-specific list (legitimate web-only)

| Item | Reasoning |
|---|---|
| Service worker / PWA install path | No native analog needed |
| HLS.js player shell, Web Audio synthesis, canvas animation players | Rendering-layer; native AVFoundation/ExoPlayer/AVKit replace them |
| RSC / server-component surfaces | Server-rendered HTML is web-specific by design |
| next-intl routing mechanism, `next/link` | Framework navigation; policy is what's portable |
| Admin Console (web console) | Operations surface; a native admin client is out of scope |
| Cookie-transport Supabase SSR session | Replaced by PKCE + secure storage on native; server contract unchanged |

## 5. Architectural guardrails (RATIFIED — binding)

**RATIFIED 2026-09-01 by owner direction (POST-MOBILE-READINESS-
RATIONALIZATION-01); recorded as ADR-0005; codified in
`ARCHITECTURE-PRINCIPLES.md` §13.** Six binding rules:

1. **Domain logic lives in `src/services` / pure `src/lib` modules and stays
   UI-framework-free** — no new business rules inside components or hooks.
2. **New persistence must define a portable contract** — plain-JSON payloads
   and a documented native equivalent (SQLite/queue) for any new browser
   storage; no new `localStorage`/IndexedDB usage without a KV contract.
3. **New features must declare their mobile posture** — every task with
   client-side state, storage, or session work records whether the design is
   `CLIENT-AGNOSTIC` or `WEB-SPECIFIC` (with reasoning) in its governance
   evidence.
4. **Session-engine changes stay inside the S03 session-core boundary** —
   no new engine behavior in the React hook; new state transitions go through
   the pure contracts.
5. **Health data (when it arrives) writes through a platform-neutral server
   contract** — never a device SDK directly into client state.
6. **No mobile stack selection without the technology spike** — per the
   trigger criteria in §7.

## 6. Trigger / criteria for starting actual mobile implementation

`DECISION 2026-09-01: thresholds DEFERRED until product evidence requires
them (ADR-0005). The checklist and signals below remain advisory guidance,
not binding gates.`

Precondition checklist (all must hold before any mobile build):

- [ ] Session-core extraction (guardrail §4 + §3.1) complete.
- [ ] Technology-selection spike executed and decision recorded (see §8).
- [ ] Mobile posture declared for all features merged since this report.
- [ ] Notifications/background requirements defined (APNs/FCM, background
      sync scope) — currently an undefined capability.
- [ ] HealthKit/Health Connect scope decision recorded (read-only weight/
      activity per roadmap vs more).
- [ ] Offline media requirement decided (streaming-only vs download).

Trigger signals (any strong signal can start the spike):

- Sustained mobile-usage demand (analytics share of traffic, install
  requests) crossing an owner-set threshold.
- A revenue/provider milestone that makes an app-store presence required.
- A feature (e.g. HealthKit import, background workout sync) that is
  impossible or materially worse in a browser context.

## 7. Later technology-selection spike (definition only — NOT executed here)

`DECISION 2026-09-01: DEFERRED until its documented trigger conditions are
met (ADR-0005). No mobile stack is selected.`

Scope of a future spike comparing **React Native/Expo vs alternatives**
(Kotlin Multiplatform, native iOS/Android, PWA-follow-up):

- Decision criteria: team skill, offline/sync parity, HealthKit/Health
  Connect support, reusability of `src/services` + pure contracts, media
  playback, auth (PKCE/secure storage), localization/RTL, build/release
  overhead.
- Output: a recorded decision with rationale in `docs/adr/`.
- **No stack is selected by this task.**

## 8. Decision status (2026-09-01)

| Item | Resolution |
|---|---|
| §5 guardrails | **RATIFIED / BINDING** (ADR-0005) |
| Mobile implementation trigger thresholds | **DEFERRED** until product evidence requires them |
| HealthKit / Health Connect scope | **DEFERRED** until the health integration trigger |
| Mobile technology-selection spike | **DEFERRED** until its documented triggers; **no stack selected** |
| High-severity debt (session-core edge) | **RECONCILED onto `S-04`** (Session Core Contract Adoption) and PROMOTED to the executable backlog; not started |
| Remaining owner actions | Next-batch authorization only (Batch 2 = ADMIN-DS-05 + ADMIN-DS-06; S-04 as its own lifecycle) |
