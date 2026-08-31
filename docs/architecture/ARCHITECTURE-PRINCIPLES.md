# Architecture Principles

`STATUS: CURRENT — AUTHORITATIVE ARCHITECTURE PRINCIPLES`

This document is the canonical statement of Apex Home Fit's architecture
principles. It **extends** [`../../AGENTS.md`](../../AGENTS.md) and does NOT replace
the repository's existing reuse-first rule:

`reuse → extend → compose → create`

Accepted by the architecture owner on 2026-08-27 together with architecture
decisions AD-1..AD-5 (recorded in `docs/adr/`). It supersedes the earlier
proposal: `docs/architecture/ARCHITECTURE-PRINCIPLES-PROPOSAL.md` (kept as
historical record).

Authority hierarchy: Production/Security constraints → accepted ADRs →
`AGENTS.md` → these principles → domain contracts → product/feature specs →
operational docs → historical material (see
[`docs/governance/DOCUMENTATION-GOVERNANCE.md`](../governance/DOCUMENTATION-GOVERNANCE.md)).

## 1. Reuse First

`reuse → extend → compose → create` is authoritative (`AGENTS.md` §3).
Interpretation for architecture work:

1. Search for an existing capability before building.
2. Reuse it when the responsibility matches.
3. Extend it when the existing owner logically owns the new capability.
4. Compose existing modules where possible.
5. Create a new module only when no appropriate existing owner exists.

Modularity is not "more files"; over-abstraction is technical debt.

## 2. Capability Ownership

Every major reusable capability has a clear owner with:

- a clear responsibility;
- defined inputs and outputs;
- explicit side effects;
- known consumers.

A capability without a declared owner is a governance gap, not a freedom.

## 3. High Cohesion / Low Coupling

Module boundaries group related responsibility and minimize unrelated
dependencies. Prefer boundaries that make one capability changeable without
requiring unrelated domains to be understood or modified.

## 4. One-Way Dependency Direction

Prefer a clear dependency flow — Presentation → Domain → Infrastructure. Avoid:

- domain → UI;
- reusable core → page component;
- lower-level domain contract → higher-level service implementation.

Shared contracts live with the domain/capability that owns their meaning; they
are not owned by higher-level service implementations that lower-level modules
depend on (decision AD-4).

## 5. UI / Domain Separation

UI components present and orchestrate domain capabilities. They are not the
primary owner of reusable domain logic merely for implementation convenience.
Domain/session logic that outlives a single screen belongs in a
framework-independent core with a React/UI adapter (decision AD-2).

## 6. Side-Effect Isolation

External effects — network, database, browser persistence, audio, haptics,
provider APIs — stay behind explicit boundaries where practical, with
injectable seams so logic remains testable without the effect.

## 7. Durable Identity

Stable domain entities use durable identifiers rather than human-readable
labels when identity matters. Display strings are metadata (decision AD-1:
`exerciseId` is identity; `name`/`faName`/`enName` are display labels).

## 8. Source Independence

Consumers depend on normalized contracts, not on the origin of data. Workout
execution must not care whether a Program came from AI, rules, a coach, or
manual input.

## 9. Backward-Compatible Evolution

Migrations prefer additive evolution and compatibility adapters over
destructive rewrites. Existing data continues to be readable; new fields are
additive with safe defaults; old-name/old-shape resolution remains available as
a fallback during migration.

## 10. Explicit Public vs Internal Boundaries

Reusable capabilities expose intentional public contracts. Consumers do not
depend on implementation internals unnecessarily; deep imports into another
module's internals are a defect.

## 11. Documentation With Change

Material architecture, contract, deployment, security, API or operational
changes update the authoritative documentation for the affected capability,
record accepted decisions as ADRs when they qualify, and respect the
governance rules in `docs/governance/DOCUMENTATION-GOVERNANCE.md`.

## 12. Connectivity and External-Dependency Resilience

`STATUS: ACCEPTED EVALUATION NEED / DEFERRED — NOT AN IMPLEMENTATION AUTHORIZATION`

Iranian and other constrained international network paths can make external
identity, AI, storage, monitoring, and provider dependencies unavailable or
high-latency. The architecture must evaluate dependency criticality, graceful
degradation, data ownership, portability, regional reachability, operational
fallbacks, and Supabase coupling before expanding reliance on any external
service. This records the evaluation boundary only; it does not select a new
provider, authorize a migration, duplicate Supabase, or change Production.
Execution requires a separately authorized task in `docs/TASKS.md` with
evidence-based scope and rollback constraints.

## Relationship to AGENTS.md and ADRs

- `AGENTS.md` remains authoritative for agent behavior and development rules.
- Accepted ADRs outrank these principles on the specific decision they record.
- These principles govern how decisions and implementations are shaped; they
  are binding for future development unless changed by an accepted decision.
