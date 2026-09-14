# AHF Constitution — Spec Kit Router

> **STATUS: RATIFIED (PARTIAL) 2026-09-14 — §2 CONFIRMED routing + §3 P1/P3 ratified (Stage 6, owner-authorized); §3 P2/P4 remain CANDIDATE / NON-BINDING (exact owner gates recorded below)**
>
> This document is a **router, not an authority**. It points at the existing
> canonical rules so any agent or model gets one entry point into AHF's
> binding rules. It restates nothing: every rule below is owned by its cited
> canonical document, which remains fully authoritative. On any conflict,
> **the cited authority wins and this document must be corrected**.
>
> Authority hierarchy: unchanged and owned by
> [`docs/governance/DOCUMENTATION-GOVERNANCE.md`](../docs/governance/DOCUMENTATION-GOVERNANCE.md) §4.
> Ratifying this constitution creates no new authority; it only ratifies the
> ROUTING and the small set of CANDIDATE amendments in §3.

---

## 1. How to read this document

- **CONFIRMED** — the principle is already binding through its canonical
  owner. This section only routes to it.
- **CANDIDATE** — a new, Spec-Kit-specific expectation proposed by the adopted
  brownfield design. CANDIDATE items are **NOT binding** until the owner
  ratifies them explicitly (Decision Persistence,
  `DOCUMENTATION-GOVERNANCE.md` §2.12). Nothing here silently promotes a
  CANDIDATE rule to binding.

## 2. CONFIRMED — already binding (by reference)

| # | Principle | Canonical owner (authoritative) |
|---|---|---|
| C1 | Reuse first: `reuse → extend → compose → create` | [`AGENTS.md`](../AGENTS.md) §3 |
| C2 | One-way dependency direction: Presentation → Domain → Infrastructure | [`docs/architecture/ARCHITECTURE-PRINCIPLES.md`](../docs/architecture/ARCHITECTURE-PRINCIPLES.md) §4 |
| C3 | UI/domain separation; framework-independent core + React adapter | ARCHITECTURE-PRINCIPLES §5; [ADR-0002](../docs/adr/0002-pure-workout-session-core.md); session-engine rule §13.4 |
| C4 | Side-effect isolation with injectable seams | ARCHITECTURE-PRINCIPLES §6 |
| C5 | Durable identity over display labels (`exerciseId`) | [ADR-0001](../docs/adr/0001-canonical-exercise-identity.md); PRINCIPLES §7 |
| C6 | Source independence (AI / rules / coach / manual produce the same Program contract) | PRINCIPLES §8 |
| C7 | Backward-compatible, additive evolution | PRINCIPLES §9 |
| C8 | Explicit public vs internal module boundaries | PRINCIPLES §10 |
| C9 | Documentation with change; status headers; explicit supersession | [`docs/governance/DOCUMENTATION-GOVERNANCE.md`](../docs/governance/DOCUMENTATION-GOVERNANCE.md) §2.3/2.4/2.7 |
| C10 | Production safety: task complete only at verified checkpoint; real-browser acceptance; HTTP 200 is not acceptance | [`docs/RELEASE_POLICY.md`](../docs/RELEASE_POLICY.md) RULE 1/6/7 |
| C11 | No silent behavior change; fail-closed over fail-open (incl. AI fallback classification) | [`docs/RELEASE_POLICY.md`](../docs/RELEASE_POLICY.md) RULE 4 + [`docs/FEATURE_TO_PRODUCTION.md`](../docs/FEATURE_TO_PRODUCTION.md) §T; [`src/lib/ai/provider.ts`](../src/lib/ai/provider.ts) contract; TS-01 privacy posture ([ADR-0014](../docs/adr/0014-privacy-safety-architecture.md)) |
| C12 | Testing proportionality: targeted verification first; full E2E stays nightly | [`docs/CI.md`](../docs/CI.md); [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| C13 | Deployment identity: immutable builds, exact-SHA, build-time vs runtime config | RELEASE_POLICY RULE 4/5 |
| C14 | Privacy/safety boundaries: raw video never leaves the device; fitness-not-medical; DATA-ONLY media | [ADR-0014](../docs/adr/0014-privacy-safety-architecture.md); [ADR-0021](../docs/adr/0021-companion-camera-architecture.md); MG-04 gate |
| C15 | Localization: `/en` + `/fa` parity, RTL, Vazirmatn/Inter contract | [`AGENTS.md`](../AGENTS.md) §4/§6; [ADR-0010](../docs/adr/0010-localization-media-architecture.md); [`docs/DESIGN_SYSTEM.md`](../docs/DESIGN_SYSTEM.md) §4.1–4.2 |
| C16 | Accessibility & mobile-first behavior: 360px minimum, keyboard, reduced motion; declared mobile posture | [`AGENTS.md`](../AGENTS.md) §6; [ADR-0005](../docs/adr/0005-mobile-readiness-guardrails.md) |
| C17 | Evidence before migration; unknown stays unknown | [`AGENTS.md`](../AGENTS.md) §1 status labels; runtime-revisit triggers: [`docs/architecture/AHF-ARCHITECTURE-SCALE-READINESS-AUDIT.md`](../docs/architecture/AHF-ARCHITECTURE-SCALE-READINESS-AUDIT.md) §8E |
| C18 | Owner escalation at genuine gates; decisions persisted to canonical docs | [`AGENTS.md`](../AGENTS.md) §2 (EXECUTE); DOCUMENTATION-GOVERNANCE §2.12 |
| C19 | State ownership: client persistence via offline contracts; no new raw localStorage/IndexedDB without a KV contract | [ADR-0005](../docs/adr/0005-mobile-readiness-guardrails.md) Decision item 1, guardrail 2 (= ARCHITECTURE-PRINCIPLES §13.2); [`src/lib/offline/`](../src/lib/offline/) |
| C20 | Security boundaries: every CSP origin/relaxation carries documented justification | [`next.config.mjs`](../next.config.mjs) CSP documentation |
| C21 | UI KIT-FIRST: platform kit reused; MUI confined to its allowlist | [`AGENTS.md`](../AGENTS.md) §6; [`scripts/governance-runtime.mjs`](../scripts/governance-runtime.mjs) allowlists |
| C22 | One executable backlog: `docs/TASKS.md` only | DOCUMENTATION-GOVERNANCE §2.11 |

## 3. CANDIDATE — proposed additions (NOT binding; require owner ratification)

| # | Proposed rule | Rationale / evidence | Conflict check |
|---|---|---|---|
| P1 | **Spec-first for STANDARD/CRITICAL work**: qualifying tasks carry a `docs/specs/NNNN-slug/spec.md` (thin for STANDARD; full for CRITICAL) linked from their `TASKS.md` entry before implementation | [`docs/governance/AHF-SPECKIT-BROWNFIELD-ADOPTION-DESIGN.md`](../docs/governance/AHF-SPECKIT-BROWNFIELD-ADOPTION-DESIGN.md) §5–6; gap: no repeatable spec workflow today | **RATIFIED 2026-09-14 (Stage 6)** — the owner-authorized Development Admission Gate (`docs/governance/DEVELOPMENT-ADMISSION.md`) makes spec-first machine-enforced; no conflict found by adoption review or pilot |
| P2 | **Identity-seam discipline**: supabase-js imports remain confined to the audited file list; `userId` is treated as an opaque string everywhere else; new consumers require an architecture note | Audit §5 C-1, §9 E-2; Principle-12 accepted evaluation need (ARCHITECTURE-PRINCIPLES §12) | **STILL CANDIDATE — owner gate open:** the owner has not explicitly ratified the supabase-js confinement rule; ties into the deferred Principle-12 evaluation. (File list = 2 wrapper modules + 9 consumer files; see corrected audit §3.3.) |
| P3 | **Prototype isolation**: prototype code stays inside its `prototype/` namespace and routes until it receives spec treatment; shared-namespace or CSP-affecting promotion requires the STANDARD/CRITICAL flow | DEV `prototype/workout-layout-blueprint` precedent recorded in the adopted design (isolated namespace + `WORKOUT-PROTOTYPE-VIEWPORT-CONFORMANCE.md` on DEV) vs shared-surface additions (`MentorStage.tsx`, `three`, CSP `blob:` — DEV-only, not verifiable on MAIN) | **RATIFIED 2026-09-14 (Stage 6)** — owner deltas repeatedly reinforced the boundary (“spec drives implementation; implementation does not define product intent”; prototype = evidence only); validated by the completed pilot |
| P4 | **New runtime dependency governance**: a new runtime dependency requires a documented unmet requirement in the existing allowlist/audit pattern (KIT-FIRST precedent) and a minimal-surface justification | Existing machine pattern (`governance-runtime.mjs` MUI allowlist); DEV `three` adoption is the live case | **STILL CANDIDATE — owner gate open:** the general rule has not been explicitly ratified by the owner; the `three`/DEV case remains undecided (D2-adjacent) |

## 3.1 Ratification record (2026-09-14, Stage 6)

- **Ratified:** the §2 CONFIRMED routing (verified 0 contradictions / 0 duplicated authority by the Stage-2 adoption review and re-validated during the Stage-4 pilot) and §3 **P1 (spec-first)** + **P3 (prototype isolation)**. Basis: the Stage-6 owner authorization explicitly mandates the spec/admission gate for STANDARD/CRITICAL work (P1), and the owner decision deltas repeatedly reinforced the prototype-evidence boundary validated by the completed pilot (P3).
- **Not ratified (explicit owner gates remain):** §3 **P2 (identity-seam)** — ties into the deferred Principle-12 evaluation; **P4 (dependency governance)** — the general rule was never owner-ratified and the live `three` case is undecided.
- **Effect:** P1/P3 are binding product/engineering rules from 2026-09-14; P2/P4 remain proposals (visible, referenced, but non-binding) until the Owner explicitly ratifies them.

## 4. Precedence and amendment

1. Canonical authority always wins over this document (§2 citations are the
   rules themselves; this file adds no force of its own).
2. If a CANDIDATE item conflicts with existing authority, existing authority
   wins; the conflict is recorded in
   [`docs/governance/DOCUMENTATION-CONFLICT-MATRIX.md`](../docs/governance/DOCUMENTATION-CONFLICT-MATRIX.md)
   (the canonical conflict register, DOCUMENTATION-GOVERNANCE §3) and the
   candidate is corrected — never resolved silently. The Stage-2 contradiction
   review artifact is evidence, not the register.
3. Amendments to §3 CANDIDATE items, or promotion of a CANDIDATE item to
   binding, require an explicit owner decision recorded per Decision
   Persistence (DOCUMENTATION-GOVERNANCE §2.12).
4. If ratification is declined or the file is retired, mark it
   `HISTORICAL`/`SUPERSEDED` — historical preservation applies
   (DOCUMENTATION-GOVERNANCE §2.5).
