# ADR-0001: Canonical Exercise Identity

`STATUS: ACCEPTED — 2026-08-27`

## Context

Before S02, Exercise identity was **name-based** across the application:

- `src/components/workout/workoutTokens.ts` maps exercise **names** to Lottie
  animation tokens;
- workout logs (`src/services/syncService.ts` `CompletedExerciseInput`) carry
  `exerciseId` + `exerciseName` strings;
- sample plans (`src/lib/workout/samplePlan.ts`) and generated programs key
  exercises by name;
- the library catalog (`src/app/[locale]/library/ExerciseLibraryPage.tsx`) is a
  page-local array with its own id/name fields and demo streams.

Renaming an exercise silently breaks media tokens, workout-log joins and any
future catalog mapping. Analytics, Workout Preview and future exercise metadata
(media, cadence, instructions) all need a stable identity independent of the
display name. This was the audit's highest-risk coupling (R-01 in
`docs/architecture/COUPLING-RISK-REGISTER.md`).

## Decision

**ACCEPTED.** Apex Home Fit moves toward a canonical exercise identity based on
a **durable stable identifier**:

```text
exerciseId  = identity
name/faName/enName = display metadata (search/labels)
```

This applies consistently across: program generation, program normalization,
ProgramExercise records, workout session persistence, exercise media, the
exercise library/catalog, Workout Preview, Workout Experience V2, coach-created
and manual programs, and analytics wherever exercise identity is needed.

## Compatibility

Existing name-based data **continues to work** — no breaking migration is
designed. Name-based resolution remains available as a **backward-compatible
fallback** during migration:

- new contract (id-first) + compatibility adapter (name→id resolution) +
  gradual adoption;
- original names are never discarded solely because ids are added.

## Consequences

Positive:

- media mapping and localized names decouple from identity;
- Workout Preview and the exercise library can bind to stable ids;
- source-independent programs (AI / rules / coach / manual);
- consistent analytics and history joins;
- future rep→duration metadata attaches to the exercise, not the label.

Costs:

- migration complexity (mapping, backfill);
- a name→id compatibility adapter that must be maintained during transition;
- potential schema/API changes later (planned, gated — see
  `docs/architecture/ARCHITECTURE-STABILIZATION-PLAN.md` GATE A).

## Not Decided Yet

At the time of this ADR, the following were deliberately NOT decided (the
later Gate A/S02 design resolved the currently applicable identity foundation):

- historical backfill mechanics;
- exercise taxonomy / catalog schema;
- media technology for demonstrations;
- the library's product role (sample vs production catalog — see
  `ARCHITECTURE-STABILIZATION-PLAN.md` S-06).

## Relationship

- Decision id: AD-1 (approved with the architecture decisions on 2026-08-27).
- Implements: Architecture Principle §7 (Durable Identity).
- Follow-up: `docs/architecture/ARCHITECTURE-STABILIZATION-PLAN.md` S-02.
