# Capability Inventory Proposal

`STATUS: PROPOSED — NOT AUTHORITATIVE`

Candidate capability inventory and ownership model derived from the actual
codebase (modularity audit, `docs/architecture/MODULARITY-AUDIT.md`). This is
audit input for a future Component/Capability Registry decision — it is not the
registry itself and defines no boundaries that are binding.

The proposed grouping below reflects where responsibilities already live in
code. It does not impose a new structure.

## Proposed capability ownership model

```text
Auth Domain
  OTP lifecycle (request/verify/replay/cooldown)   — src/lib/auth/otp.ts, services/otpService.ts
  SMS delivery adapter (SMS.ir)                   — src/lib/auth/smsIrProvider.ts
  Phone → Supabase session establishment          — services/phoneSessionService.ts
  Session enforcement (middleware, protect)       — src/middleware.ts, src/lib/auth/protect.ts

Identity / Profile Domain
  User sync + profile persistence                 — services/userService.ts
  Avatar storage (Supabase Storage)               — services/avatarStorage.ts

Onboarding Domain
  Quiz answers validation/normalization           — src/lib/quiz/quizFlow.ts
  Quiz draft persistence (localStorage)           — src/lib/quiz/quizDraft.ts
  Quiz HTTP layer + error classification          — src/lib/quiz/quizApi.ts
  Quiz UI (JS island — migration candidate)       — src/components/quiz/*

Program Domain
  Program generation (AI)                         — src/lib/ai/provider.ts, prompts.ts, api/generate-program
  Program generation (rules engine)               — src/lib/ai/ruleBasedProgram.ts
  Program normalization + persistence             — services/programService.ts
  Generation idempotency ledger                   — services/generationIdempotency.ts + lib/ai/idempotency.ts
  Rate limiting / request security                — src/lib/ai/requestSecurity.ts, rateLimitStore.ts
  Program schedule + week calendar                — src/lib/programSchedule.ts, weekCalendar.ts

Exercise Domain
  Exercise metadata / catalog                     — MISSING (no canonical source; library page is sample data)
  Exercise media players (video/lottie)           — components/video/VideoPlayer.tsx, workout/AnimationPlayer.tsx
  Exercise name → media tokens                    — components/workout/workoutTokens.ts (name-keyed — risk R-01)

Workout Session Domain
  Wall-clock timing                               — src/lib/workout/wallClock.ts
  Session engine (React hook today)               — components/workout/useWorkoutEngine.ts (pure-core extraction candidate)
  Workout player UI                               — components/workout/WorkoutPlayer.tsx
  Offline session snapshot + recovery             — src/lib/offline/workoutPersistence.ts, db.ts
  Conflict resolution policy                      — src/lib/offline/conflictPolicy.ts
  Set/repetition tracking UI                      — components/workout/RepSetCounter.tsx, CountdownTimer.tsx

Sync Domain
  Outbox (IndexedDB)                              — src/lib/offline/db.ts (exerciseLogs)
  Sync engine + classifier                        — services/syncService.ts
  Connectivity monitor                            — services/syncService.ts (startSyncMonitor)

Analytics Domain
  Event catalog + tracking client                 — services/analyticsEvents.ts, analyticsService.ts
  First-party ingestion endpoint                  — src/app/api/analytics/events/route.ts (structured logs today)
  Statistics computation (pure)                   — services/analyticsService.ts

Gamification Domain
  XP / levels / streaks / badges                  — services/gamificationService.ts

Guidance Domain
  Audio cues                                      — services/audioService.ts
  Haptics                                         — hooks/useHaptic.ts
  (Voice coach / visual demonstration — PLANNED, Workout V2)

UI / Design System Domain
  Platform primitives                             — src/components/ui/platform/*
  Platform context + layouts (AppShell)           — components/providers/PlatformProvider, components/layout/*
  Theme / MUI providers                           — components/providers/ThemeProvider.tsx, MuiProvider.tsx
  Motion / reduced-motion                         — hooks/useReducedMotion.ts, lib/animationFps.ts

Localization Domain
  next-intl setup + routing                       — src/i18n.ts, src/i18n/navigation.ts, src/i18n/routing.ts

Infrastructure / Ops Domain
  Prisma singleton, Supabase clients              — src/lib/prisma.ts, supabase.ts, supabase-server.ts
  Logging / error tracking / timeouts             — src/lib/logger.ts, errorTracking.ts, timeout.ts
  Ops monitors                                    — src/app/api/monitor/*
```

## Candidate reusable modules (future registry input)

| Candidate | Current implementation | Maturity | Consumers | Reusable scope | Known coupling | Recommended future status |
|---|---|---|---|---|---|---|
| Wall-clock timer | `lib/workout/wallClock.ts` | High (tested) | useWorkoutEngine | Any timed/interval feature | None | Registry candidate (stable) |
| Conflict-resolution policy | `lib/offline/conflictPolicy.ts` | High (tested) | offline persistence | Any multi-writer snapshot store | Workout-state shapes | Registry candidate (stable) |
| OTP core | `lib/auth/otp.ts` + `services/otpService.ts` | High (tested) | auth routes | Phone verification generally | Prisma `PhoneOtp` | Registry candidate (stable) |
| Provider resolution + error classification | `lib/ai/provider.ts` | High (tested) | generate-program | Any AI provider | Program shapes | Registry candidate (stable) |
| Idempotency ledger | `services/generationIdempotency.ts` + `lib/ai/idempotency.ts` | High (tested) | generate-program, quiz save | Any idempotent POST | Prisma ledger rows | Registry candidate (stable) |
| Quiz answer schema | `lib/quiz/quizFlow.ts` | High (tested) | quiz save route, client flow | Onboarding contract | Mirrors JS quiz ids (R-08) | Needs quiz migration first |
| Analytics computation | `services/analyticsService.ts` (pure helpers) | High (tested) | analytics UI | Any stats/streaks feature | None | Registry candidate (stable) |
| Sync engine | `services/syncService.ts` | Medium-High | workout player, PWA | Offline-first uploads | Exercise-log shapes | Consolidate with offline store (R-06) |
| Session engine | `components/workout/useWorkoutEngine.ts` | Medium | workout page | Guided sessions | React (hook) | Extract pure core before reuse (R-02) |
| Audio cues | `services/audioService.ts` | Medium | workout player | Any audio feedback | None | Registry candidate (stable) |
| Video player | `components/video/VideoPlayer.tsx` | Medium | library page | Any HLS/MP4 playback | None | Registry candidate (stable) |
| Exercise media tokens | `components/workout/workoutTokens.ts` | Low | AnimationPlayer | Visual guidance | Name-keyed (R-01) | Replace with catalog ids for V2 |
| Onboarding quiz widget | `components/quiz/*` | Medium | quiz page | Onboarding flows | Self-contained JS island (R-03) | Port to TS; then component |

## Explicitly deferred (do NOT create here)

- Authoritative Component/Capability Registry
- Dependency Map
- Modularization Backlog / tickets
- Target module boundaries as binding rules

These are outputs of the post-decision Architecture Stabilization phase.
