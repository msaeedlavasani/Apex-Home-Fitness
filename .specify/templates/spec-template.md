# SPEC — <Feature title>

<!--
AHF Spec Kit spec template (Stage 1 scaffolding; tool-agnostic).
Rules:
- One spec per feature directory: docs/specs/NNNN-slug/spec.md.
- A TASKS.md entry MUST exist and be linked below before this file is created.
- Link to canonical policy; never restate it (DOCUMENTATION-GOVERNANCE §2).
- STANDARD specs target <= ~150 lines before appendices. If it grows beyond
  that, split the work or reclassify as CRITICAL.
- Unknown stays UNKNOWN: use `UNKNOWN / OWNER DECISION` instead of guessing.
-->

| Field | Value |
|---|---|
| STATUS | `PROPOSED` / `CURRENT` / `NOT YET IMPLEMENTED` / `SUPERSEDED (by: …)` |
| SPEC_CLASS | `STANDARD` / `CRITICAL` (LIGHT work does not use specs) |
| TASK_PROFILE | `CODE_NO_DEPLOY` / `PRODUCTION_BOUND` / `DB_CHANGE` / `HOTFIX` (per `scripts/governance-runtime.mjs`) |
| OWNER_GATE | none / pending / decided (`<ID>` + date) |
| TASKS.md entry | link to the authorizing `docs/TASKS.md` entry (REQUIRED) |
| Date | YYYY-MM-DD |

## CURRENT_STATE_EVIDENCE

What exists today that this change touches, each with a file path, contract, or
[`../CURRENT_SYSTEM_BASELINE.md`](../CURRENT_SYSTEM_BASELINE.md) reference.
Distinguish `OBSERVED CURRENT STATE` from product policy; never infer intent
from implementation.

## PRODUCT_REQUIREMENTS

Numbered requirements with their source (owner instruction, product-vision doc,
TASKS.md entry, or `UNKNOWN / OWNER DECISION`). Requirements without a source
are not requirements.

## NON_GOALS

Explicitly out of scope; protects the smallest-safe boundary.

## OPEN_QUESTIONS

One clarify pass per STANDARD spec. Each item: question, evidence available,
resolution path (owner decision / repository evidence / measurement). Resolved
items move into PRODUCT_REQUIREMENTS with their source.

## ACCEPTANCE_CRITERIA

Checkable statements tied to requirements. Include the validation lanes
(`docs/CI.md`) that prove each criterion where applicable.

## ARCHITECTURE_IMPACT

Module boundaries touched; new dependency or boundary; ADR needed
(yes/no + why); session-core purity and one-way dependency direction preserved
(yes/no). Reference `docs/architecture/ARCHITECTURE-PRINCIPLES.md` sections
instead of restating them.

## SECURITY_PRIVACY_IMPACT

Auth surface, CSP changes, secrets, rate limiting, data classification
(TS-01 C1–C7), privacy posture (raw-video-never-leaves-device, non-persistence
default). State `NONE` explicitly when none.

## LOCALIZATION_IMPACT

`/en` and `/fa` parity, RTL, message catalogs (`src/messages/`), movement-domain
keys (MG-07). State `NONE` explicitly when none.

## TESTING_REQUIREMENTS

Targeted unit/contract/E2E lanes per `docs/CI.md`; new tests required;
test-debt interaction (`docs/TEST-DEBT.md`).

## ROLLBACK

Small, safe rollback: what reverts, what data persists, deployment implications
(none expected for CODE_NO_DEPLOY).

## HANDOFF

| Field | Value |
|---|---|
| CURRENT_STATUS | e.g. `SPEC_DRAFTED` / `CLARIFIED` / `IMPLEMENTED_CONVERGED` |
| NEXT_ACTION | the single next concrete step |
| NEXT_ACTION_AUTONOMOUS | `YES` / `NO` (NO when an owner/Production gate applies) |
| BLOCKERS | none / list |
