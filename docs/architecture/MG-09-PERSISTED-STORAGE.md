# MG-09 — Movement Graph Persisted Storage / Governed Adoption

> **STATUS: DELIVERED — MG-09 (2026-09-01)**
>
> Task: `MG-09` in [`../TASKS.md`](../TASKS.md) — Production migration /
> adoption (governed) (P0, DEPENDENCIES: MG-08, PROD_SENSITIVE,
> DB_SENSITIVITY: SCHEMA_AND_DATA, architecture-gated).
> Decision record: [`../adr/0011-persisted-movement-graph.md`](../adr/0011-persisted-movement-graph.md).
> Inputs: [`MG-08-RECONCILIATION.md`](MG-08-RECONCILIATION.md) (reconciliation
> engine + report); the gateway `db-operation` contract
> ([`../PRODUCTION_DEPLOYMENT_GATEWAY.md`](../PRODUCTION_DEPLOYMENT_GATEWAY.md)
> §db-operation); the additive-migration discipline.

## 1. Purpose

Adopt the versioned Movement Graph (MG-01 contract) in the database through a
**governed, additive** migration, and switch the runtime workout-content
resolution onto the graph. The adoption follows the established gateway
`db-operation` lifecycle: **read-only dry-run → evidence → explicitly
authorized apply** (mirrors the S02-E pattern; see
[`GOVERNED-DB-MUTATION-01.md`](GOVERNED-DB-MUTATION-01.md)).

This task delivers the migration, the allowlisted data-migration runner, the
fail-safe runtime switchover, and the local dry-run/rehearsal evidence. The
**Production apply** itself is gated on the recorded
`OWNER_DECISION_GATE` (dry-run evidence + explicit apply authorization) and
the gateway environment — it is NOT part of this delivery.

## 2. Additive schema (nothing destructive)

Three new tables + one optional back-relation (no column added to any
existing table):

| Table | Contents | Key rules |
|---|---|---|
| `Movement` | the persisted movement knowledge object (slug, nameEn, nameFa?, aliases, taxonomy, description, instructions, coachingCues, provenance, versioning) | `slug`/`nameEn` unique; `exerciseId` unique FK → `Exercise.id` (the durable legacy link); `exerciseId` nullable + `onDelete: SetNull` |
| `MovementRelationship` | typed graph edges (sourceSlug, kind, targetSlug, note?) | references by canonical slug, never resolved at schema time (MG-01 §2.4); indexed both directions |
| `MovementMedia` | self-hosted media manifest entries (movementSlug, assetId, kind, url, contentHash?, fallbackUrl?, captionKey?, validated) | MG-07 contract; indexed by movementSlug |

Rules honored:

- **ADDITIVE ONLY** — `ALTER TABLE` touches no existing table; the
  `Exercise.movement` back-relation is client-side only.
- **`Movement.exerciseId` is the reference-preservation guarantee**: the data
  migration links each MAPPED Movement row to its existing `Exercise` row, so
  every `ProgramExercise` / `WorkoutSessionExercise` join keeps pointing at
  the same durable `Exercise.id` (MG-09 acceptance: *the data migration
  preserves every existing exercise reference*).
- Verified: the migration applies cleanly on a fresh database (`prisma
  migrate deploy` → 14 migrations, schema up to date); tables are additive
  and independent (validated locally, section 6).

## 3. Data migration from the reconciled catalog (MG-08)

The allowlisted gateway operation `mg09-movement-graph-adopt`
(`scripts/gateway-db-ops/mg09-movement-graph-adopt.mjs` + pure lib
`lib/mg09-adopt.mjs`) rebuilds the plan from the **MG-08 reconciliation
engine** (`buildReconciliationReport` — the same deterministic
MAPPED/AMBIGUOUS/UNRESOLVED model closed in MG-08):

- **Every canonical catalog entry** (74: 40 seed + 34 rules) becomes a
  `Movement` row (slug, nameEn, aliases, provenance `SOURCE_CONTROLLED`,
  versioning).
- **MAPPED legacy rows** link the Movement row back to the existing Exercise
  row via `exerciseId` (SEED_LINKED). Linkage is derived by re-classifying
  each row's NAME — an existing slug is never trusted as canonical
  (`slugDrift` is reported).
- **AMBIGUOUS rows are surfaced with candidates and NEVER linked; UNRESOLVED
  rows are surfaced and NEVER mapped** (the S02-E lesson). Their Exercise
  rows stay untouched and remain referenceable through the legacy path.
- **Apply is idempotent**: upsert by slug; `exerciseId` is only set when the
  link is still null (never clobbers an existing link); the operation never
  writes, alters, or deletes any pre-existing table.
- **Evidence model**: dry-run prints a canonical JSON report (counts, plan,
  ambiguous/unresolved surfaces, verification `PASS/FAIL`); the gateway
  hashes it as dry-run evidence and refuses `apply` without the matching
  evidence SHA.

Local evidence (canonical corpus — 74 entries): **72 SEED_LINKED /
2 CATALOG_ONLY / 2 AMBIGUOUS / 0 UNRESOLVED**, plan + applied verification
PASS. Recorded S02-E corpus: 8 MAPPED linked, `Side-Lying Leg Lift` remains
AMBIGUOUS with candidates surfaced — never guessed.

## 4. Runtime switchover (fail-safe adoption gate)

`src/services/movementGraphStore.ts` is the switchover seam:

- `isMovementGraphAdopted()` — **fail-safe gate**: true only when the
  `Movement` table EXISTS and holds rows. A missing table (migration not yet
  applied) reads as NOT adopted → the runtime keeps the exact legacy
  behavior (zero change before adoption). Any probe error is fail-closed
  (false).
- `resolveWorkoutExercises(names, programId)` — the workout session's
  exercise resolution. When adopted, canonical names resolve through the
  graph (`nameEn` → the linked legacy `Exercise.id`, preserving every
  reference); names the graph doesn't know (e.g. AI-generated program
  exercises outside the canonical catalog) fall back to the exact legacy
  lookup; the program-membership filter applies to both paths identically.
- Wired into `src/app/api/workout/session/route.ts` (session start).

Result: before the Production migration+data migration are applied, behavior
is byte-identical to the pre-MG-09 path; after adoption, workout content
resolution serves from the Movement Graph.

## 5. Boundaries respected (scope guard)

- ❌ No Production apply — gated on `OWNER_DECISION_GATE` (dry-run evidence +
  explicit apply authorization) and the gateway environment (server-side,
  root-only; Docker unavailable in this workspace).
- ❌ No destructive change — the migration is additive; legacy tables are
  never written by the runner.
- ❌ No media ingestion; no media bytes imported (`MovementMedia` stays
  empty until a future rights-cleared media lifecycle).
- ❌ No Side-Lying Leg Lift resolution — remains AMBIGUOUS, Owner-deferred
  (S02-E decision preserved; structurally surfaced in the adoption report).
- ❌ No UI change; no unrelated backlog work (AL-01+ not started).
- ✅ Runtime behavior change is scoped to the session exercise-resolution
  seam and is fail-safe (legacy path when not adopted).

## 6. Architecture gate

The `ARCHITECTURE_GATE: REQUIRED` metadata of MG-09 is satisfied by:
1. this document (schema, adoption contract, switchover design), and
2. [`../adr/0011-persisted-movement-graph.md`](../adr/0011-persisted-movement-graph.md)
   (decision record: additive persisted Movement Graph tables + governed
   data migration + fail-safe runtime switchover).

## 7. Downstream dependencies

The adoption unlocks `AL-01+` (workout outcome/feedback model) and the
adaptive-loop pillars: the Movement Graph is now the persisted, versioned
knowledge surface the Personal Movement Profile and Adaptive Training build
on. The Side-Lying ambiguity's structural resolution remains an Owner-decision
item (recorded in MG-08's absorbed debt).