# Dependencies — Workout Experience V2 (`WORKOUT-V2-IMPL-01`)

| Field | Value |
|---|---|
| STATUS | `RUN 1 CLOSED — dependency graph remains canonical for subsequent admission` |
| SPEC | [`spec.md`](./spec.md) · PLAN: [`plan.md`](./plan.md) · WORK PACKAGES: [`tasks.md`](./tasks.md) |
| Date | 2026-09-15 · Baseline: fresh main `897e376` |
| IMPLEMENTATION | **AUTHORIZED by parent admission; WP-06/WP-07 Run 1 CLOSED/FROZEN** |

## 1. Dependency graph (design graph — not a required code shape)

```
WP-01 Session-core contract extension
  └── (hard) ─► WP-02 Orchestration layer
                   ├── design output: presentation view-model contract (frozen when WP-02 starts its design; not a WP-02 completion dependency)
                   ├── (hard) ─► WP-04 Experience shell  ── (hard) ─► WP-05 START + PREPARING (first planned slice)
                   ├── (hard) ─► WP-06 SET + SET_RESULT + mode-aware progress (Run 1 / Workstream A)
                   ├── (hard) ─► WP-07 REST (Run 1 / Workstream B)
                   ├── (hard) ─► WP-14 Orchestration control-state reconciliation
                   ├── (hard) ─► WP-08 Controls surface + outcome consumption (after WP-14)
                   └── (soft) ─► WP-09 Mentor presentation boundary + degraded mode (consumes the view-model)
WP-03 Prescription resolution contract ── (hard) ─► consumed by WP-06 / WP-07
WP-03 ── (hard) ─► WP-13 Shared Program ↔ Workout prescription contract
WP-10 Audio cues + accessibility — (software/cross-cutting) asserts on every stage WP
WP-12 WORKOUT_RESULT + EXIT ── (hard) ─► after accepted WP-06 + WP-07 + WP-13
GATE-01 Block-Completeness Audit ── (hard) ─► after accepted WP-05/06/07/12; audits all required capabilities
WP-11 Convergence & release path — (hard) depends on all implementing WPs and GATE-01
```

<!-- WORKOUT_V2_AUTONOMOUS_DAG:BEGIN -->
```json
{
  "schema": 1,
  "nodes": [
    {"id":"WP-01","dependsOn":[],"kind":"WORK_PACKAGE"},
    {"id":"WP-02","dependsOn":["WP-01"],"kind":"WORK_PACKAGE","providesCapabilities":["V2_PRESENTATION_VIEW_MODEL_V1"]},
    {"id":"WP-03","dependsOn":[],"kind":"WORK_PACKAGE","providesCapabilities":["V2_PRESCRIPTION_RESOLUTION_AUTHORITY_V1"]},
    {"id":"WP-04","dependsOn":["WP-02"],"kind":"WORK_PACKAGE"},
    {"id":"WP-05","dependsOn":["WP-02","WP-04"],"kind":"WORK_PACKAGE","providesCapabilities":["V2_START_PREPARING_INTRO_SURFACES_V1"]},
    {"id":"WP-06","dependsOn":["WP-02","WP-03","WP-05"],"kind":"WORK_PACKAGE","workstream":"A","ownerVisualGate":false,"status":"CLOSED","frozen":true,"admissionPath":"docs/admissions/WP-06.admission.json","verification":"PASS","providesCapabilities":["V2_SET_RESULT_CAPABILITY_V1"]},
    {"id":"WP-07","dependsOn":["WP-02","WP-03","WP-05"],"kind":"WORK_PACKAGE","workstream":"B","ownerVisualGate":false,"status":"CLOSED","frozen":true,"admissionPath":"docs/admissions/WP-07.admission.json","verification":"PASS","providesCapabilities":["V2_REST_CAPABILITY_V1"]},
    {"id":"WP-14","dependsOn":["WP-02","WP-06","WP-07"],"kind":"WORK_PACKAGE","workstream":"ORCHESTRATION_RECONCILIATION","ownerVisualGate":false,"requiresCapabilities":[{"id":"V2_PRESENTATION_VIEW_MODEL_V1","provider":"WP-02"},{"id":"V2_SET_RESULT_CAPABILITY_V1","provider":"WP-06"},{"id":"V2_REST_CAPABILITY_V1","provider":"WP-07"}],"providesCapabilities":["V2_SESSION_CONTROL_ACTIONS_V1","V2_DEFERRED_SKIPPED_STATE_V1","V2_COMPLETION_ELIGIBILITY_V1","V2_EXIT_ORCHESTRATION_ACTION_V1"]},
    {"id":"WP-08","dependsOn":["WP-02","WP-06","WP-07","WP-14"],"kind":"WORK_PACKAGE","requiresCapabilities":[{"id":"V2_SESSION_CONTROL_ACTIONS_V1","provider":"WP-14"},{"id":"V2_DEFERRED_SKIPPED_STATE_V1","provider":"WP-14"},{"id":"V2_COMPLETION_ELIGIBILITY_V1","provider":"WP-14"},{"id":"V2_EXIT_ORCHESTRATION_ACTION_V1","provider":"WP-14"},{"id":"V2_SET_RESULT_CAPABILITY_V1","provider":"WP-06"},{"id":"V2_REST_CAPABILITY_V1","provider":"WP-07"}]},
    {"id":"WP-09","dependsOn":["WP-02"],"softDependsOn":["WP-06"],"kind":"WORK_PACKAGE","requiresCapabilities":[{"id":"V2_PRESENTATION_VIEW_MODEL_V1","provider":"WP-02"}]},
    {"id":"WP-10","dependsOn":["WP-05"],"kind":"WORK_PACKAGE","requiresCapabilities":[{"id":"V2_START_PREPARING_INTRO_SURFACES_V1","provider":"WP-05"}]},
    {"id":"WP-12","dependsOn":["WP-06","WP-07","WP-13","WP-14"],"kind":"WORK_PACKAGE","requiresCapabilities":[{"id":"V2_DEFERRED_SKIPPED_STATE_V1","provider":"WP-14"},{"id":"V2_COMPLETION_ELIGIBILITY_V1","provider":"WP-14"},{"id":"V2_EXIT_ORCHESTRATION_ACTION_V1","provider":"WP-14"},{"id":"V2_SHARED_PRESCRIPTION_CONTRACT_V1","provider":"WP-13"}]},
    {"id":"WP-13","dependsOn":["WP-03"],"kind":"WORK_PACKAGE","workstream":"SHARED_CONTRACT","ownerVisualGate":false,"requiresCapabilities":[{"id":"V2_PRESCRIPTION_RESOLUTION_AUTHORITY_V1","provider":"WP-03"}],"providesCapabilities":["V2_SHARED_PRESCRIPTION_CONTRACT_V1"]},
    {"id":"GATE-01","dependsOn":["WP-05","WP-06","WP-07","WP-12"],"kind":"GATE"},
    {"id":"RUN-4-PROGRAM-COMPOSITION","dependsOn":["GATE-01"],"kind":"COMPOSITION"},
    {"id":"RUN-5-OWNER-ACCEPTANCE","dependsOn":["RUN-4-PROGRAM-COMPOSITION"],"kind":"HUMAN_GATE","ownerVisualGate":true,"gateScope":"COMPLETE_FLOW"}
  ]
}
```
<!-- WORKOUT_V2_AUTONOMOUS_DAG:END -->

Cross-cutting capabilities: **Session Controls** (WP-14 orchestration authority + WP-08 surface) · **Progress** (WP-06) · **Mentor Presentation** (WP-09) · **Functional Audio** (WP-10) · **Shared Program ↔ Workout prescription contract** (WP-13) · **Accessibility** (WP-10, asserted per stage) · **Persistence/Resume** (existing snapshot contract; WP-01 must keep it intact).

Owner visual acceptance is a milestone gate, not a work-package dependency:
WP-06 and WP-07 have no Owner visual gate. The only Owner visual gate in this
DAG is `RUN-5-OWNER-ACCEPTANCE`, and its scope is the complete program-driven
experience after composition and machine/integration verification.

Run 1 close-out: `WP-06` and `WP-07` are CLOSED/FROZEN after their required
child admissions, task-scoped verification, and report validation. The
previous selector incorrectly treated manually assigned `NOT_YET` fields as
independent gates even after dependencies were satisfied. The selector now
derives readiness for ordinary autonomous nodes from the DAG, capability
providers, and governance state. `WP-02` remains historically CLOSED/FROZEN
for its admitted scope; it does not claim the later control-state
capabilities. `WP-14` is the explicit follow-up prerequisite for those
capabilities, so `WP-08` is not READY until WP-14 is verified and frozen. The
current derived candidates are `WP-09`, `WP-10`, `WP-13`, and `WP-14`;
`WP-08` is deterministically blocked by WP-14 and its missing capability set,
while `WP-12` is blocked by WP-13 and WP-14 rather than by a manual promotion
field.
Evidence: [`WP-06-closeout.json`](../../../reports/workout-v2-impl-01/WP-06-closeout.json),
[`WP-07-closeout.json`](../../../reports/workout-v2-impl-01/WP-07-closeout.json).

## 2. Hard dependencies

- WP-02 requires WP-01 (orchestration needs the extended module/phase contract).
- WP-04 requires the **presentation view-model contract** (a design output that WP-02 freezes when its design starts — see §5).
- WP-05 requires WP-02 (orchestration actions/state) **and** WP-04 (the shell it presents inside).
- WP-06/07 require WP-02 (they consume orchestration state/actions, never sequence themselves).
- WP-14 is a narrowly scoped follow-up owned by the orchestration authority. It extends the frozen WP-02 boundary with the approved session-control actions, deferred/skipped state, completion eligibility, and exit action contract; it does not reopen or rewrite WP-02's historical close-out.
- WP-08 requires WP-14 plus the frozen SET/SET_RESULT and REST capability contracts. WP-08 remains a consumer/control-surface task and does not own any orchestration state or transitions.
- WP-06/07 require WP-03 (mode + targets must be explicit on the resolved prescription).
- WP-13 requires the existing WP-03 resolution authority and establishes the shared, versioned Program ↔ Workout resolved-prescription boundary before later integration.
- WP-12 requires accepted Run 1 capabilities (WP-06 + WP-07), **WP-13**, and the verified WP-14 control-state capability; it owns neither Run 1 capability and consumes orchestration actions rather than owning control sequencing.
- GATE-01 requires the accepted START/PREPARING/INTRO boundary plus accepted Run 1/Run 2 blocks; it audits every required reusable/cross-cutting capability, does not assume missing capabilities are complete, and does not itself implement or admit a missing capability.
- WP-11 requires every implementing WP terminal and GATE-01 PASS.

### 2.1 Capability-readiness audit

Readiness now distinguishes a named predecessor from the capability contract
that predecessor actually provides:

| Node | Required capability boundary | Canonical provider | Readiness result |
|---|---|---|---|
| WP-08 | control actions, deferred/skipped state, completion eligibility, exit action | WP-14 | blocked until WP-14 closes; WP-02 alone is insufficient |
| WP-09 | frozen presentation view-model | WP-02 | satisfied; mentor remains a consumer and owns no session logic |
| WP-10 | existing START/PREPARING/INTRO stage surfaces | WP-05 | satisfied; later-stage assertions remain soft freeze evidence, not a hidden start blocker |
| WP-13 | prescription-resolution authority | WP-03 | satisfied; this task does not add orchestration ownership |
| WP-12 | deferred/skipped state, completion eligibility, exit action, shared prescription contract | WP-14 + WP-13 | blocked until both providers close |

This prevents a task from becoming `READY_DERIVED` merely because a historical
predecessor is CLOSED when the required capability is absent or unrepresented.

## 3. Soft dependencies

- WP-09 (mentor) depends on the **view-model shape** and can proceed once it is frozen; it must not block WP-06/07 (degraded mode is the default-safe path).
- WP-10 (audio/a11y) asserts per stage; it does not block a stage's implementation but **does** participate in that stage's freeze.

## 4. Independently implementable work

- WP-01 and WP-03 are largely independent of each other (core contract vs prescription resolution) and can proceed in parallel immediately.
- WP-09 is independent once the view-model shape is frozen; the GLB/asset work is independent of session logic.
- WP-04 is implementable independently **once the view-model contract is frozen** (it does not need WP-02's implementation to complete).

## 5. Safe parallelism (recommended)

| Wave | Parallel work | Reason |
|---|---|---|
| 1 | WP-01 · WP-03 | no shared files; distinct contracts; both available immediately |
| 2 | WP-02 (after WP-01) · WP-04 (after the view-model contract freeze) · WP-09 (after the view-model contract freeze) | WP-04 and WP-09 consume WP-02's frozen view-model contract; WP-09 must not depend on WP-02 completion (degraded-first) |
| 3 | WP-05 (after WP-02 + WP-04) → then WP-06 ∥ WP-07 (after WP-03 + WP-02) | Run 1 Workstream A/B remain independent; orchestration contract is frozen before stages |
| 4 | WP-09 · WP-10 ∥ WP-13 ∥ WP-14 | mentor/a11y assertions and the shared prescription contract remain independently scoped; WP-14 reconciles the missing orchestration control-state boundary |
| 5 | WP-08 (after WP-14) | controls consume the verified orchestration capability plus frozen SET/REST contracts |
| 6 | WP-12 (after WP-06 + WP-07 + WP-13 + WP-14) | Run 2 result/Exit block follows the frozen Run 1 capabilities, shared contract, and control-state authority |
| 7 | GATE-01 → program-driven Prototype Composition only after PASS | completeness is audited explicitly before composition |

Parallel work must never edit the same contract file concurrently; contract changes go through the owning WP. WP-04/WP-09 may start in wave 2 **only** because the view-model contract is a design output frozen at WP-02's design start — if that freeze slips, they wait (they never invent their own view-model).

## 6. Conflict / resource boundaries

- **Orchestration is a single writer** — WP-02 owns the frozen base orchestration contract; WP-14 is the only follow-up extension authority for the explicitly missing control-state capability. Other WPs consume both contracts and do not sequence.
- **Session core is a single writer** — WP-01 owns the core extension; later WPs consume.
- **Presentation modules must not import each other's internals**; shared view-model lives with the presentation contract.
- **No WP may write the canonical prescription** (controls are session-scoped).
- **DB/schema**: WP-03 decides whether an additive data representation is required; if so it runs as a **DB_CHANGE** gate inside that WP, never as a side effect of another WP.

## 7. Sufficiency statement (for CRITICAL admission)

This analysis identifies: hard dependencies (WP-01→02→{05,06,07,14}→08, WP-03→{06,07,13}, {06,07,13,14}→12→GATE-01→composition), explicit capability providers/consumers, soft dependencies (WP-04/09 on the view-model shape), independently implementable Run 1 workstreams (WP-06 and WP-07), safe parallelism, and conflict boundaries (single-writer orchestration, no prescription writes, DB change isolated to WP-03). It is sufficient for preparation: each roadmap stage is explicit, WP-02's historical freeze is preserved, missing control-state capability is represented as WP-14, and full composition is gated by an explicit completeness PASS.
