# Environment Contract

Authoritative classification of environment variables used by the application.
This file contains **no secret values** — names and classifications only.

Legend:

- **Kind:** `BUILD_TIME` (compiled into the artifact) · `RUNTIME` (read at
  runtime) · `BOTH`
- **Visibility:** `PUBLIC` (client-inlined, safe to expose) · `SECRET`
- **Presence:** `REQUIRED` · `OPTIONAL`
- **Validation method** describes how presence/shape is checked without
  printing values.

## Rule: build-time vs runtime

`NEXT_PUBLIC_*` values are compiled into the Next.js artifact at build time.
Runtime container injection is **not** sufficient to repair a bundle built
without them. The build-time public values must be supplied as non-empty Docker
build args and independently validated in the immutable artifact; runtime
presence does NOT prove compiled correctness. Never pass server secrets such as
`SUPABASE_SERVICE_ROLE_KEY` or `SMS_IR_API_KEY` as public build args. See
[`PITFALLS/NEXTJS-BUILDTIME-PUBLIC-CONFIG-DRIFT.md`](PITFALLS/NEXTJS-BUILDTIME-PUBLIC-CONFIG-DRIFT.md).

Report config state only as: `PRESENT_VALID` / `PRESENT_EMPTY` / `ABSENT` /
`INVALID`. Never print values.

## Variables

| NAME | Kind | Visibility | Presence | Fallback / Notes | Validation method |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | BUILD_TIME | PUBLIC | REQUIRED in prod | Docker build arg; empty/invalid falls back to `https://apexfit.app` via `src/lib/siteUrl.ts` | resolver unit tests: empty / malformed / valid |
| `NEXT_PUBLIC_SUPABASE_URL` | BUILD_TIME | PUBLIC | REQUIRED in prod | Docker build arg; inlined into client bundle | non-empty + `http(s)://` shape check |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | BUILD_TIME | PUBLIC | REQUIRED in prod | Docker build arg; inlined into client bundle | presence-only (non-empty), never print value |
| `DATABASE_URL` | RUNTIME | SECRET | REQUIRED | SQLite `file:/data/app.db` in container; `file:./ci.db` in CI | runtime shape check `file:` prefix; DB integrity/migration checks |
| `SUPABASE_SERVICE_ROLE_KEY` | RUNTIME | SECRET | OPTIONAL | avatar storage signing; absent → data-URL fallback | presence-only |
| `AUTH_OTP_MODE` | RUNTIME | SECRET(ish) | OPTIONAL | `mock` vs real provider routing | presence + allowed values |
| `AUTH_OTP_MOCK_IN_PRODUCTION` | RUNTIME | SECRET(ish) | OPTIONAL | mock guard flag | presence + boolean |
| `AUTH_OTP_MOCK_PHONES` | RUNTIME | SECRET | OPTIONAL | mock allowlist | presence-only |
| `OTP_AUTH_ENABLED` | RUNTIME | SECRET(ish) | OPTIONAL | feature kill-switch | presence + boolean |
| `SMS_IR_API_KEY` | RUNTIME | SECRET | OPTIONAL (required for real SMS) | real OTP provider | presence-only |
| `SMS_IR_TEMPLATE_ID` | RUNTIME | SECRET(ish) | OPTIONAL | template id | presence + numeric shape |
| `SMS_IR_CODE_PARAMETER` | RUNTIME | SECRET(ish) | OPTIONAL | `otp` | presence-only |
| `GROQ_API_KEY` | RUNTIME | SECRET | OPTIONAL | AI provider | presence-only |
| `OPENAI_API_KEY` | RUNTIME | SECRET | OPTIONAL | AI provider fallback | presence-only |
| `AI_PROVIDER` / `AI_MODEL` / `AI_FALLBACK_PROVIDER` / `AI_GENERATION_FALLBACK` | RUNTIME | SECRET(ish) | OPTIONAL | provider/model selection | presence + allowed values |
| `PROGRAM_GENERATOR` | RUNTIME | SECRET(ish) | OPTIONAL | generator mode | presence-only |
| `PORT` / `HOSTNAME` | RUNTIME | PUBLIC | OPTIONAL (container defaults) | `3000` / `0.0.0.0` | defaults in Dockerfile |
| `NODE_ENV` | RUNTIME | PUBLIC | REQUIRED | `production` in runner | set in Dockerfile |
| `NEXT_TELEMETRY_DISABLED` | RUNTIME | PUBLIC | OPTIONAL | `1` | set in Dockerfile |
| `ADMIN_SESSION_TTL_MS` | RUNTIME | SECRET(ish) | OPTIONAL | 12-hour bounded admin session lifetime | positive bounded integer; never print values |
| `ADMIN_LOGIN_WINDOW_MS` | RUNTIME | SECRET(ish) | OPTIONAL | 15-minute administrator login window | positive bounded integer; never print values |
| `ADMIN_LOGIN_IP_LIMIT` / `ADMIN_LOGIN_EMAIL_LIMIT` | RUNTIME | SECRET(ish) | OPTIONAL | administrator abuse-protection limits | positive bounded integer; never print values |

## Administrator authentication boundary

Admin Auth V1 uses the runtime `DATABASE_URL` and does not add public build
arguments. Administrator passwords, session tokens, and provisioning input are
never stored in this contract or committed configuration. See
[`ADMIN_AUTH.md`](ADMIN_AUTH.md).

## CI / local

- CI uses placeholders only (`DATABASE_URL=file:./ci.db`, migrated fresh before
  tests/build). Real secrets are never committed or printed.
- Local development uses `.env` / `.env.example`; never commit real values.
