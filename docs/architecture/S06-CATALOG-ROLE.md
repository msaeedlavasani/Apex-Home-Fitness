# S-06 — Exercise Library / Catalog Role (Decision Record)

> **STATUS: DECIDED / DOCS-ONLY — 2026-09-01.** Executed under
> STABILIZATION BATCH S06+S05 (owner authorization). No code changed.
> Input to the S-02 design review; must complete before any post-GATE-A
> schema work.

## 1. The question (R-09)

What is the architectural role of the current exercise library/catalog?
What is canonical vs sample/demo — so future media/library work is built on
the right foundation?

## 2. On-disk evidence

| Surface | What it is | Role today |
|---|---|---|
| `src/lib/exercise/catalog.ts` + `contracts.ts` (S02-A) | Source-controlled, pure SYSTEM exercise catalog: stable slugs, canonical display names, aliases (verified variants only), `faName` deliberately absent (no Persian corpus) | **CANONICAL identity/metadata source** |
| DB `Exercise` table (GATE A GA-03) | Persisted exercise rows; `slug`/`faName` additive nullable (S02-B); resolution layer links names → canonical rows | **CANONICAL persisted ids** |
| `src/app/[locale]/library/ExerciseLibraryPage.tsx` | Client page: hardcoded `EXERCISES` array ("Sample catalog — demo streams (public, CORS-enabled). Swap `videoSrc` for real assets") + demo HLS/mp4 streams (mux.dev, Google Cloud Storage) | **SAMPLE / DEMO presentation layer** |
| `docs/ASSETS.md` | Exercise Library demo catalog uses two external demo origins, explicitly allowlisted for demo use | Confirms demo posture |

## 3. Decision

1. **Canonical exercise identity + metadata = `src/lib/exercise/catalog.ts`
   (+ contracts).** Persisted ids are owned by the DB (`Exercise`), per
   GATE A GA-03. This is the architectural source of truth; every future
   catalog build-out, media mapping, and exercise-related feature must
   derive from it.
2. **The Exercise Library page is a SAMPLE/DEMO presentation layer.** Its
   hardcoded `EXERCISES` array is illustrative (ids mirror catalog slugs by
   convention, not by linkage), and its media are DEMO streams (per
   `ASSETS.md`). It is NOT canonical.
3. **No new exercises, categories, metadata, or media enter the product
   through the library page's hardcoded array.** New content must go through
   the catalog module (and DB rows for persisted ids) with a real media
   pipeline.
4. **Unification is future, bounded work** (not authorized here): re-drive
   the library page from catalog data + real assets; until then the page's
   sample content stays clearly labelled as demo (already the case in code
   comments and `ASSETS.md`).
5. **Constraint on later schema work:** any post-GATE-A schema/media work
   may only treat catalog/DB-backed content as canonical; the demo library
   array never becomes a schema/media source.

## 4. Impact

- Code: **none** (decision only).
- Schema/runtime/compat: none.
- Tests: n/a.
- Rollback: n/a (documentation decision).

## 5. Acceptance

- Decision recorded (this document), reflected in `docs/INDEX.md` (catalog
  row) and `docs/TASKS.md` (registered decision row).
- Scope of a future library task bounded to: catalog-driven content + real
  media pipeline; no build-out now.
