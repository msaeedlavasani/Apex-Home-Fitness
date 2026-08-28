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
> **CURRENT VERIFIED PRODUCTION CHECKPOINT: R6**

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

- **Status:** PASS
- **Purpose:** R6 session contracts
- **Source:** `aee28d12e2368206e2d9f788afc2ecd19983e5f6`
- **Image:** `apex-home-fit:r6-aee28d1`
- **Image ID:** `sha256:6aabafe13b1b21af7e9e467a1503ad58aa0afd1d1c1e58e7ad9b967256dbe8bf`
- **Acceptance:** local real-browser 9/9 PASS; Production real-browser 9/9
  PASS; delayed Production re-check 9/9 PASS; Application Error ABSENT; fatal
  RSC error ABSENT; RestartCount 0
- **DB:** unchanged — 12 migrations, integrity `ok`

---

## Production persistence baseline

- **Engine:** SQLite via Prisma
- **Volume:** `apexhomefit_prod_db:/data`
- **DATABASE_URL:** `file:/data/app.db`
- **Migrations:** 12, latest `20260827011500_add_exercise_canonical_identity_fields`
- **PostgreSQL:** deferred independent infrastructure task (evaluate before
  significant real customer data accumulates)
- **Supabase resilience:** separate backlog item — see `docs/TASKS.md`
