# ADR-0009: Governed Ingestion Pipeline (MG-04)

> **STATUS: ACCEPTED — 2026-09-01**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `MG-04` (Ingestion architecture, delivered 2026-09-01;
> pipeline: `src/lib/movement/ingest.ts` + `scripts/mg04-ingest-dry-run.ts`;
> document: `docs/architecture/MG-04-INGESTION-PIPELINE.md`; decision gate:
> `docs/architecture/MG-04-DECISION-GATE-SOURCE-SELECTION.md` §7; view in
> `docs/TASKS.md`)
>
> **Execution gating:** this ADR ratifies the pipeline ARCHITECTURE and the
> source selection. It does NOT authorize Production ingestion, any DB
> write, or media import. The pipeline runs dry-run/evidence-only until a
> governed adoption task (MG-08/MG-09) is separately authorized.

## Context

Strategy §5 requires a governed ingestion & enrichment pipeline from
external permitted sources to a versioned Movement Graph, with identity
resolution that is fail-closed (the S02-E lesson: surface ambiguity, never
guess). The MG-04 decision gate (closed 2026-09-01) selected
`yuhonas/free-exercise-db` (Unlicense) as the primary upstream source with
a DATA-ONLY media posture. Without a ratified pipeline architecture, future
ingestion work would invent per-source formats and bypass the legal and
identity gates established by MG-01…MG-03.

## Decision

1. **Adopt the staged pipeline** (pin → parse → normalize → fail-closed
   identity → MG-02 taxonomy enrichment → MG-03 provenance → MG-01
   MovementObject → versioned evidence report) as the canonical ingestion
   architecture, in `src/lib/movement/ingest.ts` with the dry-run runner
   `scripts/mg04-ingest-dry-run.ts`.
2. **Sources are snapshot-pinned**: ingest always binds a commit SHA +
   license, recorded in provenance per entry; upgrades are deliberate
   governed re-ingests.
3. **Identity is exact-match fail-closed in MG-04**: RESOLVED (one owner),
   AMBIGUOUS (candidates surfaced, never guessed — S02-E), UNRESOLVED
   (preserved, never dropped). The deterministic fuzzy classifier is
   MG-05's scope.
4. **Taxonomy enrichment uses ONLY the MG-02 closed vocabulary** via
   explicit alias maps; unknown terms surface in the report, never guessed.
5. **Provenance is per-entry and auditable** (MG-03): pinned per-file URL,
   Unlicense, sha256 content hash, evidence-based confidence.
6. **DATA-ONLY media posture**: source `images` are excluded; all media
   work is deferred to MG-07. **No Production/DB writes** — dry-run evidence
   only (`RUNTIME_BEHAVIOR_CHANGED = NO`; not wired into application code).

## Consequences

- MG-05 (classifier) extends the identity stage in place; MG-06/07 consume
  the same pipeline hooks; MG-08/09 own reconciliation and persistence.
- The license gate is re-verified at ingest time per MG-03 rules (never
  import on an unknown license).
- The repo vendors only a 34-entry sample fixture; the full 876-entry
  snapshot loads at dry-run time from the pinned URL — no bulk data
  vendoring, no Production ingestion.

## Related

- `docs/architecture/MG-04-INGESTION-PIPELINE.md` — stage detail + evidence
- `docs/architecture/MG-04-DECISION-GATE-SOURCE-SELECTION.md` — closed gate (§7)
- `docs/architecture/MG-03-SOURCE-PROVENANCE.md` + `adr/0008-…` — provenance contract
- `docs/architecture/MG-02-MOVEMENT-TAXONOMY.md` + `adr/0007-…` — taxonomy vocabulary
- `docs/product/MOVEMENT-INTELLIGENCE-STRATEGY.md` §3–5 — pipeline + identity posture