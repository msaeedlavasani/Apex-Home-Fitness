# PLAN 0001 — Workout Experience (Guided Workout Player)

| Field | Value |
|---|---|
| STATUS | `PROPOSED` — design outline (owner-mandated pilot artifact set; D2 authorized design/plan, NOT implementation) |
| SPEC | [`spec.md`](./spec.md) |
| TASK_PROFILE | `CODE_NO_DEPLOY` (this document) — the eventual implementation is expected to be **CRITICAL** (session-core contract + media architecture) |
| Date | 2026-09-14 · Baseline: main `80b6eb5` |

This plan names **boundaries and reversible choices only**. No source code, no technology mandate, no schema change. Where technology is undecided (media format, mentor implementation, voice), the plan preserves an abstraction boundary and defers the choice to the owner-authorized implementation task.

## 1. Approach at a glance

Extend, don't replace (AGENTS.md §3; V2 Part 4 reuse/extend analysis). The existing pure session core (`src/lib/workout/sessionCore.ts`, ADR-0002) and its React adapter stay the execution foundation; the experience surface is re-presented as a guided player. Today's phase set is fixed (READY/EXERCISING/RESTING/COMPLETED) and `autoAdvance` is a global boolean; the V2 timeline needs richer phase semantics — that contract change is the heart of the future implementation and why it is CRITICAL-class.

## 2. Invariants that must not break

- Session transitions only through the pure session core, never the adapter (ADR-0002; ARCHITECTURE-PRINCIPLES §13.4) — binding regardless of experience change.
- Source independence: execution never depends on AI vs rules provenance (ARCHITECTURE-PRINCIPLES §8; V2 §25).
- Mobile posture: this experience is declared `WEB-SPECIFIC` (browser-presentation surface; no native equivalent claimed; no new client storage beyond the existing offline contract) — ADR-0005 guardrail 3; see spec §4.
- Offline contract: snapshots remain backward-compatible and versioned; completed work never regresses (S-05; `src/lib/offline/*`).
- One-way dependency direction: presentation → domain → infrastructure (PRINCIPLES §4).
- Media/localization contracts: self-hosted media + integrity rules, fa/en key structure (MG-07/ADR-0010).
- Privacy: no new data collection; camera remains gated and optional (TS-01; ADR-0014/0021).
- Playability without optional visuals (proposed; see spec §7/U-5).

## 3. Proposed boundaries (architecture level)

| Boundary | Responsibility | Keep separable from | Notes |
|---|---|---|---|
| Experience shell | Full-surface presentation, safe-area/viewport contract, locale/RTL framing | Session logic | Mobile-first; adapts the existing prototype's viewport lessons (prototype evidence only) |
| Session timeline controller | Program → timeline (PREPARE/WORK/REST/TRANSITION/COMPLETE); ownership of sequencing | UI components | Extends the pure core; contract-first change (CRITICAL) |
| Data/program boundary | Consumes the normalized Program contract only | Generator internals | Existing `programSchedule` enrichment stays the seam |
| Mentor presentation boundary | Renders the mentor when available; capability detection; fallback | Session logic; asset delivery | Lazy/`ssr:false`; renderer-agnostic interface; no Three.js mandate |
| Demonstration media boundary | Exercise demonstration assets + caching policy | Component internals | MG-07 manifest contract; format decided later |
| Fallback/degraded boundary | Text/identity presentation when optional visuals fail | Mentor/media boundaries | Requirement pending U-5 |
| Audio/voice boundary | Cues / optional voice | Session logic | Pipeline undecided (U-7) |
| Telemetry boundary | Session events | Session logic | Log-only sink today; scope pending U-9 |
| Localization boundary | fa/en keys, numerals, RTL | Copy strings | MG-07 key structure |
| Offline/persistence boundary | Snapshot + outbox | Experience shell | Existing contract, additive evolution only |

## 4. Data/session contract considerations (no schema change here)

- Phase semantics extension must be **additive** to `SessionState`/`SessionCommand`/`SessionEffect` with safe defaults (PRINCIPLES §9). Snapshot `snapshotVersion` pattern is the precedent for backward compatibility.
- Exercise execution metadata (TIMED/REP_BASED/HOLD, cadence) has an unresolved owner/data-model home (spec U-1; V2 Part 5 identifies the data-model gap). Any schema movement is a separate **DB_CHANGE** task.
- Identity: display names stay display-only; canonical `exerciseId` used where resolvable (ADR-0001). The known name-resolution gap (V2 Part 5) is unaffected by this plan.

## 5. Testing strategy (for the future implementation task)

- Targeted-first per `docs/CI.md`: session-core unit/contract tests + golden-trace updates (`tests/session-golden-trace.test.tsx` pattern) + effect-boundary tests; targeted E2E on the workout route in both locales; real-browser acceptance on a 360px viewport (RELEASE_POLICY RULE 6/7).
- Full E2E stays on the nightly lane unless the release path requires it.
- If a reduced-motion/fallback path ships, it needs its own targeted assertions.

## 6. Reversibility

- Every boundary above can be adopted independently; none requires a schema change to introduce.
- Media/mentor/voice remain behind interfaces so any technology decision can change without touching session logic.
- Rollback for the future implementation: feature-flag or page-level rollback (existing patterns), plus the standard release rollback (RELEASE_POLICY).

## 7. Explicitly deferred decisions (owner)

U-1…U-13 from spec §16 — most materially U-5 (mentor necessity/fallback) and U-1/U-2 (execution types, timing), which gate the session-contract shape.

## HANDOFF

| Field | Value |
|---|---|
| CURRENT_STATUS | `PLANNED` (outline) |
| NEXT_ACTION | Owner resolves spec §16 UNKNOWN items (start with U-5/U-1/U-2), then authorizes an implementation spec/task |
| NEXT_ACTION_AUTONOMOUS | `NO` |
| BLOCKERS | Owner decisions; implementation not authorized |
