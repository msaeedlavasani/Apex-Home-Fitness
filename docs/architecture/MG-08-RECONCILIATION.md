# MG-08 — Catalog Validation + Legacy Seed Reconciliation

- **Task:** MG-08 — P0 — `CODE_NO_DEPLOY`
- **Status:** ACTIVE 2026-09-01 (DELIVERED on merge)
- **Dependencies:** MG-07 — builds on MG-01…MG-07 (MG-05 classifier, MG-03 provenance, canonical catalog)
- **Architecture gate:** `NONE` (per `docs/TASKS.md` MG-08 row — design record is this document, no ADR)
- **Production sensitivity:** `PROD_SENSITIVE` (reads Production seed data) — this task issues a reconciliation REPORT over the source-controlled seed corpus and the recorded S02-E Production evidence; **no Production read/write is performed here** (the live gateway dry-run is server-side; the governed migration is the future execution step, NOT this task)
- **DB sensitivity:** `DATA` (reads; writes only via governed migration — NOT executed in this task)
- **Owner decision gate:** reconciliation mapping decisions — the report surfaces AMBIGUOUS candidates; mapping decisions are deferred to the Owner

## 1. Scope

Implements catalog validation + legacy seed reconciliation
(`src/lib/movement/reconcile.ts`), absorbing the deferred
`EXERCISE-CATALOG-DISAMBIGUATION-01` debt:

- **Catalog validation** — normalized canonical names/aliases are checked for
  collisions across entries (structural findings, never auto-fixed);
- **Legacy seed reconciliation** — every Production seed record passes through
  reconciliation against the canonical catalog: an existing slug is NOT
  assumed permanently canonical; the record's NAME is re-classified
  deterministically (MG-05 classifier) into MAPPED / AMBIGUOUS / UNRESOLVED;
- **Report** — S02-E evidence model (classes/counts/decisions); deterministic;
  the AMBIGUOUS list is the Owner-decision surface.

## 2. Reconciliation model

| Status | Meaning | Decision |
|---|---|---|
| `MAPPED` | name resolves uniquely (AUTO canonical name / ALIAS alias) | carry the canonical slug; existing slug drift reported |
| `AMBIGUOUS` | name matches >1 distinct canonical entry | candidates surfaced; NEVER picked (S02-E lesson) |
| `UNRESOLVED` | no candidate | surfaced for catalog review; never mapped |

Existing slugs are evidence, not authority: `reconcileRecord` re-classifies
the NAME and reports `slugDrift` when the record's existing slug differs from
the reconciled canonical slug.

### 2.1 Catalog validation findings (deterministic)

`findCatalogCollisions` over the canonical catalog (74 entries, S-06 seed +
rules) reports **2 structural alias collisions**:

| Normalized form | Claiming canonical slugs |
|---|---|
| `side-lying leg lift` | `side-kick-side-leg-lifts` (seed alias) · `side-lying-leg-lift` (rules name + alias) |
| `glute bridge` | `glute-bridge-hold` (seed alias) · `glute-bridge` (rules name + alias) |

The `side-lying leg lift` collision is the S02-E Production ambiguity
(candidates surfaced, never guessed). The `glute bridge` collision is the
same structural pattern latent in the seed catalog — both are symptoms of the
seed catalog's alias-overlap (the root cause recorded in
`EXERCISE-CATALOG-DISAMBIGUATION-01`). MG-08 surfaces both; resolving which
entry owns a colliding alias is a **catalog-data decision for the Owner**
(canonical edge/catalog work), not something this engine guesses.

### 2.2 Reconciliation evidence

**Canonical seed corpus** (74 source-controlled records, slug-less):
`MAPPED=72 · AMBIGUOUS=2 (Glute Bridge, Side-Lying Leg Lift) · UNRESOLVED=0`
— the catalog is self-consistent modulo the two known collisions;
verification PASS.

**S02-E recorded Production corpus** (from
`docs/PRODUCTION_CHECKPOINTS.md`, 2026-09-01 — 8 rows backfilled via runtime
generation + the ambiguous row): `MAPPED=8 · AMBIGUOUS=1 · UNRESOLVED=0`.

The single AMBIGUOUS row is the recorded Production row:
`Side-Lying Leg Lift` (id `cmtdmzmw80008k101j3a2gd2z`, slug NULL) →
candidates `side-kick-side-leg-lifts` | `side-lying-leg-lift` — **never
guessed**, exactly matching the S02-E Owner decision to leave it unmapped.

Determinism: identical corpus ⇒ identical report (verified by
`verifyReconciliationReport`: counts sum, MAPPED carries a slug, AMBIGUOUS /
UNRESOLVED never resolve).

## 3. EXERCISE-CATALOG-DISAMBIGUATION-01 — absorbed

The deferred proposal is **superseded by MG-08** (traceability preserved in
`docs/TASKS.md` PROPOSED section):

- The alias collision is a symptom of the seed catalog's alias-overlap; the
  reconciliation engine now surfaces it structurally and deterministically
  (collision list + AMBIGUOUS rows) instead of leaving it as a floating
  proposal;
- The `Side-Lying Leg Lift` ambiguity remains **unresolved by design** — the
  engine reports it AMBIGUOUS with candidates; the mapping decision belongs
  to the Owner through the governed migration path below;
- No canonical-catalog data was changed (no alias removed, no entry merged)
  in this task.

## 4. Governed DB migration plan (NOT executed in this task)

Adopting the reconciled catalog in Production requires a separate governed
lifecycle (this task only produced the report + engine). The plan:

1. **Read-only Production dry-run** via the gateway `db-operation` capability
   (`docs/PRODUCTION_DEPLOYMENT_GATEWAY.md` §db-operation — the S02-E
   pattern) over the real Production `Exercise` table, producing
   reconciliation evidence with a `report_sha`.
2. **Owner review of the AMBIGUOUS/UNRESOLVED surface** — mapping decisions
   for `Side-Lying Leg Lift` (and any other surfaced row) are Owner-decided,
   never guessed by the engine.
3. **Governed apply** (new allowlisted gateway db-operation when authorized):
   mandatory pre-mutation backup, dry-run-evidence binding, idempotent slug
   writes, post-apply verification, rollback restore.
4. **Catalog-data reconciliation** (alias ownership) rides a future canonical
   catalog/Movement Graph data task when the Owner authorizes it.

None of steps 2–4 happened in MG-08.

## 5. Acceptance criteria — evidence

- Every reconciliation record has MAPPED / AMBIGUOUS / UNRESOLVED — engine +
  report; canonical corpus 74/74 with 0 UNRESOLVED; recorded corpus 9/9.
- `Side-Lying Leg Lift` surfaced with candidates, never guessed — regression
  test (candidates `side-kick-side-leg-lifts` | `side-lying-leg-lift`).
- Report deterministic — two-runs deepEqual test + verification PASS.
- Governed DB migration plan exists — §4 above.
- 14 new unit tests. No Production/DB/UI change; no deployment.
  `RUNTIME_BEHAVIOR_CHANGED = NO` (nothing in application code imports these
  modules yet).

## 6. Open items (unchanged)

- `Side-Lying Leg Lift` ambiguity remains unmapped in Production (Owner
  decision S02-E preserved; structural catalog resolution deferred).
- Live Production corpus read (gateway dry-run) remains server-side; the
  engine accepts any seed-record corpus so the future dry-run can feed it
  unchanged.