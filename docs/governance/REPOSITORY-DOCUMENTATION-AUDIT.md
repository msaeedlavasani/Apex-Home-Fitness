# Repository Documentation Audit

> **STATUS: HISTORICAL — AUDIT EVIDENCE RECORD (2026-08-27)**
>
> This document is the output of a read-only, repository-wide documentation and
> governance audit. It is a historical audit record: the conflicts it found were
> resolved by the Documentation & Governance Reconciliation (2026-08-27, see
> the updated conflict matrix) and the accepted rules now live in
> [`DOCUMENTATION-GOVERNANCE.md`](./DOCUMENTATION-GOVERNANCE.md). Do not treat
> this file as current rules.
>
> Audit date: 2026-08-27 · Branch: `main` @ `c256bc7` · Scope: entire repository
> (not only `docs/`).

Related artifacts:

- [DOCUMENTATION-CONFLICT-MATRIX.md](./DOCUMENTATION-CONFLICT-MATRIX.md)
- [DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md](./DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md)
- [DOCUMENTATION-GOVERNANCE-PROPOSAL.md](./DOCUMENTATION-GOVERNANCE-PROPOSAL.md)

---

## 1. Scope and method

The whole repository was scanned for material that acts as documentation,
guidance, policy, specification, history or operational instruction:

- Markdown documents anywhere (`*.md`, 21 files);
- documentation embedded in configuration (`.env.example`, `docker-compose.yml`,
  `Dockerfile`, `next.config.mjs`, `.github/workflows/*.yml`, `infra/config/*`);
- data-model documentation (`prisma/schema.prisma` comments, Prisma migrations,
  `supabase/migrations/0001_workout_exercise_logs.sql`);
- code-adjacent documentation (module headers in `src/lib`, `src/services`,
  `src/components`, `src/hooks`, `scripts/audit-*.mjs`);
- marker scan for `TODO` / `FIXME` / `HACK` / `DEPRECATED` (no meaningful
  markers found — only false positives from phone-number format strings).

Claims in documentation were compared against the current code/config where
verifiable (routes, schema, env handling, provider defaults, CI workflows,
media pipeline, session API).

## 2. Artifact inventory

| # | Path | Title / purpose | Category | Declared status | Assessment |
|---|---|---|---|---|---|
| 1 | `README.md` | Onboarding, stack, commands, docs map | PRODUCT / ONBOARDING | — | CURRENT; minor stale phrasing (§4) |
| 2 | `AGENTS.md` | AI engineering standard — agent behavior, priority order, boundaries, security, validation | AGENT_GUIDANCE | v1 | AUTHORITATIVE |
| 3 | `docs/INDEX.md` | Canonical documentation map ("one reference doc per topic") | DEVELOPMENT | — | AUTHORITATIVE map; incomplete (§4) |
| 4 | `docs/HANDOFF.md` | Operational snapshot + current status + handoff | HANDOFF / OPERATIONAL | snapshot | CURRENT (2026-08-27) |
| 5 | `docs/TASKS.md` | Batch history, backlog, technical debt | ROADMAP / BACKLOG | — | CURRENT; minor internal inconsistency (§4) |
| 6 | `docs/TRANSFORMATION_ROADMAP.md` | Competitor research + itemized future features | ROADMAP / FEATURE_SPEC | PROPOSED (declared) | CURRENT as proposal |
| 7 | `docs/EXECUTION_ROADMAP.md` | Previous execution plan (MUI/OTP/baseline workstreams) | ROADMAP / HISTORICAL | ARCHIVED (declared, with successors) | HISTORICAL — correctly archived |
| 8 | `docs/OTP_LAUNCH_READINESS.md` | Launch contract: env, OTP security, Go/No-Go, smoke test | OPERATIONS / SECURITY | contract | CURRENT; §3 stale (self-declared pending update) |
| 9 | `docs/RELEASING.md` | Release/deploy runbook: Docker, HTTPS, PWA/TWA, provider config | OPERATIONS / DEPLOYMENT | — | CURRENT; provider-config section stale (see Conflict Matrix C-01, C-02) |
| 10 | `docs/CI.md` | CI & E2E policy, failure classification, targeted E2E map | TESTING / DEVELOPMENT | successor of HANDOFF temp section (declared) | CURRENT — verified against workflows |
| 11 | `docs/AI_API.md` | AI + analytics API contract (routes, schemas, limits, env) | API / ARCHITECTURE | "kept in sync" (declared, lists reviewed files) | CURRENT — verified accurate |
| 12 | `docs/AI_CHANGE_TEMPLATE.md` | Agent change-report template | DEVELOPMENT | — | CURRENT; template duplicated in AI_DEVELOPMENT_SYSTEM §5 |
| 13 | `docs/AI_DEVELOPMENT_SYSTEM.md` | Internal autonomous-development contract (cycle, classification, validation, git, reporting) | AGENT_GUIDANCE / DEVELOPMENT | v1 | CURRENT; overlaps AGENTS.md |
| 14 | `docs/DESIGN_SYSTEM.md` | Design tokens + UI architecture (v2.1) | ARCHITECTURE / UI | "Frontend source of truth" (declared) | AUTHORITATIVE |
| 15 | `docs/ASSETS.md` | Asset pipeline: resolution, fallback, cache, CSP, audits | ARCHITECTURE / OPERATIONS | — | CURRENT — verified against code (AnimationPlayer/VideoPlayer/CSP) |
| 16 | `docs/product/WORKOUT-EXPERIENCE-V2.md` | Workout Experience V2 product vision + analysis | PRODUCT / FEATURE_SPEC | PRODUCT / UX VISION — NOT YET IMPLEMENTED (declared) | PROPOSED — consistent with codebase |
| 17 | `docs/product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md` | V2 open product/architecture questions | PRODUCT | PROPOSED (declared) | PROPOSED — no decisions made |
| 18 | `src/components/ui/platform/README.md` | Platform UI kit (iOS/Android/Web components) | DEVELOPMENT / COMPONENT | — | CURRENT; path reference imprecision (safe-corrected) |
| 19–21 | `infra/ai/prompts/01|02|03-*.md` | Versioned AI system prompts (general / injury-focused / equipment-limited) | CONFIGURATION (deployment artifact) | versioned | CURRENT — referenced by AI_API.md §6 |
| 22 | `.env.example` | Environment contract template (heavily commented) | CONFIGURATION | — | AUTHORITATIVE env contract — verified consistent with code (incl. `AI_PROVIDER=openai`) |
| 23 | `docker-compose.yml` / `Dockerfile` | Self-hosted stack; comments document DNS, migrate, volume | CONFIGURATION / OPERATIONS | — | CURRENT — matches RELEASING + HANDOFF |
| 24 | `.github/workflows/ci.yml`, `ci-full-e2e.yml` | CI policy implementation (commented) | CONFIGURATION / TESTING | — | CURRENT — matches CI.md (nightly 22:00 UTC full E2E) |
| 25 | `prisma/schema.prisma` | Data model + invariants (composite indexes, OTP security, idempotency) | DATA | — | AUTHORITATIVE data contract |
| 26 | `supabase/migrations/0001_workout_exercise_logs.sql` | Offline exercise-log outbox table (commented) | DATA | — | CURRENT; not covered by docs/ suite (gap) |
| 27 | Code module headers (`src/lib/offline/db.ts`, `src/services/syncService.ts`, `src/lib/workout/wallClock.ts`, `src/components/workout/useWorkoutEngine.ts`, `src/services/audioService.ts`, `src/lib/auth/mode.ts`, …) | Embedded architecture/runtime documentation | ARCHITECTURE (embedded) | — | CURRENT — generally consistent with each other and with docs |
| 28 | `scripts/audit-assets.mjs`, `audit-design-system.mjs`, `audit-lottie-fps.mjs` | Self-documenting audits | TESTING / TOOLING | — | CURRENT |

## 3. Status classification summary

| Classification | Artifacts |
|---|---|
| AUTHORITATIVE | `AGENTS.md`, `docs/INDEX.md` (map), `docs/DESIGN_SYSTEM.md`, `.env.example`, `prisma/schema.prisma`, `docs/AI_API.md` (within its scope), `docs/CI.md` (within its scope) |
| CURRENT | `README.md`, `docs/HANDOFF.md`, `docs/TASKS.md`, `docs/TRANSFORMATION_ROADMAP.md`, `docs/OTP_LAUNCH_READINESS.md`, `docs/RELEASING.md`, `docs/ASSETS.md`, `docs/AI_CHANGE_TEMPLATE.md`, `docs/AI_DEVELOPMENT_SYSTEM.md`, platform README, prompts, workflows, compose |
| PROPOSED / NOT YET IMPLEMENTED | `docs/product/WORKOUT-EXPERIENCE-V2.md`, `docs/product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md` |
| HISTORICAL / REFERENCE_ONLY | `docs/EXECUTION_ROADMAP.md` (properly archived with declared successors) |
| STALE_CANDIDATE | `docs/RELEASING.md` provider-configuration block (C-01, C-02); `docs/OTP_LAUNCH_READINESS.md` §3 (self-declared); `README.md` OTP phrasing (C-05) |
| DUPLICATE / MERGE_CANDIDATE | change-report template (`docs/AI_CHANGE_TEMPLATE.md` ↔ `docs/AI_DEVELOPMENT_SYSTEM.md` §5); agent-behavior overlap (`AGENTS.md` ↔ `docs/AI_DEVELOPMENT_SYSTEM.md`) |
| CONFLICT | see DOCUMENTATION-CONFLICT-MATRIX.md (C-01…C-12) |
| UNCLEAR | none found that cannot be classified with evidence |

## 4. Notable findings (summary)

- **Conflict C-01 (HIGH):** `docs/RELEASING.md` still recommends
  `AI_PROVIDER=groq` as the production configuration, while the code default
  (`src/lib/ai/provider.ts` → `'openai'`), `.env.example`, and `docs/HANDOFF.md`
  (2026-08-27 status: production = `openai`, Groq geo-blocked from Iranian
  egress) all say OpenAI. Following RELEASING would misconfigure production.
- **Conflict C-02 (MEDIUM):** `docs/RELEASING.md` claims `OPENAI_MODEL` "is not
  used in this version"; the code reads `OPENAI_MODEL` (`?? 'gpt-4o-mini'`) and
  `.env.example` / `docs/AI_API.md` document it.
- **Conflict C-03 (MEDIUM):** `docs/OTP_LAUNCH_READINESS.md` §3 lists
  `POST /api/auth/refresh` (no such route — actual: `logout`, `otp`,
  `request-code`, `verify`) and `GET /api/dashboard` (a page, not an API), and
  describes the old two-implementation OTP contract (mock devCode /
  Supabase `signInWithOtp`) rather than the current `PhoneOtp` ledger +
  `otpService` + `smsIrProvider` implementation. The section itself is marked
  "update after tasks 1–4", i.e. self-declared pending.
- **Conflict C-04 (LOW):** `SMS_IR_CODE_PARAMETER` default differs across
  sources: doc §1 says default `CODE`, code default is `Code`
  (`SMSIR_DEFAULT_OTP_PARAMETER_NAME = 'Code'`), production template uses `otp`
  (`.env.example`, `docs/HANDOFF.md`).
- **Conflict C-05 (LOW/MEDIUM):** `README.md` says production login is "ورود
  آزمایشی با کد ثابت" (fixed code); the current hardened mock
  (`src/lib/auth/mode.ts`) is dev/CI-only, allowlist-based, mints no sessions,
  and fails honestly (503) without Supabase — the README phrasing predates the
  hardening.
- **Conflict C-06 (LOW):** "What's next" diverges: `docs/HANDOFF.md` names
  Transformation item 1 (Progress Check-in) as the focus; `docs/TASKS.md`
  "next tasks" lists only the Next.js 16 upgrade (post-launch).
- **Conflict C-07 (LOW, fixed):** `src/components/ui/platform/README.md` says
  "See DESIGN_SYSTEM.md (repo root)" — the file lives at `docs/DESIGN_SYSTEM.md`.
  Safe-corrected during this audit.
- **Conflict C-08 (LOW):** `docs/TASKS.md` batch summary list omits batches 16
  and 17 although detailed sections for them exist below.
- **Conflict C-09 (MEDIUM, duplication):** the change-report template exists in
  `docs/AI_CHANGE_TEMPLATE.md` and is duplicated in
  `docs/AI_DEVELOPMENT_SYSTEM.md` §5.
- **Conflict C-10 (MEDIUM, overlap):** `AGENTS.md` and
  `docs/AI_DEVELOPMENT_SYSTEM.md` both define agent behavior (validation
  commands, security rules, doc map, reporting). They are compatible but
  partially redundant.
- **Conflict C-11 (LOW, gap):** `docs/INDEX.md` (the canonical map) does not
  list `docs/product/*` or the platform UI README; `README.md`'s docs list also
  omits `docs/product/*`. Safe-corrected (INDEX rows added) during this audit.
- **Conflict C-12 (LOW, gap):** the offline→Supabase sync outbox
  (`src/lib/offline/db.ts`, `src/services/syncService.ts`,
  `supabase/migrations/0001_workout_exercise_logs.sql`) has no docs/ entry; the
  DATA area has no dedicated reference document beyond schema comments.
- **Positive patterns found (worth preserving):** `EXECUTION_ROADMAP.md` is
  properly archived with declared successors; `CI.md` declares itself the
  successor of the HANDOFF temp section; `DESIGN_SYSTEM.md` and `.env.example`
  self-declare authority; `AI_API.md` lists the files it was reviewed against;
  `docs/INDEX.md` already enforces "one reference doc per topic".

## 5. Staleness analysis (candidates only — no deletions performed)

| Artifact | Signal | Classification |
|---|---|---|
| `docs/RELEASING.md` provider block | contradicts code default, `.env.example`, HANDOFF; Groq 403 diagnosis supersedes it | STALE_CANDIDATE (owner decision required — see C-01/C-02) |
| `docs/OTP_LAUNCH_READINESS.md` §3 | routes/contract differ from implementation; section self-marks pending update | STALE_CANDIDATE (in-doc caveat) |
| `README.md` OTP phrasing | "fixed code" no longer describes the hardened mock | STALE_CANDIDATE (low) |
| `docs/EXECUTION_ROADMAP.md` | intentionally historical | HISTORICAL (keep) |

Git recency was deliberately NOT used as the authority signal; each candidate is
supported by code/config evidence.

## 6. Workout Experience V2 reconciliation

`docs/product/WORKOUT-EXPERIENCE-V2.md` and
`docs/product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md` (created 2026-08-27,
committed `c256bc7`) were audited against existing authoritative material:

- **`docs/DESIGN_SYSTEM.md`:** V2 defers all visual specifics (media technology,
  focus mode, countdowns) to open questions and does not contradict the token
  system, RTL, reduced-motion or accessibility rules. No conflict.
- **`docs/ASSETS.md`:** V2's media-library direction matches ASSETS's documented
  state (AnimationPlayer supports Lottie/video; `public/animations|videos|posters/`
  are empty namespaces; AnimationPlayer has no consumer). V2 explicitly notes
  the gap — consistent, no conflict.
- **`docs/AI_API.md` / `prisma/schema.prisma`:** V2's normalized
  `WorkoutExercise[]` engine contract, name-based session persistence and
  per-exercise execution metadata questions are consistent with the current
  session API and schema. No conflict.
- **`AGENTS.md` / `docs/CI.md`:** V2 introduces no agent rules or validation
  changes. No conflict.
- **`docs/TRANSFORMATION_ROADMAP.md`:** both are product-direction documents.
  Potential future overlap: Transformation item 4 (set-by-set logging / PR) and
  V2 rep-based execution both touch workout recording. Not a conflict today;
  flagged as a product-owner coordination item before V2 Technical
  Specification.
- **V2 dependencies to track before a technical spec:** decision on canonical
  exercise identity; session persistence for non-catalog exercises; where
  execution metadata lives (Exercise library vs Program vs runtime enrichment);
  compatibility with the loosely-typed `weeklySchedule` JSON and IndexedDB
  snapshot records.

V2 docs are correctly marked `PRODUCT / UX VISION — NOT YET IMPLEMENTED` /
`PROPOSED` and resolve no open questions. They are safe as-is.

## 7. Existing modularity / reusability rules (found, not created)

The repository already contains explicit modularity and reusability rules:

1. **`AGENTS.md` §3 (reuse-first):** "همیشه این ترتیب را دنبال کن:
   `reuse → extend → compose → create`" and "قبل از ساخت component، hook،
   service، utility یا abstraction، نمونهی موجود را جستوجو کن" — this IS the
   *Search before build / Reuse before extend / Extend before create* principle,
   already authoritative for agents.
2. **`AGENTS.md` §4 (architecture boundaries):** UI in `src/app` +
   `src/components`; reusable logic in `src/lib`; domain services in
   `src/services`; persistence via Prisma/SQLite; identity via Supabase SSR;
   versioned AI prompts in `infra/ai/prompts`; server-only code must not leak
   into Client Components/middleware; both `en`/`fa` routes preserved.
3. **`AGENTS.md` §6 (UI reuse):** prefer existing semantic tokens, reuse
   existing icons and shared components, respect reduced motion.
4. **`AGENTS.md` §8 + `docs/INDEX.md`:** "از ایجاد سند موازی خودداری کن" —
   find the canonical home before creating documentation; one reference doc per
   topic.
5. **`docs/AI_DEVELOPMENT_SYSTEM.md`:** change classification
   (ui/domain/auth/ai/data/infra/docs), per-category minimum validation,
   "docs updated" as part of every change, traceability cycle.
6. **`docs/CI.md`:** validation pyramid (static → unit → contract → targeted
   E2E → full E2E).

**Not yet present (would be NEW rules, not amendments):** a capability-ownership
registry ("every major capability has a clear owner, contract and dependency
boundary"), an explicit dependency-direction policy, a component registry, and
an ADR mechanism. The proposed modularity principles (Phase 9 of the task
prompt) largely restate what AGENTS.md §3 already mandates; any future
"stronger" rules must be layered onto these existing ones, not replace them, and
should be reviewed against AGENTS.md §1's priority order before adoption.

## 8. Proposed agent documentation read order (summary)

1. `README.md` — orientation (optional for focused agents);
2. `AGENTS.md` — behavior rules + authority priority (must read);
3. `docs/INDEX.md` — documentation map (must read);
4. domain-relevant reference: `docs/DESIGN_SYSTEM.md` (UI), `docs/AI_API.md`
   (AI), `docs/OTP_LAUNCH_READINESS.md` (auth), `docs/RELEASING.md`
   (deployment), `docs/ASSETS.md` (media/offline);
5. `docs/CI.md` — validation policy before running tests;
6. `docs/TASKS.md` + `docs/HANDOFF.md` — status snapshot;
7. feature/product specs relevant to the change
   (`docs/product/*`, `docs/TRANSFORMATION_ROADMAP.md` items);
8. historical material (`docs/EXECUTION_ROADMAP.md`) only as reference.

Full reasoning and hierarchy in [DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md](./DOCUMENTATION-SOURCE-OF-TRUTH-PROPOSAL.md).

## 9. Safe corrections applied

- `docs/INDEX.md` — added rows linking the two `docs/product/` documents
  (indisputable links into the canonical map; no rule change).
- `src/components/ui/platform/README.md` — corrected the reference
  "DESIGN_SYSTEM.md (repo root)" → "docs/DESIGN_SYSTEM.md" (obvious path fix).

No other file was modified. All other findings are reported for decision.

## 10. Open decisions (owner required)

See [DOCUMENTATION-CONFLICT-MATRIX.md](./DOCUMENTATION-CONFLICT-MATRIX.md)
(C-01…C-12) and the mandatory external report's "Decisions Required" sections.
Nothing in this document decides them.
