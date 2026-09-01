# MG-01 — Movement Graph Canonical Schema / Domain Contract

> **STATUS: DELIVERED — MG-01 (2026-09-01)**
>
> Task: `MG-01` in [`../TASKS.md`](../TASKS.md) — Movement Graph canonical
> schema / domain contract (P0, DEPENDENCIES: NONE, architecture-gated).
> Decision record: [`../adr/0006-movement-graph-domain-contract.md`](../adr/0006-movement-graph-domain-contract.md).
> Inputs: [`../product/MOVEMENT-INTELLIGENCE-STRATEGY.md`](../product/MOVEMENT-INTELLIGENCE-STRATEGY.md)
> §1; `src/lib/exercise/contracts.ts` + `src/lib/exercise/catalog.ts`
> (S-06: catalog = canonical); `prisma/schema.prisma` `Exercise` model.

## 1. Purpose

A **movement knowledge object** is the future node of the Apex Movement
Graph. This contract fixes its type-level shape: identity, taxonomy fields,
relationship edges, provenance, versioning, and localization keys. The
Module of Record is `src/lib/movement/types.ts` (pure TypeScript; the
public surface is `src/lib/movement/index.ts`).

**NO database migration is part of this task.** DB sensitivity of MG-01 is
`SCHEMA (new tables; additive migration)` in the *future*: MG-09 owns the
governed Production adoption. This task changes no schema, no runtime
wiring, and imports nothing from application code (no runtime behavior
change).

## 2. Field-by-field contract

Every field below carries its **provenance requirement** — where the value
comes from (today and after the governance pipeline lands). Owner column:
**SEED** = derivable from today's source-controlled catalog;
**PIPELINE** = produced by the MG-04…MG-08 ingestion/enrichment pipeline;
**MG-NN** = designed/owned by a later task; **ADMIN** = future curation.

### 2.1 Identity

| Field | Type | Required | Provenance |
|---|---|---|---|
| `id` | `MovementId` (branded string) | ✅ | **PIPELINE / MG-04–05** — durable identity assigned by fail-closed identity resolution (S02-E lesson: never guess). DRAFT placeholders only today (`draft-movement:<slug>`). |
| `slug` | `MovementSlug` (branded kebab-case token) | ✅ | **SEED** — the existing `ExerciseSlug` token format (`slugifyName` output) carries over one-to-one. Resolution anchor, never the durable key. |
| `name.en` | `string` | ✅ | **SEED** — canonical display name from the S-06 catalog. |
| `name.fa` | `string?` | no | **SEED / ADMIN** — absent until a real Persian corpus exists (GATE A: no invented FA names). |
| `name.aliases` | `readonly string[]?` | no | **SEED** — confidently-equivalent variants from the catalog; never cross-vocabulary guesses. |

### 2.2 Taxonomy (shape; exhaustive vocabulary = MG-02)

| Field | Type | Provenance |
|---|---|---|
| `taxonomy.primaryMuscles` / `.secondaryMuscles` | `readonly MuscleGroupToken[]?` | **MG-02** vocabulary + PIPELINE enrichment |
| `taxonomy.movementPatterns` | `readonly MovementPatternToken[]?` | **MG-02** |
| `taxonomy.equipment` | `readonly EquipmentTypeToken[]?` | **MG-02** |
| `taxonomy.difficulty` | `DifficultyTier?` = `'beginner'|'intermediate'|'advanced'` | **SEED** — project of the live Prisma `DifficultyLevel` enum (lowercased) |
| `taxonomy.impact` | `ImpactLevelToken?` | **MG-02** |
| `taxonomy.symmetry` | `MovementSymmetryToken?` | **MG-02** |
| `taxonomy.homeSuitability` | `HomeSuitabilityToken?` | **MG-02** |
| `taxonomy.constraints` | `readonly MovementConstraintToken[]?` | **MG-02** / ADMIN |

Taxonomy tokens are **nominal** in MG-01 (`string` + brand) so the contract
ships the SHAPE without freezing the VOCABULARY; MG-02 designs the closed
enum set + FA/EN display maps. `difficulty` is closed now because the
vocabulary already exists in the live schema.

### 2.3 Descriptive/localization content

| Field | Type | Provenance |
|---|---|---|
| `description` | `LocalizedText?` (`key`, `en`, `fa?`) | **PIPELINE / ADMIN** |
| `instructions` | `readonly LocalizedText[]?` | SEED (existing `Exercise.instructions`) + PIPELINE |
| `coachingCues` | `readonly LocalizedText[]?` | **PIPELINE / ADMIN** — common mistakes/form cues, *where supported* |

`LocalizedText.key` is the stable localization key; the key structure is
defined by MG-07. Text is embedded alongside the key as the display
default.

### 2.4 Relationships

| Field | Type | Provenance |
|---|---|---|
| `relationships[]` | `readonly MovementRelationshipEdge[]?` | **MG-06** |

Each edge: `kind` ∈ `progression | regression | substitution`, `target`
(`MovementReference` by `id` or `slug` — never resolved at schema time),
and optional `note` (e.g. the constraint/equipment/impact driver).
Structural validation (no cycles, no dangling refs) is **MG-06**.

### 2.5 Media

| Field | Type | Provenance |
|---|---|---|
| `media[]` | `readonly MovementMediaAsset[]?` | **MG-07** |

Each asset: `kind` ∈ `image|video|animation|audio`, self-hosted `url`,
`contentHash?`, `fallbackUrl?`, `captionKey?`, `validated?`. The
self-hosting/resilience requirement (strategy §6) is MG-07's architecture.

### 2.6 Provenance (baseline; module = MG-03)

| Field | Type | Provenance |
|---|---|---|
| `provenance.sourceKind` | `SOURCE_CONTROLLED|UPSTREAM_IMPORT|CURATED|LEGACY_SEED` | **SEED / PIPELINE** — today all drafts are `SOURCE_CONTROLLED` |
| `provenance.sourceRef` | `string?` | **SEED / PIPELINE** |
| `provenance.license` | `string?` | **MG-03** license-compatibility rules |
| `provenance.contentHash` | `string?` | **MG-03** hashing contract |
| `provenance.confidence` | `MovementConfidence` (0..1) | **MG-03** assessment model; fail-closed |

MG-01 fixes the *shape*; MG-03 implements the module (hash algorithm,
license rules, confidence semantics) and may extend semantics without
changing this schema's field set.

### 2.7 Versioning

| Field | Type | Provenance |
|---|---|---|
| `versioning.catalogVersion` | `number` | **PIPELINE** — monotonic catalog version |
| `versioning.entryVersion` | `number` | **PIPELINE** — monotonic per-object revision |
| `versioning.changeNote` | `string?` | **PIPELINE / ADMIN** — e.g. ingestion event id |

## 3. Expressibility of the existing catalog

Acceptance: *the existing exercise catalog can be expressed in terms of the
new types.* Proven by the pure bridge `src/lib/movement/expressibility.ts`
and `tests/movement-domain.test.ts`:

- **Every** `CANONICAL_CATALOG` entry (74: 40 seed + 34 rules) maps to a
  `MovementObject` draft with unique deterministic ids and preserved slug
  tokens.
- Drafts carry only **known** knowledge: identity, name, provenance
  (`SOURCE_CONTROLLED`, confidence 1, sourceRef = the S-06 catalog), and
  versioning. Taxonomy/instructions/relationships/media/description are
  **absent** — partial knowledge is representable without invention.
- `name.fa` is never invented (GATE A).

Mapping of the current `Exercise` model into this contract:

| Prisma `Exercise` field | Movement Graph mapping |
|---|---|
| `id` (cuid) | future durable `MovementId` source during MG-09 migration; drafts have placeholders |
| `slug` | `slug` (token format carried over; S-06 canonical) |
| `faName` | `name.fa` |
| `name` | `name.en` |
| `description` | `description.en` |
| `category` / `difficulty` | `taxonomy.movementPatterns` (MG-02 vocabulary) / `taxonomy.difficulty` |
| `equipment` (Json) | `taxonomy.equipment` (MG-02 vocabulary) |
| `instructions` (Json) | `instructions[]` |
| `imageUrl` | `media[]` (after MG-07 validation; today NOT self-hosted-validated) |
| `durationSeconds` / `reps` / `sets` / `restSeconds` | out of scope: prescription, not movement knowledge (stays in Program/Workout domains) |

## 4. Boundaries respected (scope guard)

- ❌ No database migration, no Prisma change (MG-09).
- ❌ No exhaustive taxonomy enums / FA–EN display maps (MG-02).
- ❌ No provenance module logic / license rules / hashing (MG-03).
- ❌ No ingestion pipeline, identity resolution, or reconciliation (MG-04/05).
- ❌ No relationship validation (MG-06); no media/localization architecture (MG-07).
- ❌ No resolution of the S02-E `Side-Lying Leg Lift` ambiguity — MG-01
  resolves nothing (identity resolution is later, fail-closed).
- ❌ No runtime wiring: nothing in application code imports
  `src/lib/movement`; `RUNTIME_BEHAVIOR_CHANGED = NO`.

## 5. Architecture gate

The `ARCHITECTURE_GATE: REQUIRED` metadata of MG-01 is satisfied by:
1. this contract document (field-by-field type + provenance), and
2. [`../adr/0006-movement-graph-domain-contract.md`](../adr/0006-movement-graph-domain-contract.md)
   (decision record: adopt the Movement Graph domain contract as the
   canonical type-level schema; established in `src/lib/movement`, pure,
   no persistence change).

## 6. Downstream dependencies

`MG-02` (taxonomy vocabulary) ← `MG-01`; `MG-03` (provenance module) ←
`MG-01`; `MG-04…MG-08` consume the contract for the governed pipeline;
`MG-09` maps the contract onto additive persistence (new tables). No cycle:
MG-01 imports only `exercise/contracts` types (one-way, type-only).