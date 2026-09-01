# MOBILE-READINESS-01 — Mobile Lock-in / Web-Coupling Architecture Audit

> **STATUS: EXECUTED AND RATIFIED 2026-09-01.** (added 2026-09-01 during
> POST-AUDIT-RATIONALIZATION-01; executed as a docs-only `AUDIT` task with
> no app/DB change and no deployment; findings and guardrails ratified via
> POST-MOBILE-READINESS-RATIONALIZATION-01 / ADR-0005.)
>
> Profile: `AUDIT` / architecture task. **Does NOT build iOS or Android.**
> No app code, schema, or dependency changes result from this task; its
> output is a durable audit report that informs future guardrails. Findings:
> [`MOBILE-READINESS-01-REPORT.md`](MOBILE-READINESS-01-REPORT.md);
> guardrails **RATIFIED / BINDING** in `ARCHITECTURE-PRINCIPLES.md` §13 and
> recorded as [`../adr/0005-mobile-readiness-guardrails.md`](../adr/0005-mobile-readiness-guardrails.md).
> Mobile triggers, Health scope, and the technology spike are DEFERRED;
> the high-severity finding was reconciled onto `S-04` (Session Core
> Contract Adoption) and promoted in `docs/TASKS.md` (not started).
> Implementation of any promoted recommendation requires the ordinary
> batch-start authorization in `docs/TASKS.md`.

## 1. Purpose

Inspect the current Apex Home Fit architecture (Next.js 15 / React,
Supabase SSR auth, Prisma/SQLite persistence, service worker + Dexie
offline layer, HLS/video, next-intl localization, multi-platform design
tokens) and identify **future mobile blockers and web lock-in**, so that
today's development choices stop adding avoidable mobile cost. It produces
the evidence, guardrails, criteria, and spike definition for a future
mobile program — without selecting a technology stack now.

## 2. Inspection scope (checklist)

For each dimension, the audit must cite specific code/modules and classify
`CLIENT-AGNOSTIC NOW` / `WEB-SPECIFIC OK` / `MOBILE BLOCKER (needs change)`:

1. **Business logic coupled to Next.js/React UI** — services in `src/lib`,
   `src/services` vs page/component-embedded logic; server-only leakage;
   reusability of domain logic outside the web runtime.
2. **API/data-contract portability** — route handlers, server actions/invoke
   patterns, RSC boundaries; whether the same data contracts could serve a
   native client.
3. **Authentication/session assumptions** — Supabase SSR cookie flow,
   phone/OTP journey, admin auth; what a native client would need
   (PKCE/deep-link/secure storage) and what the server contract exposes.
4. **Browser-only storage / IndexedDB / localStorage dependencies** — Dexie
   offline layer, `localStorage` theme/platform keys, service worker; which
   persistence has portable equivalents.
5. **Workout-session state portability** — the pure session core
   (S03 refactor, `src/services`/session-core modules) vs UI-coupled timer
   state; whether the golden-trace/session contracts are already client-
   agnostic.
6. **Media/video handling** — HLS.js/video player, offline media cache,
   DRM-free assumption; native AVFoundation/ExoPlayer equivalents.
7. **Navigation assumptions** — AppShell routes, next-intl locale routing,
   `next/link` coupling; what a native navigation model would need.
8. **Offline/resume requirements** — current PWA/service-worker offline
   guarantees and what they imply for native offline/resume parity.
9. **Notifications/background-work** — any web push/background sync
   presence or absence, and the native implications (APNs/FCM,
   background tasks).
10. **Localization/RTL portability** — next-intl message catalogs (en/fa),
    RTL handling, Vazirmatn; whether message content is portable out of the
    box.
11. **Shared design tokens vs platform-specific UI** — `globals.css` /
    platform kit (Apple HIG/Material 3 tokens) already designed for iOS and
    Android rendering; where web-specific markup would block reuse.
12. **HealthKit / Health Connect integration boundaries** — where future
    health-data import/export would attach (workout metrics, weight entries,
    HR/calories), and what server-side contract would keep it
    platform-neutral.

## 3. Deliverables (audit report)

1. **Must-become-client-agnostic list (now):** the smallest set of modules /
   contracts to extract or harden TODAY so a future mobile client is not
   blocked (e.g. session-core, data contracts, localization catalogs,
   auth token exchange boundaries). Each item scored: effort vs blocker
   severity.
2. **Stays-web-specific list:** things that legitimately remain web-only
   (service worker, HLS player shell, RSC surfaces, admin console) with
   reasoning.
3. **Architectural guardrails for new development:** concrete rules to add
   to `AGENTS.md`/architecture principles (e.g. "domain logic must live in
   `src/services` and stay UI-framework-free", "new persistence must define
   a portable contract", "new features must declare their mobile posture").
4. **Trigger/criteria for starting actual mobile implementation:** concrete
   signals (e.g. user demand thresholds, revenue milestone, provider
   availability) and precondition checklist (audit recommendations
   executed, spike completed, platform decisions recorded).
5. **Later technology-selection spike definition:** scope of a future spike
   comparing React Native/Expo vs alternatives (e.g. Kotlin Multiplatform,
   native, PWA-follow-up) — including decision criteria (team skill, wallet
   sync, HealthKit/Health Connect, offline, reusability of `src/services`).
   **No stack is selected now; the spike is not executed by this task.**

## 4. Task contract (when authorized)

- **EXECUTION_CLASS:** ISOLATED (own worktree/branch; touches docs only).
- **DEPENDENCIES:** none blocking; runs after Batch 1 by sequencing, and can
  run before Batch 2 so its guardrails feed ADMIN-DS-05/06 and future work.
- **ISOLATION_REQUIREMENT:** own worktree/branch; output files:
  `docs/architecture/MOBILE-READINESS-01-REPORT.md` + updates to
  `docs/architecture/ARCHITECTURE-PRINCIPLES.md` (proposed rules, awaiting
  owner adoption) and `docs/TASKS.md` promotion records.
- **VALIDATION_REQUIREMENT:** governance checks; doc-route consistency
  (`governance:check`); review of evidence citations against actual source.
- **PRODUCTION_IMPACT:** none — `AUDIT` profile, no app code, no schema
  (`DB_CHANGED = NO`), no public/auth behavior change, no deploy. Output is
  docs; lifecycle per the governed `DOCS_ONLY`/audit path.
- **WHY_BATCHABLE:** independent, low-risk, docs-only output; can execute in
  its own worktree without blocking or being blocked by UI remediation; its
  report rides the next docs/audit lifecycle rather than a release.

## 5. Explicit exclusions (NOW and for this task)

- No iOS/Android app scaffold, SDK, or native project.
- No React Native / Expo / KMP dependency or configuration.
- No HealthKit / Health Connect implementation or SDK dependency.
- No schema or API redesign — only identification and proposals, plus
  guardrail recommendations awaiting owner adoption.
- No stack selection.

## 6. HUMAN_DECISION_REQUIRED (expected at audit completion)

- Adoption of proposed architectural guardrails (owner sign-off).
- Authorization of Batch 2 (ADMIN-DS-05 + ADMIN-DS-06) and the eventual
  technology-selection spike.
- Timing decision for actual mobile implementation per §3.4 triggers.