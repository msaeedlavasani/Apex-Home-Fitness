# MG-05 — Normalization / Deduplication / Identity Resolution

- **Task:** MG-05 — P0 — `CODE_NO_DEPLOY` (no Production/DB/UI change)
- **Status:** ACTIVE 2026-09-01 (DELIVERED on merge)
- **Dependencies:** MG-04 (ingestion pipeline) — consumes its inbound names; builds on MG-01/MG-02/MG-03 contracts
- **Architecture gate:** `NONE` (per `docs/TASKS.md` MG-05 row — no ADR is required for this task; the design decision record is this document)
- **Owner decision gate:** ambiguous identities are surfaced in a report; resolution decisions are Owner-deferred

## 1. Scope

Implements the **normalization and identity-resolution stages** of the governed
ingestion pipeline as a pure, deterministic, framework-independent module
(`src/lib/movement/identity.ts`), following the proven S02-E classifier pattern
(`scripts/gateway-db-ops/lib/classify.mjs`). It is the MG-05 stage declared by
MG-04 as "exact-match only by design; the deterministic fuzzy classifier is
MG-05 scope".

## 2. Design

### 2.1 Stage A — FA/EN name normalization (deterministic)

- **EN names** reuse the established S02-A `normalizeExerciseName`
  (trim → lowercase → whitespace collapse → punctuation normalization).
- **FA names** (`hasFaScript`) take a new Persian normalizer `normalizeFaName`:
  - Arabic → Persian canonical letter forms: ي/ى→ی, ك→ک, أ/إ/آ→ا, ة→ه;
  - strips Arabic diacritics (U+064B–U+0653) and tatweel (U+0640);
  - preserves ZWNJ (U+200C) but de-spaces it — spacing around the joiner never
    splits an otherwise identical name;
  - trims, collapses whitespace, lowercases.
- No invented knowledge: normalization only changes *form*, never meaning.

### 2.2 Stage B — deterministic fuzzy tier (report-only)

- `levenshteinDistance` (plain DP) + `similarityScore ∈ [0,1]` — pure,
  order-independent, and identical for identical inputs.
- `fuzzySuggestions(normalized, catalog)` ranks canonical names + aliases by
  score DESC then name ASC, capped (`minScore` default 0.75, `maxResults`
  default 5). No randomness; deterministic tie-breaks.
- **Fail-closed:** fuzzy matches are SUGGESTIONS ONLY — the classifier never
  promotes a fuzzy hit to a resolution (`slug` stays absent). This preserves
  the S02-E lesson: identity is decided by exact evidence, not similarity.

### 2.3 Stage C — classification (S02-E precedence)

`classifyMovementName(name, catalog = CANONICAL_CATALOG)`:

| Class | Meaning | Decision |
|---|---|---|
| `AUTO` | exact normalized canonical name | `APPLY` |
| `ALIAS` | exact normalized alias | `APPLY` |
| `AMBIGUOUS` | normalized input matches >1 distinct catalog entry | `SKIP_AMBIGUOUS` — candidates surfaced, NEVER picked |
| `UNRESOLVED_WITH_SUGGESTIONS` | no exact match; fuzzy tier found ≥ minScore | `SKIP_UNRESOLVED` — suggestions are evidence |
| `UNRESOLVED` | no exact match; fuzzy tier below threshold | `SKIP_UNRESOLVED` |

Determinism contract: same input ⇒ same output (sorted collections, no
environment dependence, no randomness). Regression: `Side-Lying Leg Lift` ⇒
`AMBIGUOUS` with candidates `side-kick-side-leg-lifts` + `side-lying-leg-lift`
(the S02-E Production row ambiguity — preserved, never resolved).

### 2.4 Stage D — batch dedup

`findDuplicateNames(names)` groups distinct raw names that normalize to the
same form and reports the group. Duplicates are **evidence, never silently
collapsed** — the report names every distinct raw form.

### 2.5 Stage E — classification report (S02-E evidence model)

`buildIdentityReport(names)` returns:

- `rows` — input order preserved, each with `{ name, classification, decision }`;
- `counts` — per-class tallies;
- `duplicates` — dedup groups;
- `collisions` — canonical slugs claimed by >1 distinct row
  (the S02-E BLOCKED_COLLISION model);
- `ambiguous` — the Owner-decision surface (name, normalized name, candidates);
- `fuzzySuggestions` — every emitted suggestion (flattened evidence).

`verifyIdentityReport(report)` asserts the invariants: AUTO/ALIAS rows APPLY
with a slug; AMBIGUOUS rows never APPLY; UNRESOLVED\* rows never APPLY; a
collided slug never yields two APPLY rows; counts equal row count. Status is
`PASS` only when every invariant holds.

## 3. Integration with the pipeline (MG-04)

The identity stage is exported from `src/lib/movement/index.ts` alongside the
MG-04 pipeline surface. Its natural pipeline placement:

```
pinned snapshot → parse (MG-04) → normalize (MG-05 A) → classify (MG-05 C)
→ build report (MG-05 E) → [Owner resolves AMBIGUOUS] → taxonomy (MG-04)
→ provenance (MG-03) → MovementObject (MG-01)
```

The exact-match `resolveIdentity` (MG-04) remains the pipeline's conservative
identity hook; `classifyMovementName` is the superset classifier for batch
evidence (dedup + collisions + fuzzy suggestions) intended for MG-08 catalog
reconciliation. Name-level dedup/collision evidence feeds the future MG-05
integration point; no Production write exists anywhere in this stage.

## 4. Acceptance criteria — evidence

- Classifier deterministic — covered by the two-runs-deepEqual tests.
- AMBIGUOUS ⇒ report entry, never auto-resolve — `Side-Lying Leg Lift` test.
- Regression — 22 unit tests incl. the S02-E case.
- No Production/DB/UI change; no deployment. `RUNTIME_BEHAVIOR_CHANGED = NO`
  (nothing in the application imports this module yet).

## 5. Open items (unchanged by MG-05)

- `Side-Lying Leg Lift` ambiguity remains **unresolved** (Owner decision from
  S02-E preserved; structural resolution is MG-08 scope).
- `EXERCISE-CATALOG-DISAMBIGUATION-01` remains PROPOSED / absorbed into MG-08.