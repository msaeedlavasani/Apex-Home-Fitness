# AHF Spec Kit — Brownfield Scaffolding

> **STATUS: CURRENT — scaffolding contract for forward-looking feature specs**
> Authorized by owner decision D1 (OPTION A, 2026-09-14) — see
> [`../governance/OWNER_DECISION_GATE.md`](../governance/OWNER_DECISION_GATE.md)
> and [`../governance/AHF-SPECKIT-BROWNFIELD-ADOPTION-DESIGN.md`](../governance/AHF-SPECKIT-BROWNFIELD-ADOPTION-DESIGN.md).

## Purpose

`docs/specs/` is the single home for **forward-looking feature specifications**
produced through the Spec Kit workflow. It exists to make the next feature's
requirements, clarifications, and acceptance reviewable *before* implementation —
it does not replace any existing authority.

## Binding rules (existing authority, restated nowhere)

1. **One backlog.** [`../TASKS.md`](../TASKS.md) remains the ONLY executable
   backlog. A `docs/specs/<feature>/tasks.md` file is a feature-local work
   breakdown linked FROM a `TASKS.md` entry — it is NOT authorization to
   execute work on its own.
2. **Find-Before-Create / Update-Before-Duplicate**
   ([`../governance/DOCUMENTATION-GOVERNANCE.md`](../governance/DOCUMENTATION-GOVERNANCE.md)
   §2) applies here: specs link to canonical policy; they never restate it.
3. **Code is implementation evidence, not product intent.** Specs state
   requirements; observed behavior becomes a requirement only through an owner
   decision recorded in the spec.
4. **Status discipline.** Every spec carries a status header using the
   repository vocabulary (`CURRENT`, `PROPOSED`, `NOT YET IMPLEMENTED`,
   `HISTORICAL`, `DEPRECATED`, `SUPERSEDED`).
5. **No retro-specs.** The existing system is described once, in
   [`../CURRENT_SYSTEM_BASELINE.md`](../CURRENT_SYSTEM_BASELINE.md) — not in
   per-feature specs.

## Directory contract

```text
docs/specs/
  NNNN-slug/          # one directory per feature (NNNN = zero-padded sequence)
    spec.md           # required (STANDARD and CRITICAL); linked FROM the
                      #   authoring TASKS.md entry (spec template field
                      #   `TASKS.md entry`)
    plan.md           # CRITICAL only (optional appendix for STANDARD)
    tasks.md          # CRITICAL only; linked FROM docs/TASKS.md
```

Do not create a feature directory before the corresponding `TASKS.md` entry
exists (LIGHT work never touches `docs/specs/`).

## Workflow classes (declared in the TASKS.md entry)

| Class | Spec Kit artifacts | Typical scope | Machine profile |
|---|---|---|---|
| **LIGHT** | none | typo/copy fix, isolated visual fix, local refactor without contract change, low-risk dependency patch | `DOCS_ONLY` / existing targeted validation |
| **STANDARD** | `spec.md` (thin; ≤ ~150 lines) + one clarify pass | ordinary feature/fix behind existing surfaces | `CODE_NO_DEPLOY` |
| **CRITICAL** | full `spec.md` + `plan.md` + `tasks.md` + cross-artifact check | auth, AI behavior/security, schema/database, deployment, production topology, security/privacy boundaries, cross-plane data changes | `PRODUCTION_BOUND` / `DB_CHANGE` / `HOTFIX` per `scripts/governance-runtime.mjs` |

Spec-first and clarify are new process expectations (CANDIDATE rules in
[`../../.specify/constitution.md`](../../.specify/constitution.md)); they do not
alter machine task-profile behavior. Any machine-enforcement of spec artifacts
is a separately authorized Stage-6 tooling task and is NOT active.

## Templates

- [`../../.specify/templates/spec-template.md`](../../.specify/templates/spec-template.md)
- [`../../.specify/templates/plan-template.md`](../../.specify/templates/plan-template.md)
- [`../../.specify/templates/tasks-template.md`](../../.specify/templates/tasks-template.md)

Templates are AHF-adapted and tool-agnostic: they assume no specific agent,
model, or vendor. Any agent able to read the repository can execute the
workflow; handoff state lives in the artifacts, never in a conversation.
