# Production Checkpoints — Verified Ledger

Compact authoritative history of **verified** Production checkpoints. The
operational runbook is [`FEATURE_TO_PRODUCTION.md`](FEATURE_TO_PRODUCTION.md);
the rules are in [`RELEASE_POLICY.md`](RELEASE_POLICY.md).

> This ledger contains ONLY verified Production checkpoints. Failed or
> candidate builds MUST NOT be promoted into this ledger.
>
> **Before starting a dependent development task, read `RELEASE_POLICY.md`
> and this ledger first.**
>
> **CURRENT VERIFIED PRODUCTION CHECKPOINT: AUTH-FIX-01**

---

## S02

- **Status:** PASS
- **Purpose:** site URL fallback / S02 recovery checkpoint
- **Source:** `60abb2d373983fa781665a0b6301f1ca1f46b357`
- **Image:** `apex-home-fit:s02-60abb2d-r1`
- **Image ID:** `sha256:d0483ad7dd718186f38817fae2f811df2150d663a6c4c0e72d6b31157aeaee9d`
- **Acceptance:** 9/9 Production real-browser PASS + delayed re-check PASS;
  Application Error ABSENT; fatal RSC error ABSENT; RestartCount 0
- **DB:** unchanged — 12 migrations, integrity `ok`

## R6

- **Status:** PASS (immediate rollback checkpoint for AUTH-FIX-01)
- **Purpose:** R6 session contracts
- **Source:** `aee28d12e2368206e2d9f788afc2ecd19983e5f6`
- **Image:** `apex-home-fit:r6-aee28d1`
- **Image ID:** `sha256:6aabafe13b1b21af7e9e467a1503ad58aa0afd1d1c1e58e7ad9b967256dbe8bf`
- **Acceptance:** local real-browser 9/9 PASS; Production real-browser 9/9
  PASS; delayed Production re-check 9/9 PASS; Application Error ABSENT; fatal
  RSC error ABSENT; RestartCount 0
- **DB:** unchanged — 12 migrations, integrity `ok`

## AUTH-FIX-01

- **Status:** PASS
- **Purpose:** real login/authentication recovery — fix unwritable SQLite volume
- **Source:** `ce91a4f297951142fce1394a5ac9157378e72961`
  (source commits: `b624742ea874854c40c825c706333115a5593212` +
  `ce91a4f297951142fce1394a5ac9157378e72961`)
- **Image:** `apex-home-fit:authfix-ce91a4f`
- **Image ID:** `sha256:f0b0785bdbb94b21b7b6aa47dde6b5f03e9f4f2377c3828a62b91dc14c1ad53a`
- **BUILD_ID:** `TfZRMHwm3pBWUW3bBgTZc`
- **Root cause:** `apexhomefit_prod_db` volume was owned by `root:root`
  (app.db 0644), while the app container runs as `nextjs` (uid 100) — every DB
  write failed with SQLite `attempt to write a readonly database` (real OTP
  requests 503 `provider_error`, post-login user sync 500). Read-only volume
  deployment is now guarded by the image startup preflight
  (`scripts/preflight-db.mjs`).
- **Acceptance:** Production real-browser 9/9 PASS; real auth journey PASS
  (request/verify/session/protected/fresh-nav/logout/blocked); post-login DB
  write verified fixed (program API 200, User row synced by app user); locale
  en/fa PASS; delayed re-check 9/9 PASS; Application Error ABSENT; fatal RSC
  error ABSENT; RestartCount 0
- **DB:** schema unchanged — 12 migrations, integrity `ok`; volume re-owned to
  `100:101` so the app can write

---

## Production persistence baseline

- **Engine:** SQLite via Prisma
- **Volume:** `apexhomefit_prod_db:/data`
- **DATABASE_URL:** `file:/data/app.db`
- **Migrations:** 12, latest `20260827011500_add_exercise_canonical_identity_fields`
- **PostgreSQL:** deferred independent infrastructure task (evaluate before
  significant real customer data accumulates)
- **Supabase resilience:** separate backlog item — see `docs/TASKS.md`
