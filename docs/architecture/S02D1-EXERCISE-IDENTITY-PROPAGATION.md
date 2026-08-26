# S02-D1 — Canonical Exercise Identity Propagation Contract

`STATUS: IMPLEMENTED CONTRACT FOUNDATION — CLIENT ADOPTION NOT STARTED` (S02-D1, 2026-08-27)

Phase: `S02-D1 — Canonical Exercise Identity Propagation Contract`
(Architecture Stabilization Plan, S-02. Precedes S02-D2 client/player adoption.)

## Objective

Provide a **stable, additive propagation seam** so new consumers can receive
canonical exercise identity where available while every existing client and
legacy path continues to work unchanged. Canonical identity becomes the
*primary* client identity only later (S02-D2); this phase establishes the
contract + pure enrichment path and proves the join strategy.

## Key facts from the trace

| Layer | Current ID | Canonical ID available? | Source |
|---|---|---|---|
| Generated JSON exercise | `EX-001` (AI) / `rule-{day}-{n}` (rules) / `generated-{n}` (fallback) | No (session-local, unstable) | `AiExercise.id` in `weeklySchedule` |
| `GET /api/program/current` `program.exercises[].exercise.id` | DB `Exercise.id` (cuid) | **Yes** | Prisma `ProgramExercise → Exercise` relation |
| `program.exercises[].exercise.slug` | canonical slug (NULL until resolved) | Yes (S02-C) | `Exercise.slug` |
| Player plan `WorkoutExercise.id` | schedule `id` / `generated-{index}` | **No — dropped today** | `generatedExerciseDefaults` |
| Workout logs / snapshots | schedule id + display name | No (legacy path) | `workout_exercise_logs`, IndexedDB |

**Divergence:** the API already returns canonical identity (relational
`program.exercises[].exercise.*`), but the workout page builds its plan solely
from `weeklySchedule` (raw JSON) and discards the relational data. S02-D1 gives
consumers an explicit, tested way to reunite the two without touching either.

## Canonical source of truth

**The persisted `Exercise` row id** (`ProgramExercise.exerciseId →
`Exercise.id`). Canonical identity is **never invented** and **never derived**
from the generated JSON id, the slug alone, array position, or display name.
The slug assists lookup/propagation when present (`Exercise.slug`), and the
display name is metadata/fallback only.

## Propagation contract (owned by the Program-normalization domain)

Live in `src/lib/programSchedule.ts` (pure, no Prisma/service internals, no
React, server-agnostic — reusable by program normalization, future Workout
Preview, Workout Player, Voice Coach, and later logs/snapshots):

- **`WorkoutExerciseIdentity`**:
  - `exerciseId?: ExerciseId` — canonical movement identity (persisted `Exercise.id`) when resolvable;
  - `slug?: ExerciseSlug` — canonical resolution slug when available;
  - `legacyId: string` — the workout STEP's existing generated/session-local id (always present);
  - `name: string` — display/metadata (never identity).
- **`RelationalExercise`** — the minimal `ProgramExercise → Exercise` input shape already returned by `GET /api/program/current`.
- **`ExerciseIdentityIndex`** + **`exerciseIdentityIndex(...)`** — name/slug lookup over the relational list.
- **`enrichExerciseIdentity(...)`** / **`enrichScheduleExercises(...)`** — the pure enrichment seam (see below).

## Exercise identity vs workout-step identity

- `ExerciseId` = identity **of the movement** (durable, shared by many steps).
- `legacyId` + schedule `order`/position = identity **of the scheduled step**.

The two must never be conflated: a step's unique identity is its position +
legacy id, NOT its `exerciseId`. The contract therefore keeps both, and the
seam never deduplicates steps merely because they share an `exerciseId`
(same movement in two sessions, or alias collapse).

## Enrichment / join strategy

```
weeklySchedule exercise  +  relational ProgramExercise→Exercise  →  WorkoutExerciseIdentity
```

Matching policy (NO fuzzy matching):
1. exact relational **display-name** match (strongest — the DB relation);
2. exact relational **slug** match (when the input carries a slug hint);
3. legacy-only reference — canonical id is never invented, never inferred
   from name similarity.

When a relational row matched, `exerciseId` (and `slug` when that row has one)
is copied through; the legacy id and display name are always preserved.

## Legacy compatibility

- `legacyId` and `name` always present → legacy consumers keep working.
- Old programs / name-only programs / unresolved names → legacy-only reference
  (no canonical id, no error).
- Generated/session-local ids (`EX-001`, `rule-{day}-{n}`, `generated-{n}`) are
  **not removed or rewritten**.
- `weeklySchedule` is **not rewritten** — canonical identity is enriched at
  **read-time**, avoiding duplicated authority and historical rewrites.
- No API shape change: `GET /api/program/current` already carries the needed
  relational data additively.

## API impact

`NONE` — the current response already includes `program.exercises[].exercise.*`
(additive, ignored by legacy clients). No field was removed or renamed and no
new required identity field was introduced.

## Normalized workout contract

`WorkoutExerciseIdentity` is the additive evolution of the workout plan's
identity fields. The runtime `WorkoutExercise` (player) is **unchanged** in
S02-D1; S02-D2 will decide how `WorkoutExercise.id` semantics adopt the
canonical + step distinction.

## S02-D2 handoff (IMPLEMENTED 2026-08-27)

S02-D2 adopted this seam into the client workout-plan build:
- workout page (`src/app/[locale]/workout/page.tsx`) feeds `program.exercises`
  into `exerciseIdentityIndex` + `enrichScheduleExercises`, threading
  `exerciseId`/`slug` into each plan step as OPTIONAL canonical metadata.
- `WorkoutExercise.id` remains the workout-step/legacy identity (unchanged
  semantics); canonical `exerciseId`/`slug` are separate optional fields
  (`src/components/workout/useWorkoutEngine.ts`). No step-collapse when aliases
  resolve to one canonical exercise. See
  [`S02D2-CLIENT-IDENTITY-ADOPTION.md`](./S02D2-CLIENT-IDENTITY-ADOPTION.md).

## Exercise logs / S-05 snapshot handoff

- **Exercise logs:** today `workout_exercise_logs.exercise_id` stores the
  unstable schedule id + `exercise_name` a display name. S02-D2/backfill should
  eventually map logs to a canonical `Exercise.id` while retaining
  `exercise_name` forever (GA-08); additive only.
- **IndexedDB snapshots:** `workout_states` persist the player's `WorkoutExercise`
  (legacy id + name). Canonical identity should be added *additively* under the
  S-05 snapshot `version` discipline — never destructively.
  (**Not implemented in S02-D1; no snapshot or log changes were made.**)

## Tests

`tests/identity-propagation.test.ts` (9 tests): canonical relation → id+slug;
slug-hint routing; legacy id preservation; no-match legacy-only; missing-id
fallback; same-exercise-multiple-steps preserved; alias collapse (distinct
steps, one canonical id); no fuzzy match; index availability.

## Status note

This is **contract/enrichment only** — no user-visible behavior changed, no
player/API/log/snapshot modification, no backfill, Production untouched.