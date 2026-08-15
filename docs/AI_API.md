# AI API Documentation / مستندات APIهای هوش مصنوعی

> This document describes the AI-related HTTP API endpoints of the app and is kept in sync with the current implementation. It records routes, auth, body schemas, sample request/response, status codes, rate limits, timeouts, medical clearance, in-memory constraints, and required environment variables — **without any secrets**.
>
> این سند endpoints مربوط به هوش مصنوعی را دقیقاً مطابق کد فعلی مستند می‌کند: مسیرها، احراز هویت، schema بدنه، نمونه request/response، کد وضعیت‌ها، محدودیت نرخ (rate limit)، timeout، سنجش پزشکی (medical clearance)، محدودیت‌های in-memory و متغیرهای محیطی لازم — **بدون ذکر هیچ secret**.
>
> Last reviewed against: `src/app/api/generate-program/route.ts`, `src/app/api/analytics/events/route.ts`, `src/lib/ai/requestSecurity.ts`, `src/lib/ai/prompts.ts`, `src/services/programService.ts`, `src/services/userService.ts`, `src/services/analyticsEvents.ts`, `src/lib/supabase.ts`, `prisma/schema.prisma`.

---

## 1. Overview / مرور کلی

| | |
|---|---|
| Base path | Same-origin (no prefix; the i18n middleware only matches `/` and `/(fa\|en)/:path*`, so API routes are served as-is) |
| Runtime | Next.js App Router Route Handlers (`src/app/api/**/route.ts`) |
| Language | TypeScript, Zod v3 for validation, Prisma for persistence |
| AI provider | Vercel AI SDK (`ai` v4) + `@ai-sdk/openai`, model `gpt-4o-mini` |

Covered endpoints:

1. `POST /api/generate-program` — generates a personalized workout program with OpenAI and persists it for the authenticated user.
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

Source: `src/app/api/generate-program/route.ts` · helpers: `src/lib/ai/requestSecurity.ts`, `src/lib/ai/prompts.ts`, `src/services/programService.ts`

### 3.1 Summary / خلاصه

Takes the user's workout profile (level, goal, equipment, limitations), checks safety (medical clearance), enforces per-IP / per-user rate limits and per-user concurrency, reads the user's recent workout history (last 10 sessions, up to 12 exercises each), calls `gpt-4o-mini` with a mode-specific system prompt and a strict Zod output schema (`generateObject`), then persists the validated program in **one Prisma transaction** and returns both the DB record and the full AI output.

### 3.2 Request / بدنه درخواست

No auth header — identity comes from the Supabase session cookies. `Content-Type` is not checked; the body must be valid JSON (`req.json()`). The body is validated against `GENERATE_PROGRAM_INPUT_SCHEMA` (Zod, **strict** — unknown top-level keys are rejected → `400`).

| Field | Required | Type / allowed values | Constraints |
|---|---|---|---|
| `level` | ✅ | `'beginner' \| 'intermediate' \| 'advanced'` | — |
| `goal` | ✅ | `'strength' \| 'fat_loss' \| 'flexibility' \| 'functional_fitness'` | — |
| `equipment` | ✅ | `string[]` of `'none' \| 'pull_up_bar' \| 'bands' \| 'dumbbells' \| 'barbell' \| 'kettlebells' \| 'bench' \| 'cable_machine' \| 'jump_rope'` | 1–9 items; no duplicates; `'none'` cannot be combined with other items |
| `limitations` | ✅ | `string[]` of `'none' \| 'knee' \| 'lower_back' \| 'shoulder' \| 'wrist' \| 'ankle' \| 'hip' \| 'neck'` | 0–8 items; no duplicates; `'none'` cannot be combined with other items |
| `limitationsDetails` | ❌ (default `''`) | `string` | trimmed, max 1000 chars |

Note: `limitations` is required but may be an empty array (`[]`); `equipment` requires at least one item.

**Sample request:**

```json
POST /api/generate-program
Cookie: sb-<ref>-auth-token=<session>…   (Supabase session)

{
  "level": "beginner",
  "goal": "strength",
  "equipment": ["dumbbells", "bench"],
  "limitations": ["knee"],
  "limitationsDetails": "Mild knee discomfort during squats"
}
```

### 3.3 Request flow (order matters) / ترتیب پردازش

1. Parse JSON body — failure → `400 {"error":"Invalid JSON body."}`
2. Validate against `GENERATE_PROGRAM_INPUT_SCHEMA` — failure → `400 {"error":"Invalid workout profile."}`
3. Resolve the Supabase user + sync the Prisma `User` — failure → `401 {"error":"Authentication required"}`
4. **Medical clearance check** on `limitationsDetails` — hit → `422` (see §3.5)
5. **Rate limiting / concurrency** via `acquireGenerationSlot(userId, ip)` — rejection → `429` / `409` (see §3.4)
6. Mode detection:
   - `limitations` non-empty and does not include `'none'` → `injury_focused`
   - else `equipment === ['none']` → `equipment_limited`
   - else → `general`
7. Load the mode-specific system prompt from `infra/ai/prompts/` (`loadSystemPrompt`)
8. Load recent `WorkoutSession` history (newest first, `take: 10`, exercises limited to 12 per session; completion status + actual sets/reps/duration drive the AI's progression/regression `adjustments`)
9. `generateObject({ model: openai('gpt-4o-mini'), schema: ProgramSchema, ... })` raced against a **45 000 ms** timeout
10. Persist the validated program (transactional) and return `200`

### 3.4 Rate limits & concurrency / محدودیت نرخ و همزمانی

All counters live in **module-level in-memory `Map`s / `Set`** in `src/lib/ai/requestSecurity.ts` (per process instance — see §7).

| Limit | Key | Value | Response |
|---|---|---|---|
| IP window | `x-forwarded-for` first value → `x-real-ip` → `'unknown'` | 5 requests / 60 s window (window = first request + 60 s) | `429 {"error":"Too many requests. Please wait a moment and try again."}` |
| User window | Prisma user id | 3 requests / 60 s | `429` (same message) |
| Daily (user) | `YYYY-MM-DD (UTC) : userId` | 10 requests / UTC calendar day | `429 {"error":"Daily program generation limit reached. Please try again tomorrow."}` |
| Concurrency (user) | user id in `activeUsers` set | 1 in-flight generation | `409 {"error":"A program is already being generated. Please wait for it to finish."}` |

Behavioral notes:

- IP is derived from `x-forwarded-for` (first entry, trimmed) or `x-real-ip`; the route **trusts proxy headers** — set these correctly at the edge/proxy in production.
- The per-IP / per-user / daily counters are incremented **before** the concurrency check, so a request rejected with `409` still consumes one slot from the IP and user windows.
- The concurrency slot is added only after all checks pass and is released in the route's `finally` block (`releaseGenerationSlot`).
- Expired counters are pruned lazily on the next `consume` call (no background timer).

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

- `AI_GENERATION_TIMEOUT_MS = 45_000` — if the AI call does not resolve within 45 s, the route responds `504 {"error":"Program generation timed out. Please try again."}`.
- The timeout is implemented with `Promise.race`; the underlying OpenAI request is **not aborted** (it may still complete server-side, but nothing is persisted).
- The route does not set `maxDuration`/`runtime` — it runs on the default Node.js runtime. On serverless platforms with a default function duration shorter than 45 s (e.g. Vercel Hobby), the platform may kill the function first; configure `maxDuration` if deploying there.

### 3.7 Persistence / ذخیره‌سازی

`persistProgramForUser(userId, {...})` (`src/services/programService.ts`) runs everything in a single interactive Prisma transaction:

1. **Exercises**: upsert by unique `name` with an empty `update` — create-only, curated seed rows are never overwritten.
2. **Program**: created with `ownerId = userId`, `name = "AI Program <program_id>"` (unique), `durationWeeks = 6`, `sessionsPerWeek = number of days in weekly_schedule`, `level` mapped from the input, description built from goal + mode + notes.
3. **ProgramExercise** links with the AI prescription (`sets`, `reps` parsed to Int, `restSeconds`) in program order. Because of the composite PK `@@id([programId, exerciseId])`, a repeated exercise name across sessions is linked only once (first occurrence).
4. If any write fails, the whole transaction rolls back (no orphaned programs / exercises). A `P2002` unique-name collision on the program name surfaces as a generic `500`.

### 3.8 Response (200 OK)

```json
{
  "program": {
    "id": "clx…",
    "name": "AI Program prog_x1y2z3",
    "description": "Goal: strength. AI-generated general program. …",
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
- `method_mix`: `strength_pct`, `hypertrophy_pct`, `cardio_pct`, `mobility_pct`, `pilates_pct`, `bodyweight_pct`, `isometric_pct` (numbers)
- `weekly_schedule`: array of `{ day, focus, warmup[], exercises[], cooldown[], notes? }`
  - `warmup` / `cooldown` items: `{ name, duration_seconds, purpose }`
  - exercise items: `{ id, name, method, equipment, sets|null, reps|null, rest_seconds|null, tempo|null, rpe|null, instruction_cue, alternatives[], contraindicated_for[] }`
    - `method` ∈ `strength | hypertrophy | cardio | mobility | pilates | bodyweight | isometric | flexibility`
    - `equipment` ∈ `none | dumbbell | barbell | kettlebell | resistance_band | pull_up_bar | bench | mat | cardio_machine | other`
- `progression_plan`: `{ weeks_1_2, weeks_3_5, week_6, overload_variables[] }`
- `adjustments`: `{ summary, progression[], regression[], rationale }` — required by the schema; grounded in workout history (falls back to a baseline statement when there is no history)
- `warnings[]`, `notes`, `disclaimer` — `disclaimer` is trimmed and falls back to the app's `MEDICAL_DISCLAIMER` when empty

`program` is the persisted Prisma `Program` including ordered `exercises` (with their `exercise` records) and `owner` (`{ id, email, name }`).

### 3.9 Status codes / کد وضعیت‌ها

| Code | Meaning | Body |
|---|---|---|
| `200` | Program generated and persisted | `{ program, generated }` |
| `400` | Malformed JSON **or** schema violation (incl. unknown keys) | `{"error":"Invalid JSON body."}` / `{"error":"Invalid workout profile."}` |
| `401` | No valid Supabase session | `{"error":"Authentication required"}` |
| `409` | Another generation already in flight for this user | `{"error":"A program is already being generated. Please wait for it to finish."}` |
| `422` | High-risk disclosure in `limitationsDetails` | `{"error":"…", "code":"MEDICAL_CLEARANCE_REQUIRED"}` |
| `429` | IP / user / daily rate limit exceeded | see §3.4 |
| `504` | AI call exceeded 45 s | `{"error":"Program generation timed out. Please try again."}` |
| `500` | Internal error (Prisma, prompt file missing, provider error, user-sync error, program-name collision) — logs only a stable error category, never prompts/profiles/API details | `{"error":"Failed to generate program"}` |

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

Names only — no values (see `.env.example`). Runtime source of truth: `src/lib/supabase.ts`, `src/lib/prisma`, `@ai-sdk/openai`.

| Variable | Needed by | Required? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `generate-program` (auth + user sync) | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `generate-program` (auth + user sync) | ✅ |
| `DATABASE_URL` | `generate-program` (Prisma: history query + persistence) | ✅ |
| `OPENAI_API_KEY` | `generate-program` (default env var read by `@ai-sdk/openai`) | ✅ |
| `NEXT_PUBLIC_SITE_URL` | PWA / TWA release, OG metadata (not read by these routes) | ❌ optional |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | error tracking (console reporter fallback without it) | ❌ optional |

`analytics/events` requires **no** environment variables (logger only).

---

## 6. Runtime dependencies & deployment notes / وابستگی‌های زمان اجرا

- **Prompt files (deployment artifact):** `infra/ai/prompts/01-general-program-generation-prompt.md`, `02-injury-focused-program-prompt.md`, `03-equipment-limited-program-prompt.md` are read from `process.cwd()` at request time by `loadSystemPrompt(mode)`. A missing file → `500 {"error":"Failed to generate program"}`. They must be present in the deployed artifact.
- **Database:** SQLite via Prisma (`DATABASE_URL`), with migrations in `prisma/` — `WorkoutSession`, `User`, `Program`, `ProgramExercise`, `Exercise` are read/written by `generate-program`.
- **AI call:** one `gpt-4o-mini` structured-output call per request (OpenAI API). The route does **not** configure `maxDuration`; default Node.js runtime. See §3.6.
- **Body size:** no app-level limit on `generate-program` (platform default applies); `analytics/events` enforces 64 KiB itself.
- **Logging:** `analytics/events` output goes to structured logs (scope `analytics`); in production each entry is a single JSON line suitable for aggregation (CloudWatch, Datadog, …). Sensitive keys are redacted by the logger.

---

## 7. In-memory constraints / محدودیت‌های حافظه

- **`generate-program` rate limiting is per-process, in-memory** (`src/lib/ai/requestSecurity.ts`):
  - `ipCounters`, `userCounters`, `dailyCounters` (`Map<string, Counter>`) and `activeUsers` (`Set<string>`) are module-level singletons.
  - Counters are **not shared** across serverless instances/replicas and are **lost on process restart**; expired entries are pruned lazily on the next request (no timer).
  - Implication: under horizontal scaling the effective limits multiply by the number of instances; this is a soft guard, not an authoritative quota.
- **`analytics/events`**: no server-side queue/state. The client-side queue (`analyticsEvents.ts`) holds at most **100 events** in memory and drops the oldest beyond that.
- **Program generation is fully synchronous per request** (one in-flight per user by design); the 45 s timeout prevents unbounded resource usage, but the underlying AI request is not cancelled (see §3.6).

---

## 8. Related files / فایل‌های مرتبط

| Purpose | Path |
|---|---|
| Generate-program route | `src/app/api/generate-program/route.ts` |
| Analytics ingestion route | `src/app/api/analytics/events/route.ts` |
| Input schema, rate limits, medical clearance, timeout, disclaimer | `src/lib/ai/requestSecurity.ts` |
| System prompts + modes | `src/lib/ai/prompts.ts` |
| Program persistence (transactional) | `src/services/programService.ts` |
| Supabase auth / user sync | `src/services/userService.ts` |
| Server Supabase client (cookies) | `src/lib/supabase-server.ts` |
| Supabase env config | `src/lib/supabase.ts` |
| Client analytics tracking | `src/services/analyticsEvents.ts` |
| Structured logger (redaction) | `src/lib/logger.ts` |
| Data model | `prisma/schema.prisma` |
| Env template | `.env.example` |
| Prompt files (deployment artifact) | `infra/ai/prompts/*.md` |
| Security helper tests | `tests/request-security.test.ts` |
