# S-02 — Canonical Exercise Identity: GATE A Decision Package

`STATUS: PROPOSED — OWNER APPROVAL REQUIRED`

Phase: `S-02 — Canonical Exercise Identity Foundation` (Architecture Stabilization Plan).
Baseline: ADR-0001 (ACCEPTED — exerciseId is identity; names are display metadata);
S-01 complete (2026-08-27, contract ownership).

> **No schema change, migration, backfill, or runtime change may begin until
> GA-01..GA-08 below are approved.** This document is the technical design that
> GATE A requires; it contains no implementation.

## Gate A Decisions Requested

| ID | Decision | Recommendation | Status |
|---|---|---|---|
| GA-01 | ID strategy | Hybrid: opaque stable `ExerciseId` (existing cuid pattern) as identity + canonical unique `slug` as source-controlled alias + names as display metadata | **PENDING OWNER APPROVAL** |
| GA-02 | Exercise domain ownership | New `src/lib/exercise/` (contracts, catalog, resolver) — narrow, no giant service | **PENDING OWNER APPROVAL** |
| GA-03 | Catalog model | Hybrid: system catalog source-controlled in `src/lib/exercise/catalog.ts`, seeded into the existing DB `Exercise` table | **PENDING OWNER APPROVAL** |
| GA-04 | Resolver policy | Precedence id → slug → normalized name → alias → UNRESOLVED; never silent fuzzy match; AMBIGUOUS on multiple hits | **PENDING OWNER APPROVAL** |
| GA-05 | Unknown exercise policy | Preserve as unresolved (keep name, no id, queue for catalog review); never drop/reject data | **PENDING OWNER APPROVAL** |
| GA-06 | Schema evolution | Additive only: `Exercise.slug` (unique, nullable→backfilled), `Exercise.faName?`, `Exercise.aliases?` (Json); no other table changes | **PENDING OWNER APPROVAL** |
| GA-07 | Backfill strategy | Classify AUTO / ALIAS / AMBIGUOUS / UNRESOLVED; dry-run → stats → apply → verify; idempotent; never guess | **PENDING OWNER APPROVAL** |
| GA-08 | Compatibility policy | No flag-day; name-first everywhere retained; new contract + resolver fallback + gradual adoption | **PENDING OWNER APPROVAL** |

---

## 1. Evidence — current exercise identity map

The repository already has a **canonical DB layer** (`prisma/schema.prisma`):
`Exercise` (cuid `id`, `name` UNIQUE, category, equipment, difficulty, instructions),
plus relational joins `ProgramExercise(exerciseId → Exercise)` and
`WorkoutSessionExercise(exerciseId → Exercise)`. The identity problem is in the
**generation and client layers**, which bypass or weaken that canonical layer.

| # | Representation | Identity used today | Durable? | Consumers |
|---|---|---|---|---|
| 1 | `Exercise` (Prisma) | cuid `id`; `name` UNIQUE (upsert key) | Yes (row id), but rows are created by name-upsert | `ProgramExercise`, `WorkoutSessionExercise`, analytics, seed |
| 2 | `AiExercise.id` in generated JSON | AI emits `"EX-001"`-style; rules emit `rule-{day}-{index}` (position-based) | **No** — unstable across generations/positions | `Program.weeklySchedule` (Json), `ProgramGenerationRequest.responsePayload`, player plan, sync logs, IndexedDB snapshots |
| 3 | Sample plans (`src/lib/workout/samplePlan.ts`) | local ids `fbi-1`, … + `nameKey` translation keys | No (demo) | `/workout` page fallback player |
| 4 | Library catalog (`src/app/[locale]/library/ExerciseLibraryPage.tsx`) | local slug-ish ids `push-ups`, … with demo video streams | No (demo) | library page |
| 5 | Offline snapshots / logs (`src/lib/offline/*`, `src/services/syncService.ts`) | whatever id the plan carried (2 or 3), plus `exerciseName` | No | `workout_states` (IndexedDB), `workout_exercise_logs` (Supabase) |

### Persistence trace (verified in code)

- `programService.ts` `persistProgramTransaction`: **upserts `Exercise` by unique
  `name`** (`tx.exercise.upsert({where: {name}, update: {}, create})`) — the AI/rules
  emitted name is the de-facto identity key; a new variant ("Push Up" vs "Push-Up")
  silently creates a new row.
- `ProgramExercise.exerciseId` = the DB row id for that name (looked up via
  `findMany where name in names`).
- The **player does not read the relational join**: `workout/page.tsx` builds the
  plan from `Program.weeklySchedule` (the raw generated JSON) via
  `programSchedule.workoutExercisesFromSchedule` + `generatedExerciseDefaults`,
  which keeps `AiExercise.id` (or falls back to `generated-{index}`).
- Those unstable ids then flow into `exercise_logs` (Supabase
  `0001_workout_exercise_logs.sql` stores `exercise_id` + `exercise_name`) and
  IndexedDB snapshots — so historical logs carry non-canonical, non-joinable ids.
- `AnimationPlayer` accepts `src` URLs (e.g. `/animations/push-up.json`) but is
  **not wired to any exercise** yet — media binding is a clean slate (V2).

### Aggregated data (read-only, development DB `prisma/dev.db`)

- `Exercise` rows: **40**, all distinct names (no normalized-name duplicates in
  dev data).
- `ProgramExercise`: 8 rows; `WorkoutSessionExercise`: 3; `Program`: 1;
  `WorkoutSession`: 1.
- Production data was NOT inspected (no established read-only mechanism); the
  backfill design (GA-07) is therefore built for unknown real-world variant
  density, not tuned to a specific corpus.

### Name corpus (source-controlled catalogs only)

- Rules engine catalog: **36 exercises** (in `src/lib/ai/ruleBasedProgram.ts`).
- Seed catalog: **40 exercises** (`prisma/seed.ts`) — overlap with the rules
  catalog is only **1 exact-name match**, i.e. the two lists describe similar
  movements under different display names ("Tempo Bodyweight Squat" vs
  "Bodyweight Squat").
- Library page: 10 demo entries; sample plans: 9 nameKeys.
- No Persian exercise-name corpus exists in code (localization for the library
  uses `Library.exercises.*` message keys; generated programs embed the AI's
  English name).

## 2. Current catalog assessment

**`PARTIAL / FRAGMENTED`** — there is no single canonical catalog, but two strong
fragments: the 40-row DB `Exercise` seed (canonical-capable shape: id, name,
category, equipment, difficulty, instructions) and the 36-entry rules engine
catalog (equipment + contraindication safety metadata, display-name keyed). The
library and sample plans are demo data with their own id namespaces. The DB
`Exercise` table is the natural canonical substrate; it lacks a stable slug,
aliases, localized names, and a seeded mapping for the rules/library vocabularies.

## 3. GA-01 — ID strategy

| Option | Pros | Cons |
|---|---|---|
| A. UUID | globally unique, distributed-safe, no reuse risk | not deterministic for a source-controlled catalog; unreadable in fixtures/logs; tests/backfill awkward |
| B. Semantic slug as identity (`push-up`) | deterministic, readable, natural for source-controlled catalog + resolver | taxonomy changes force re-keys; custom exercises risk collisions; renaming a movement re-identifies it |
| C. Opaque string id (`ex_01H…`) | durable, collision-safe, custom-exercise friendly | not deterministic for the catalog; no readability; tests need a lookup table anyway |
| **D. Hybrid (recommended)** | opaque stable `ExerciseId` (cuid, matching the existing DB) is the durable identity; canonical `slug` is a **unique source-controlled alias** used for resolution, fixtures, the rules catalog, library and backfill; names stay display metadata | slightly more fields to maintain (slug discipline) |

**Recommendation: D.** The DB already uses cuid ids — keeping them as identity
zero-cost. The slug gives determinism where it matters (source-controlled catalog,
resolver precedence, tests, backfill mapping) without making a human string the
durable key, and opaque ids leave a clean namespace for future custom/coach
exercises. **Names must never become the durable ID** (ADR-0001); a slug is an
identifier, not a display label, and is governed by an alias policy.

## 4. GA-02 — Exercise domain ownership

**Recommendation:** new `src/lib/exercise/` owning:
- `contracts.ts` — `ExerciseId`, `ExerciseSlug`, `ExerciseRef` (id | slug | name |
  alias), `ExerciseCatalogEntry`, resolver result types;
- `catalog.ts` — source-controlled system catalog (slug, id mapping, names,
  aliases, category/equipment metadata) seeded into the DB;
- `resolver.ts` — the Exercise Resolver (GA-04) and ambiguity classification.

This mirrors the S-01 contract-ownership pattern (domain owns its contracts) and
stays narrow: no persistence, no UI, no media. Media metadata is later data on
catalog entries, not a new service.

## 5. GA-03 — Catalog model

| Model | Evaluation |
|---|---|
| A. Static source-controlled only | deterministic, offline, testable; but duplicates the DB seed and can't host per-environment ids/aliases |
| B. DB table only | flexible, admin-able; but the canonical list then has no in-repo source of truth and the rules engine/library can't import it without a runtime dependency |
| **C. Hybrid (recommended)** | system catalog source-controlled (`src/lib/exercise/catalog.ts`), seeded into the existing `Exercise` table (id + slug + name + metadata); DB remains the persisted source of truth for rows and future custom exercises; source control remains the source of truth for the system list |

**Recommendation: C.** It matches what the codebase already does (seed →
`Exercise`) and gives the rules engine, library, tests and backfill one
importable source, while keeping the relational layer canonical.

## 6. GA-04 — Resolver policy

`resolve(input) → { status, exerciseId?, slug?, matches? }`

Precedence (first match wins; never fall through to fuzzy matching):

1. exact `ExerciseId`;
2. exact canonical `slug`;
3. exact normalized name (lowercase, whitespace-collapsed, punctuation-normalized);
4. known alias (case-insensitive);
5. **UNRESOLVED** — no silent guess.

If more than one catalog entry matches at any step → **AMBIGUOUS** (matches
listed, caller decides). States: `RESOLVED`, `UNRESOLVED`, `AMBIGUOUS`
(plus `LEGACY_FALLBACK` at the persistence layer, see GA-08). Ambiguity is
surfaced in backfill reports and generation metadata, never auto-guessed.

## 7. GA-05 — Unknown exercise policy

**Recommendation: preserve as unresolved.** When AI/rules/manual input names an
exercise not in the catalog:

- keep the original name everywhere (programs, logs, sessions, snapshots);
- no canonical id is assigned; resolution is retried on every later pass
  (idempotent — a future catalog addition resolves it without data changes);
- the name is recorded in an **unresolved-exercise report/queue** for catalog
  review (not auto-created, not rejected, not dropped).

Options explicitly rejected: reject (loses program data), auto-create canonical
row (silent catalog mutation), dynamic custom-exercise creation (a product
decision, deferred — the opaque-id namespace keeps it possible later).

## 8. GA-06 — Schema evolution (minimum GATE-A scope)

Additive only, on the existing `Exercise` model:

- `slug String? @unique` — canonical source-controlled alias (nullable during
  backfill, then made required in a later additive step if approved);
- `faName String?` — canonical Persian display name (optional);
- `aliases Json?` — historical name variants / aliases for resolution.

No changes to `ProgramExercise` / `WorkoutSessionExercise` (already keyed by
`Exercise.id`). No changes to the `weeklySchedule` JSON shape at this stage
(consumers adopt canonical ids in S02-D; old fields remain). No changes to
`workout_exercise_logs` (Supabase) — `exercise_id` already exists and will carry
canonical ids for new rows; `exercise_name` is retained forever.

## 9. GA-07 — Backfill design (not executed)

Idempotent, staged, observable:

1. **Classify** every `Exercise` row: `AUTO-RESOLVABLE` (name maps to a
   catalog slug via the seed/mapping table or deterministic slugification of the
   curated 40-row seed), `ALIAS-RESOLVABLE` (exact match against a curated alias
   list), `AMBIGUOUS` (multiple candidates), `UNRESOLVED` (no candidate).
2. **Dry-run**: compute the classification, write a report (counts + the
   UNRESOLVED/AMBIGUOUS lists); no writes.
3. **Apply**: set `slug`/`faName` only for AUTO + ALIAS rows; skip AMBIGUOUS and
   UNRESOLVED; log every decision.
4. **Verify**: re-run classification → all AUTO/ALIAS rows now resolve; counts
   compared to the dry-run; unresolved list recorded for catalog review.
5. **Rerun safety**: the whole pass is idempotent (upsert semantics, no
   destructive ops) and replayable after the catalog grows.

## 10. GA-08 — Compatibility policy

| Surface | Behavior |
|---|---|
| Old program + old client | unchanged (name-only) |
| Old program + new client | `Exercise.name` still returned; resolver adds `slug`/`exerciseId` when resolvable; UNRESOLVED → name-only, no error |
| New program + current client | current fields unchanged; canonical id additive |
| New program + future client | canonical id primary; name kept |
| Existing DB rows | untouched until backfill (GA-07); names never deleted |
| Existing IndexedDB snapshots | additive optional id (S-05 version discipline); old snapshots hydrate |
| AI generation | emits id/name as today; persistence resolves through the resolver (upsert by slug with **name fallback**); unresolved names preserved |
| Rules fallback | catalog entries carry slugs; output unchanged otherwise |
| Unknown exercises | preserved as unresolved (GA-05) |

**No flag-day migration.** Generation/normalization switch from
"upsert by name" to "resolve → upsert by slug with name fallback", so behavior
stays identical when resolution fails.

## 11. API / analytics / media / source-independence notes

- **API (additive):** `ProgramSchema` exercises may gain an optional canonical
  id; `name` stays required. `GET /api/program/current` and
  `POST /api/workout/session` unchanged in shape (additive fields only).
- **Analytics:** logs already carry `exercise_id` + `exercise_name`; going
  forward `exercise_id` = canonical id (or the existing value until S02-D).
  No analytics redesign.
- **Media / V2 readiness:** `AnimationPlayer` takes `src` URLs and is unwired —
  the catalog's `exerciseId → media metadata` mapping replaces any future
  name→animation lookup. Media technology is NOT decided here.
- **Source independence:** AI, rules, coach and manual programs all normalize to
  the same resolver output; workout execution consumes normalized refs only.

## 12. Proposed implementation phases (post-approval; NOT started)

| Phase | Content | Gate / note |
|---|---|---|
| S02-A | `src/lib/exercise/` contracts + source-controlled catalog + resolver (no DB, no runtime change) | after GATE A approval |
| S02-B | Additive schema (`slug`/`faName`/`aliases`) + seed/catalog sync | additive migration; forward-compatible |
| S02-C | Generation normalization: resolver in `persistProgramTransaction` (upsert by slug, name fallback, unresolved preserved) | behavior-parity tests |
| S02-D | Client adoption: player plan + logs + snapshots carry canonical id (additive, versioned) | coordinates with S-05 |
| S02-E | Backfill dry-run → apply → verify (GA-07) | separately observable |
| (later) | Media metadata, Workout V2 binding | outside GATE A |

## 13. Rollback

- S02-A / C / D: plain git revert (code-only).
- S02-B: additive nullable columns — safe to keep after revert; slug column is
  forward-compatible (never destructive).
- S02-E: backfill replayable and reconstructible; original names are never
  removed, so no data-loss rollback path exists.

## 14. Rejected alternatives (summary)

- **UUID-only identity**: no determinism for the source-controlled catalog.
- **Slug-as-identity**: re-keying risk on taxonomy changes; custom-exercise
  collisions.
- **Static-catalog-only** (no DB): duplicates the seed; no per-environment data.
- **DB-only catalog**: no in-repo source of truth for the rules engine/library.
- **Reject/auto-create on unknown**: would lose program data or silently mutate
  the catalog.

## 15. Open risks

- Real production name-variant density is unknown (no read-only production
  access) — backfill is designed for the worst case (mostly UNRESOLVED → catalog
  review), not tuned.
- Slug curation for the existing 40-row seed + 36-entry rules catalog + library
  vocabulary is manual, one-time effort (estimated SMALL-MEDIUM, relative).
- `Exercise.name` UNIQUE + upsert-by-name remains the fallback path — it must
  stay, or old programs break; the resolver replaces it only when it resolves.
- Client adoption (S02-D) spans the player, logs and snapshots — keep it
  additive and versioned to avoid coupling with S-05.

---

*This document is the GATE A decision package. Approval of GA-01..GA-08 is
required before any schema change, migration, backfill or runtime behavior
change for canonical exercise identity.*
