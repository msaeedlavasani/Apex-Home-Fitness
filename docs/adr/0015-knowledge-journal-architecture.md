# ADR-0015: Knowledge / Journal Architecture

> **STATUS: ACCEPTED — 2026-09-03**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `TS-04` (Knowledge / Journal architecture, delivered
> 2026-09-03; architecture:
> `docs/architecture/TS-04-KNOWLEDGE-JOURNAL-ARCHITECTURE.md`;
> view in `docs/TASKS.md`)
>
> **Execution gating:** this ADR ratifies the knowledge architecture. It does
> NOT authorize any Blog/CMS/page implementation, any content authoring, any
> content-table migration, or any SEO/landing work (strategy §10: "Do NOT
> implement Blog/CMS/pages now"). The public trust pages (TS-05) remain
> separately authorized (they additionally require TS-02 legal review).

## Context

The strategy (`docs/product/PRODUCT-STRATEGY.md` §10) requires the future
Blog/Journal to be part of Apex's **product knowledge architecture**, not an
isolated SEO blog: `Movement Graph ↔ Exercise Pages ↔ Educational Content ↔
Workout Programs ↔ Companion`. Potential content areas include exercise
technique, movement education, common mistakes, progressions/regressions,
mobility, recovery, home fitness, workout education, and evidence-informed
fitness content. Discovery/SEO is supported but is not the sole purpose.
The Movement Graph family (MG-01…MG-09, incl. MG-07 localization/media and
MG-06 relationships) now exists as the canonical movement knowledge layer;
without a knowledge architecture, future content would drift into
standalone articles disconnected from that moat.

## Decision

1. **Adopt the Knowledge / Journal architecture** in
   `docs/architecture/TS-04-KNOWLEDGE-JOURNAL-ARCHITECTURE.md` as the
   canonical content-model + rendering + authoring design for the product
   knowledge system.
2. **Content is anchored to the Movement Graph, never standalone**: every
   knowledge item references movement knowledge objects; movement
   relationships (progression/regression/substitution, MG-06) drive
   interlinking and program-level content.
3. **Content reuses the established contracts**: MG-07 localization keys +
   FA/EN corpus discipline (no invented Persian), MG-07 self-hosted media
   manifest, MG-03 provenance/confidence (evidence-informed claims carry
   source + confidence), S-02 identity discipline (slug refs, never display
   names as identity).
4. **Rendering is locale-aware SSR** (en/fa + RTL) on the existing design
   system; SEO metadata is a separate, derived surface — discovery is
   supported, not the purpose.
5. **Authoring is movement-first** and gated: content starts from a movement
   knowledge object or a validated user intent, with a documented review
   step; no CMS exists in this task.
6. **This architecture authorizes no implementation** — pages, CMS,
   authoring, migrations, and SEO/landing surfaces each require their own
   task authorization (TS-05 remains gated on TS-02 as recorded).

## Consequences

- Future content surfaces (TS-05 and beyond) must express themselves through
  this model instead of parallel blog schemas; exercise pages and articles
  interlink via movement refs.
- Any future additive content tables must preserve the movement reference
  and content-hash discipline defined here; this ADR implies no migration.
- Content quality is structural: localization, media self-hosting, and
  provenance rules apply to knowledge items by contract, not by policy.

## Related

- `docs/architecture/TS-04-KNOWLEDGE-JOURNAL-ARCHITECTURE.md` — the architecture (this record's evidence)
- `docs/product/PRODUCT-STRATEGY.md` — §10 (knowledge surface)
- `docs/adr/0010-localization-media-architecture.md` (MG-07), `docs/adr/0008-source-provenance-contract.md` (MG-03), `docs/adr/0006-movement-graph-domain-contract.md` (MG-01)
- `docs/TASKS.md` — TS-04 queue entry (DELIVERED / CLOSED)
