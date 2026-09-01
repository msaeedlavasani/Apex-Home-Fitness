# ADR-0007: Movement Taxonomy Vocabulary

> **STATUS: ACCEPTED — 2026-09-01**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `MG-02` (Movement taxonomy design, delivered
> 2026-09-01; vocabulary + FA/EN maps:
> `docs/architecture/MG-02-MOVEMENT-TAXONOMY.md`; module:
> `src/lib/movement/taxonomy.ts`; view in `docs/TASKS.md`)
>
> **Execution gating:** this ADR ratifies the closed vocabulary for the
> Movement Graph taxonomy fields. It does NOT authorize enrichment of the
> catalog with taxonomy values (MG-04/MG-08 pipeline), a persistence change
> (MG-09), or vocabulary extension.

## Context

The MG-01 domain contract (ADR-0006) declared the taxonomy FIELDS of a
movement knowledge object as nominal token types, explicitly deferring the
exhaustive closed VOCABULARY to MG-02: movement patterns, muscle groups
(primary/secondary), equipment types, difficulty tiers, impact levels,
unilateral/bilateral symmetry, home-suitability ratings, and movement
constraints, each with FA/EN display mappings. Without a closed vocabulary,
downstream tasks (ingestion, relationship enrichment, Companion guidance,
localization) would each invent parallel term sets, fragmenting the
Movement Graph.

## Decision

1. **Adopt the closed taxonomy vocabulary defined in
   `src/lib/movement/taxonomy.ts`** as canonical for the Movement Graph
   taxonomy fields: 19 movement patterns, 17 muscle groups, 11 equipment
   types, 3 difficulty tiers, 3 impact levels, 3 symmetry values,
   3 home-suitability levels, and 9 movement constraints (71 tokens).
2. **Tokens are stable kebab-case identifiers**; display strings are FA/EN
   renderings. FA strings are **provisional app-authored translations for
   taxonomy terms only** — they do not violate GATE A (no invented
   exercise display names) and are flagged for corpus verification with the
   MG-07 localization model.
3. **The vocabulary is closed and extensible only by governance**: a new
   token requires a documented decision (ADR/owner review) — ad-hoc enum
   extension is prohibited. `DifficultyTier` remains closed in MG-01
   (mirrors the live Prisma `DifficultyLevel` enum).
4. **MG-01 contract types are unchanged**: `MovementTaxonomy` keeps nominal
   token types; MG-02 supplies literal unions, `isX` guards, and `toXToken`
   bridges. `taxonomyTokenErrors` is fail-closed (unknown tokens surface,
   never silently accepted — consistent with the S02-E identity lesson).
5. **Exhaustiveness is proven against the current canonical catalog** (74
   entries: 40 seed + 34 rules) via illustrative classification fixtures in
   `tests/movement-taxonomy.test.ts`; this is evidence, not production
   enrichment.

## Consequences

- Downstream tasks (MG-04 ingestion, MG-05 identity, MG-06 relationships,
  MG-08 reconciliation, MG-09 persistence, later Companion/localization
  work) consume one canonical vocabulary instead of inventing parallel sets.
- Classification values for actual catalog entries remain FUTURE work
  (pipeline enrichment); nothing in production data changes.
- The `Side-Lying Leg Lift` ambiguity is unaffected (fixtures classify by
  name only; no identity claim).

## Related

- `docs/architecture/MG-02-MOVEMENT-TAXONOMY.md` — full term list + FA/EN maps
- `docs/architecture/MG-01-MOVEMENT-GRAPH-CONTRACT.md` + `adr/0006-movement-graph-domain-contract.md` — the contract this vocabulary closes
- `docs/product/MOVEMENT-INTELLIGENCE-STRATEGY.md` — strategy §1 (field list), §2 (relationships)