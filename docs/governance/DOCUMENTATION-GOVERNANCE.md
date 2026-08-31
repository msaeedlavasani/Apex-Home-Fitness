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
9. **Branch lifecycle** — normal development branches follow
   `ACTIVE → VALIDATION → APPROVED_FOR_MERGE → MERGED → LEGACY / RETIRED →
   DELETE_VERIFIED`. `MERGED` alone is not sufficient for deletion: verify
   ancestry and zero unique commits, delete remote and local refs safely, prune,
   and confirm a clean repository before opening the next normal branch.
10. **Superseded branch retirement exception** — a branch with unique history
    may be retired without merge only when semantic reconciliation proves its
    substantive capabilities are present or superseded, safety-critical gaps
    are zero, the owner explicitly approves abandonment, the final tip SHA is
    recorded for recovery, and the deletion is documented as intentional
    abandonment. This exception is not a shortcut around normal verification;
    `MERGE → VERIFY → DELETE` remains preferred.
11. **One executable backlog** — `docs/TASKS.md` is the only document that can
    authorize or sequence executable work. Roadmaps, visions, audits, risk
    registers, plans, open questions, handoffs, and historical records may
    advise or preserve decisions, but MUST NOT act as parallel task stores.
12. **Decision Persistence** — an accepted or deferred owner decision that is
    not implemented immediately MUST be written to its canonical topic owner
    before workflow continuation. Chat history, a report, or agent memory alone
    is not durable product knowledge. Record the decision, status (`ACCEPTED`,
    `DEFERRED`, `REJECTED`, or `OPEN`), implementation state, and execution
    authorization. Authorized work must also be promoted explicitly to
    `TASKS.md`; all other persisted decisions remain non-executable.
13. **Controlled docs-direct-main path** — future strictly documentation-only,
    low-risk tasks may use `DOCS_DIRECT_MAIN` only under the eligibility,
    exact-SHA Main CI, reporting, and fail-closed rules in
    `docs/BRANCHING_POLICY.md`. It is forbidden for application/config/schema/
    dependency/CI/Production/tooling changes and for machine-consumed
    Governance changes that alter executable behavior. Existing task branches
    are completed normally rather than rewritten to use the fast path.

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

This is the single precedence graph for documentation and delivery decisions.
Verified evidence describes reality; it does not authorize unsafe changes.
`AGENTS.md` owns agent behavior, this document owns documentation governance,
and `RELEASE_POLICY.md` owns normative release requirements. Other documents
must link here rather than define a competing global hierarchy.

Preserves and makes explicit `AGENTS.md` §1:

```text
1. Verified runtime/code/config evidence (including workflows, Docker files,
   schema.prisma, and .env.example) — evidence of what exists, not permission
   to violate safety or product policy
        ↓
2. Accepted ADRs                      (docs/adr/ — accepted architecture decisions)
        ↓
3. AGENTS.md                          (agent behavior / repository development rules)
        ↓
4. Authoritative governance and release policy
   (this document, docs/RELEASE_POLICY.md, docs/BRANCHING_POLICY.md)
        ↓
5. Authoritative domain contracts
   (docs/AI_API.md, docs/ASSETS.md, docs/DESIGN_SYSTEM.md, prisma/schema.prisma,
    .env.example)
        ↓
6. Product / Feature specifications
   (docs/product/PRODUCT-VISION.md, docs/product/WORKOUT-EXPERIENCE-V2.md,
    docs/TRANSFORMATION_ROADMAP.md — each carries its own status)
        ↓
7. Current state / executable backlog / operational runbooks
   (docs/CURRENT_STATE.md, docs/TASKS.md, docs/HANDOFF.md,
    docs/RELEASING.md, docs/OTP_LAUNCH_READINESS.md)
        ↓
8. Advisory planning / validation policy
   (docs/TRANSFORMATION_ROADMAP.md, docs/CI.md)
        ↓
9. Historical documentation
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
5. relevant accepted ADR(s) — `docs/adr/` (currently 0001–0003);
6. current `docs/CURRENT_STATE.md` — current manifest;
7. current `docs/TASKS.md` — the only executable backlog;
8. `docs/CI.md` — validation policy before running tests;
9. current `docs/HANDOFF.md` — supporting operational snapshot;
10. relevant product/feature specification —
   `docs/product/PRODUCT-VISION.md`, `docs/product/WORKOUT-EXPERIENCE-V2.md`,
   `docs/TRANSFORMATION_ROADMAP.md`;
11. historical material only when needed — `docs/EXECUTION_ROADMAP.md`.

This list lives here (authoritative) and is pointed to from `docs/INDEX.md` and
`AGENTS.md` §8; it is intentionally not duplicated in full elsewhere. The
canonical agent contract is task-delta based: prompts provide task-specific
scope and acceptance, while stable governance is loaded from this repository.

## 6. Canonical ownership boundaries

| Information | Canonical owner | Authorizes execution? |
|---|---|---|
| Approved/active/blocked/next task | `docs/TASKS.md` | Yes |
| Current repository/task/Production manifest | `docs/CURRENT_STATE.md` | No |
| Handoff context | `docs/HANDOFF.md` | No |
| Accepted/deferred product direction | Product vision or named feature vision | No |
| Product advisory/competitor evidence/North Star | `docs/TRANSFORMATION_ROADMAP.md` | No |
| Accepted architecture decision | Accepted ADR; principles for cross-cutting constraints | No, unless promoted to `TASKS.md` |
| Architecture stabilization status | Architecture stabilization plan | No |
| Historical evidence | Explicitly historical/superseded document and Git | No |

## 7. Relationship to other governance files

| File | Role |
|---|---|
| `docs/governance/DOCUMENTATION-GOVERNANCE.md` (this file) | Authoritative governance rules |
| `docs/INDEX.md` | Authoritative documentation map / source-of-truth index |
| `docs/governance/DOCUMENTATION-CONFLICT-MATRIX.md` | Conflict register (historical + open) |
| `docs/governance/REPOSITORY-DOCUMENTATION-AUDIT.md` | Audit evidence (historical record) |
| `docs/governance/DOCUMENTATION-GOVERNANCE-PROPOSAL.md` | Superseded proposal (record) |
| `docs/governance/DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md` | Superseded proposal (record) |
| `docs/adr/README.md`, `docs/adr/ADR-TEMPLATE.md` | ADR mechanism; accepted decisions are 0001–0003 |

## 8. ADRs

Architecture decisions are recorded through the ADR mechanism in
`docs/adr/README.md`. Accepted ADRs rank above domain contracts in the
hierarchy (§4). Accepted ADRs currently include 0001–0003; future architecture decisions
decision (e.g. the Workout Experience V2 technical specification) should be
recorded there.
