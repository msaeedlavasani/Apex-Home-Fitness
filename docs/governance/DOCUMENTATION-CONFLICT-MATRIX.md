# Documentation Conflict Matrix

> **STATUS: CURRENT REGISTER — RECONCILED THROUGH 2026-08-27**
>
> This register records resolved conflicts and the current-state reconciliation
> performed after S03 closure and owner-approved branch retirement.

> **STATUS: REGISTER — CONFLICT RESOLUTION RECORD**
>
> Every meaningful contradiction found during the repository-wide documentation
> audit (2026-08-27, `main` @ `c256bc7`) plus its resolution. All conflicts were
> resolved by the Documentation & Governance Reconciliation (2026-08-27,
> approved decisions A-01…A-07, D-01…D-03). The register is kept for traceability;
> the authoritative rules are in [`DOCUMENTATION-GOVERNANCE.md`](./DOCUMENTATION-GOVERNANCE.md).
>
> Related: [REPOSITORY-DOCUMENTATION-AUDIT.md](./REPOSITORY-DOCUMENTATION-AUDIT.md)

## Legend

- **CRITICAL** — can cause production misconfiguration or data loss if followed.
- **HIGH** — will misdirect an operator or agent on a consequential decision.
- **MEDIUM** — materially misleading but bounded impact.
- **LOW** — cosmetic or coordination-level inconsistency.

---

## C-01 — AI provider production recommendation

- **Topic:** Which AI provider is the recommended production setting.
- **Document A:** `docs/RELEASING.md` — "Provider configuration and program
  generation" block recommends `PROGRAM_GENERATOR=ai`, `AI_PROVIDER=groq`,
  `AI_GENERATION_FALLBACK=rules`.
- **Claim A:** Groq is the recommended production provider.
- **Document B:** `.env.example` — `# AI_PROVIDER=openai  # production: Groq is
  geo-blocked (HTTP 403) from Iranian egress IPs`; `docs/HANDOFF.md`
  (2026-08-27): `AI_PROVIDER=openai` is now the production setting; Groq key is
  VALID but geo-blocked from Iranian egress.
- **Claim B:** Production uses OpenAI; Groq is unusable from the production
  egress region.
- **Code/config evidence:** `src/lib/ai/provider.ts` — `AI_PROVIDER` defaults
  to `'openai'`; `classifyAiGenerationError` maps 401/402/403 to
  `ai_configuration_error` (routes to rules fallback). A Groq-configured
  production would never generate via AI from the Iranian server.
- **Git history evidence:** commit `5b0e9e1` "Diagnose and document the AI
  provider failure (Groq geo-blocked from Iran, OpenAI zero credits); switch
  production provider setting to OpenAI…".
- **Impact:** an operator following RELEASING misconfigures production; every
  generation silently falls back to rules with misleading metadata.
- **Severity:** HIGH.
- **Reconciliation options:** (a) update RELEASING.md provider block to
  `AI_PROVIDER=openai` and document the Groq geo-block + fallback;
  (b) mark the old block historical; (c) both, plus a cross-reference to
  HANDOFF's provider-status section.
- **Product Owner decision required:** No — this is an operational/architecture
  correction with strong evidence; Architecture/Ops owner decision required.

## C-02 — `OPENAI_MODEL` usage claim

- **Topic:** Whether `OPENAI_MODEL` is read by the code.
- **Document A:** `docs/RELEASING.md` — "مدل فعلی `gpt-4o-mini` در کد تنظیم شده
  و متغیر `OPENAI_MODEL` در این نسخه استفاده نمی‌شود" (OPENAI_MODEL is not used).
- **Claim A:** `OPENAI_MODEL` is unused.
- **Document B:** `.env.example` (`OPENAI_MODEL=gpt-4o-mini`), `docs/AI_API.md`
  §5 (default `gpt-4o-mini`).
- **Claim B:** `OPENAI_MODEL` is a supported variable.
- **Code evidence:** `src/lib/ai/provider.ts` — `valueOf(env, 'OPENAI_MODEL') ?? 'gpt-4o-mini'`.
- **Impact:** contradictory guidance on env configuration; harmless but wrong.
- **Severity:** MEDIUM.
- **Reconciliation options:** correct RELEASING.md to state `OPENAI_MODEL`
  (default `gpt-4o-mini`) is honored, overridden by `AI_MODEL`.
- **Decision:** Architecture/Ops owner (evidence is conclusive).
- **Resolution (2026-08-27):** RESOLVED — A-02 approved. `docs/RELEASING.md` corrected: `OPENAI_MODEL` (default `gpt-4o-mini`) is read by the code and `AI_MODEL` overrides it.
- **Resolution (2026-08-27):** RESOLVED — A-01 approved. `docs/RELEASING.md` provider block updated to the current operational state (`AI_PROVIDER=openai`); Groq documented as a supported provider whose use from the current production environment is unavailable (geo-block), not permanently excluded.

## C-03 — OTP auth endpoint contract (outdated section)

- **Topic:** The documented OTP/auth route + service contract.
- **Document A:** `docs/OTP_LAUNCH_READINESS.md` §3 — lists
  `POST /api/auth/request-code`, `/verify`, `/refresh`, `/logout`,
  `POST /api/quiz/save`, `POST /api/generate-program`,
  `GET /api/dashboard`; describes the service contract as two implementations:
  `mock` (devCode) and `supabase` (`signInWithOtp`/`verifyOtp`).
- **Claim A:** those routes/contract are the current ones; the section header
  itself says "بعد از تسک ۱–۴ به‌روزرسانی شود" (to be updated after tasks 1–4).
- **Document B (code/config):** actual routes are `src/app/api/auth/{logout,
  otp, request-code, verify}` — there is **no** `auth/refresh` route and no
  `api/dashboard` route (dashboard is a server page). Implementation:
  `src/lib/auth/otpService.ts` + `PhoneOtp` Prisma ledger (scrypt hash,
  single-use, expiry, attempts) + `smsIrProvider.ts` + `mode.ts`
  (`AUTH_OTP_MODE=mock` is dev/CI-only, mints no sessions).
- **Claim B:** the current contract is `request-code`/`verify`/`otp`/`logout`
  with the Prisma-backed OTP service and SMS.ir adapter.
- **Impact:** an agent or operator relying on §3 would look for a refresh route
  and an outdated service contract; the section is already self-flagged.
- **Severity:** MEDIUM.
- **Reconciliation options:** (a) update §3 to the current route set and
  implementation; (b) if desired, decide whether a `refresh` route should exist
  (Supabase SSR refresh is handled by middleware/cookies today) and document the
  decision.
- **Decision:** Architecture owner + launch checklist owner.
- **Resolution (2026-08-27):** RESOLVED — A-03 approved. `docs/OTP_LAUNCH_READINESS.md` §3 rewritten to the actual contract: routes `request-code` / `verify` / `logout` with their real statuses; `refresh` explicitly documented as non-existent (session refresh happens in `src/middleware.ts` via Supabase SSR; recorded as a future consideration, not existing behavior); empty `auth/otp/*` directories noted as non-routes.

## C-04 — `SMS_IR_CODE_PARAMETER` default mismatch

- **Topic:** Default template parameter name for the OTP code.
- **Document A:** `docs/OTP_LAUNCH_READINESS.md` §1 — default `CODE`.
- **Claim A:** default `CODE`.
- **Document B:** `.env.example` (`SMS_IR_CODE_PARAMETER=otp`), `docs/HANDOFF.md`
  (template `976440`, parameter `otp`).
- **Code evidence:** `src/lib/auth/smsIrProvider.ts` —
  `SMSIR_DEFAULT_OTP_PARAMETER_NAME = 'Code'`.
- **Impact:** three different values in three places (doc `CODE`, code `Code`,
  production `otp`). Any mismatch with the SMS.ir panel template breaks delivery.
- **Severity:** LOW (production value is pinned by env, but docs should agree).
- **Reconciliation options:** state the code default exactly (`Code`), the env
  override (`otp`), and the requirement that the value match the panel template.
- **Decision:** Ops owner (quick fix).
- **Resolution (2026-08-27):** RESOLVED — `docs/OTP_LAUNCH_READINESS.md` §1 now states the code default (`Code`) and the production value (`otp`, must match the SMS.ir panel template).

## C-05 — README OTP mock description

- **Topic:** How production login behaves today.
- **Document A:** `README.md` — "ورود آزمایشی با کد ثابت فعال است" (fixed code).
- **Claim A:** production login uses a fixed test code.
- **Document B (code):** `src/lib/auth/mode.ts` — `AUTH_OTP_MODE=mock` is
  DEV/CI-ONLY, allowlist-based (`AUTH_OTP_MOCK_PHONES`), mints no sessions; without
  Supabase env the login API fails honestly (503). `docs/HANDOFF.md` describes
  the allowlist harness.
- **Claim B:** mock is an explicit emergency/development harness, not a fixed code.
- **Impact:** README misdescribes the auth hardening state.
- **Severity:** LOW/MEDIUM.
- **Reconciliation options:** rephrase README to match HANDOFF/mode.ts (e.g.
  "OTP login behind feature flag; dev-only mock allowlist; production launch
  pending readiness checklist").
- **Decision:** Product/Ops owner (evidence conclusive).
- **Resolution (2026-08-27):** RESOLVED — `README.md` rephrased to the current auth reality (OTP behind feature flag; dev/CI mock is allowlist-based and mints no sessions; public launch gated by the Go/No-Go checklist).

## C-06 — "What's next" divergence

- **Topic:** The declared next focus of work.
- **Document A:** `docs/HANDOFF.md` — "تمرکز بعدی: … اولویت اول: آیتم ۱ «ثبت
  پیشرفت (Progress Check-in)»".
- **Claim A:** Progress Check-in is the next focus.
- **Document B:** `docs/TASKS.md` — "تسک‌های پیشنهادی بعدی" lists only the
  Next.js 16 upgrade (post-launch).
- **Claim B:** (implied) no feature backlog item is queued beyond Next 16.
- **Impact:** an agent planning the next batch reads two different "next" items.
  Not a code conflict; both defer to `TRANSFORMATION_ROADMAP.md` for features.
- **Severity:** LOW.
- **Reconciliation options:** align TASKS.md "next tasks" with HANDOFF's focus
  (or explicitly defer feature work), and keep the two docs cross-referenced.
- **Decision:** Product owner (priority ordering).
- **Resolution (2026-08-27):** RESOLVED — D-01 approved. `docs/HANDOFF.md` and `docs/TASKS.md` now present the single current priority sequence (Documentation/Governance Reconciliation → Modularity Audit → Architecture Stabilization → Feature Development); Progress Check-in and Next.js 16 reclassified as deferred/planned (not deleted).

## C-07 — Platform README design-system path (fixed)

- **Topic:** Location of the design system document.
- **Document:** `src/components/ui/platform/README.md` — "See DESIGN_SYSTEM.md
  (repo root)".
- **Code evidence:** the file is `docs/DESIGN_SYSTEM.md`.
- **Severity:** LOW. **Resolution:** safe-corrected during this audit (reference updated to `docs/DESIGN_SYSTEM.md`). No decision needed.

## C-08 — TASKS.md batch summary omission

- **Topic:** Batch status summary completeness.
- **Document:** `docs/TASKS.md` — the "وضعیت batchها" summary list jumps from
  Batch 15 to Batch 18 (omits 16 and 17), while detailed sections for Batch 16
  and 17 exist in the same file.
- **Severity:** LOW.
- **Reconciliation options:** add the two summary lines; confirm Batch 20 status
  wording ("آماده validation نهایی") vs HANDOFF's matching statement.
- **Decision:** none required beyond a mechanical fix (owner: project docs).
- **Resolution (2026-08-27):** RESOLVED — `docs/TASKS.md` batch summary now includes Batch 16 and 17 lines.

## C-09 — Change-report template duplication

- **Topic:** The agent change-report template.
- **Document A:** `docs/AI_CHANGE_TEMPLATE.md` — the canonical template.
- **Document B:** `docs/AI_DEVELOPMENT_SYSTEM.md` §5 — the same template
  embedded; `AGENTS.md` §9 has a related-but-different summary format
  (Changed / Validation / Risks / Follow-up).
- **Impact:** risk of the two copies drifting apart.
- **Severity:** MEDIUM.
- **Reconciliation options:** (a) keep `AI_CHANGE_TEMPLATE.md` authoritative and
  replace the §5 copy with a link; or (b) declare `AI_DEVELOPMENT_SYSTEM.md` the
  home and link from the template file. Either way one source of truth.
- **Decision:** Architecture owner (small).
- **Resolution (2026-08-27):** RESOLVED — A-04 approved. `docs/AI_CHANGE_TEMPLATE.md` is authoritative; `docs/AI_DEVELOPMENT_SYSTEM.md` §5 now links to it instead of duplicating the template.

## C-10 — Agent-behavior documentation overlap

- **Topic:** Two documents define agent behavior.
- **Document A:** `AGENTS.md` — authoritative agent rules (priority, modes,
  boundaries, security, validation, docs, reporting).
- **Document B:** `docs/AI_DEVELOPMENT_SYSTEM.md` — internal autonomous
  development contract (change cycle, classification, validation matrix, git
  policy, reporting).
- **Claim:** both cover validation commands, security rules, the docs map and
  the report template.
- **Impact:** duplication risk; an agent may treat the two as competing.
- **Severity:** MEDIUM.
- **Reconciliation options:** (a) KEEP SEPARATE with an explicit relationship:
  `AGENTS.md` = agent behavior in this repo, `AI_DEVELOPMENT_SYSTEM.md` = the
  proposed (not yet adopted) automated development system; add cross-references
  and de-duplicate the template; or (b) MERGE. Option (a) matches the documents'
  own declared scopes.
- **Decision:** Architecture owner.
- **Resolution (2026-08-27):** RESOLVED — A-05 approved. Roles declared in both documents: `AGENTS.md` = authoritative agent behavior; `docs/AI_DEVELOPMENT_SYSTEM.md` = process/workflow guidance; explicit cross-references added in both.

## C-11 — Canonical documentation map incomplete (gap; fixed in part)

- **Topic:** `docs/INDEX.md` completeness.
- **Document:** `docs/INDEX.md` claims "هر موضوع یک سند مرجع دارد" but omits the
  new `docs/product/*` documents (and the platform UI README).
- **Impact:** agents cannot discover the V2 product docs from the map.
- **Severity:** LOW/MEDIUM.
- **Resolution:** rows for `docs/product/WORKOUT-EXPERIENCE-V2.md` and
  `docs/product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md` were added during this
  audit (indisputable links, no rule change). Whether the platform UI README
  belongs in INDEX is left to the docs owner.
- **Decision:** docs owner (if any further rows are desired).
- **Resolution (2026-08-27):** RESOLVED — `docs/INDEX.md` now includes the `docs/product/*` rows (added during the audit) and was rebuilt into the authoritative map covering governance, ADRs, product vision, data and offline/sync reference rows.

## C-12 — DATA / offline-sync area has no docs/ reference (gap)

- **Topic:** Where the offline exercise-log → Supabase sync is documented.
- **Evidence:** `src/lib/offline/db.ts`, `src/services/syncService.ts`,
  `supabase/migrations/0001_workout_exercise_logs.sql`; the docs/ suite has no
  DATA row in `docs/INDEX.md`.
- **Impact:** the sync contract lives only in code comments; a future agent has
  no indexed reference.
- **Severity:** LOW.
- **Reconciliation options:** decide whether a `docs/DATA.md` (or a section in
  an existing doc) should own the offline-sync and data-contract knowledge.
- **Decision:** Architecture owner.
- **Resolution (2026-08-27):** RESOLVED (discoverability, per A-06) — `docs/INDEX.md` gains an Offline/Sync implementation-reference row (`src/lib/offline/`, `src/services/syncService.ts`, Supabase migration) explicitly marked `NO CANONICAL ARCHITECTURE DOC YET`; a deeper data contract is deferred to the Modularity Audit.

---

## Non-conflicts worth recording (observed consistency)

- `docs/EXECUTION_ROADMAP.md` is explicitly ARCHIVED with declared successors —
  the correct pattern for historical material; no conflict.
- `docs/CI.md` declares itself the successor of the temporary HANDOFF workflow
  section; the two workflows (`ci.yml`, `ci-full-e2e.yml`) match the documented
  policy (nightly full E2E 22:00 UTC).
- `docs/AI_API.md`'s route/status/limit tables match the implementation
  (`generate-program`, `analytics/events`, `ProgramGenerationRequest`).
- `docs/ASSETS.md` matches the code (AnimationPlayer Lottie/video switching,
  FPS/reduced-motion fallbacks, empty media namespaces, CSP allowlists).
- `docs/TRANSFORMATION_ROADMAP.md` current-state tables match actual pages/routes
  and the Prisma model list.
- `.env.example` matches `src/lib/ai/provider.ts` and `src/lib/auth/*` env
  reads (verified for the AI and OTP sections).

## Summary by severity (audit-time assessment)

| Severity | Count | IDs |
|---|---|---|
| CRITICAL | 0 | — |
| HIGH | 1 | C-01 |
| MEDIUM | 5 | C-02, C-03, C-09, C-10, C-11 |
| LOW | 6 | C-04, C-05, C-06, C-07, C-08, C-12 |

**Resolution status (2026-08-27):** all 12 original conflicts RESOLVED by the approved
reconciliation decisions (A-01…A-07, D-01…D-03). No conflict is left open.
**Post-stabilization reconciliation (2026-08-27):** S03 is closed, Session Core
is runtime-active, `useWorkoutEngine` is the React/browser adapter, and the old
`fix/rules-engine-safety-v2` branch was deleted through the owner-approved
functionally-superseded path. Current Production remains behind `main`; the
additive S02 Exercise migration is still a release prerequisite. The immediate
next step is `OWNER REVIEW → PRODUCTION RELEASE PREFLIGHT / DECISION`.

Future conflicts are handled per `docs/governance/DOCUMENTATION-GOVERNANCE.md`
§3 (hierarchy → evidence-based correction → `OWNER DECISION REQUIRED`).
