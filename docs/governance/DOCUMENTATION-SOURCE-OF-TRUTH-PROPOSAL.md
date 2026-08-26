# Documentation Source-of-Truth Proposal

> **STATUS: SUPERSEDED — PROPOSAL RECORD**
>
> **SUPERSEDED BY [`../INDEX.md`](../INDEX.md)** (adopted as the authoritative
> documentation map on 2026-08-27). This file is kept as the historical
> proposal/evidence record and is NOT authoritative guidance.
>
> Original abstract: a proposed answer to "where should an agent or operator
> look for each category of project knowledge?", derived from what the
> repository already has. It did not force a new hierarchy; it mapped the
> existing one and flagged the gaps.
>
> Audit date: 2026-08-27 · Related:
> [REPOSITORY-DOCUMENTATION-AUDIT.md](./REPOSITORY-DOCUMENTATION-AUDIT.md),
> [DOCUMENTATION-CONFLICT-MATRIX.md](./DOCUMENTATION-CONFLICT-MATRIX.md),
> [DOCUMENTATION-GOVERNANCE-PROPOSAL.md](./DOCUMENTATION-GOVERNANCE-PROPOSAL.md)

## 1. Source-of-truth map (proposed)

| Category | Current authoritative source | Notes |
|---|---|---|
| Product Vision (workout experience) | `docs/product/WORKOUT-EXPERIENCE-V2.md` | PROPOSED / NOT YET IMPLEMENTED status; only source for V2 |
| Product Vision (general) | NO CLEAR SOURCE | `README.md` (overview) + `docs/TRANSFORMATION_ROADMAP.md` (features) split it; consider an explicit product-vision statement if needed |
| Feature roadmap | `docs/TRANSFORMATION_ROADMAP.md` | itemized, prioritized, PROPOSED status declared |
| Architecture principles | NO CLEAR SOURCE (partial) | `AGENTS.md` §4 (boundaries) + `docs/DESIGN_SYSTEM.md` (UI) + `docs/ASSETS.md` (media/offline) + `docs/AI_API.md` (AI) — no single architecture document exists |
| ADRs | NONE EXIST | gap: no accepted-decision record mechanism (see governance proposal §4) |
| Feature specifications | NO CONVENTION | `docs/TRANSFORMATION_ROADMAP.md` items + `docs/product/*`; per-feature specs are ad-hoc |
| Agent behavior rules | `AGENTS.md` | declares v1; includes an authority priority list |
| Agent development system | `docs/AI_DEVELOPMENT_SYSTEM.md` | overlaps AGENTS.md (see Conflict C-10) |
| UI / design system | `docs/DESIGN_SYSTEM.md` | self-declared "Frontend source of truth" (v2.1) |
| Asset / media / offline pipeline | `docs/ASSETS.md` | verified against code |
| AI & analytics API contract | `docs/AI_API.md` | self-declared in-sync; lists reviewed files |
| Database / data model | `prisma/schema.prisma` (comments) | authoritative in-code; no docs/ row exists for data (see Conflict C-12) |
| Environment configuration | `.env.example` | enforced by `tests/otp-launch-readiness.test.ts`; verified against code |
| CI / testing policy | `docs/CI.md` | self-declared successor of the HANDOFF temp section |
| Deployment / release runbook | `docs/RELEASING.md` | CURRENT but contains stale provider guidance (Conflict C-01, C-02) |
| Production launch contract (auth) | `docs/OTP_LAUNCH_READINESS.md` | Go/No-Go checklist; §3 stale (Conflict C-03) |
| Production operational status | `docs/HANDOFF.md` | declared operational snapshot (2026-08-27) |
| Backlog / batch history / debt | `docs/TASKS.md` | declared single reference for status/history |
| Historical decisions / plans | `docs/EXECUTION_ROADMAP.md` | correctly archived with successors |
| Change-report template | `docs/AI_CHANGE_TEMPLATE.md` | duplicated in AI_DEVELOPMENT_SYSTEM §5 (Conflict C-09) |
| Component-level docs | `src/components/ui/platform/README.md` | per-component README convention (small) |
| AI system prompts | `infra/ai/prompts/*.md` | deployment artifacts; versioned; referenced by AI_API §6 |

## 2. Proposed rules hierarchy (authority precedence)

The repository already has an authority hierarchy in `AGENTS.md` §1
(code/config → manifests → AGENTS.md → DESIGN_SYSTEM → operational docs →
backlog/handoff → historical). This proposal preserves it and makes the
categories explicit:

```text
1. Production/Security constraints + current code/config reality
   (schema.prisma, .env.example, next.config.mjs, workflows, Docker files)
        ↓
2. Accepted ADRs                       ← does not exist yet (gap)
        ↓
3. AGENTS.md                           (agent behavior; its §1 priority list governs conflicts)
        ↓
4. Domain contracts
   (docs/AI_API.md, docs/ASSETS.md, docs/DESIGN_SYSTEM.md, prisma/schema.prisma)
        ↓
5. Feature / product specifications
   (docs/product/*, docs/TRANSFORMATION_ROADMAP.md items — each carries its own status)
        ↓
6. Operational snapshots & runbooks
   (docs/HANDOFF.md, docs/RELEASING.md, docs/OTP_LAUNCH_READINESS.md)
        ↓
7. Backlog & status
   (docs/TASKS.md, docs/CI.md policy)
        ↓
8. Historical material
   (docs/EXECUTION_ROADMAP.md — archive only)
```

Additional proposed precedence rules (consistent with AGENTS.md §1):

- **A document's declared status wins over its age.** A `PROPOSED` doc is not
  authoritative regardless of how new it is; an `ARCHIVED` doc is never a source
  of current instructions; a `CURRENT` doc is not overridden by an older
  `CURRENT` doc — the conflict must be resolved explicitly (see below).
- **Code is evidence of implementation, not automatically intent.** If a
  document describes intended future behavior that code does not implement, that
  is an "INTENDED DESIGN" (or "PLANNED / NOT IMPLEMENTED") statement, not a bug —
  unless the document claims to describe current behavior.
- **Conflicts that the hierarchy cannot resolve are marked** `PRODUCT OWNER
  DECISION REQUIRED` or `ARCHITECTURE DECISION REQUIRED` (see conflict matrix).

## 3. Conflicts that need owner decisions before adoption

- C-01 / C-02 (RELEASING.md provider guidance vs code/env/HANDOFF) — resolve
  before this map is acted on, because deployment docs are on the critical
  operational path.
- C-03 (OTP §3 contract) — launch-checklist owner.
- C-09 / C-10 (template duplication; AGENTS vs AI_DEVELOPMENT_SYSTEM overlap) —
  architecture owner, small scope.
- C-06 (next-work priority) — product owner.

## 4. Gaps this proposal leaves open (for a later decision, not this audit)

- No ADR mechanism: consider a `docs/adr/` (or `docs/decisions/`) directory with
  numbered, dated records once the first architectural decision needs recording.
- No single architecture-principles document: AGENTS.md §4 + DESIGN_SYSTEM +
  ASSETS + AI_API collectively cover it; decide whether a consolidated
  `docs/ARCHITECTURE.md` is wanted (NOT created here).
- No DATA row in the documentation map (offline sync, data contracts) — see
  Conflict C-12.
- No component registry / capability-ownership map — explicitly deferred to the
  planned Modularity Audit (must NOT be created by this task).
