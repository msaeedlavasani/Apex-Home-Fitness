# Coupling & Architectural Risk Register

`STATUS: AUDIT RECORD — NOT AN IMPLEMENTATION BACKLOG`

Ranked register of coupling and architecture risks discovered by the modularity
audit. This is NOT a ticket list and does NOT authorize work. See
`docs/architecture/MODULARITY-AUDIT.md` for the full analysis.

Severity: CRITICAL / HIGH / MEDIUM / LOW.
Urgency: BEFORE NEXT FEATURE / BEFORE WORKOUT V2 / WHEN TOUCHED / OPTIONAL.
Effort is relative (SMALL / MEDIUM / LARGE), not calendar time.

| ID | Domain | Issue | Evidence | Consequence | Recommended direction | Severity | Urgency | Effort |
|---|---|---|---|---|---|---|---|---|
| R-01 | Exercise/Media | Canonical exercise identity does not exist; name-keyed coupling | `workoutTokens.ts` maps exercise names → Lottie; `syncService` logs `exerciseId`/`exerciseName` strings; `samplePlan.ts` keyed by name; library catalog is a local hardcoded array | V2 media library, rep→duration metadata, previews and cross-device sync all need a stable id; renaming an exercise silently breaks tokens, logs and history joins | Introduce a canonical `Exercise` catalog with stable ids; keep display names separate | HIGH | BEFORE WORKOUT V2 | MEDIUM |
| R-02 | Workout Session | Session engine lives inside a React hook (`components/workout/useWorkoutEngine.ts`, 689 LOC) | imports only React + `wallClock`; used by `WorkoutPlayer` only | V2 Session Engine, Voice Coach, background/PWA sessions and recovery can only consume state through a component hook | Extract a pure timeline/session core (framework-agnostic); the hook becomes a thin adapter | HIGH | BEFORE WORKOUT V2 | MEDIUM |
| R-03 | Quiz/Onboarding | JS island with duplicated domain logic | `quiz/restDays.js` vs `lib/ai/restDays.ts`; `quiz/exerciseStyles.js` vs `lib/exerciseStyles.ts`; `quiz/theme.js` vs `ThemeProvider`; `quiz/i18n.js` vs next-intl | Two sources of truth for rest-day/exercise-style rules; TS contracts (`quizFlow.ts`) mirror JS ids by hand; quiz UI cannot reuse app services | Port quiz components to TS and collapse duplicates into the authoritative modules; keep behavior identical | HIGH | WHEN TOUCHED | MEDIUM |
| R-04 | Program Generation | Rules engine type-depends on service layer | `lib/ai/ruleBasedProgram.ts:5` imports types from `@/services/programService`; `lib/quiz/quizDraft.ts:30` imports type from `@/services/userService` | Inverted dependency: lib cannot be reused without dragging in service module types; contract ownership unclear | Move shared program/quiz shapes into a neutral contract module (e.g. `lib/contracts` or domain types) and import from both sides | MEDIUM | BEFORE NEXT FEATURE | SMALL |
| R-05 | Workout Session | Player fan-out | `WorkoutPlayer.tsx` imports audioService, analyticsEvents, offline/db, workoutPersistence, hooks, cn, engine, timers | V2 guidance additions (voice, PREPARE/TRANSITION UI) enlarge an already wide surface; testing the player needs many fakes | Define a stable session-state read-model for the player; guidance/audio consumers bind to it | MEDIUM | BEFORE WORKOUT V2 | MEDIUM |
| R-06 | Offline/Sync | Generic IndexedDB store mixed with workout-specific record shapes | `lib/offline/db.ts` (490 LOC) exposes both; `workoutPersistence.ts` + `syncService.ts` consume it | Provider change (e.g. SQLite/WASM) touches workout shapes and sync mapping | Split generic store from workout records only when the store is touched | LOW | WHEN TOUCHED | SMALL |
| R-07 | Analytics/State | Client singleton module state invisible to React | `syncService.ts` module-level `syncing/lastSyncAt/lastError` | Status badge state resets on HMR; multi-surface sync later needs a real store | Re-evaluate when sync surfaces expand | LOW | OPTIONAL | SMALL |
| R-08 | Quiz/Onboarding | Quiz answer ids mirrored in three files by hand | `OnboardingQuiz.jsx` step ids ↔ `quizFlow.ts` schemas ↔ `requestSecurity.ts` schema | Payload drift fails loudly (zod `.strict()`) but only at runtime after divergence | Single source for the answer vocabulary once quiz moves to TS | MEDIUM | WHEN TOUCHED | SMALL |
| R-09 | Exercise/Media | Library catalog is sample/demo, not a real feature | `ExerciseLibraryPage.tsx` hardcodes demo streams (`test-streams.mux.dev`, gtv-videos-bucket) | Media capability exists (`VideoPlayer`) but nothing to bind V2 guidance to; no asset ownership | Decide catalog status as a product question; do not build an inventory until then | MEDIUM | BEFORE WORKOUT V2 | MEDIUM |
| R-10 | Workout Session | Snapshot schema versioning is soft | `workoutStates` records carry optional `version` (default 0); conflict merge is order-independent | V2 adds phases/execution types → snapshot shape changes must stay backward-compatible (already the policy) | Keep the optional-field + monotonic-merge discipline; bump version deliberately | LOW | BEFORE WORKOUT V2 | SMALL |

## Severity summary

- CRITICAL: none
- HIGH: R-01, R-02, R-03
- MEDIUM: R-04, R-05, R-09, R-08
- LOW: R-06, R-07, R-10

## Notes

- No CRITICAL risk: the codebase is generally well-layered; the three HIGH
  items are all concentrated in domains the upcoming Workout Experience V2 work
  will touch, which is why they are marked BEFORE WORKOUT V2 (R-03 is the
  exception — quiz is stable today, hence WHEN TOUCHED).
- Everything above is analysis. Acceptance of any direction requires owner
  review; items marked in the audit as ADR candidates need an ADR before
  implementation planning.
