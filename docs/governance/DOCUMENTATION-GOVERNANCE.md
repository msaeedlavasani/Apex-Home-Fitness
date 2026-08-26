# Documentation Governance

> **STATUS: CURRENT — ACCEPTED REPOSITORY DOCUMENTATION GOVERNANCE**
>
> Adopted: 2026-08-27 (Documentation & Governance Reconciliation, approved
> decisions A-04…A-07, D-01, D-03).
>
> This document is the **authoritative** governance rule set for repository
> documentation. It supersedes the earlier proposals:
> - [`DOCUMENTATION-GOVERNANCE-PROPOSAL.md`](./DOCUMENTATION-GOVERNANCE-PROPOSAL.md)
>   (kept as a proposal record);
> - [`DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md`](./DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md)
>   (the map itself now lives authoritatively in `docs/INDEX.md`).
>
> The audit evidence remains in `REPOSITORY-DOCUMENTATION-AUDIT.md` and
> `DOCUMENTATION-CONFLICT-MATRIX.md` as historical records.

## 1. Scope

These rules govern how documentation is created, updated, superseded and read
in this repository. They complement — and never override — `AGENTS.md`, which
remains the authoritative agent-behavior and repository-development rule set
(see §4 hierarchy). Documentation decisions that contradict `AGENTS.md` or the
production/security constraints below are invalid unless a later approved
decision changes them.

## 2. Accepted principles

1. **Find Before Create** — before creating a new document, search
   (`docs/INDEX.md`, `AGENTS.md`, existing docs) for the canonical document that
   already owns the topic.
2. **Update Before Duplicate** — if a canonical document owns the topic,
   update/extend it instead of creating a parallel source of truth. Other
   documents may reference an authority; they must not restate it as a new
   authority.
3. **Explicit Document Status** — important documents carry a status header
   where appropriate, using one of:
   - `CURRENT` — describes the current implementation/state;
   - `PROPOSED` — a proposal not yet adopted;
   - `NOT YET IMPLEMENTED` — a registered direction/vision not implemented;
   - `HISTORICAL` — preserved for history, not current guidance;
   - `DEPRECATED` — no longer recommended;
   - `SUPERSEDED` — replaced by another document (which must be named).
4. **Explicit Supersession** — a superseding document says what it supersedes;
   a superseded document points to its replacement. Both directions.
5. **Historical Preservation** — important historical context is archived, not
   deleted. Archived documents name their successors and stay out of the
   current read path.
6. **Implementation vs Intent** — documentation must distinguish current
   implementation from intended design. **Code is evidence of implementation;
   code does NOT automatically redefine product intent.** A doc describing
   unimplemented intent is "PLANNED / NOT IMPLEMENTED", not a bug.
7. **Documentation With Change** — material changes to architecture, product
   contracts, deployment, security, API or operations must update their
   authoritative documentation in the same change.
8. **Find → Update → Extend → Create** — apply this order to documentation
   creation, mirroring `AGENTS.md` §3 (`reuse → extend → compose → create`)
   for code.

## 3. Conflict handling

1. Apply the authority hierarchy (§4). `AGENTS.md` §1's own priority list
   remains in force for agents.
2. If the conflict is resolvable by clear evidence (code/config/approved
   decision), correct the stale document and note the change.
3. If it is a genuine product/architecture choice, record it in the conflict
   matrix and mark `OWNER DECISION REQUIRED`. Do not silently pick a side.
4. Never delete the losing document's content outright — preserve it with a
   status/supersession header instead.

Two governing rules:

- **NEWER DOES NOT AUTOMATICALLY MEAN MORE AUTHORITATIVE.** A document's
  declared status and its place in the hierarchy decide authority, not its
  timestamp.
- **CODE = implementation evidence, not automatic product intent.**

## 4. Authority hierarchy

Preserves and makes explicit `AGENTS.md` §1:

```text
1. Production / Security safety constraints + current code & configuration
   (schema.prisma, .env.example, next.config.mjs, workflows, Docker files)
        ↓
2. Accepted ADRs                      (docs/adr/ — mechanism; none accepted yet)
        ↓
3. AGENTS.md                          (agent behavior / repository development rules)
        ↓
4. Authoritative domain contracts
   (docs/AI_API.md, docs/ASSETS.md, docs/DESIGN_SYSTEM.md, prisma/schema.prisma,
    .env.example)
        ↓
5. Product / Feature specifications
   (docs/product/PRODUCT-VISION.md, docs/product/WORKOUT-EXPERIENCE-V2.md,
    docs/TRANSFORMATION_ROADMAP.md — each carries its own status)
        ↓
6. Operational runbooks / current handoff
   (docs/HANDOFF.md, docs/RELEASING.md, docs/OTP_LAUNCH_READINESS.md)
        ↓
7. Backlog / planning documents
   (docs/TASKS.md, docs/CI.md)
        ↓
8. Historical documentation
   (docs/EXECUTION_ROADMAP.md — archive only)
```

When a conflict cannot be resolved through this hierarchy, mark it
`OWNER DECISION REQUIRED` (product owner or architecture owner as appropriate)
in `docs/governance/DOCUMENTATION-CONFLICT-MATRIX.md`.

## 5. Agent documentation read order (authoritative)

Future development agents MUST follow this order before making changes, so no
archived or superseded document is read as current instructions:

1. `README.md` — orientation (optional for focused agents);
2. `AGENTS.md` — behavior rules + authority priority (must read);
3. `docs/INDEX.md` — documentation map (must read);
4. relevant authoritative domain document(s) — `docs/DESIGN_SYSTEM.md` (UI),
   `docs/AI_API.md` (AI/API), `docs/ASSETS.md` (media/offline),
   `docs/OTP_LAUNCH_READINESS.md` (auth/launch), `docs/RELEASING.md`
   (deployment), `prisma/schema.prisma` (data);
5. relevant accepted ADR(s) — `docs/adr/` (none accepted yet);
6. `docs/CI.md` — validation policy before running tests;
7. current `docs/HANDOFF.md` — operational snapshot;
8. current `docs/TASKS.md` — backlog/status;
9. relevant product/feature specification —
   `docs/product/PRODUCT-VISION.md`, `docs/product/WORKOUT-EXPERIENCE-V2.md`,
   `docs/TRANSFORMATION_ROADMAP.md`;
10. historical material only when needed — `docs/EXECUTION_ROADMAP.md`.

This list lives here (authoritative) and is pointed to from `docs/INDEX.md` and
`AGENTS.md` §8; it is intentionally not duplicated in full elsewhere.

## 6. Relationship to other governance files

| File | Role |
|---|---|
| `docs/governance/DOCUMENTATION-GOVERNANCE.md` (this file) | Authoritative governance rules |
| `docs/INDEX.md` | Authoritative documentation map / source-of-truth index |
| `docs/governance/DOCUMENTATION-CONFLICT-MATRIX.md` | Conflict register (historical + open) |
| `docs/governance/REPOSITORY-DOCUMENTATION-AUDIT.md` | Audit evidence (historical record) |
| `docs/governance/DOCUMENTATION-GOVERNANCE-PROPOSAL.md` | Superseded proposal (record) |
| `docs/governance/DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md` | Superseded proposal (record) |
| `docs/adr/README.md`, `docs/adr/ADR-TEMPLATE.md` | ADR mechanism (see below) |

## 7. ADRs

Architecture decisions are recorded through the ADR mechanism in
`docs/adr/README.md`. Accepted ADRs rank above domain contracts in the
hierarchy (§4). There are no accepted ADRs yet; the first real architecture
decision (e.g. the Workout Experience V2 technical specification) should be
recorded there.
