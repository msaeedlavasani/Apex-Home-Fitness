# AHF Design Brain vNext — P0 Contract

> **Status:** APPROVED / INTEGRATED — 2026-09-08
> **Scope:** design/product-development governance only
> **No runtime/UI implementation:** this contract does not implement Workout UI,
> camera behavior, observation behavior, persistence, or Production changes.
> **Source proposal:** `docs/../ApexHFAgentReports/AHF-DESIGN-BRAIN-UPGRADE-AUDIT-20260908.md`

## 1. Purpose

This is the AHF-native integration of the approved P0 findings from the
BaziGB/AHF design-brain audit. It adopts reusable composition and governance
ideas without importing BaziGB’s game-specific semantics, Honey Bronze identity,
MUI-primary foundation, or multiplayer rules.

## 2. Canonical reasoning model

```text
AHF Design System
→ Experience State
→ Layout Class
→ Platform Adaptation
→ Composition Map
→ Prototype / Product Acceptance
```

The model is ordered. A feature must define state and composition before
choosing page geometry, platform treatment, or implementation components.

## 3. P0 contracts

### 3.1 Pre-implementation Composition Map

Required before any material/specialized UI or high-fidelity prototype:

- semantic regions;
- primary visual anchor;
- primary CTA/action;
- initial-viewport priority;
- grouping rationale;
- responsive reflow;
- invariant visual anchor;
- persistent versus contextual controls;
- camera/body-safe regions where camera or body overlays are relevant.

Approved prose requirements alone are not approval of an improvised composition.
The map belongs in the task’s UI Conformance evidence or the canonical
specialized experience specification.

### 3.2 Available-space Layout Classes

AHF uses composition classes, not separate device products:

| Class | Meaning |
|---|---|
| Compact Portrait | narrow vertical space; touch-first; primary task above optional detail |
| Compact / Short Landscape | constrained block height; primary surface/action stays initial-viewport; support reflows beside/below |
| Medium | balanced portrait/landscape space; semantic regions may become multi-column |
| Expanded / Desktop | wide pointer/keyboard composition; more supporting context without stealing primary priority |

Rules:

- available inline/block space controls composition;
- fluid spacing and intrinsic geometry are preferred;
- container queries are used only when composition or priority changes;
- named-device duplication is not a design model;
- no horizontal overflow is necessary but insufficient;
- acceptance also checks task visibility, CTA order, reachability, density, and
  hierarchy;
- first server/client render must remain deterministic; browser-only/device
  state activates after mount where relevant.

### 3.3 Platform Adaptation

Platform adaptation is a distinct layer below layout class:

- iOS: safe areas, home indicator, HIG control/gesture conventions;
- Android: system insets, gesture navigation, Material interaction conventions;
- Web/Desktop: pointer hover, keyboard focus, window resizing, mouse distance.

AHF’s existing `AppShell`, `PlatformProvider`, platform kit, semantic tokens,
Light/Dark, self-hosted typography, and EN/FA/RTL architecture remain canonical.

### 3.4 FocusSessionShell contract

A specialized focused session may reduce/remove generic AppShell chrome when
focus requires it. This is a design contract, not an implementation request.

Future Workout composition uses these semantic owners:

```text
session utility/exit
session state + exercise identity
primary movement / mentor / camera surface
contextual coach / compare layer
compact HUD
exception controls
```

The movement/session activity is the visual anchor. Exercise identity,
phase/timer, camera/tracking status, coaching, and compare/correction state each
have one semantic owner. Duplicate state/status labels are non-conforming.

This contract preserves CP-01/CP-04/CP-06/CP-07 boundaries: camera denial or
uncertainty never blocks the normal workout, raw C1 stays on-device, and no
persistence is implied.

### 3.5 Component Ownership and Maturity Registry

The minimum AHF-native registry entry is:

```text
name
path
responsibility
contracts
consumers
maturity: Prototype | Candidate | Stable | Deprecated
evaluationEvidence
surface: Prototype | Product | Both
```

The registry is a governance/documentation contract first. It does not require
creating components. A pattern may become Product authority only after real
consumers, relevant validation, and the appropriate UI/human visual gate.

Initial registry scope is intentionally small:

| Name | Path | Maturity | Surface | Purpose |
|---|---|---|---|---|
| Platform Kit | `src/components/ui/platform/**` | Stable | Product | shared controls and platform adaptation |
| AppShell | `src/components/layout/AppShell.tsx` | Stable | Product | current platform-dispatch shell |
| Workout Player | `src/components/workout/WorkoutPlayer.tsx` | Candidate | Product | current session player; not the future FocusSessionShell |
| FocusSessionShell | specification-only | Prototype | Future Product | future immersive session ownership contract |
| Interactive Workout V2 Prototype | `scripts/interactive-workout-prototype/index.html` | Prototype | Prototype | UX exploration only; not Product authority |
| Observation Runtime | `src/lib/observation/runtime.ts` | Stable | Product | in-session CP-07 observation contract |

### 3.6 Prototype Acceptance Contract

A high-fidelity prototype requires, where applicable:

- approved Composition Map and Experience State map;
- state/transition behavior;
- layout-class viewport matrix;
- EN/FA and RTL/LTR;
- Light/Dark;
- reduced motion/accessibility;
- camera/body collision review;
- hands-free happy path and exception controls;
- initial-viewport task visibility;
- representative-device validation;
- Owner visual/UX gate;
- rejected findings and supersession linkage.

Technical delivery/CI success is not UX acceptance. A rejected prototype
remains rejected until a new Owner gate accepts a corrected version.

### 3.7 Initial-viewport / primary-task acceptance

Every layout class must demonstrate:

- primary task is visible;
- primary visual anchor is visible;
- essential state/action is understandable;
- action hierarchy survives reflow;
- content remains usable;
- short landscape is deliberately composed;
- desktop is not merely stretched mobile;
- landscape is not merely rotated portrait.

## 4. Preserved AHF-only contracts

These remain canonical and are not replaced by BaziGB rules:

- Apex Coral semantic visual system;
- Light/Dark token architecture;
- platform dispatch and KIT-FIRST platform kit;
- Inter/Vazirmatn/Roboto typography;
- EN/FA and logical RTL/LTR;
- safe-area/platform-native behavior;
- fitness-safe touch/state semantics;
- S-04 session contracts and wall-clock timing;
- CP-01 Companion silence-by-default and fitness-not-medical boundary;
- CP-02 observation contract;
- CP-03 evidence discipline and validated-capability limits;
- CP-04 consent/privacy/C1 boundary;
- CP-06 no-camera fallback and revocation;
- CP-07 uncertainty-preserving runtime.

## 5. Explicitly rejected BaziGB transfers

- Honey Bronze palette;
- MUI-primary architecture;
- GameShell board/player/turn/legal-action semantics;
- multiplayer presence rules;
- game sound rules;
- game identity/board-specific visual language.

## 6. Relationship to existing governance

- `docs/DESIGN_SYSTEM.md` remains the visual source of truth and now carries
  the concise P0 contract in §8.1.
- `docs/governance/UI-CONFORMANCE-GATE.md` remains the mandatory UI gate and
  now points to this contract for composition-map/prototype evidence.
- `docs/INDEX.md` routes this contract as the canonical design-brain vNext
  owner.
- `docs/TASKS.md` remains the executable backlog; this document authorizes no
  Product implementation by itself.
- `AGENTS.md` remains authoritative for reuse, UI discovery, and reporting.
