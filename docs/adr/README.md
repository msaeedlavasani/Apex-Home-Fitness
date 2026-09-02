# Architecture Decision Records (ADR)

> **STATUS: CURRENT — ADR MECHANISM**
>
> This directory holds Architecture Decision Records for Apex Home Fit.
> The mechanism was created on 2026-08-27 (Documentation & Governance
> Reconciliation). Accepted records are listed below; do not invent records for
> decisions that have not been made.

## What qualifies as an ADR

An ADR records a **significant, accepted (or proposed) architecture decision**
that will shape future work — for example:

- a major technical direction (e.g. the Workout Experience V2 Session Engine);
- a persistence/architecture choice (e.g. moving session recovery server-side);
- a dependency or platform decision (e.g. next major Next.js upgrade strategy);
- a boundary or ownership decision affecting multiple modules.

Small, local, easily reversible choices do not need an ADR — a commit message
and the relevant domain documentation are enough.

## Naming convention

```
docs/adr/####-kebab-case-title.md
```

Sequential zero-padded numbers (`0001`, `0002`, …). Never renumber.

## Statuses

| Status | Meaning |
|---|---|
| `PROPOSED` | Written for review; not yet adopted |
| `ACCEPTED` | Approved by the architecture owner (and product owner when product-affecting); binding from now on |
| `SUPERSEDED` | Replaced by a later ADR (which must be named) |
| `REJECTED` | Considered and declined; kept for context |

## Lifecycle

1. **Propose:** create `docs/adr/####-title.md` from
   [`ADR-TEMPLATE.md`](./ADR-TEMPLATE.md), status `PROPOSED`.
2. **Review:** architecture owner reviews; product owner reviews when the
   decision is product-affecting (per `docs/governance/DOCUMENTATION-GOVERNANCE.md`
   conflict rules, unresolved authority conflicts are marked `OWNER DECISION
   REQUIRED`).
3. **Accept:** status → `ACCEPTED`. Accepted ADRs outrank domain contracts in
   the documentation hierarchy (see `docs/governance/DOCUMENTATION-GOVERNANCE.md` §4).
4. **Record:** update the relevant authoritative documentation to match the
   decision (Documentation With Change).
5. **Supersede:** a later ADR may supersede an earlier one — both records must
   say so explicitly.

## Relationship to other documents

- **`AGENTS.md`** — behavior rules for development agents; ADRs do not replace
  them and must not contradict them (a conflicting ADR is invalid unless a
  later approved decision changes the rule).
- **Domain/architecture docs** (`docs/DESIGN_SYSTEM.md`, `docs/ASSETS.md`,
  `docs/AI_API.md`, `prisma/schema.prisma`, …) — ADRs explain *why*; these
  documents describe *what* is in force. Accepted ADRs take precedence over
  conflicting domain-doc statements.
- **Governance** — `docs/governance/DOCUMENTATION-GOVERNANCE.md` is the
  authoritative documentation rule set this mechanism serves.

## Current records

| ADR | Status | Decision |
|---|---|---|
| [`0001-canonical-exercise-identity.md`](./0001-canonical-exercise-identity.md) | ACCEPTED (2026-08-27) | Exercise identity = durable id; names = display metadata; name fallback during migration (AD-1) |
| [`0002-pure-workout-session-core.md`](./0002-pure-workout-session-core.md) | ACCEPTED (2026-08-27) | Framework-independent session core + React adapter (AD-2) |
| [`0003-quiz-onboarding-migration.md`](./0003-quiz-onboarding-migration.md) | ACCEPTED (2026-08-27) — DO WHEN TOUCHED | Quiz JS island → TS + canonical contracts; excluded from immediate stabilization (AD-3) |
| [`0004-dedicated-admin-authentication.md`](./0004-dedicated-admin-authentication.md) | ACCEPTED (2026-08-31) | Dedicated Email + Password administrator boundary; one ADMIN role; Passkey deferred (ADMIN-AUTH-01) |
| [`0005-mobile-readiness-guardrails.md`](./0005-mobile-readiness-guardrails.md) | ACCEPTED (2026-09-01) | Six mobile-readiness architecture guardrails ratified as binding principles (MOBILE-READINESS-01) |
| [`0006-movement-graph-domain-contract.md`](./0006-movement-graph-domain-contract.md) | ACCEPTED (2026-09-01) | Movement Graph domain contract = canonical type-level movement schema; pure, fail-closed identity; shapes-not-vocabularies (MG-01) |
| [`0007-movement-taxonomy-vocabulary.md`](./0007-movement-taxonomy-vocabulary.md) | ACCEPTED (2026-09-01) | Closed Movement Graph taxonomy vocabulary (patterns/muscles/equipment/difficulty/impact/symmetry/home-suitability/constraints) with FA/EN maps; governance-gated extension (MG-02) |
| [`0008-source-provenance-contract.md`](./0008-source-provenance-contract.md) | ACCEPTED (2026-09-01) | Hardened provenance record (ingestion timestamp) + sha256 hash contract + fail-closed license-compatibility rules + evidence confidence model (MG-03) |
| [`0009-governed-ingestion-pipeline.md`](./0009-governed-ingestion-pipeline.md) | ACCEPTED (2026-09-01) | Staged governed ingestion pipeline (pin/parse/normalize/fail-closed identity/taxonomy/provenance/MovementObject); snapshot-pinned Unlicense source; DATA-ONLY media; dry-run evidence only (MG-04) |
| [`0010-localization-media-architecture.md`](./0010-localization-media-architecture.md) | ACCEPTED (2026-09-01) | Localization keys = `<scope>.<ref>.<field>` for every user-facing movement field; self-hosted media manifest (sha256 content hash, self-hosted URL/fallback only, no third-party CDN for required media); no media import now (MG-07) |

Full decision summaries live in the records; do not duplicate ADR text here.
The Architecture Stabilization Plan (`docs/architecture/ARCHITECTURE-STABILIZATION-PLAN.md`)
carries the execution scope and gates for AD-1/AD-2.
