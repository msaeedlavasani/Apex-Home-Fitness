# MG-04 — Governed Ingestion Pipeline (Ingestion Architecture)

> **STATUS: DELIVERED — MG-04 (2026-09-01)**
>
> Task: `MG-04` in [`../TASKS.md`](../TASKS.md) — Ingestion architecture
> (governed pipeline; DEPENDENCIES: MG-02, MG-03; OWNER_DECISION_GATE
> RESOLVED 2026-09-01 — see
> [`MG-04-DECISION-GATE-SOURCE-SELECTION.md`](MG-04-DECISION-GATE-SOURCE-SELECTION.md)).
> Decision record: [`../adr/0009-governed-ingestion-pipeline.md`](../adr/0009-governed-ingestion-pipeline.md).
> Module of Record: `src/lib/movement/ingest.ts`; runner:
> `scripts/mg04-ingest-dry-run.ts`.

## 1. Decision recap (the closed gate)

- **Primary upstream source:** `yuhonas/free-exercise-db` — **Unlicense**
  (MG-03 `permissive` → importable), snapshot-pinned.
- **Media posture: DATA-ONLY** — no media import in MG-04; ALL exercise
  media is deferred to MG-07 (the free-exercise-db image chain-of-title
  risk is thereby avoided entirely).
- **No Production/DB writes**: dry-run + evidence only.

## 2. Pipeline stages (strategy §5, implemented as code)

```
Pinned snapshot (free-exercise-db@a859101… — 876 entries, license re-verified at ingest)
   ↓ 1. PARSE (fail-closed: malformed records rejected with errors)
   ↓ 2. NORMALIZE (reuse S-06 normalizeExerciseName; name + alias keys)
   ↓ 3. IDENTITY (FAIL-CLOSED, exact-match: RESOLVED | AMBIGUOUS | UNRESOLVED)
   ↓ 4. TAXONOMY (MG-02 closed vocabulary via explicit alias maps; unknowns SURFACE)
   ↓ 5. PROVENANCE (MG-03 record: pinned per-entry URL, Unlicense, sha256, confidence)
   ↓ 6. MOVEMENT OBJECT (MG-01 contract; draft ids; localization keys; NO media)
   ↓ 7. VERSIONED OUTPUT → dry-run evidence report (never Production)
   [declared hooks: relationship enrichment = MG-06; localization model + media = MG-07]
```

## 3. Fail-closed identity (the S02-E lesson, first-class)

`resolveIdentity(name)` indexes every canonical name AND alias (normalized):

- **RESOLVED** — exactly one canonical owner (name or alias), e.g.
  `Bodyweight Squat` → `bodyweight-squat`, `Pushups` → `push-up` (alias);
- **AMBIGUOUS** — ≥2 canonical owners; candidates surface in the report,
  NEVER guessed;
- **UNRESOLVED** — no owner; the upstream record is PRESERVED (never
  dropped) with the upstream namespaced slug.

**Evidence from a real dry-run of the pinned 876-entry snapshot
(2026-09-01):** 8 exact RESOLVED · 868 UNRESOLVED · **0 natural
AMBIGUOUS** (the dataset has no cross-owner name collisions). The
S02-E ambiguity is therefore reproduced as a **synthetic regression
fixture** (mirroring the Production `Side-Lying Leg Lift` row — the source
genuinely lacks that name): `Side-Lying Leg Lift` → AMBIGUOUS with
candidates `side-kick-side-leg-lifts` + `side-lying-leg-lift`. The
deterministic fuzzy classifier is **MG-05** scope; this stage is exact-match
by design.

## 4. Taxonomy enrichment (MG-02 vocabulary, explicit maps)

| Upstream → MG-02 token | Examples |
|---|---|
| Muscle map (17): `abdominals→core`, `lats/middle back/upper back→back`, `lower back→lower-back`, direct terms (chest, shoulders, glutes, hamstrings, quadriceps, calves, traps, biceps, triceps, forearms, adductors, abductors) | `lats` → `back` |
| Equipment map (7): `body only→bodyweight`, `bands→resistance-band`, `kettlebells→kettlebell`, `cable→cable-machine`, `e-z curl bar→barbell` (loading class, documented), direct (dumbbell, barbell) | `bands` → `resistance-band` |
| Level map (3): `beginner→beginner`, `intermediate→intermediate`, `expert→advanced` (top-tier interpretation, documented) | `expert` → `advanced` |
| Pattern hints (heuristic, reversible — NOT identity claims): category `stretching→mobility`, `cardio→cardio`, `plyometrics→plyometric`; force `static→isometric-hold`; mechanic `isolation→isolation` | `Plank` → isometric-hold |

**Unknown terms fail closed**: unmapped muscles/equipment are surfaced in
the report (`unknownTaxonomyTerms`), never silently mapped (`equipment:medicine
ball`, `muscle:neck`, …). Symmetry/impact/home-suitability/constraints are
absent in the source and stay absent (knowledge accumulates later).

## 5. Provenance (MG-03, per entry)

Every built object carries `recordProvenance({sourceKind: UPSTREAM_IMPORT,
sourceRef: <pinned per-entry raw URL>, license: 'Unlicense', content:
canonicalEntryJson(entry), confidence})`:

- `sourceRef` = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/<commit>/exercises/<id>.json` — stable, auditable, per-entry;
- `contentHash` = sha256 of the canonical (sorted-key, image-free) entry JSON — deterministic;
- `confidence` = `0.95` (verified evidence) when identity RESOLVED, else `0.7` (UPSTREAM_IMPORT default);
- `ingestedAt` ISO-8601; `versioning.changeNote` = `free-exercise-db@<commit>`.

## 6. Module surface + runner

- `src/lib/movement/ingest.ts` — pure pipeline (parse, normalize, identity,
  taxonomy maps, provenance, orchestration + report types). No network at
  import; `loadSnapshotDocument` takes an injected `fetch` (CLI use only).
- `scripts/mg04-ingest-dry-run.ts` — dry-run runner:
  `node --import tsx scripts/mg04-ingest-dry-run.ts [--source <url|path>] [--limit N] [--out <path>]`;
  **never writes to any database**; output = JSON evidence report.
- Fixture: `src/lib/movement/ingest-fixtures/free-exercise-db-sample.json`
  — a curated 34-entry sample of the pinned snapshot (all 7 categories) for
  tests + offline dry-runs; marked as a sample, not the corpus.

## 7. Boundaries respected (scope guard)

- ❌ No Production/DB writes; no schema change (`DB_SENSITIVITY` future/MG-09);
  dry-run evidence only.
- ❌ No media ingestion (DATA-ONLY decision); `images` excluded.
- ❌ No fuzzy classifier (MG-05), no relationship enrichment (MG-06), no
  localization model / media architecture (MG-07), no catalog
  reconciliation (MG-08), no persistence (MG-09).
- ❌ No runtime wiring — nothing in application code imports
  `src/lib/movement/ingest`; `RUNTIME_BEHAVIOR_CHANGED = NO`.
- ❌ No Source ingestion beyond dry-run: the repo vendors only the 34-entry
  sample fixture; the full 876-entry snapshot is fetched at dry-run time
  from the pinned URL.
- The S02-E `Side-Lying Leg Lift` ambiguity remains unresolved (regression
  fixture asserts AMBIGUOUS — never a guess).

## 8. Architecture gate

Satisfied by this document + [`../adr/0009-governed-ingestion-pipeline.md`](../adr/0009-governed-ingestion-pipeline.md) (ACCEPTED).