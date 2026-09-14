# PLAN 0001 — Workout Experience (Guided Workout Player)

| Field | Value |
|---|---|
| STATUS | `FINALIZED (design outline)` — owner-mandated pilot artifact set; implementation NOT authorized |
| SPEC | [`spec.md`](./spec.md) |
| TASK_PROFILE | `CODE_NO_DEPLOY` (this document) — the eventual implementation is expected **CRITICAL** |
| Date | 2026-09-14 · Baseline: main `80b6eb5` |

Boundaries and reversible choices only. No source code, no technology mandate, no schema change. Where technology is undecided (media medium, mentor implementation, audio), an abstraction boundary is preserved and the choice is deferred.

## 1. Approach

Extend, don’t replace (AGENTS.md §3). The existing pure session core (`src/lib/workout/sessionCore.ts`, ADR-0002) and its React adapter stay the execution foundation. The product contract now requires **modular composition** (START · PREPARING · EXERCISE_INTRO · WORK_SET · REST · EXERCISE_TRANSITION · COMPLETE) with an **orchestration layer** owning sequencing/applicability/transitions/block ordering/session actions — richer than today’s fixed phase set and global `autoAdvance`. That contract extension is the heart of the future implementation and the reason it is CRITICAL-class.

Mobile posture for this experience: `WEB-SPECIFIC` (browser-presentation surface; no native equivalent claimed; no new client storage) — ADR-0005 guardrail 3.

## 2. Invariants that must not break

- Session transitions only through the pure session core, never the adapter (ADR-0002; PRINCIPLES §13.4).
- Source independence: both generators resolve into the **same canonical prescription semantics** (PRINCIPLES §8; spec §5.1).
- Identity ≠ prescription (owner decision U-1). Exercise identity remains canonical (ADR-0001). *Exercise semantics ≠ execution mode.*
- Offline contract: snapshots remain versioned/backward-compatible; completed work never regresses (S-05; `src/lib/offline/*`).
- One-way dependency direction (PRINCIPLES §4).
- Media/localization contracts (MG-07; ADR-0010).
- Privacy: no new data collection; camera gated and optional (TS-01; ADR-0014/0021).
- Playability in degraded mode when the moving demonstration is unavailable (spec §5.7).
- No control or module owns global behaviour; orchestration is authoritative (spec §2/§5.6).
- Explicitly **not** in v1: `SKIP SET`, `EXTEND REST`, `REDUCE REST`, Voice/TTS, the future module examples.

## 3. Proposed boundaries (architecture level)

| Boundary | Responsibility | Keep separable from | Notes |
|---|---|---|---|
| Experience shell | Full-surface presentation, safe-area/viewport contract, locale/RTL framing | Session logic | Mobile-first; inherits prototype viewport lessons (EXISTING evidence) |
| Orchestration/session layer | Module applicability · sequencing · transitions · Exercise Block ordering · session actions · completion eligibility | UI components | Contract-first change (CRITICAL) |
| Session timeline core | Module/phase semantics + progression policy (`AUTO` / `CONFIRMATION_REQUIRED`) | UI | Additive to ADR-0002 core |
| Prescription resolution boundary | Resolves the workout prescription (incl. explicit execution mode) into blocks/sets | Generator internals; UI | Same canonical semantics for AI and rules |
| WORK_SET + progress capability | One capability; mode-aware presentation (`REP_BASED` / `TIME_BASED`) | Component internals | No parallel progress systems |
| Mentor presentation boundary | Moving demonstration when available; capability detection; degraded mode | Session logic; asset delivery | Renderer-agnostic; lazy; no Three.js mandate |
| Demonstration media boundary | Assets + caching policy | Component internals | MG-07 manifest; format deferred |
| Session-action boundary | PAUSE/RESUME · EXIT · SKIP REST · RESTART CURRENT SET · DO LATER · SKIP FOR THIS SESSION | Module internals | Acts on blocks/modules via orchestration |
| Outcome boundary | COMPLETED · OUTSTANDING/DEFERRED · SKIPPED FOR THIS SESSION | Module internals | Product-level distinction; representation deferred |
| Audio boundary | Functional cues (supplementary) | Session logic | Voice/TTS deferred; no new settings system |
| Localization boundary | fa/en keys, numerals, RTL | Copy strings | MG-07 key structure |
| Offline/persistence boundary | Snapshot + outbox | Experience shell | Existing contract, additive evolution only |

## 4. Data/session contract considerations (no schema change here)

- Module/phase semantics + progression policy must be **additive** to `SessionState`/`SessionCommand`/`SessionEffect` with safe defaults (PRINCIPLES §9). Snapshot `snapshotVersion` remains the backward-compatibility precedent.
- The resolved prescription must carry explicit execution semantics before the session consumes it; **where** that lives (schema / `ProgramExercise` / generated-plan payload / enrichment output / another contract) is a deferred implementation decision (spec §16).
- Session outcome states (completed / deferred / skipped) need a product-level distinction; their persistence/event representation is deferred.
- Identity: display names stay display-only; canonical `exerciseId` where resolvable (ADR-0001).

## 5. Testing strategy (for the future implementation task)

Targeted-first per `docs/CI.md`: session-core unit/contract tests + golden-trace updates + effect-boundary tests; targeted E2E on the workout route in both locales; real-browser acceptance at 360px (RELEASE_POLICY RULE 6/7); degraded-mode and reduced-motion assertions; control-semantics tests (incl. defer/skip outcome states). Full E2E stays on the nightly lane unless the release path requires it.

## 6. Reversibility

Every boundary can be adopted independently; none requires a schema change to introduce. Media/mentor/audio remain behind interfaces so technology choices can change without touching session logic. Rollback for the future implementation: feature flag or page-level rollback (existing patterns) plus the standard release rollback (RELEASE_POLICY).

## 7. Deferred (non-authorizing)

The full deferred list lives in spec §16 — including numeric defaults, media format, Voice/TTS, performance budget, analytics representation, Focus Mode, offline pre-cache, conversion thresholds (safety-gated), persistence mechanics, ARIA/focus/copy, and all schema/renderer/implementation selections.

## HANDOFF

| Field | Value |
|---|---|
| CURRENT_STATUS | `FINALIZED (outline)` |
| NEXT_ACTION | Owner merges PR #66; implementation requires separate explicit authorization |
| NEXT_ACTION_AUTONOMOUS | `NO` |
| BLOCKERS | None |
