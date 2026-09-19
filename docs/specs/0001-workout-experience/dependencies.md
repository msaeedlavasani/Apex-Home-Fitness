# Dependencies — Workout Experience V2 (`WORKOUT-V2-IMPL-01`)

| Field | Value |
|---|---|
| STATUS | `READY — dependency analysis for CRITICAL admission` |
| SPEC | [`spec.md`](./spec.md) · PLAN: [`plan.md`](./plan.md) · WORK PACKAGES: [`tasks.md`](./tasks.md) |
| Date | 2026-09-15 · Baseline: fresh main `897e376` |
| IMPLEMENTATION | **NOT AUTHORIZED** |

## 1. Dependency graph (design graph — not a required code shape)

```
WP-01 Session-core contract extension
  └── (hard) ─► WP-02 Orchestration layer
                   ├── design output: presentation view-model contract (frozen when WP-02 starts its design; not a WP-02 completion dependency)
                   ├── (hard) ─► WP-04 Experience shell  ── (hard) ─► WP-05 START + PREPARING (first planned slice)
                   ├── (hard) ─► WP-06 SET + SET_RESULT + mode-aware progress (Run 1 / Workstream A)
                   ├── (hard) ─► WP-07 REST (Run 1 / Workstream B)
                   ├── (hard) ─► WP-08 Controls surface + outcome consumption
                   └── (soft) ─► WP-09 Mentor presentation boundary + degraded mode (consumes the view-model)
WP-03 Prescription resolution contract ── (hard) ─► consumed by WP-06 / WP-07
WP-10 Audio cues + accessibility — (software/cross-cutting) asserts on every stage WP
WP-12 WORKOUT_RESULT + EXIT ── (hard) ─► after accepted WP-06 + WP-07
GATE-01 Block-Completeness Audit ── (hard) ─► after accepted WP-05/06/07/12; audits all required capabilities
WP-11 Convergence & release path — (hard) depends on all implementing WPs and GATE-01
```

<!-- WORKOUT_V2_AUTONOMOUS_DAG:BEGIN -->
```json
{
  "schema": 1,
  "nodes": [
    {"id":"WP-01","dependsOn":[],"kind":"WORK_PACKAGE"},
    {"id":"WP-02","dependsOn":["WP-01"],"kind":"WORK_PACKAGE"},
    {"id":"WP-03","dependsOn":[],"kind":"WORK_PACKAGE"},
    {"id":"WP-04","dependsOn":["WP-02"],"kind":"WORK_PACKAGE"},
    {"id":"WP-05","dependsOn":["WP-02","WP-04"],"kind":"WORK_PACKAGE"},
    {"id":"WP-06","dependsOn":["WP-02","WP-03","WP-05"],"kind":"WORK_PACKAGE","workstream":"A","ownerVisualGate":false},
    {"id":"WP-07","dependsOn":["WP-02","WP-03","WP-05"],"kind":"WORK_PACKAGE","workstream":"B","ownerVisualGate":false},
    {"id":"WP-08","dependsOn":["WP-02","WP-06","WP-07"],"kind":"WORK_PACKAGE"},
    {"id":"WP-09","dependsOn":["WP-02"],"softDependsOn":["WP-06"],"kind":"WORK_PACKAGE"},
    {"id":"WP-10","dependsOn":["WP-05"],"kind":"WORK_PACKAGE"},
    {"id":"WP-12","dependsOn":["WP-06","WP-07"],"kind":"WORK_PACKAGE"},
    {"id":"GATE-01","dependsOn":["WP-05","WP-06","WP-07","WP-12"],"kind":"GATE"},
    {"id":"RUN-4-PROGRAM-COMPOSITION","dependsOn":["GATE-01"],"kind":"COMPOSITION"},
    {"id":"RUN-5-OWNER-ACCEPTANCE","dependsOn":["RUN-4-PROGRAM-COMPOSITION"],"kind":"HUMAN_GATE","ownerVisualGate":true,"gateScope":"COMPLETE_FLOW"}
  ]
}
```
<!-- WORKOUT_V2_AUTONOMOUS_DAG:END -->

Cross-cutting capabilities: **Session Controls** (WP-08) · **Progress** (WP-06) · **Mentor Presentation** (WP-09) · **Functional Audio** (WP-10) · **Accessibility** (WP-10, asserted per stage) · **Persistence/Resume** (existing snapshot contract; WP-01 must keep it intact).

Owner visual acceptance is a milestone gate, not a work-package dependency:
WP-06 and WP-07 have no Owner visual gate. The only Owner visual gate in this
DAG is `RUN-5-OWNER-ACCEPTANCE`, and its scope is the complete program-driven
experience after composition and machine/integration verification.

## 2. Hard dependencies

- WP-02 requires WP-01 (orchestration needs the extended module/phase contract).
- WP-04 requires the **presentation view-model contract** (a design output that WP-02 freezes when its design starts — see §5).
- WP-05 requires WP-02 (orchestration actions/state) **and** WP-04 (the shell it presents inside).
- WP-06/07/08 require WP-02 (they consume orchestration state/actions, never sequence themselves).
- WP-06/07 require WP-03 (mode + targets must be explicit on the resolved prescription).
- WP-12 requires accepted Run 1 capabilities (WP-06 + WP-07); it owns neither Run 1 capability and consumes orchestration actions rather than owning control sequencing.
- GATE-01 requires the accepted START/PREPARING/INTRO boundary plus accepted Run 1/Run 2 blocks; it audits every required reusable/cross-cutting capability, does not assume missing capabilities are complete, and does not itself implement or admit a missing capability.
- WP-11 requires every implementing WP terminal and GATE-01 PASS.

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
| 4 | WP-08 · WP-10 | controls surface + audio/a11y; both consume frozen stage contracts |
| 5 | WP-12 (after WP-06 + WP-07) | Run 2 result/Exit block follows the frozen Run 1 capabilities |
| 6 | GATE-01 → program-driven Prototype Composition only after PASS | completeness is audited explicitly before composition |

Parallel work must never edit the same contract file concurrently; contract changes go through the owning WP. WP-04/WP-09 may start in wave 2 **only** because the view-model contract is a design output frozen at WP-02's design start — if that freeze slips, they wait (they never invent their own view-model).

## 6. Conflict / resource boundaries

- **Orchestration is a single writer** — WP-02 owns `orchestration` contract; other WPs consume it.
- **Session core is a single writer** — WP-01 owns the core extension; later WPs consume.
- **Presentation modules must not import each other's internals**; shared view-model lives with the presentation contract.
- **No WP may write the canonical prescription** (controls are session-scoped).
- **DB/schema**: WP-03 decides whether an additive data representation is required; if so it runs as a **DB_CHANGE** gate inside that WP, never as a side effect of another WP.

## 7. Sufficiency statement (for CRITICAL admission)

This analysis identifies: hard dependencies (WP-01→02→{05,06,07,08}, WP-03→{06,07}, {06,07,08}→12→GATE-01→composition), soft dependencies (WP-04/09 on the view-model shape), independently implementable Run 1 workstreams (WP-06 and WP-07), safe parallelism (six waves above), and conflict boundaries (single-writer orchestration, no prescription writes, DB change isolated to WP-03). It is sufficient for preparation: each roadmap stage is explicit, Run 1 capabilities remain independent, and full composition is gated by an explicit completeness PASS.
