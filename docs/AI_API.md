# AI API Documentation / مستندات APIهای هوش مصنوعی

> This document describes the AI-related HTTP API endpoints of the app and is kept in sync with the current implementation. It records routes, auth, body schemas, sample request/response, status codes, rate limits, timeouts, medical clearance, in-memory constraints, and required environment variables — **without any secrets**.
>
> این سند endpoints مربوط به هوش مصنوعی را دقیقاً مطابق کد فعلی مستند می‌کند: مسیرها، احراز هویت، schema بدنه، نمونه request/response، کد وضعیت‌ها، محدودیت نرخ (rate limit)، timeout، سنجش پزشکی (medical clearance)، محدودیت‌های in-memory و متغیرهای محیطی لازم — **بدون ذکر هیچ secret**.
>
> Last reviewed against: `src/app/api/generate-program/route.ts`, `src/app/api/analytics/events/route.ts`, `src/lib/ai/requestSecurity.ts`, `src/lib/ai/rateLimitStore.ts`, `src/lib/ai/prompts.ts`, `src/lib/timeout.ts`, `src/services/programService.ts`, `src/services/userService.ts`, `src/services/analyticsEvents.ts`, `src/lib/supabase.ts`, `prisma/schema.prisma`.

---

## 1. Overview / مرور کلی

| | |
|---|---|
| Base path | Same-origin (no prefix; the i18n middleware only matches `/` and `/(fa\|en)/:path*`, so API routes are served as-is) |
| Runtime | Next.js App Router Route Handlers (`src/app/api/**/route.ts`) |
| Language | TypeScript, Zod v3 for validation, Prisma for persistence |
| AI provider | Vercel AI SDK v4 + explicit resolver: `@ai-sdk/groq@1.2.9` or `@ai-sdk/openai@1.3.24`; deterministic rules fallback |

Covered endpoints:

1. `POST /api/generate-program` — generates a personalized workout program through the explicitly configured Groq/OpenAI provider or a deterministic rules engine, then persists it for the authenticated user.
2. `POST /api/analytics/events` — first-party ingestion endpoint for client-side analytics events (validates and writes each event to the structured server log).

---

## 2. Authentication / احراز هویت

- Both endpoints live under `/api/*`, which is **not** matched by the i18n middleware — there is **no middleware-level auth guard**.
- Auth is enforced **inside** `POST /api/generate-program` via Supabase SSR session cookies:
  - `createServerSupabaseClient()` (`src/lib/supabase-server.ts`) builds a server Supabase client from the request cookies (`next/headers`), using `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - `getSupabaseAuthUser()` (`src/services/userService.ts`) calls `supabase.auth.getUser()`; it throws `UnauthenticatedError` when there is no valid session → the route returns `401 {"error":"Authentication required"}`.
  - The Supabase user id is then the canonical id: `syncUserWithSupabase()` ensures a matching Prisma `User` row exists (keyed by the Supabase auth user id), and that id backs the workout-history lookup, the rate-limit counters and the persisted program's `ownerId`.
- `POST /api/analytics/events` is **public / unauthenticated** — it has no auth check (client-side beacons cannot carry credentials reliably).

---

## 3. `POST /api/generate-program`

Source: `src/app/api/generate-program/route.ts` · helpers: `src/lib/ai/requestSecurity.ts`, `src/lib/ai/restDays.ts`, `src/lib/ai/prompts.ts`, `src/services/programService.ts`

### 3.1 Summary / خلاصه

Takes the user's workout profile (level, goal, equipment, limitations), checks safety (medical clearance), enforces per-IP / per-user rate limits and per-user concurrency, reads the user's recent workout history (last 10 sessions, up to 12 exercises each), resolves the explicitly configured provider immediately before generation, validates the structured output (`ProgramSchema`), and persists exactly one final program in **one Prisma transaction**. When `AI_GENERATION_FALLBACK=rules` and only the AI-generation step fails with an eligible provider error, the deterministic rules engine produces and validates the final output instead.

### 3.2 Request / بدنه درخواست

No auth header — identity comes from the Supabase session cookies. `Content-Type` is not checked; the body must be valid JSON (`req.json()`). The body is validated against `GENERATE_PROGRAM_INPUT_SCHEMA` (Zod, **strict** — unknown top-level keys are rejected → `400`).

| Field | Required | Type / allowed values | Constraints |
|---|---|---|---|
| `level` | ✅ | `'beginner' \| 'intermediate' \| 'advanced'` | — |
| `goal` | ✅ | `string` or `string[]` of `'strength' \| 'fat_loss' \| 'flexibility' \| 'functional_fitness'` | Single legacy string or array of 1–4 items; no duplicates; always normalized to an array (`goal: ['strength', 'fat_loss']`) |
| `trainingDaysPerWeek` | ❌ (level default) | integer `2–6` | Desired workout sessions per week. When omitted, rules mode uses beginner=3, intermediate=4, advanced=5; the result is capped by weekdays available after `restDays` |
| `equipment` | ✅ | `string[]` of `'none' \| 'pull_up_bar' \| 'bands' \| 'dumbbells' \| 'barbell' \| 'kettlebells' \| 'bench' \| 'cable_machine' \| 'jump_rope'` | 1–9 items; no duplicates; `'none'` cannot be combined with other items |
| `limitations` | ✅ | `string[]` of `'none' \| 'knee' \| 'lower_back' \| 'shoulder' \| 'wrist' \| 'ankle' \| 'hip' \| 'neck'` | 0–8 items; no duplicates; `'none'` cannot be combined with other items |
| `limitationsDetails` | ❌ (default `''`) | `string` | trimmed, max 1000 chars |
| `restDays` | ❌ (absent → no constraint) | `string[]` of `'monday' \| 'tuesday' \| 'wednesday' \| 'thursday' \| 'friday' \| 'saturday' \| 'sunday'` | 1–3 items (when present); no duplicates; absent/omitted → no rest-day constraint (backward compatible); an explicit `[]` is rejected. These weekdays are kept **workout-free** in the generated and persisted program |

**Idempotency header (optional, recommended for retries):**

| Header | Required | Format | Validation |
|---|---|---|---|
| `Idempotency-Key` | ❌ (optional) | `string`, 8–64 chars of `[A-Za-z0-9_-]` | invalid value → `400 {"error":"…","code":"INVALID_IDEMPOTENCY_KEY"}` |

Contract (see §3.10): when the header is present, the server guarantees that retries — and concurrent duplicates — of the **same key + same request body** never persist a second program:

- the first request runs and records the outcome in the `ProgramGenerationRequest` table (one row per user + key, unique constraint),
- a retry **after success** replays the exact 200 response body (same `program`, same `generated`),
- a **concurrent duplicate** gets a predictable `409` while work is in flight,
- **reusing a key with a different body** is rejected as `409` (conflict),
- a **failed attempt** can be retried with the same key — it starts a fresh attempt (the record is flipped to `FAILED` on any failure after the key was claimed).

Without the header the route behaves exactly as before (no idempotency guarantee). Clients should generate a fresh key per intended request and reuse it on retries.

Note: `limitations` is required but may be an empty array (`[]`); `equipment` requires at least one item. `goal` accepts the legacy single string (`"goal": "strength"`) **or** a multi-goal array (`"goal": ["strength", "fat_loss"]`); both are normalized to an array before the prompt/persistence step, and the two forms hash identically for idempotency purposes. `trainingDaysPerWeek` and `restDays` are separate concepts: the former is workout frequency, while the latter is a hard availability constraint. Both stay optional for older clients.

**Sample request:**

```json
POST /api/generate-program
Cookie: sb-<ref>-auth-token=<session>…   (Supabase session)

{
  "level": "beginner",
  "goal": ["strength", "fat_loss"],
  "trainingDaysPerWeek": 3,
  "equipment": ["dumbbells", "bench"],
  "limitations": ["knee"],
  "limitationsDetails": "Mild knee discomfort during squats",
  "restDays": ["wednesday", "sunday"]
}
```

### 3.3 Request flow (order matters) / ترتیب پردازش

1. Parse JSON body — failure → `400 {"error":"Invalid JSON body."}`
2. Validate against `GENERATE_PROGRAM_INPUT_SCHEMA` — failure → `400 {"error":"Invalid workout profile."}`
3. Resolve the Supabase user + sync the Prisma `User` — failure → `401 {"error":"Authentication required"}`
4. **Medical clearance check** on `limitationsDetails` — hit → `422` (see §3.5)
5. **Idempotency** (when `Idempotency-Key` is present): claim the key / classify the retry via `beginIdempotentGeneration` (see §3.10) — `replay` → `200` (cached body), `in_progress` → `409 IDEMPOTENCY_IN_PROGRESS`, `conflict` → `409 IDEMPOTENCY_CONFLICT`; only a claimed key proceeds. Runs **before** rate limiting so replays/duplicates never consume quota or re-run the AI
6. **Rate limiting / concurrency** via `await acquireGenerationSlot(userId, ip)` — rejection → `429` / `409` (see §3.4); a claimed key is flipped to `FAILED` so it can be retried later
7. Mode detection:
   - `limitations` non-empty and does not include `'none'` → `injury_focused`
   - else `equipment === ['none']` → `equipment_limited`
   - else → `general`
8. Load the mode-specific system prompt from `infra/ai/prompts/` (`loadSystemPrompt`)
9. Load recent `WorkoutSession` history (newest first, `take: 10`, exercises limited to 12 per session; completion status + actual sets/reps/duration drive the AI's progression/regression `adjustments`) — bounded by `HISTORY_QUERY_TIMEOUT_MS = 5_000` via `withTimeout` (see §3.6)
10. Resolve generation mode/provider with `resolveAiProvider()` **immediately before** generation:
    - `PROGRAM_GENERATOR=rules` → no external request;
    - `PROGRAM_GENERATOR=ai` + `AI_PROVIDER=groq|openai` → calls only that provider; API-key presence never selects a provider;
    - `AI_MODEL`, when non-empty, overrides `GROQ_MODEL`/`OPENAI_MODEL`.
11. `generateObject({ model: provider.model, schema: ProgramSchema, ... })` bounded by a **45 000 ms** timeout (`AI_GENERATION_TIMEOUT_MS`) via `withTimeout` (see §3.6). If and only if generation/configuration fails with an eligible provider category and `AI_GENERATION_FALLBACK=rules`, the v2 rules engine applies the requested/default frequency, equipment matching, limitation exclusions and recent-adherence progression/regression, then validates the result with the same `ProgramSchema`.
12. Persist the single validated final program (transactional, bounded — see §3.7) and return `200`; with a claimed key, `persistProgramForUserWithIdempotency` finalizes the record to `SUCCEEDED` **in the same transaction**

### 3.4 Rate limits & concurrency / محدودیت نرخ و همزمانی

All counters go through a **swappable store** — `RateLimitStore` (`src/lib/ai/rateLimitStore.ts`) — so the same limits hold across multiple instances and survive restarts:

- Default (local development): `InMemoryRateLimitStore` — the previous per-process `Map`s / `Set` behavior, zero configuration, no secrets.
- Production shared backend (explicit opt-in): `RedisRestRateLimitStore` — an Upstash REST-compatible Redis API selected with `RATE_LIMIT_STORE=redis` (+ `REDIS_REST_URL`, `REDIS_REST_TOKEN`). Atomicity is server-side: `INCR` + `EXPIRE … NX` fixed windows, `SET … NX PX` concurrency locks, and a token-checked `EVAL` release so a stale holder can never unlock a newer one.
- Store selection is explicit via env (see §5); any store failure surfaces as `500` (fail-closed, never silently bypassed).

| Limit | Store key | Value | Response |
|---|---|---|---|
| IP window | `ip:<ip>` (from `x-forwarded-for` first value → `x-real-ip` → `'unknown'`) | 5 requests / 60 s window (window = first request + 60 s) | `429 {"error":"Too many requests. Please wait a moment and try again."}` |
| User window | `user:<prisma-user-id>` | 3 requests / 60 s | `429` (same message) |
| Daily (user) | `daily:<YYYY-MM-DD (UTC)>:<prisma-user-id>` | 10 requests / UTC calendar day | `429 {"error":"Daily program generation limit reached. Please try again tomorrow."}` |
| Concurrency (user) | `ai-generation:concurrent:<prisma-user-id>` | 1 in-flight generation (lock TTL 60 s) | `409 {"error":"A program is already being generated. Please wait for it to finish."}` |

Behavioral notes:

- IP is derived from `x-forwarded-for` (first entry, trimmed) or `x-real-ip`; the route **trusts proxy headers** — set these correctly at the edge/proxy in production.
- The per-IP / per-user / daily counters are incremented **before** the concurrency check, so a request rejected with `409` still consumes one slot from the IP and user windows.
- The concurrency lock is acquired only after all checks pass and is released in the route's `finally` block (`releaseGenerationSlot`). The release is **token-checked**, and the lock auto-expires after `CONCURRENCY_LOCK_TTL_MS = 60_000` (45 s AI budget + buffer), so a crashed instance can never block a user forever.
- In the in-memory store, expired counters are pruned lazily on the next access (no background timer); in Redis, expiry is server-side (`EXPIRE … NX`).

### 3.5 Medical clearance / سنجش پزشکی

Before any AI call and before slot acquisition, `hasHighRiskDisclosure(limitationsDetails)` runs a regex over `limitationsDetails` (English **and** Persian keywords). If matched:

```json
HTTP 422
{
  "error": "Medical clearance is required before generating a program for the disclosed symptoms or condition.",
  "code": "MEDICAL_CLEARANCE_REQUIRED"
}
```

Matched categories (keyword classes, not the raw pattern): chest pain, shortness of breath / difficulty breathing, heart disease / cardiac conditions, pregnancy, severe pain or pain rated ≥ 7/10, and Persian equivalents (بیهوش، تنگی نفس، درد قفسه سینه، بیماری قلبی، باردار، درد شدید/۱۰). The check applies to `limitationsDetails` only — the enumerated `limitations` list does not trigger it.

### 3.6 Timeout / مهلت پاسخ

All bounded operations go through the `withTimeout` helper (`src/lib/timeout.ts`), which rejects with a typed `TimeoutError` carrying a stable `code`. The route answers every timeout with `504` plus that `code` (see the status table) — the response is safe (no internal details) and differentiated (AI vs. persistence).

- `AI_GENERATION_TIMEOUT_MS = 45_000` — if the AI call does not resolve within 45 s, the route responds `504 {"error":"Program generation timed out. Please try again.","code":"AI_TIMEOUT"}`.
- `HISTORY_QUERY_TIMEOUT_MS = 5_000` — bounds the recent-workout-history read (`prisma.workoutSession.findMany`).
- Persistence timeouts — see §3.7.
- The underlying provider request is **not aborted** (it may still complete server-side, but nothing is persisted). `withTimeout` swallows late completions/rejections of the timed-out operation, so a slow operation that finally fails after the timeout can never become an unhandled rejection. When the timeout originates inside the generation boundary and rules fallback is enabled, it produces one rules output; a history or persistence timeout never falls back.
- The route does not set `maxDuration`/`runtime` — it runs on the default Node.js runtime. On serverless platforms with a default function duration shorter than the AI + persistence budget (~55 s worst case), the platform may kill the function first; configure `maxDuration` if deploying there.

### 3.7 Persistence / ذخیره‌سازی

`persistProgramForUser(userId, {...})` (`src/services/programService.ts`) runs everything in a single interactive Prisma transaction, **bounded by a two-layer timeout budget** (`src/lib/timeout.ts`):

1. **Exercises**: upsert by unique `name` with an empty `update` — create-only, curated seed rows are never overwritten.
2. **Program**: created with `ownerId = userId`, `name = "AI Program <program_id>"` (unique), `durationWeeks = 6`, `sessionsPerWeek = number of TRAINING days in weekly_schedule` (rest-day entries are excluded), `restDays = <input restDays>` (Json array of weekday ids), `level` mapped from the input, description built from goal + mode + notes.
3. **ProgramExercise** links with the AI prescription (`sets`, `reps` parsed to Int, `restSeconds`) in program order. Because of the composite PK `@@id([programId, exerciseId])`, a repeated exercise name across sessions is linked only once (first occurrence). Sessions flagged `is_rest_day` (see §3.8) are skipped entirely — no exercise is ever linked to a user-selected rest day.
4. If any write fails, the whole transaction rolls back (no orphaned programs / exercises). A `P2002` unique-name collision on the program name surfaces as a generic `500`.
5. **Timeouts**: `withTimeout(transaction, PERSIST_TIMEOUT_MS = 10_000)` enforces the client-side deadline and rejects with `TimeoutError` (code `PERSISTENCE_TIMEOUT`) → `504` (see §3.6); Prisma's native `$transaction` options (`timeout: PERSIST_TRANSACTION_TIMEOUT_MS = 15_000`, `maxWait: PERSIST_MAX_WAIT_MS = 3_000`) are a larger server-side backstop that rolls the transaction back for truly stuck transactions. The wrapper fires first (its budget is smaller), so the client always gets the stable `PERSISTENCE_TIMEOUT` error. The route's `finally` still releases the user's concurrency slot — a stuck database can no longer hold it open indefinitely.

### 3.8 Response (200 OK)

```json
{
  "program": {
    "id": "clx…",
    "name": "AI Program prog_x1y2z3",
    "description": "Goal: strength, fat_loss. AI-generated general program. …",
    "level": "BEGINNER",
    "durationWeeks": 6,
    "sessionsPerWeek": 4,
    "createdAt": "2026-08-15T10:00:00.000Z",
    "updatedAt": "2026-08-15T10:00:00.000Z",
    "ownerId": "<supabase-user-id>",
    "exercises": [
      {
        "programId": "clx…",
        "exerciseId": "clx…",
        "order": 1,
        "sets": 3,
        "reps": 10,
        "restSeconds": 60,
        "exercise": {
          "id": "clx…",
          "name": "Goblet Squat",
          "category": "CALISTHENICS",
          "difficulty": "BEGINNER",
          "instructions": ["…"],
          "equipment": ["dumbbell"]
        }
      }
    ],
    "owner": { "id": "<supabase-user-id>", "email": "user@example.com", "name": "…" }
  },
  "generated": {
    "mode": "general",
    "program_id": "prog_x1y2z3",
    "method_mix": {
      "strength_pct": 40, "hypertrophy_pct": 20, "cardio_pct": 15,
      "mobility_pct": 10, "pilates_pct": 0, "bodyweight_pct": 15,
      "isometric_pct": 0
    },
    "weekly_schedule": [
      {
        "day": 1,
        "focus": "Full body strength",
        "warmup": [{ "name": "…", "duration_seconds": 300, "purpose": "…" }],
        "exercises": [
          {
            "id": "ex_1", "name": "Goblet Squat",
            "method": "strength", "equipment": "dumbbell",
            "sets": 3, "reps": "8-10", "rest_seconds": 90,
            "tempo": "2-0-2", "rpe": 7,
            "instruction_cue": "…",
            "alternatives": [{ "name": "…", "equipment": "…", "reason": "…" }],
            "contraindicated_for": ["knee"]
          }
        ],
        "cooldown": [{ "name": "…", "duration_seconds": 300, "purpose": "…" }],
        "notes": "…"
      }
    ],
    "progression_plan": {
      "weeks_1_2": "…", "weeks_3_5": "…", "week_6": "…",
      "overload_variables": ["…"]
    },
    "adjustments": {
      "summary": "…",
      "progression": ["…"],
      "regression": ["…"],
      "rationale": "…"
    },
    "warnings": ["…"],
    "notes": "…",
    "disclaimer": "This program is for general informational and educational purposes only…"
  }
}
```

Shape of `generated` (validated by `ProgramSchema` in the route):

- `mode`: `'general' | 'injury_focused' | 'equipment_limited'`
- `program_id`: string
- `rest_days`: string[] — the user's rest-day selection echoed from the input (canonical weekday ids, e.g. `["wednesday", "sunday"]`; `[]` when none was provided)
- `method_mix`: `strength_pct`, `hypertrophy_pct`, `cardio_pct`, `mobility_pct`, `pilates_pct`, `bodyweight_pct`, `isometric_pct` (numbers whose sum must equal exactly 100)
- `weekly_schedule`: array of `{ day, focus, day_name?, is_rest_day?, warmup[], exercises[], cooldown[], notes? }`
  - `day_name`: weekday of the session (e.g. `"Monday"`) — sessions are never placed on a rest day
  - `is_rest_day`: `true` for user-selected workout-free days, recovery days outside the requested weekly frequency, or entries rewritten by enforcement; these entries have **empty** `warmup`/`exercises`/`cooldown` and are excluded from persistence
  - `warmup` / `cooldown` items: `{ name, duration_seconds, purpose }`
  - exercise items: `{ id, name, method, equipment, sets|null, reps|null, rest_seconds|null, tempo|null, rpe|null, instruction_cue, alternatives[], contraindicated_for[] }`
    - `method` ∈ `strength | hypertrophy | cardio | mobility | pilates | bodyweight | isometric | flexibility`
    - `equipment` ∈ `none | dumbbell | barbell | kettlebell | resistance_band | pull_up_bar | bench | mat | cardio_machine | cable_machine | jump_rope | other`
- `progression_plan`: `{ weeks_1_2, weeks_3_5, week_6, overload_variables[] }`
- `adjustments`: `{ summary, progression[], regression[], rationale }` — required by the schema; grounded in workout history (falls back to a baseline statement when there is no history)
- `metadata`: `{ source: 'ai' | 'rules', provider: 'groq' | 'openai' | null, model: string | null, fallbackReason: string | null, engineVersion: string }`. Metadata is response/idempotency payload only; no migration is required and no provider key, prompt, quiz payload, medical detail, or raw provider response is stored or logged.

`program` is the persisted Prisma `Program` including ordered `exercises` (with their `exercise` records) and `owner` (`{ id, email, name }`).

### 3.9 Status codes / کد وضعیت‌ها

| Code | Meaning | Body |
|---|---|---|
| `200` | Program generated and persisted (or replayed from an idempotency record) | `{ program, generated }` |
| `400` | Malformed JSON **or** schema violation (incl. unknown keys) **or** invalid `Idempotency-Key` header | `{"error":"Invalid JSON body."}` / `{"error":"Invalid workout profile."}` / `{"error":"…","code":"INVALID_IDEMPOTENCY_KEY"}` |
| `401` | No valid Supabase session | `{"error":"Authentication required"}` |
| `409` | Another generation already in flight for this user | `{"error":"A program is already being generated. Please wait for it to finish."}` |
| `409` | Duplicate `Idempotency-Key` whose generation is already in progress | `{"error":"A generation with this Idempotency-Key is already in progress. Please retry shortly.","code":"IDEMPOTENCY_IN_PROGRESS"}` |
| `409` | `Idempotency-Key` already used with a different request body | `{"error":"This Idempotency-Key was already used with a different request.","code":"IDEMPOTENCY_CONFLICT"}` |
| `422` | High-risk disclosure in `limitationsDetails` | `{"error":"…", "code":"MEDICAL_CLEARANCE_REQUIRED"}` |
| `429` | IP / user / daily rate limit exceeded | see §3.4 |
| `504` | AI call exceeded 45 s | `{"error":"Program generation timed out. Please try again.","code":"AI_TIMEOUT"}` |
| `504` | Persistence (history query or program save) exceeded its budget | `{"error":"Your program could not be processed right now. Please try again.","code":"PERSISTENCE_TIMEOUT"}` |
| `500` | Internal error (prompt/history/Prisma/persistence/provider error outside the eligible generation boundary, user-sync error, program-name collision) — logs only a stable category, never prompts/profiles/API details | `{"error":"Failed to generate program"}` |

### 3.10 Idempotency / تکرارناپذیری

Source: `src/lib/ai/idempotency.ts` (pure contract) + `src/services/generationIdempotency.ts` (Prisma-backed state machine) + `persistProgramForUserWithIdempotency` in `src/services/programService.ts`.

Ledger: the `ProgramGenerationRequest` table — one row per `(userId, Idempotency-Key)` (unique constraint), with `requestHash` (SHA-256 of the normalized request body — key-order-independent, no secrets), `status` (`IN_PROGRESS | SUCCEEDED | FAILED`), and a cached `responsePayload` for exact replays.

Behavior on `beginIdempotentGeneration` (runs after auth + medical check, before rate limiting):

| Record state | Outcome |
|---|---|
| none | claim → the request runs (row created `IN_PROGRESS`) |
| `SUCCEEDED`, same body | `replay` → `200` with the cached `{ program, generated }` — no AI call, no quota consumed |
| `IN_PROGRESS` (fresh) | `in_progress` → `409 IDEMPOTENCY_IN_PROGRESS` |
| same key, different body (any status) | `conflict` → `409 IDEMPOTENCY_CONFLICT` |
| `FAILED` (or `IN_PROGRESS` older than 120 s — crashed holder) | atomic reclaim → fresh attempt |

Failure handling: the record is finalized to `SUCCEEDED` **inside the same transaction** that creates the `Program` (a persisted program can never exist without a replayable record, and vice versa). On any failure after claim (rate-limit rejection, AI timeout, persistence error, crash) the record is flipped to `FAILED`, so a retry with the same key re-executes instead of hanging on `409`.

Retention: rows are pruned lazily by `updatedAt` after **30 days** (best-effort `deleteMany` on the next keyed request); a replayed key older than that starts a new generation.

---

## 4. `POST /api/analytics/events`

Source: `src/app/api/analytics/events/route.ts` · client: `src/services/analyticsEvents.ts` · logger: `src/lib/logger.ts`

### 4.1 Summary / خلاصه

First-party ingestion endpoint for client-side analytics events. Validates a batch and writes each valid event to the **structured server log** under the `analytics` scope (JSON lines in production) — no database write today; a persistence layer (Supabase/Postgres, warehouse, …) can be added later without touching the client.

### 4.2 Request / بدنه درخواست

- **Public** — no authentication.
- `Content-Type` must include `application/json` → otherwise `415 {"error":"unsupported media type"}`.
- Body must be **either** a JSON array of events **or** an object `{ "events": [...] }`.
- Event shape: `{ name, properties, ts, sessionId, locale?, url? }`.

**Sample request:**

```json
POST /api/analytics/events
Content-Type: application/json

{
  "events": [
    {
      "name": "workout_started",
      "properties": { "exercises": 6, "sets": 12 },
      "ts": "2026-08-15T10:00:00.000Z",
      "sessionId": "s_…",
      "locale": "en",
      "url": "https://example.com/workout/123"
    }
  ]
}
```

### 4.3 Limits / محدودیت‌ها

| Constraint | Value | Behavior |
|---|---|---|
| `MAX_BODY_BYTES` | 64 × 1024 (chars of `req.text()`) | over → `413 {"error":"payload too large"}` |
| `MAX_EVENTS` | 50 | batch is sliced to the first 50 (`slice`); the rest are dropped |
| `MAX_STRING_LENGTH` | 500 | string values truncated with `…` in `properties` |
| Sanitize depth | 3 | deeper objects/arrays become `'[object]'` / `'[array]'` |
| Array cap (sanitize) | 50 items | longer `properties` arrays are sliced |
| No rate limit / timeout | — | none implemented (synchronous, log-only) |

### 4.4 Event validation / اعتبارسنجی رویداد

Per-event check (`isValidEvent`) — **invalid events are silently dropped** (never fail the batch):

| Field | Rule |
|---|---|
| `name` | required, `string`, length 1–200 |
| `properties` | optional; `object` (or `null`); values deep-sanitized |
| `sessionId` | optional `string` (any length) |
| `locale` | optional `string` |
| `url` | optional `string` |
| `ts` | **not validated** — logged as-is |

### 4.5 Logging behavior / رفتار ثبت

- Each valid event is written with `log.info('event', { name, sessionId, locale, url, ts, properties })` under scope `analytics`.
- The logger (`src/lib/logger.ts`) redacts values whose keys match sensitive patterns (`password`, `token`, `secret`, `authorization`, `auth`, `cookie`, `api[_-]?key`, …, **`session[_-]?id`**) → **`sessionId` appears as `[REDACTED]` in the logs**. `properties` are sanitized and truncated before logging, so one bad event can never blow up the log sink.
- Success returns `204 No Content` **even if the whole batch was invalid** (an empty set of valid events is still "success").
- Failures are logged with `log.warn` and returned as `400`.

### 4.6 Status codes / کد وضعیت‌ها

| Code | Meaning | Body |
|---|---|---|
| `204` | Accepted (events logged) | empty body |
| `400` | Invalid JSON, or body is neither an array nor `{ events: [] }` | `{"error":"invalid payload"}` / `{"error":"expected an array of events"}` |
| `413` | Body text > 64 KiB | `{"error":"payload too large"}` |
| `415` | `Content-Type` is not `application/json` | `{"error":"unsupported media type"}` |

### 4.7 Client usage / استفاده سمت کلاینت

`src/services/analyticsEvents.ts` is the only producer: `trackEvent(name, properties)` → `navigator.sendBeacon` (fallback `fetch` with `keepalive`), in-memory queue capped at **100 events** (oldest dropped), flushed on `online` / `visibilitychange(hidden)` / after 750 ms. Canonical event names: `workout_start_clicked`, `workout_started`, `quiz_completed`.

---

## 5. Environment variables / متغیرهای محیطی

Names only — no values (see `.env.example`). Runtime source of truth: `src/lib/ai/provider.ts`, `src/lib/supabase.ts`, and `src/lib/prisma`.

| Variable | Needed by | Required? |
|---|---|---|
| `PROGRAM_GENERATOR` | `generate-program` provider resolver: `ai` (default) or `rules` | ❌ optional (default `ai`) |
| `AI_PROVIDER` | Explicit provider selection: `groq` or `openai` | ⚠️ conditional when generator is `ai` |
| `AI_GENERATION_FALLBACK` | Enables deterministic `rules` fallback for eligible generation/configuration failures | ❌ optional (default `rules`) |
| `AI_MODEL` | Global model override | ❌ optional |
| `GROQ_API_KEY` | Groq generation | ⚠️ conditional |
| `GROQ_MODEL` | Groq model (default `openai/gpt-oss-120b`) | ❌ optional |
| `OPENAI_API_KEY` | OpenAI generation | ⚠️ conditional |
| `OPENAI_MODEL` | OpenAI model (default `gpt-4o-mini`) | ❌ optional |
| `RUN_AI_PROVIDER_SMOKE` | Opt-in real provider smoke test only; never ordinary CI | ❌ optional |
| `NEXT_PUBLIC_SUPABASE_URL` | `generate-program` (auth + user sync) | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `generate-program` (auth + user sync) | ✅ |
| `DATABASE_URL` | `generate-program` (Prisma: history query + persistence) | ✅ |
| `NEXT_PUBLIC_SITE_URL` | PWA / TWA release, OG metadata (not read by these routes) | ❌ optional |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | error tracking (console reporter fallback without it) | ❌ optional |
| `RATE_LIMIT_STORE` | `generate-program` rate limiting — `memory` (default) or `redis` | ❌ optional |
| `REDIS_REST_URL` / `REDIS_REST_TOKEN` | Redis REST store when `RATE_LIMIT_STORE=redis` | ⚠️ conditional |

The provider is selected only by `PROGRAM_GENERATOR` and `AI_PROVIDER`; the presence of a key never silently changes the route. The AI call is created only after input/auth/medical/idempotency/rate-limit/history checks. `PROGRAM_GENERATOR=rules` makes no external AI call. With `AI_GENERATION_FALLBACK=rules`, only provider-generation/configuration categories (`ai_quota_exhausted`, `ai_rate_limited`, `ai_timeout`, `ai_network_failure`, `ai_provider_5xx`, `ai_schema_validation_failed`, `ai_configuration_error`) select the rules engine; validation, auth, medical, rate-limit, history, Prisma, persistence, and unknown programming errors do not.

`GROQ_API_KEY` and `OPENAI_API_KEY` are server-only: keep them in the ignored deployment `.env`, never in `NEXT_PUBLIC_*`, source, git, prompts, or logs. `metadata` reports only source/provider/model/category/engine version; no secret or user payload is recorded.

---

## 6. Runtime dependencies & deployment notes / وابستگی‌های زمان اجرا

- **Prompt files (deployment artifact):** `infra/ai/prompts/01-general-program-generation-prompt.md`, `02-injury-focused-program-prompt.md`, `03-equipment-limited-program-prompt.md` are read from `process.cwd()` at request time by `loadSystemPrompt(mode)`. A missing file → `500 {"error":"Failed to generate program"}`. They must be present in the deployed artifact.
- **Database:** SQLite via Prisma (`DATABASE_URL`), with migrations in `prisma/` — `WorkoutSession`, `User`, `Program`, `ProgramExercise`, `Exercise` are read/written by `generate-program`, plus the `ProgramGenerationRequest` idempotency ledger (§3.10).
- **AI call:** one structured-output call per request through the explicitly configured provider (`groq` or `openai`). `GROQ_API_KEY`/`OPENAI_API_KEY` are server-only runtime variables; model selection is `AI_MODEL` then provider-specific model. The route does not configure `maxDuration`; default Node.js runtime. See §3.6.
- **Workout tracking:** `POST /api/workout/session` creates and completes user-owned `WorkoutSession` rows used by dashboard completion markers, History, Analytics and future generation history.
- **Body size:** no app-level limit on `generate-program` (platform default applies); `analytics/events` enforces 64 KiB itself.
- **Logging:** `analytics/events` output goes to structured logs (scope `analytics`); in production each entry is a single JSON line suitable for aggregation (CloudWatch, Datadog, …). Sensitive keys are redacted by the logger.

---

## 7. In-memory constraints / محدودیت‌های حافظه

- **`generate-program` rate limiting is store-backed** (`src/lib/ai/rateLimitStore.ts`):
  - The default **in-memory** store (`InMemoryRateLimitStore`) keeps the old per-process behavior: counters and locks are module-level singletons, **not shared** across serverless instances/replicas and **lost on process restart**; expired entries are pruned lazily (no timer). Under horizontal scaling the effective limits multiply by the number of instances — a soft guard, not an authoritative quota.
  - The production **shared** backend (`RATE_LIMIT_STORE=redis`, Upstash REST-compatible) makes the same limits authoritative across all instances and after restarts: fixed windows via atomic `INCR` + `EXPIRE … NX`, concurrency via `SET … NX PX` with a 60 s TTL and token-checked `EVAL` release. See §3.4.
  - Per-process state that remains: the lock-token registry in `requestSecurity.ts` (acquire/release always happen inside one HTTP request on one instance).
- **`analytics/events`**: no server-side queue/state. The client-side queue (`analyticsEvents.ts`) holds at most **100 events** in memory and drops the oldest beyond that.
- **Program generation is fully synchronous per request** (one in-flight per user by design); the 45 s AI timeout and the persistence timeouts (5 s history read / 10 s save wrapper + native backstop, see §3.6–3.7) prevent unbounded resource usage, but the underlying AI request is not cancelled.
- **Idempotency is DB-backed, not in-memory** (`ProgramGenerationRequest`): replay/conflict state survives restarts and is shared across instances (same SQLite/DB), unlike the rate-limit counters' in-memory default. Rows are pruned lazily after 30 days; an `IN_PROGRESS` row older than 120 s is treated as a crashed holder and reclaimed.

---

## 8. Related files / فایل‌های مرتبط

| Purpose | Path |
|---|---|
| Generate-program route | `src/app/api/generate-program/route.ts` |
| Analytics ingestion route | `src/app/api/analytics/events/route.ts` |
| Input schema, rate limits, medical clearance, timeout, disclaimer | `src/lib/ai/requestSecurity.ts` |
| Swappable rate-limit store (in-memory fallback + Redis REST shared backend) | `src/lib/ai/rateLimitStore.ts` |
| Idempotency-Key contract (validation, request hash) | `src/lib/ai/idempotency.ts` |
| Idempotency state machine (claim / replay / conflict / reclaim) | `src/services/generationIdempotency.ts` |
| System prompts + modes | `src/lib/ai/prompts.ts` |
| Program persistence (transactional, incl. idempotency finalize) | `src/services/programService.ts` |
| Supabase auth / user sync | `src/services/userService.ts` |
| Server Supabase client (cookies) | `src/lib/supabase-server.ts` |
| Supabase env config | `src/lib/supabase.ts` |
| Client analytics tracking | `src/services/analyticsEvents.ts` |
| Structured logger (redaction) | `src/lib/logger.ts` |
| Data model | `prisma/schema.prisma` |
| Env template | `.env.example` |
| Prompt files (deployment artifact) | `infra/ai/prompts/*.md` |
| Security helper tests | `tests/request-security.test.ts` |
| Rate-limit store + race condition tests | `tests/rate-limit-store.test.ts` |
| Idempotency contract + state-machine tests | `tests/idempotency.test.ts` |
