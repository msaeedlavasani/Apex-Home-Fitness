# Documentation Governance Proposal

> **STATUS: SUPERSEDED — PROPOSAL RECORD**
>
> **SUPERSEDED BY [`DOCUMENTATION-GOVERNANCE.md`](./DOCUMENTATION-GOVERNANCE.md)**
> (adopted 2026-08-27, decision A-04…A-07/D-01/D-03). This file is kept as the
> historical proposal record and is NOT authoritative guidance.
>
> Original abstract: proposed governance rules for repository documentation,
> prepared for review. Several principles already exist in the repository
> (`docs/INDEX.md`'s "one reference doc per topic", `AGENTS.md` §8 "no parallel
> documents"); this proposal made them explicit and complete.
>
> Audit date: 2026-08-27 · Related:
> [REPOSITORY-DOCUMENTATION-AUDIT.md](./REPOSITORY-DOCUMENTATION-AUDIT.md),
> [DOCUMENTATION-CONFLICT-MATRIX.md](./DOCUMENTATION-CONFLICT-MATRIX.md),
> [DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md](./DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md)

## 1. Proposed principles

1. **Find Before Create** — before creating a new document, search
   (`docs/INDEX.md`, README, existing docs) for the authoritative document that
   already owns the topic. This mirrors `AGENTS.md` §3's reuse-first rule for
   code and `AGENTS.md` §8 for docs.
2. **Update Before Duplicate** — if an authoritative document owns the topic,
   update/extend it instead of creating a parallel source of truth. Multiple
   documents may reference one authority; they must not restate it as a new
   authority.
3. **Explicit Status** — important documents should carry a status header where
   appropriate: `CURRENT`, `PROPOSED`, `HISTORICAL`, `DEPRECATED`,
   `SUPERSEDED`, `NOT YET IMPLEMENTED`. Existing good examples:
   `docs/DESIGN_SYSTEM.md` ("Frontend source of truth"),
   `docs/TRANSFORMATION_ROADMAP.md` (PROPOSED),
   `docs/EXECUTION_ROADMAP.md` (ARCHIVED),
   `docs/product/WORKOUT-EXPERIENCE-V2.md` (NOT YET IMPLEMENTED).
4. **Explicit Supersession** — if document B supersedes document A, say so in
   both (see the pattern `docs/CI.md` uses for the HANDOFF temp section).
5. **Historical Preservation** — important historical decisions are archived,
   not deleted (`docs/EXECUTION_ROADMAP.md` is the model). Archived docs must
   name their successors.
6. **Code vs Intent** — every claim about behavior should be identifiable as
   `CURRENT IMPLEMENTATION`, `INTENDED DESIGN`, `HISTORICAL IMPLEMENTATION`, or
   `PLANNED / NOT IMPLEMENTED`. A mismatch between a doc and code is either a
   stale doc or a planned feature — not automatically a bug.
7. **Documentation with Change** — material behavior/architecture changes update
   the corresponding authoritative document in the same change (already
   mandated by `AGENTS.md` §8, `docs/INDEX.md`, `docs/AI_DEVELOPMENT_SYSTEM.md`
   §3, and the README's closing rule).
8. **Agent Read Order** — the read order proposed in the audit
   (README → AGENTS.md → docs/INDEX.md → domain reference → CI.md → TASKS/HANDOFF
   → feature spec) should be followed before making changes, so an agent never
   treats an archived or superseded document as current instructions.

## 2. Status header convention (proposed, when adding a new important doc)

```md
> **STATUS: <CURRENT | PROPOSED | HISTORICAL | DEPRECATED | SUPERSEDED | NOT YET IMPLEMENTED>**
```

- New product/architecture proposals: `PROPOSED` (or `NOT YET IMPLEMENTED` for
  registered visions) until adopted.
- Adopted contracts: `CURRENT` + (optionally) "source of truth for X".
- Superseded documents: keep content, add `SUPERSEDED BY <path>` at the top.
- Historical: `ARCHIVED` + `SUCCESSORS: <paths>`.

## 3. Conflict-handling convention (proposed)

When two documents conflict:

1. Apply `AGENTS.md` §1's priority order and this proposal's hierarchy
   ([DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md](./DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md) §2).
2. If the conflict is resolvable by clear evidence (code/config), correct the
   stale document and note the change.
3. If it is a genuine product/architecture choice, record it in the conflict
   matrix and mark `PRODUCT OWNER DECISION REQUIRED` or
   `ARCHITECTURE DECISION REQUIRED`. Do NOT silently pick a side.
4. Never delete the losing document's content without preserving it (status +
   supersession header instead).

## 4. Optional future mechanisms (proposed, NOT created by this audit)

- **ADR directory:** `docs/adr/` (or `docs/decisions/`) for accepted
  architecture decisions, each with `Status: Accepted | Proposed | Superseded`.
  There are no ADRs today; the first real architectural decision (e.g. the V2
  Session Engine technical specification) would be a good candidate to record.
- **DATA reference:** a `docs/` entry for the data/sync contract (offline
  outbox → Supabase, Prisma model map) to close Conflict C-12.
- **Docs audit maintenance:** periodically re-run this audit's checks
  (INDEX completeness, status headers, supersession links, provider/env
  statements) as part of the docs update rule.

## 5. What this proposal intentionally does NOT do

- It does not change any existing rule, document, or status.
- It does not resolve Conflicts C-01…C-12.
- It does not create ADRs, a component registry, or modularity rules.
- It does not introduce the planned "Search before build / Reuse before extend /
  Extend before create" or capability-ownership principles as authoritative —
  those belong to the planned Modularity Audit and must first be checked against
  `AGENTS.md` §3 (which already encodes the reuse-first rule).
