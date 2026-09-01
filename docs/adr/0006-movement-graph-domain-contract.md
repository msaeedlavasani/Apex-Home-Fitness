# ADR-0006: Movement Graph Domain Contract

> **STATUS: ACCEPTED — 2026-09-01**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `MG-01` (Movement Graph canonical schema / domain
> contract, delivered 2026-09-01; contract:
> `docs/architecture/MG-01-MOVEMENT-GRAPH-CONTRACT.md`; module:
> `src/lib/movement/types.ts`; expressibility bridge:
> `src/lib/movement/expressibility.ts`; view in `docs/TASKS.md`)
>
> **Execution gating:** this ADR ratifies the type-level contract for the
> Movement Graph. It does NOT authorize the taxonomy vocabulary (MG-02),
> the provenance module (MG-03), the ingestion pipeline (MG-04…MG-08), or
> any persistence change (MG-09). Each of those requires its own task
> authorization.

## Context

The persisted Movement Intelligence strategy
(`docs/product/MOVEMENT-INTELLIGENCE-STRATEGY.md`) requires that exercises
eventually become **related movement knowledge objects** — not flat table
rows — with identity, taxonomy, relationships, provenance, versioning,
localization, and validated self-hosted media. Before any of the movement
graph family can be built (MG-02…MG-09), the SHAPE of a movement knowledge
object must be fixed: what fields exist, what their types are, where each
value comes from, and what the pure/contract boundary is. Today the only
canonical exercise artifacts are the S-06 source-controlled catalog
(`src/lib/exercise/contracts.ts`, `catalog.ts`) and the Prisma `Exercise`
model, which mix identity, display metadata, prescription fields, and
media.

## Decision

1. **Adopt the Movement Graph domain contract as the canonical type-level
   schema** for the future Movement Graph, in `src/lib/movement/types.ts`
   (public surface `src/lib/movement/index.ts`).
2. **The contract is PURE** — no Prisma, React, services, environment, or
   runtime side effects; nothing in application code imports it yet (no
   runtime behavior change).
3. **Identity is fail-closed by design**: `MovementId` is opaque/durable,
   `MovementSlug` is the resolution anchor, and the contract performs ZERO
   identity resolution (the S02-E `Side-Lying Leg Lift` lesson is preserved;
   MG-01 resolves nothing). Draft ids (`draft-movement:<slug>`) are
   explicit placeholders, replaced by MG-04/MG-05 identity resolution.
4. **The contract fixes SHAPES, not vocabularies**: taxonomy fields are
   nominal token types; the exhaustive closed vocabulary + FA/EN display
   maps are MG-02's scope. `DifficultyTier` is closed today because the
   values already exist in the live Prisma `DifficultyLevel` enum.
5. **Provenance/relationships/media/versioning shapes live in the
   contract**; their implementations (license rules + hashing = MG-03,
   relationship validation = MG-06, self-hosted media + localization keys =
   MG-07, persistence = MG-09) are separate tasks with separate
   authorization.
6. **Expressibility is an acceptance property**: the existing S-06
   canonical catalog maps into the new types via the pure bridge
   (`expressibility.ts`) with unique ids/slugs and no invented knowledge
   (no FA names; no unsupported metadata).

## Consequences

- Downstream P0 family (MG-02…MG-09) imports/extends the contract instead
  of inventing parallel shapes.
- `src/lib/exercise` remains the canonical system catalog (S-06 decision),
  unchanged; `src/lib/movement` is the forward-looking movement knowledge
  schema with a documented one-way, type-only dependency on
  `exercise/contracts`.
- No migration is implied or performed; `Exercise` model is untouched.
- Slugs remain kebab-case tokens shared across domains; crossing the token
  from `ExerciseSlug` to `MovementSlug` is a documented explicit cast in the
  bridge, not an implicit coercion.

## Related

- `docs/architecture/MG-01-MOVEMENT-GRAPH-CONTRACT.md` — field-by-field contract
- `docs/architecture/S06-CATALOG-ROLE.md` — S-06 decision (catalog = canonical)
- `docs/product/MOVEMENT-INTELLIGENCE-STRATEGY.md` — strategy §1 (field list), §2 (relationships), §6 (self-hosting)
- `docs/architecture/S02E-BACKFILL-PREFLIGHT.md` — preserved ambiguity (Side-Lying Leg Lift)