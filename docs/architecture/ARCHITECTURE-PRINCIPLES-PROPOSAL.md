# Architecture Principles — Proposal

`STATUS: PROPOSED — REQUIRES OWNER REVIEW`

Candidate architecture principles derived from the modularity audit
(`docs/architecture/MODULARITY-AUDIT.md`). **Nothing here is authoritative.**
Adoption requires owner approval and, where marked, an ADR. The documentation
baseline currently records `NO CANONICAL ARCHITECTURE PRINCIPLES DOC YET` for
this topic (see `docs/governance/DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md`).

The audit found the codebase already *practices* most of these principles
consistently; the proposal formalizes what is observed and names the few gaps.

## Candidate principles

### P-1. Reuse-first (extends AGENTS.md, does not replace it)

`reuse → extend → compose → create` remains authoritative. This proposal only
interprets it for architecture work:

1. Search for an existing capability before building.
2. Reuse it when the responsibility matches.
3. Extend it when the existing owner logically owns the new capability.
4. Compose existing modules where possible.
5. Create a new module only when no appropriate existing owner exists.

Corollary: modularity is not "more files". Over-abstraction is technical debt.

### P-2. Capability ownership

Every major capability has a clear owner (a module or documented seam) with a
documented responsibility and public contract. Audit finding: mostly true today
(services, lib seams); gaps are the missing Exercise catalog (R-01) and the
session engine's home (R-02).

### P-3. One-way dependency direction

Presentation → Domain → Infrastructure. No `Domain → UI`, no
`Infrastructure → Feature UI`. Observed violations to fix: lib → services type
imports (R-04). Contracts (program shape, quiz answers) need a neutral home.

### P-4. Side-effect isolation

Database, network, browser storage, audio, haptics, analytics and env reads sit
behind documented seams with injectable fakes. Audit finding: consistently
practiced (OTP, avatar storage, sync, analytics, idempotency). Keep the
discipline as V2 adds voice/guidance side effects.

### P-5. UI/domain separation

Domain/session logic does not live in UI components. Audit finding: mostly true;
the exception is the session engine living in `components/workout/` as a React
hook (R-02). V2 should extract a pure session core with the hook as an adapter.

### P-6. Durable identity over labels

Cross-cutting identity uses stable ids, not display strings. Audit finding:
violated for exercises (R-01) — programs, workout logs, media tokens and the
library catalog are name-keyed. Display names remain a localization concern.

### P-7. Source independence

Domain execution does not depend on how inputs were produced. Audit finding:
already practiced for programs (rules vs AI share one persisted shape). V2 must
keep the Session Engine generator-agnostic.

### P-8. Backward-compatible evolution

Schema/snapshot/contract changes remain readable by old data. Audit finding:
practiced (optional fields, monotonic merge in `conflictPolicy.ts`, versioned
localStorage keys). V2 snapshot changes must keep this discipline.

### P-9. Explicit public/internal boundaries

Consumers import a module's public contract, not its internals. Audit finding:
generally true (barrels, seams); the mixed generic/workout store in
`lib/offline/db.ts` (R-06) is a mild exception to review when touched.

### P-10. Documentation with change

Material architecture, contract, deployment, security, API or operational
changes update their authoritative documentation (`docs/governance/
DOCUMENTATION-GOVERNANCE.md`).

## Non-canonical status

- Accepted architecture principles are NOT established by this file. Approval
  path: owner review → accepted ADR(s) → a canonical architecture document.
- The audit's only binding input to this process is `AGENTS.md` (already
  authoritative) — everything else here is a recommendation.
