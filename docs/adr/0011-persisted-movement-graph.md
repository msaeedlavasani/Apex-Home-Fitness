# ADR-0011: Persisted Movement Graph + governed adoption

> **STATUS: ACCEPTED**
>
> **Date:** 2026-09-01

## Context

The Movement Graph is the candidate Apex moat: the closed-loop knowledge
across **User ↔ Movement ↔ Workout ↔ Observation ↔ Outcome ↔ Adaptation**
(product strategy). MG-01..MG-08 established the Movement Graph as pure
type-level knowledge (identity, taxonomy, provenance, relationships, media,
localization, reconciliation) with **no persistence and no runtime wiring**.
MG-09 owns the governed Production adoption: additive tables, data migration
from the reconciled catalog, and the runtime switchover.

The Production database is governed: mutations require the gateway
`db-operation` contract (read-only dry-run evidence → explicitly authorized
apply, with mandatory pre-mutation backup and before/after DB hash) and the
`OWNER_DECISION_GATE` recorded in the task contract. Docker is unavailable in
the execution workspace, and the gateway is server-side/root-only — so this
record accepts the architecture; the Production apply itself stays gated.

## Decision

1. **Additive persistence**: new `Movement`, `MovementRelationship`,
   `MovementMedia` tables mirroring the MG-01 contract. `Movement.exerciseId`
   is the unique FK link back to the legacy `Exercise` row, preserving every
   existing exercise reference. No existing table is altered (the
   `Exercise.movement` back-relation is client-side only). Relationship/media
   rows reference movements by canonical slug — never resolved at schema time
   (MG-01 §2.4).
2. **Governed data migration**: a new allowlisted gateway operation
   `mg09-movement-graph-adopt` rebuilds the plan from the MG-08
   reconciliation engine; dry-run evidence → evidence-SHA-gated apply;
   idempotent upserts; AMBIGUOUS/UNRESOLVED rows never guessed or mapped.
3. **Fail-safe runtime switchover**: a store with an adoption gate
   (`isMovementGraphAdopted`) — the session exercise resolution serves from
   the Movement Graph when adopted and keeps the exact legacy behavior when
   not adopted. This makes the code deployable before the DB adoption
   without breaking Production.

## Alternatives considered

- **Full Prisma relation wiring between all graph tables** — richer
  referential integrity, but violates the contract's "never resolved at
  schema time" rule for edges and adds coupling; slug references keep the
  persisted graph contract-faithful and insertion-order-independent.
- **One giant `Movement` table with embedded edges/media JSON** — simpler, but
  loses queryability of edges/media and the graph's shape; child tables match
  the persisted-graph model.
- **Immediate runtime switchover (no gate)** — rejected: it would break
  Production before the migration+data migration are applied. The adoption
  gate is the safe expand-style switchover.
- **Backfill into `Exercise.slug` only (no new tables)** — S02-E's scope;
  does not deliver a persisted Movement Graph (the moat surface).

## Consequences

- Positive: the Movement Graph becomes queryable/versionable knowledge;
  existing references are preserved; the runtime switchover is safe and
  reversible; the S02-E fail-closed lesson is preserved end-to-end.
- Negative / trade-offs: one extra adoption gate to reason about; JSON
  columns carry rich shapes (validated in code by the pure domain modules);
  the Production apply remains a separate, gated step.
- Documentation updated to match (Documentation With Change):
  `docs/architecture/MG-09-PERSISTED-STORAGE.md`, `docs/INDEX.md`,
  `docs/adr/README.md`, `docs/TASKS.md`, `docs/CURRENT_STATE.md`.

## Supersedes / Superseded by

- Supersedes: none (MG-01..MG-08 records remain in force; this is the
  persistence layer they anticipated).
- Superseded by: none.