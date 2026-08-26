# Apex Home Fit — Product Vision

> **STATUS: CANONICAL PRODUCT VISION — CURRENT**
>
> This is the concise, durable high-level product vision for Apex Home Fit. It
> does NOT replace feature specifications or the transformation roadmap; it is
> the anchor those documents relate to.
>
> Adoption: 2026-08-27 (approved decision D-03 of the Documentation &
> Governance Reconciliation). Canonical location — discoverable from
> [`../INDEX.md`](../INDEX.md).
>
> Sections clearly distinguish:
> - **CURRENT PRODUCT** — what the implemented app does today;
> - **PRODUCT DIRECTION** — agreed direction not yet fully implemented;
> - **PLANNED / NOT IMPLEMENTED** — ideas recorded for evaluation.

---

## 1. What is Apex Home Fit?

Apex Home Fit is a **bilingual (English / Persian, RTL-aware) home-fitness
platform** that takes a user from an onboarding quiz to a personalized weekly
training program, guides them through each workout, and tracks progress over
time — on the web, as a PWA, and as an Android TWA, with iOS/Android native
surface styling.

It is a single product with three connected loops:

1. **Plan** — a personalized program is generated from the user's goals,
   level, equipment, limitations, rest days and recent history (AI-first with a
   deterministic rules engine fallback).
2. **Execute** — the user plays the program as a guided workout session
   (currently a timer-driven player; see the Workout Experience V2 direction).
3. **Progress** — completed sessions feed history, analytics, streaks,
   gamification and future program adaptation.

## 2. Who is it for?

- **Home exercisers** who have no gym, limited equipment, and limited time;
- **Beginners** in particular — the product must not assume prior exercise
  knowledge (see the V2 "beginner-first" principle);
- **Persian-speaking users** first-class: full `fa` localization, RTL layout,
  Persian weekdays/calendar and Persian-safe content;
- Users on low-end/mobile devices and unreliable connections — offline-first.

## 3. Core problem

Most people who want to train at home do not know **what to do**, **how to do
it safely**, or **how to stay consistent**. Apex Home Fit solves this by:

- generating a **safe, personalized** program (medical screening, injury and
  equipment awareness, enforced rest days);
- **guiding execution** so the user does not have to operate software while
  exercising;
- **recording progress** so effort becomes visible and motivating.

## 4. Major product principles

- **Personalized and safe** — programs derive from the user's profile and
  limitations; medical disclaimers and clearance checks are non-negotiable.
- **Guided and beginner-first** — "Show, don't just tell" (V2); the app takes
  responsibility for leading the workout.
- **Hands-free by default** — minimum interaction during exercise (V2 goal).
- **Source-independent generation** — AI and rules produce the same normalized
  Program contract; execution never depends on which generator produced it.
- **Offline-first / PWA** — plan, workout and progress survive lost
  connections; a durable offline outbox syncs completed sets later.
- **Bilingual and accessible** — EN/FA, RTL, reduced motion, keyboard,
  contrast, safe-area and touch-target rules (see `docs/DESIGN_SYSTEM.md`).
- **Progress transparency** — history, analytics, streaks and gamification make
  effort visible (see `docs/TRANSFORMATION_ROADMAP.md` for the deeper roadmap).
- **Durable architecture** — reuse-first engineering (`AGENTS.md` §3:
  `reuse → extend → compose → create`), explicit documentation governance
  (`docs/governance/DOCUMENTATION-GOVERNANCE.md`), and ADRs for architecture
  decisions (`docs/adr/README.md`).

## 5. Major capability areas (CURRENT PRODUCT)

| Capability | Status |
|---|---|
| Onboarding quiz → personalized program (AI-first + rules fallback) | CURRENT |
| Weekly schedule + rest-day enforcement + in-place program regeneration | CURRENT |
| Dashboard (weekly plan, completion markers, gamification entry points) | CURRENT |
| Guided workout player (timer-based, wall-clock, offline-resumable) | CURRENT |
| History + analytics (calendar, volume, streaks, calorie estimates) | CURRENT |
| Profile (phone identity, editable contact, weight/height, avatar) | CURRENT |
| Preferences (exercise styles, equipment, rest days) | CURRENT |
| Gamification (XP, levels, badges) | CURRENT |
| Phone OTP auth (SMS.ir) with launch-readiness gate | CURRENT |
| Offline cache + sync outbox (IndexedDB → Supabase) | CURRENT |
| PWA / TWA + self-hosted Docker deployment | CURRENT |

## 6. PRODUCT DIRECTION

- **Workout Experience V2 — Guided Workout Player**
  (NOT YET IMPLEMENTED — see `WORKOUT-EXPERIENCE-V2.md`): one tap to start,
  automatic work/rest/transition timeline, visual exercise demonstrations,
  audio/voice coach, session recovery. Implementation is intentionally paused
  until the architecture baseline is ready (see current priority below).
- **Transformation roadmap items**
  (PROPOSED — see `docs/TRANSFORMATION_ROADMAP.md`): progress check-in, streak
  polish, body measurements, PR/volume logging (coordinated with V2),
  monthly/yearly reports, goals & reminders, real social challenges, nutrition,
  health-kit sync.

## 7. Current project priority (as of 2026-08-27)

```text
Documentation / Governance Reconciliation
        ↓
Full Codebase Modularity, Coupling & Reusability Audit
        ↓
Architecture Stabilization / Approved Modularization
        ↓
Resume Feature Development  (incl. Workout Experience V2)
```

Feature work (including V2 and Transformation-roadmap items) is deferred until
the architecture baseline is established. Nothing in this document changes
that sequence; it is recorded in `docs/HANDOFF.md` and `docs/TASKS.md`.

## 8. How this document relates to others

- Feature roadmap & competitor research → `docs/TRANSFORMATION_ROADMAP.md`
- Workout execution vision → `docs/product/WORKOUT-EXPERIENCE-V2.md`
- Agent behavior / engineering standard → `AGENTS.md`
- Documentation governance & read order → `docs/governance/DOCUMENTATION-GOVERNANCE.md`
- Architecture decisions → `docs/adr/README.md` (mechanism; no ADRs yet)
- Onboarding overview → `README.md`
