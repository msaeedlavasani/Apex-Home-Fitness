# TASKS — <Feature title>

<!--
AHF Spec Kit tasks template (Stage 1 scaffolding; tool-agnostic).
CRITICAL only. THIS FILE IS NOT AUTHORIZATION TO EXECUTE WORK.
docs/TASKS.md remains the ONLY executable backlog
(DOCUMENTATION-GOVERNANCE §2.11). This file is a feature-local work
breakdown linked FROM the authorizing TASKS.md entry.
-->

| Field | Value |
|---|---|
| STATUS | `PROPOSED` / `ACTIVE` / `CLOSED` / `SUPERSEDED (by: …)` |
| SPEC | link to `docs/specs/NNNN-slug/spec.md` |
| PLAN | link to `docs/specs/NNNN-slug/plan.md` |
| TASKS.md entry | link to the authorizing `docs/TASKS.md` entry (REQUIRED) |
| Date | YYYY-MM-DD |

## WORK_BREAKDOWN

Ordered, independently verifiable checklist. Each item:

- [ ] `<id>` — concrete outcome + the validation that proves it
  (targeted lane per `docs/CI.md`; "validation ran" claims require real runs)

Suggested slicing (adapt, do not pad): contracts/types → domain logic →
service boundary → API/UI surface → localization/catalog updates →
targeted validation → documentation convergence.

## CONVERGENCE_CHECKLIST (post-implementation)

- [ ] Spec status updated (`CURRENT` or `NOT YET IMPLEMENTED` with reasons)
- [ ] Canonical docs updated in the same change (Documentation With Change,
      DOCUMENTATION-GOVERNANCE §2.7)
- [ ] ADR recorded if the plan declared one
- [ ] `CURRENT_STATE.md` / `TASKS.md` lifecycle fields updated per close-out
      convention
- [ ] Report per `docs/AI_CHANGE_TEMPLATE.md` (REPORT_PERSISTED / VALIDATED /
      DELIVERED contract)

## HANDOFF

| Field | Value |
|---|---|
| CURRENT_STATUS | e.g. `BREAKDOWN_DRAFTED` / `IN_PROGRESS` / `CONVERGED` |
| NEXT_ACTION | single next concrete step |
| NEXT_ACTION_AUTONOMOUS | `YES` / `NO` |
| BLOCKERS | none / list |
