# MG-04 — Decision Gate: Upstream Exercise Source Selection + License Approval

> **STATUS: AWAITING OWNER DECISION — PROPOSED (2026-09-01)**
>
> This document prepares the mandatory `OWNER_DECISION_GATE` of `MG-04`
> (`docs/TASKS.md`): source selection + license approval. It evaluates
> viable exercise dataset/source candidates against AHF requirements using
> the MG-03 provenance contract (`docs/architecture/MG-03-SOURCE-PROVENANCE.md`)
> as the legal gate.
>
> **Nothing here authorizes MG-04.** The decision below selects and licenses
> the source; starting MG-04 implementation requires a SEPARATE explicit
> Owner instruction after this gate closes.
>
> **Nothing was ingested, downloaded, or executed against any dataset.**
> This is analysis only (public metadata + license texts). Research date:
> 2026-09-01/02. Licenses change — the MG-04 implementation MUST re-verify
> the selected snapshot's license at ingest time.

## 1. Evaluation criteria (per the governing task direction)

| # | Criterion | Gate | Notes |
|---|---|---|---|
| 1 | **Legal importability (data)** | MG-03 fail-closed | permissive/attribution importable; copyleft/share-alike/NC/ND/**unknown** rejected |
| 2 | **Data AND media licensing** | MG-03 | **media chain-of-title is the hidden risk** — "dataset is free" ≠ "images are cleared" |
| 3 | **Self-hosting** | strategy §6 | downloadable + rehostable (no API runtime dependence, no ToS redistribution ban) |
| 4 | **Coverage / quality** | — | breadth + correctness vs the 74-entry canonical catalog needs |
| 5 | **Structured metadata** | MG-01/02 | fields map to `MovementObject` taxonomy/instructions/provenance |
| 6 | **Updateability** | — | maintained, versioned, snapshot-pinnable |
| 7 | **Movement Graph compatibility** | MG-01/02 | expressible in the MG-01 contract + MG-02 closed vocabulary |
| 8 | **FA localization potential** | MG-07 | none provide FA — FA stays provisional (GATE A) regardless |

## 2. Candidate assessment (evidence)

### 2.1 yuhonas/free-exercise-db — **Recommended primary (data + source)**
- **License:** `LICENSE.md` = **Unlicense** (public domain dedication) —
  GitHub license metadata `spdx_id: Unlicense` (verified 2026-09-01).
  MG-03 classification: `permissive` → **importable**.
- **Data:** 800+ exercises (JSON per exercise, JSON Schema-validated:
  `id, name, force, level, mechanic, equipment, primaryMuscles,
  secondaryMuscles, instructions, category, images`).
- **Media:** ~2,600 image files bundled IN the repo (self-hostable). ⚠️
  **Images trace to the older wrkout/exercises.json lineage whose images
  were never explicitly licensed** — an independent 2026 audit (repdb.co)
  flags this as THE risk for commercial use (see §4 Risks).
- **Self-hosting:** ✅ plain files via raw.githubusercontent; no hotlink
  protection; no ToS redistribution ban (Unlicense).
- **Updateability:** ✅ actively maintained (pushed 2026-08-30), ~1.8k
  stars; snapshot-pinnable by commit SHA for stable provenance.
- **Metadata quality:** strong schema; ~"force/mechanic/equipment" nullable
  on some entries (documented gaps); English only; image styles
  inconsistent (stitched from multiple sources).
- **MG mapping:** muscles ✓(MG-02), equipment ✓(MG-02), instructions ✓,
  force/mechanic → movement-pattern hints (MG-02), level → `DifficultyTier` ✓.

### 2.2 RepDB/exercise-dataset free tier — **Recommended alternative / media-safe option**
- **License:** custom attribution license (`LICENSE-DATA.md`): free for
  personal + **commercial in-app use with attribution** ("Exercise data by
  RepDB (repdb.co)"); ⚠️ terms: no redistribution "as a dataset", no
  generative-AI derivation, premium-samples evaluation-only.
  MG-03 framing: attribution-class importable **by explicit Owner approval**
  (the classifier today returns `unknown` for the custom id — the gate IS
  that approval, mirroring the CC-BY treatment; our catalog is a curated
  transformed in-app catalog, not a repackage/re-sale of RepDB as a
  dataset — interpretation to be owned by the Owner).
- **Data:** 601 exercises JSON: `id, name_en/de/es, description, instructions,
  tips, category, force_type, mechanic, difficulty (beginner/intermediate/
  advanced — maps DIRECTLY to our `DifficultyTier`), equipment,
  body_part, primary/secondary_muscles, goals, tags (e.g. knee_safe → MG-02
  constraint hints), met, is_unilateral/is_bodyweight (→ symmetry), images`.
  Multilingual EN/DE/ES (no FA).
- **Media:** ✅ **flat 512×512 WebP illustrations CLEARED for commercial
  in-app use** (start/peak poses) — the one candidate whose images have a
  clean chain of title.
- **Self-hosting:** ✅ files (ZIP / GitHub); no API, no rate limits.
- **Updateability:** ✅ actively maintained (2026 blog/docs activity).

### 2.3 wrkout/exercises.json — Superseded data-only alternative
- **License:** `spdx_id: Unlicense` (verified). Public-domain JSON.
- Less structured (folder-per-exercise `exercise.json`), no bundled media
  in the free repo (images/videos live in the paid wrkout.xyz product);
  last push 2025-02 (stale). free-exercise-db is its restructured,
  maintained superset → **ranked below 2.1**.

### 2.4 wger-project/wger (direct database/API) — NOT recommended (audit-required)
- **License:** software AGPL-3.0; the exercise **data is CC-BY-SA 3.0**
  ("licensed additionally under one of the Creative Commons licenses, see
  the individual exercises") — **mixed/per-exercise**.
  MG-03 classification: CC-BY-SA = `restrictive` → **NOT importable** under
  fail-closed rules without an item-level license audit of every record.
- **Media:** user-uploaded images on a live CDN → unclear rights + runtime
  dependence (violates self-hosting unless snapshotted and audited).
- Verdict: only with a per-record audit; high burden; rejected for now.

### 2.5 Rejected — proprietary/API-fenced (fail-closed on redistribution)
| Candidate | Why rejected |
|---|---|
| **MuscleWiki API** | Paid API; license "limited, non-exclusive, non-transferable, non-sublicensable, **revocable**" → cannot self-host/redistribute; runtime API dependence |
| **API-Ninjas / RapidAPI ExerciseDB** | Proprietary ToS restricting redistribution + offline bundling/caching; metered API |
| **Kaggle/GitHub scraped "free" datasets** | License often unspecified; **image provenance unknown** — "dataset is free ≠ images are cleared" |
| **ExRx.net etc.** | Proprietary content |

## 3. Ranked recommendation

| Rank | Source | Data license | Media posture | Verdict |
|---|---|---|---|---|
| **1** | **free-exercise-db** (yuhonas) | Unlicense → importable | bundled, ⚠️ chain-of-title audit required | **Primary data + source**; snapshot-pin a commit SHA |
| **2** | **RepDB free tier** | Attribution (Owner-approved) | ✅ cleared for commercial in-app use | **Media-safe alternative / image supplement + difficulty/symmetry/MET richness** |
| 3 | wrkout/exercises.json | Unlicense | none bundled | superseded by #1 |
| 4 | wger direct | CC-BY-SA (restrictive) | ⚠️ user-uploaded | audit-required; not now |
| 5 | MuscleWiki / API-Ninjas / scrapes | proprietary / unknown | proprietary | **rejected** (self-hosting violation) |

**Recommended posture:** adopt **free-exercise-db as the primary upstream
source** (Unlicense data, snapshot-pinned, per-entry provenance recorded
per MG-03), and **gate media separately**: MG-04 ingests data + includes an
**image chain-of-title audit step**; images failing the audit default to
exclusion (media remains optional until MG-07 media architecture), with
**RepDB free tier approved as the cleared-image fallback** (attribution
credits). This keeps the legal floor on anything we ever SHIP while making
the data-layer decision today.

## 4. Risks

1. **free-exercise-db image chain-of-title (HIGH, media only):** upstream
   wrkout photos were never explicitly licensed for redistribution; the
   maintainer's Unlicense dedication covers his own work, not necessarily
   the photos. **Mitigation:** MG-04 image audit (hash + entry-level review)
   + Owner rule: ship no image whose chain of title fails; fall back to
   RepDB images or defer media to MG-07. Data layer unaffected.
2. **RepDB attribution + no-dataset-redistribution interpretation (MEDIUM):**
   our Movement Graph is a curated transformed in-app catalog (not a
   repackage of RepDB as a dataset) — consistent with "in-app use", but the
   Owner must explicitly accept the interpretation and the visible
   attribution credits (product/About surface — a Legal/TS surface change
   later, TS-01/TS-05 family).
3. **Mixed wger lineage (MEDIUM, only if #1-chosen-for-data):** free-exercise-db
   claims Unlicense; wger (an upstream ancestor of the lineage) says data
   CC-BY-SA. The JSON text is short factual data (names/muscle lists —
   arguably thin copyright), and BOTH free-exercise-db and wrkout dedicate
   it as public domain; **recorded as residual uncertainty** — RepDB's audit
   treats the JSON as clean ("the JSON is clearly Unlicense") while
   flagging images only. Accept data-layer risk with provenance recorded.
4. **No Persian corpus (LOW):** every candidate is EN-only (+DE/ES for
   RepDB); FA stays provisional per GATE A; MG-07 handles localization.
5. **Snapshot drift (LOW):** pin commit SHA at ingest; upgrades = deliberate
   governed re-ingest with new provenance entries.

## 5. Exact Owner decision required

1. **Select the primary upstream source** for MG-04:
   - **(A) free-exercise-db (Unlicense)** — recommended primary;
   - (B) RepDB free tier (attribution) — media-safe alternative;
   - (C) both (A data + B as cleared media fallback);
   - (D) wger (per-record CC audit) — not recommended;
   - (E) defer MG-04 source selection.
2. **Approve the license treatment**: Unlicense data as `permissive`
   (MG-03) AND/OR RepDB custom terms as an Owner-approved `attribution`
   class (incl. the visible "Exercise data by RepDB" credits + the
   no-dataset-redistribution interpretation).
3. **Media posture**: (i) accept free-exercise-db images subject to the
   MG-04 image audit (risk accepted); (ii) use RepDB cleared images
   instead; (iii) data-only now, media deferred wholly to MG-07.

After the decision is recorded, MG-04 (ingestion architecture) remains
NOT STARTED — it starts only on the Owner's next explicit instruction.

## 6. Evidence

- `LICENSE.md` @ yuhonas/free-exercise-db — Unlicense text (fetched 2026-09-01)
- GitHub API: free-exercise-db `spdx_id: Unlicense`, pushed 2026-08-30, 1.8k stars; wrkout `spdx_id: Unlicense`, pushed 2025-02
- free-exercise-db README (schema, bundled images, wrkout lineage credit)
- wrkout/exercises.json README (public-domain claim; images/videos in the paid product)
- wger readthedocs / GitHub — "initial exercise and ingredient data … CC-BY-SA 3.0 / under one of the Creative Commons licenses"
- RepDB/exercise-dataset README + `LICENSE-DATA.md` summary (601 exercises; attribution; no-dataset-redistribution; no gen-AI)
- Independent license audit: RepDB blog "Free Exercise Dataset Licenses: Which Are Safe to Ship?" (2026-06) — free-exercise-db JSON clean (Unlicense), **images = chain-of-title risk**
- MG-03 classification is reproducible in-repo: `classifyLicense('Unlicense')`
  → `permissive` (importable); `classifyLicense('CC-BY-SA-4.0')` →
  `restrictive` (not importable)