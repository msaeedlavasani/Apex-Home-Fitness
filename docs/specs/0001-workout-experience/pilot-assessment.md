# Pilot Assessment — Spec Kit Stage 4 (Workout Experience Specification)

> **STATUS: PILOT ARTIFACT — evaluation record (2026-09-14)**
> This file is a pilot-only output (Stage 4, D2). It is not part of the standing
> spec directory contract and changes nothing in global governance or templates.
> Findings are recommendations only.

| Field | Value |
|---|---|
| Pilot | Workout Experience Specification (`docs/specs/0001-workout-experience/`) |
| Pilot class | `STANDARD` (docs-only; implementation expected CRITICAL later) |
| Date | 2026-09-14 · Baseline main `80b6eb5` · Prototype evidence DEV `prototype/workout-layout-blueprint` @ `a62a7ce` |

## Evaluation

| Question | Finding |
|---|---|
| Was existing governance duplicated? | **No.** The spec routes by reference (traceability §19); `docs/TASKS.md` stayed the only backlog; the constitution was not restated. One structural cost: the spec's source table inevitably enumerates canonical docs — routing, not duplication. |
| Did the spec clarify product intent? | **Yes, materially.** A registered advisory vision (`WORKOUT-EXPERIENCE-V2.md`, "NOT YET IMPLEMENTED") plus a prototype exploration became a labeled contract: principles CONFIRMED against `PRODUCT-VISION.md`, direction CANDIDATE, and 13 blocking decisions surfaced explicitly (U-1…U-13). The largest clarification: separating *exploration* from *intent*. |
| Did prototype evidence stay separate from requirements? | **Yes.** Prototype content lives only in §14 (evidence table with an explicit "product-approved?" column) and §15 (explicit non-requirements). No prototype behavior appears as CONFIRMED. Three.js, the GLB asset, the CSP relaxation and the iOS bridge are all recorded as implementation details, not requirements. |
| Did the process create unnecessary overhead? | **Moderate.** The mandated section set produced a **229-line** spec (vs the STANDARD guidance of ≤ ~150 lines). The length is content-driven (behavior surface + evidence separation + unknowns), not padding — but the STANDARD line budget does not fit experience-scale specs. |
| Independent review outcome | **PASS after correction.** Reviewer findings: 3 structural contradictions (STANDARD label vs owner-mandated CRITICAL-shaped artifact set; missing ADR-0005 mobile-posture declaration; section structure diverging from the Stage-1 template), 1 unsupported citation (V2 §26), 3 hidden-as-assumption items (CONFIRMED-by-implementation rows; code paths as requirement sources; imperative tasks.md phrasing), 2 broken/imprecise references. All corrected in the same change; 0 unresolved contradictions remain. |
| Was the STANDARD workflow size appropriate? | **Class: yes. Size: exceeded.** Docs-only, no cross-plane risk → STANDARD was correct. The artifact-size mismatch suggests a template variant (see recommendations). |
| Is the spec usable by a different implementation agent/model? | **Yes.** Spec + plan + tasks are self-contained in-repo with HANDOFF blocks; the independent reviewer (separate context) read and evaluated all three without the authoring conversation — practical evidence of cross-agent legibility. |
| Unresolved ambiguities blocking implementation? | **Yes — intentionally.** U-1…U-13; the highest-leverage blockers are U-5 (3D mentor necessity/fallback/fidelity), U-1 (execution types + data ownership) and U-2 (timing defaults). Implementation must not start before these are resolved. |
| Should the workflow/templates change before the next spec? | **Recommendations only** (not applied — a separate owner decision would be required): ① add an **experience-scale spec allowance** (core ≤ ~150 lines + labelled appendices) and an explicit rule for owner-mandated full artifact sets like this pilot's (spec+plan+tasks+assessment under a STANDARD work class); ② promote an **EVIDENCE** section/label into the spec template — prototype/observed-evidence separation proved essential and should be first-class; ③ standardize a "Blocking owner decisions" table convention with IDs; ④ consider a lightweight pilot-assessment template so Stage-4-style evaluations are repeatable; ⑤ make the mobile-posture declaration (`WEB-SPECIFIC`/`CLIENT-AGNOSTIC`, ADR-0005 guardrail 3) an explicit template field — it was missed on first authoring and caught only by independent review. |

## Verdict

`PASS` — the pilot produced a usable, evidence-separated, governance-conformant specification and did not duplicate existing authority. Independent review found 9 findings across 4 categories; all were corrected within the spec/design boundary without inventing owner intent (contradictions 3→0, unsupported 1→0, hidden-assumptions 3→0, broken references 2→0).

Key pilot product: the **owner-mandate exceptions** (full artifact set + expanded sections under a STANDARD work class) and the **artifact-size mismatch** are the two places where the standing workflow did not fit — both recorded rather than silently bent.

## Explicitly unchanged by this pilot

- No global template change; no governance-machine change (`governance-runtime.mjs` untouched).
- Constitution remains `PROPOSED / NON-BINDING`.
- No implementation authorized or started.
