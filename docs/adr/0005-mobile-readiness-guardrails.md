# ADR-0005: Mobile-Readiness Architecture Guardrails

> **STATUS: ACCEPTED — 2026-09-01**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `MOBILE-READINESS-01` (audit executed 2026-09-01;
> report: `docs/architecture/MOBILE-READINESS-01-REPORT.md`)
>
> **Execution gating:** this ADR ratifies architecture policy only. It does
> NOT authorize a mobile build, a stack selection, or the S-04
> implementation.

## Context

The mobile-readiness audit classified the current Next.js/React, Supabase,
Prisma, Dexie, HLS, and next-intl architecture across 12 dimensions. The
domain layer is largely portable today; the single high-priority residual
architecture debt was identified as session-core/contract adoption (see
"Reconciliation" below). The owner ratified the audit's proposed guardrails
and resolved the remaining decision items in POST-MOBILE-READINESS-
RATIONALIZATION-01 (2026-09-01).

## Decision

1. **Ratify the six mobile-readiness guardrails as binding architecture
   principles** (now codified in `docs/architecture/ARCHITECTURE-PRINCIPLES.md`
   §13, status RATIFIED):

   1. Domain logic lives in `src/services` / pure `src/lib` modules and stays
      UI-framework-free — no new business rules inside components or hooks.
   2. New persistence must define a portable contract — plain-JSON payloads
      and a documented native equivalent; no new `localStorage`/IndexedDB
      usage without a key-value contract.
   3. New features must declare their mobile posture (`CLIENT-AGNOSTIC` or
      `WEB-SPECIFIC` with reasoning) in their governance evidence.
   4. Session-engine changes stay inside the S03 session-core boundary — no
      new engine behavior in the React adapter; state transitions go through
      the pure session core.
   5. Health data (when it arrives) writes through a platform-neutral server
      contract — never a device SDK directly into client state.
   6. No mobile stack selection without the technology-selection spike.

2. **Mobile implementation trigger thresholds:** DEFERRED — no thresholds
   are set until product evidence requires them. The audit's trigger-signal
   definitions remain advisory guidance, not binding gates.

3. **HealthKit / Health Connect scope:** DEFERRED — no scope decision until
   the health integration trigger (a feature that requires health-data
   import/export). The platform-neutral server-contract guardrail applies
   when that trigger fires.

4. **Mobile technology-selection spike:** DEFERRED — the spike
   (React Native/Expo vs Kotlin Multiplatform vs native vs PWA-follow-up)
   is NOT scheduled until its documented trigger conditions are met. **No
   mobile stack is selected now.**

5. **Session-core/contract adoption is promoted as high-priority executable
   architecture debt** as `S-04 — Stable Session State Contract` in
   `docs/TASKS.md` (the single executable backlog). The task is NOT
   authorized for implementation by this ADR; it requires the ordinary
   batch-start authorization before execution.

## Reconciliation (why this is S-04, not a duplicate)

The audit initially framed the high-severity item as "session-core
extraction." On-disk verification shows the extraction is already closed:
`src/lib/workout/sessionCore.ts` exists and `useWorkoutEngine.ts` delegates
to it (`createSessionCore`, `core.transition(command, now)`,
`core.derive(state)`) — S03 (pure session core + React adapter) is complete
per its closure record. The residual debt is the **contract-adoption edge**,
which is exactly the planned S-04 scope:

- `src/lib/offline/workoutPersistence.ts` imports `WorkoutEngineState` /
  `WorkoutExercise` / `WorkoutEngineHydrateInput` from the hook component
  `src/components/workout/useWorkoutEngine` — consumers still bind to hook
  internals (ADR-0002's stated risk).
- `src/lib/workout/sessionContracts.ts` still carries a stale note that the
  wiring "does not exist yet."

Rather than inventing a parallel task, the promoted backlog entry IS
`S-04 — Stable Session State Contract`, preserving the S03/S04 task lineage.

## Consequences

Positive:

- New development now has binding mobile-readiness rules that fail closed
  (parallel visual systems, unbounded new persistence, engine logic in hooks
  all require explicit justification/authorization).
- The S-04 debt is visible in the executable backlog with a precise,
  verifiable scope instead of an ambiguous "extraction" label.
- Deferrals are explicit and revisitable when triggers fire.

Trade-offs:

- The guardrails add evidence/review burden to future tasks (mobile-posture
  declaration).
- Until S-04 executes, the persistence layer still imports hook types; the
  debt is tracked, not removed, by this ADR.

## Related contracts

- Guardrails: `docs/architecture/ARCHITECTURE-PRINCIPLES.md` §13
- Audit report: `docs/architecture/MOBILE-READINESS-01-REPORT.md`
- Stabilization lineage: `docs/architecture/ARCHITECTURE-STABILIZATION-PLAN.md`
- Executable task: `docs/TASKS.md` (`S-04 — Stable Session State Contract`)