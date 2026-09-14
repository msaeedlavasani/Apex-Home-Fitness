# Current System Baseline

> **STATUS: CURRENT — bounded system snapshot**
> **SNAPSHOT_SHA:** `ff1202c687889f0de9f340d38dbcbdb1687f9db5` (`origin/main`)
> **DATE:** 2026-09-14
> **PURPOSE:** the single bounded description of the observed system for future
> agents and feature specs — so specs can cite shared facts instead of
> re-deriving them. This is NOT a retro-spec, NOT a requirements document, and
> NOT a second architecture audit (full evidence:
> [`architecture/AHF-ARCHITECTURE-SCALE-READINESS-AUDIT.md`](./architecture/AHF-ARCHITECTURE-SCALE-READINESS-AUDIT.md)).
>
> **Refresh rule:** refresh this file when a change materially affects a fact
> recorded here (in the same change, per Documentation With Change,
> `governance/DOCUMENTATION-GOVERNANCE.md` §2.7), or mark it explicitly stale
> (`STATUS: STALE — see …`). Facts are labeled with exactly one of:
> `OBSERVED CURRENT STATE` (verified, evidence-cited) · `PRODUCT REQUIREMENT`
> (stated policy from a canonical owner) · `ARCHITECTURAL RULE` (binding rule
> with its authority) · `UNKNOWN / OWNER DECISION`.

---

## Stack (OBSERVED CURRENT STATE)

Next.js 15.5.23 App Router (standalone output) · React ^18 · TypeScript 5 strict · Node.js >=22 (`.nvmrc`; digest-pinned `node:22-alpine`) · npm + lockfile v3 · next-intl 4.13.7 (`/en` + `/fa`, RTL) · Tailwind 3.4 + platform kit (`src/components/ui/platform`) + MUI confined to allowlist (`scripts/governance-runtime.mjs`) · Prisma 6.19 + SQLite · Supabase (`@supabase/ssr`) · Dexie (IndexedDB) · Vercel AI SDK + Groq/OpenAI · Playwright (17 specs) + node:test (82 unit/contract files).

## Data planes (OBSERVED CURRENT STATE)

1. **Prisma/SQLite (server)** — 15 models, 13 migrations; production DB is the Docker volume `apexhomefit_prod_db:/data`. `@/lib/prisma` imported by exactly 10 files (6 route handlers, 3 admin modules, `movementGraphStore`).
2. **Supabase** — auth (phone OTP via SMS.ir live / explicit mock that never mints sessions), session cookies refreshed in `src/middleware.ts`, private `avatars` Storage bucket, one Postgres table `workout_exercise_logs` (RLS; client-side upserts). supabase-js imports confined to 9 src files + 2 wrapper modules (`src/lib/supabase{,-server}.ts`).
3. **Browser (Dexie/IndexedDB)** — `activePrograms`, `workoutStates` (snapshot versioning + LWW/monotonic conflict policy), `exerciseLogs` outbox (attempt-capped), drained to Supabase by `src/services/syncService.ts` with idempotent upserts.

**Identity contract (OBSERVED CURRENT STATE):** `Prisma User.id == Supabase auth user.id`; the same id namespaces offline Dexie records and `workout_exercise_logs.user_id` (documented in `src/lib/offline/db.ts`, `src/services/syncService.ts`; implemented in `src/services/userService.ts`).

## Key behaviors (OBSERVED CURRENT STATE)

- **Program generation**: `POST /api/generate-program` — zod schema, idempotency ledger (`ProgramGenerationRequest`), rate limiting via `RateLimitStore` (in-memory default; Upstash Redis REST optional, inactive), concurrency slots + timeout, provider resolver (env: `PROGRAM_GENERATOR`, `AI_PROVIDER`; Groq geo-blocked from Iranian egress per `.env.example`), classified fail-closed fallback to the deterministic rules engine (`AI_ENGINE_VERSION = 'rules-v2/provider-v1'`).
- **Workout session**: pure core `src/lib/workout/sessionCore.ts` + thin adapter `useWorkoutEngine` (S03, ADR-0002); offline persistence with snapshot versioning (S-05).
- **Analytics**: `POST /api/analytics/events` validates/sanitizes and writes to structured logs only — no persistence table.
- **Observability**: structured logger; Sentry optional (DSN-gated); `/api/monitor/sms-delivery`.
- **Production**: single host, docker compose (`migrate` + `app`), deploy via root-owned `apex-deploy-gateway` (exact-SHA, fail-closed, rollback snapshots); last verified checkpoint `4ada1dae` (STABILIZATION-S06-S05), while `main` has advanced (docs-only + CODE_NO_DEPLOY work per `CURRENT_STATE.md` Notes).
- **CI**: per-push fast lane (governance → guardrail → gateway tests → lint → typecheck → unit → build → targeted E2E) + nightly full E2E; branch protection `enforce_admins`.

## Binding rules most likely to constrain new work (ARCHITECTURAL RULE)

- Session transitions only through the pure session core (ADR-0002; PRINCIPLES §13.4).
- `reuse → extend → compose → create` (AGENTS.md §3); KIT-FIRST UI (AGENTS.md §6).
- One executable backlog = `docs/TASKS.md` (DOCUMENTATION-GOVERNANCE §2.11); authority hierarchy §4.
- Release: task complete only at verified Production checkpoint; real-browser acceptance (RELEASE_POLICY RULE 1/6/7); no deploy/migration without explicit approval + verified rollback.
- Privacy: raw video never leaves the device; camera consent two-layer; default non-persistence (ADR-0014/0021).
- CSP relaxations require documented per-origin justification (`next.config.mjs`).
- Both `/en` and `/fa` must always work (AGENTS.md §4).

## Product constraints carried from canonical docs (PRODUCT REQUIREMENT)

- Bilingual fa/en product with RTL/LTR parity (README, PRODUCT-VISION).
- AI is assistive with a deterministic fallback; program generation carries a medical disclaimer and high-risk disclosure gates (`src/lib/ai/requestSecurity.ts`, `docs/AI_API.md`).
- OTP public launch is gated on the Go/No-Go checklist (`docs/OTP_LAUNCH_READINESS.md`); production mock OTP is emergency-only.

## Open facts (UNKNOWN / OWNER DECISION)

- Supabase plan/tier/limits/region (account facts not in the repository).
- Any real traffic baseline (no metrics pipeline; all scale math is relative — audit §6).
- Product intent for the DEV 3D workout prototype (`prototype/workout-layout-blueprint`): adoption, scope, and whether `three`, `MentorStage.tsx`, and the CSP `blob:` relaxation reach `main` (pilot/Stage-4 territory; D2 pending).
- Pre-existing owner gates (not reopened here): MG-09 Production apply; TS-03 Production deletion acceptance; CP-05 physical acceptance; dual compose file cleanup; OTP Go/No-Go.
