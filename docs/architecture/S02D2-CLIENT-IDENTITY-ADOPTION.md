# S02-D2 — Client / Workout Canonical Exercise Identity Adoption

`STATUS: IMPLEMENTED — LOG/SNAPSHOT ADOPTION DEFERRED` (S02-D2, 2026-08-27)

Phase: `S02-D2 — Client / Workout Canonical Exercise Identity Adoption`
(Architecture Stabilization Plan, S-02. Follows S02-D1 propagation contract.)

## Objective

Wire the S02-D1 canonical-identity propagation seam into the client
workout-plan construction so each workout step can carry canonical Exercise
identity (`exerciseId` / `slug`) **where available**, WITHOUT changing
workout-step identity or user-visible behavior.

## Core semantic rule

```
WorkoutExercise.id      = workout-STEP / legacy identity (EX-001, rule-{day}-{n}, generated-{n})  — UNCHANGED
WorkoutExercise.exerciseId = OPTIONAL canonical movement identity (persisted DB Exercise.id)
WorkoutExercise.slug       = OPTIONAL canonical resolution slug
```

`WorkoutExercise.id` MUST remain step-local/legacy-compatible. A single canonical
Exercise may appear multiple times; those steps stay distinct (state is driven
by `currentExerciseIndex`, not by id or exerciseId). Never deduplicate workout
steps based on `exerciseId`.

## Client contract evolution

- `src/components/workout/useWorkoutEngine.ts` — `WorkoutExercise` gained two
  OPTIONAL fields, `exerciseId?: ExerciseId` and `slug?: ExerciseSlug` (branded
  types from `src/lib/exercise/`). `id` remains required and its meaning is
  unchanged. Type-only change → no runtime effect on the engine/player.
- `src/app/[locale]/workout/page.tsx` — the local `CurrentProgramResponse`
  type now additively includes `exercises?: RelationalExercise[]` (the payload
  `GET /api/program/current` already returns). The API server response was NOT
  changed.

## Canonical identity enrichment wiring

The workout page builds the plan as:

```text
weeklySchedule exercises  +  program.exercises (relational)
            ↓  exerciseIdentityIndex(program.exercises ?? [])
            ↓  enrichScheduleExercises(scheduleExercises, index)
            ↓  base step = generatedExerciseDefaults(raw, i)
            →  merge: exerciseId/slug added ONLY when resolved
```

Canonical identity comes ONLY from a matched relational `Exercise.id` (via the
S02-D1 seam) — never invented, never fuzzy-matched. Unresolved steps keep a
legacy-only `WorkoutExercise` (canonical fields `undefined`) and remain fully
playable.

## Exercise vs step identity

Confirmed in the current code: `useWorkoutEngine` and `WorkoutPlayer` drive all
state (current exercise, set progression, timers, pause/resume, completion,
React keys via `${phase}-${index}-${set}`) from **`currentExerciseIndex`**, NOT
`WorkoutExercise.id`. The `id` was only consumed by the snapshot serializer
(`toOfflineExercises`) for step identity. Adding canonical fields introduces no
behavior coupling.

## Same-exercise-multiple-step + alias collapse

Both scenarios verified by tests: two schedule entries (distinct `id`/position)
may share the same `exerciseId` and remain TWO distinct steps; alias spellings
mapping to one canonical row keep both steps, each with its original `id` and
set/order info. No array item disappears, no state collision.

## Legacy / unresolved compatibility

- Legacy program (no usable relational match): the plan is byte-identical in
  behavior to before — canonical fields `undefined`, no error.
- Unresolved/ambiguous names: the S02-D1 relational join stays authoritative;
  fallback is legacy step id + display name only.

## Snapshot safety — `SNAPSHOT_PAYLOAD_UNCHANGED`

`src/lib/offline/workoutPersistence.ts#toOfflineExercises` projects
`WorkoutExercise` to a FIXED `OfflineExercise` field set (`id`, `name`, `sets`,
`reps`, `durationSeconds`, `restSeconds`, `completed`, `actualSets`,
`actualReps`). It does NOT serialize the full object, so the new optional
`exerciseId`/`slug` fields do **not** appear in IndexedDB snapshots. No
stripping needed; no snapshot format change; S-05 remains authoritative for
intentional snapshot evolution.

## Logging safety — `WORKOUT_LOG_ID_SEMANTICS_CHANGED: NO`

The active session path (`POST /api/workout/session`) sends exercise **names**;
the server resolves and links `WorkoutSessionExercise.exerciseId` to the DB
`Exercise.id`. It does NOT read `WorkoutExercise.id`. `queueCompletedExercise`
(the `exercise_logs` outbox) has no live caller feeding `WorkoutExercise.id`.
Adding optional fields to `WorkoutExercise` does not shift any log-id source.

## Remaining identity gaps (future phases)

- **Exercise logs** (`exercise_logs` / `workout_exercise_logs`): still
  name/server-resolved; canonical `exercise_id` adoption deferred to a later
  S02-D3 / S-05-coordinated phase (additive, keep `exercise_name` forever).
- **IndexedDB snapshots**: intentionally NOT persisted with canonical identity;
  S-05 owns snapshot versioning + additive canonical field adoption.
- **Historical backfill** (S02-E): NOT started — historical Programs/rows stay
  as-is.

## Status note

This is client identity adoption only — user-visible behavior unchanged, player
logic, timers, weeklySchedule, API, logs and snapshots untouched, no DB change,
Production untouched.