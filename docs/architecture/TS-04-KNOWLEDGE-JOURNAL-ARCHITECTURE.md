# TS-04 — Knowledge / Journal Architecture

> **STATUS: DELIVERED / CLOSED — 2026-09-03**
>
> Decision: [`adr/0015-knowledge-journal-architecture.md`](../adr/0015-knowledge-journal-architecture.md).
> Docs-only task (`DOCS_ONLY`): architecture + content model + authoring
> workflow. No Blog/CMS/pages, no content authoring, no migration, no
> implementation (strategy §10: "Do NOT implement Blog/CMS/pages now").

## 1. Purpose and position

The future Blog/Journal is part of Apex's **product knowledge architecture**
— connected to the canonical movement knowledge layer, not an isolated SEO
blog. Conceptual position (`PRODUCT-STRATEGY.md` §10):

```text
Movement Graph          ← canonical movement knowledge (MG-01…MG-09)
  ↕
Exercise Pages          ← per-movement public surfaces (future TS-05+)
  ↕
Educational Content     ← technique, education, mistakes, progression,
  ↕                        mobility, recovery, home fitness, evidence
Workout Programs        ← program-level content driven by the graph
  ↕
Companion               ← guidance surfaces consuming the same knowledge
```

Knowledge assets deepen the moat: they are **expression of movement
knowledge**, feeding discovery, education, and the Companion — never a
parallel content silo.

## 2. Content model (design)

`KnowledgeItem` — one unit of educational content, anchored to the graph.
Field groups and their governing contracts:

| Group | Fields (design) | Governing contract |
|---|---|---|
| Identity | `contentId` (durable), `slug` (kebab, resolution anchor), content kind | S-02 identity discipline (never display names as identity) |
| Movement anchoring | typed refs to movement knowledge objects (slug/id); optional relationship-kind context (`progression`/`regression`/`substitution` — MG-06) | MG-01/MG-06 refs |
| Content areas | closed topic set: `exercise-technique`, `movement-education`, `common-mistakes`, `progressions-regressions`, `mobility`, `recovery`, `home-fitness`, `workout-education`, `evidence-informed` | MG-02-style closed vocab discipline |
| Body | localized blocks keyed by the MG-07 localization grammar | MG-07 keys + FA/EN corpus discipline (no invented Persian) |
| Media | self-hosted assets with content hashes + fallbacks | MG-07 media manifest (no third-party CDN for required media) |
| Provenance / evidence | source refs + license posture + confidence for evidence-informed claims | MG-03 provenance/confidence |
| SEO/discovery (derived) | metadata generated from content + validated user intents | separate concern — discovery, not purpose |

Structural rule: a `KnowledgeItem` **cannot exist without at least one
movement ref or validated user intent** — no standalone orphan articles.

## 3. Rendering pipeline (design)

- **Locale-aware SSR** pages on the existing design system (`en`/`fa`,
  RTL/LTR, Vazirmatn/Inter) — the localization architecture already in the
  product (next-intl catalogs, `dir` handling).
- **Interlinking is derived from the graph**: exercise pages link technique /
  mistakes / progression articles via the item's movement refs; articles
  link related movements via MG-06 relationships. No hand-maintained link
  tables.
- **Catalog/landing surfaces** (beginner home training, no-equipment,
  dumbbell, low-impact — validated intents only) are derived views over the
  movement taxonomy + coverage; SEO metadata is generated, never the reason
  content exists.
- Rendering consumes content through pure read models (same discipline as
  the adaptive loop contracts) — implementation deferred.

## 4. Content authoring workflow (design)

1. **Movement-first**: a content item starts from a movement knowledge
   object (technique/mistakes/progression for movement X) or a validated
   user intent (a discovery area with real demand).
2. **Contracts enforced at authoring time**: localization keys valid (MG-07
   validator), media self-hosted + hashed, provenance present for
   evidence-informed claims, FA text only from a real corpus (GATE A).
3. **Review gate**: human/owner review for medical/safety-adjacent wording —
   the TS-01 safety boundary ("fitness guidance, not medical diagnosis")
   applies to all knowledge content.
4. **No CMS in this task**: authoring surfaces/tooling are future work.

## 5. Discovery / SEO posture

Discovery is **supported but not the purpose**: content earns placement
through movement knowledge and validated user intents; SEO metadata is
derived at render time. Landing surfaces are only built for validated user
intents (never speculative keyword targets).

## 6. DB posture (design, not executed)

Future additive content tables (a separate gated lifecycle) preserve:
movement refs by slug/id (never names), content-hash discipline (MG-03/MG-07
sha256), localization keys, and additive-migration discipline. This task
performs no migration and implies none.

## 7. Acceptance

- [x] architecture connects educational content to movement knowledge objects
      (structural anchoring rule §2) — not standalone articles;
- [x] content model supports exercise technique, movement education, common
      mistakes, progressions/regressions, mobility, recovery, home fitness,
      and workout/evidence content (closed content-area set §2);
- [x] SEO/discovery supported but not the sole purpose (§5);
- [x] no CMS implementation in this task (§4.4) — docs-only delivery.

## 8. Related

- `docs/product/PRODUCT-STRATEGY.md` §10 — knowledge surface
- `docs/adr/0015-knowledge-journal-architecture.md` — decision record
- `docs/adr/0010-localization-media-architecture.md` (MG-07), `docs/adr/0006-movement-graph-domain-contract.md` (MG-01), `docs/adr/0008-source-provenance-contract.md` (MG-03)
- `docs/architecture/TS-01-PRIVACY-SAFETY-ARCHITECTURE.md` — safety boundary for content
- `docs/TASKS.md` — TS-04 queue entry (DELIVERED / CLOSED)
