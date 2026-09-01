# Apex Home Fit — Movement Intelligence Strategy

> **STATUS: PROPOSED / NON-EXECUTABLE**
>
> This is the **deeper specialist strategy** for movement intelligence — the
> Apex Movement Graph / Exercise Intelligence Library. It deepens pillar A of
> the parent/master strategy
> [`PRODUCT-STRATEGY.md`](PRODUCT-STRATEGY.md), which remains the
> comprehensive product strategy.
>
> **Nothing here authorizes implementation.** The ONLY executable backlog
> authority is [`../TASKS.md`](../TASKS.md). Exercise Library / Movement Graph
> rebuilding is a top future product priority, but it is NOT authorized yet.
>
> AHF remains **execution-frozen** for everything in this document (see the
> freeze section of the parent strategy).
>
> Persisted: 2026-09-01 (docs/governance-only persistence task; no code, DB,
> infrastructure, or Production change).

---

## 1. Movement Graph — more than an exercise table

The Apex Movement Graph is a **self-hosted canonical movement knowledge
system** in which exercises eventually become **related movement knowledge
objects** — not flat table rows.

The Movement Graph should ultimately support:

- broad curated exercise coverage;
- canonical Apex exercise identities;
- stable internal IDs;
- names and aliases;
- movement taxonomy;
- primary/secondary muscles;
- movement patterns;
- equipment;
- difficulty;
- impact;
- unilateral/bilateral properties;
- home suitability;
- relevant movement constraints;
- instructions;
- common mistakes/form cues where supported;
- progression relationships;
- regression relationships;
- substitution/alternative relationships;
- provenance/source metadata;
- catalog versioning;
- FA/EN localization;
- validated/self-hosted required media.

## 2. Relationship model

Exercises are nodes in a knowledge graph. Future relationship types include:

- **Progression** — harder variants/next steps of a movement;
- **Regression** — easier variants/entry points of a movement;
- **Substitution / alternative** — functionally similar movements usable in
  place of each other (equipment, impact, or constraint driven).

These relationships are what enable the Adaptive Training Graph and the
Companion to make **contextual** progression/regression/substitution decisions
later.

## 3. Governed ingestion & enrichment pipeline

Future rebuilding follows a governed pipeline (conceptually):

```
External permitted sources
        ↓
Ingest
        ↓
Normalize
        ↓
Deduplicate
        ↓
Identity resolution
        ↓
Apex canonical taxonomy
        ↓
Relationship enrichment
        ↓
Localization
        ↓
Media validation/self-hosting
        ↓
Quality/curation
        ↓
Versioned Apex Movement Graph
        ↓
Production adoption through governed migration
```

**Do NOT execute this pipeline now.**

## 4. Identity resolution — the S02-E lesson preserved

Identity resolution must be **fail-closed and never guess**.

Preserved from the completed S02-E lifecycle (CLOSED / PRODUCTION_ACCEPTED,
2026-09-01):

- The Production row **`Side-Lying Leg Lift`** (id `cmtdmzmw80008k101j3a2gd2z`)
  remains **intentionally unmapped** due to the recorded seed-catalog alias
  ambiguity — candidates `side-kick-side-leg-lifts` (`Side Kick (Side Leg
  Lifts)`, alias match) and `side-lying-leg-lift` (`Side-Lying Leg Lift`,
  exact-name match), caused by the alias `side-lying leg lift` being declared
  on both entries.
- It must NOT be resolved or guessed during this task.
- The deferred proposal **`EXERCISE-CATALOG-DISAMBIGUATION-01`**
  (PROPOSED / NOT AUTHORIZED in `../TASKS.md`) preserves this state.
- Future catalog reconciliation **may supersede/resolve** this ambiguity when
  sufficient movement context exists.

This case is the canonical example of why identity resolution must surface
ambiguity rather than pick a winner.

## 5. Current Production records are not canonical

- Current Production exercise records are **seed/legacy data, NOT an immutable
  final catalog**.
- Existing slugs are not permanently canonical merely because they are
  currently valid.
- All current seed records should eventually pass through **catalog
  reconciliation** against the rebuilt Movement Graph.

## 6. Self-hosting / resilience

- Core fitness functionality must not depend at runtime on third-party
  exercise APIs.
- Third-party datasets/APIs may serve as **upstream import/enrichment
  sources** where legally/operationally appropriate, but must not become
  runtime sources of truth.
- The Apex canonical catalog must be **controlled/self-hosted**; required
  exercise media must be **validated and self-hosted** or otherwise available
  through infrastructure satisfying the resilience requirement.
- Loss of upstream connectivity must not break core workout execution.

## 7. Governance posture

- This is **strategic direction only** — PROPOSED / NON-EXECUTABLE.
- Any future Movement Graph implementation requires explicit Owner
  authorization and promotion through the canonical executable backlog
  (`../TASKS.md`), with governed migration for Production adoption.
- See the parent strategy for the full execution freeze and governance
  relationship.
