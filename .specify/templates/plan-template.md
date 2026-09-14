# PLAN — <Feature title>

<!--
AHF Spec Kit plan template (Stage 1 scaffolding; tool-agnostic).
Required for CRITICAL; optional appendix for STANDARD.
The plan owns HOW-at-a-glance; the spec owns WHAT/WHY; the code owns HOW.
Link, never restate: ARCHITECTURE-PRINCIPLES, RELEASE_POLICY, CI.md.
-->

| Field | Value |
|---|---|
| STATUS | `PROPOSED` / `CURRENT` / `SUPERSEDED (by: …)` |
| SPEC | link to `docs/specs/NNNN-slug/spec.md` |
| TASK_PROFILE | per `scripts/governance-runtime.mjs` |
| Date | YYYY-MM-DD |

## APPROACH

The smallest change that satisfies the spec's acceptance criteria. Layers
touched (pages → components → services → lib → infra) and why this is the
minimal boundary.

## INVARIANTS THAT MUST NOT BREAK

Explicit list, each with its authority (ADR, ARCHITECTURE-PRINCIPLES §,
RELEASE_POLICY RULE). Examples of authorities to cite, not restate: session-core
purity (ADR-0002; PRINCIPLES §13.4), identity contract (`User.id == Supabase
auth id`), fail-closed AI fallback classification, strict CSP.

## AFFECTED_SURFACES

Files/modules expected to change; APIs/contracts touched; cross-plane effects
(Prisma ↔ Supabase ↔ Dexie); UI conformance obligations when `UI_CHANGED=YES`
(`docs/governance/UI-CONFORMANCE-GATE.md`).

## VALIDATION_MAPPING

Map each acceptance criterion to its validation lane (`docs/CI.md`): unit,
contract, targeted E2E, build, audits. Full-E2E stays on the nightly lane
unless the release path requires it.

## ARCHITECTURE_REVIEW

ADR required? (yes/no + rationale). New runtime dependency? — requires the
dependency-governance candidate rule (`.specify/constitution.md` §CANDIDATE)
and a justified, minimal surface.

## ROLLBACK

Concrete revert path and what evidence proves the rollback point.

## HANDOFF

| Field | Value |
|---|---|
| CURRENT_STATUS | `PLANNED` / `PARTIALLY_IMPLEMENTED` / `IMPLEMENTED` |
| NEXT_ACTION | single next concrete step |
| NEXT_ACTION_AUTONOMOUS | `YES` / `NO` |
| BLOCKERS | none / list |
