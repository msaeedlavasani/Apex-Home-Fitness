# Production Checkpoints — Verified Ledger

Compact authoritative history of **verified** Production checkpoints. The
operational runbook is [`FEATURE_TO_PRODUCTION.md`](FEATURE_TO_PRODUCTION.md);
the rules are in [`RELEASE_POLICY.md`](RELEASE_POLICY.md). Historical incident-to-Pitfall traceability is indexed in [`PRODUCTION_INCIDENT_LEDGER.md`](PRODUCTION_INCIDENT_LEDGER.md).

> This ledger contains ONLY verified Production checkpoints. Failed or
> candidate builds MUST NOT be promoted into this ledger.
>
> **Before starting a dependent development task, read `RELEASE_POLICY.md`
> and this ledger first.**
>
> **CURRENT VERIFIED PRODUCTION CHECKPOINT: AUTONOMOUS-PROD-OPS-01**

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

## AUTONOMOUS-PROD-OPS-01 — post-hardening gateway release (CLOSED)

- **Status:** VERIFIED post-hardening release; task **CLOSED**
- **Purpose:** final release through the gateway from a freshly-authenticated
  unprivileged `apexadmin` session after legacy privilege removal, proving the
  full zero-manual-Owner release lifecycle
- **Source:** `f2387cc3a5b8438e1fc0ab02d36174a151d1b504` (authoritative GitHub
  `main` HEAD at release time)
- **Image:** `apex-home-fit:release-f2387cc3a5b8` (ID
  `sha256:7227b1c5ff0f181e9099462ef9485908b939b668196068987607e484e4866926`)
- **DB_STATE:** integrity `ok`; **13 migrations**; volume owned `100:101`;
  `db_change=false`, DB hash unchanged across the no-op migration gate;
  backup `gateway-backup-prodops01-postharden.db` retained in volume
- **ROLLBACK_REFERENCE:** `/opt/apex-home-fit/
  compose.yml.rollback-prodops01-postharden` (root-only 0600);
  `verify-rollback` via client PASS, `previous_image AVAILABLE`
- **ACCEPTANCE:** release ran through `/usr/local/bin/apex-deploy` with legacy
  NOPASSWD sudo and Docker-group membership **already removed**; fresh SSH
  session: direct `sudo` = password required, direct `docker` = permission
  denied, `.env` read = denied, proof file read = denied, yet `apex-deploy
  status` READY and `release … post-hardening` PASS, loopback `/en` 200 and
  public HTTPS `200`; proof root-only at
  `/var/lib/apex-deploy-gateway/proof-post-hardening.json`
- **PRIVILEGES:** `apexadmin` NOPASSWD sudo and Docker-group membership
  REVOKED (proof-gated); `apexdeploy` group membership retained
- **FINAL_STATUS:** PASS / CLOSED

## AUTONOMOUS-PROD-OPS-01 — pre-hardening gateway release

- **Status:** VERIFIED pre-hardening release (proof-before-revocation;
  superseded by the post-hardening release above)
- **Purpose:** prove the constrained root-owned Unix-socket gateway end-to-end
  (bootstrap, socket-only client, fail-closed, exact-source build, rollback
  capture, DB invariants, zero manual Owner commands) before legacy privilege
  removal
- **Source:** `fde82c1a8fb33edaa1af60e43f6a9d6eb149d0a2` (authoritative GitHub
  `main` HEAD at release time; integration via PR #12)
- **Image:** `apex-home-fit:release-fde82c1a8fb3` (ID `sha256:05f2c97591d5…`)
- **DB_STATE:** integrity `ok`; **13 migrations**; volume owned `100:101`;
  `db_change=false`, DB hash unchanged across the no-op migration gate;
  gateway backup `gateway-backup-prodops01-preharden.db` retained in volume
- **ROLLBACK_REFERENCE:** `/opt/apex-home-fit/
  compose.yml.rollback-prodops01-preharden` (root-only 0600);
  `verify-rollback` via client PASS, `previous_image AVAILABLE`; marker
  `/var/lib/apex-deploy-gateway/rollback-verified` (root-only)
- **ACCEPTANCE:** pre-hardening release through `/usr/local/bin/apex-deploy`
  (no sudo/Docker in client), health HTTP 200, secret boundary `PROTECTED`;
  fail-closed live rejects (unknown field, `db_change`, non-authoritative
  SHA); `.env` remains `root:root` 0600 and unreadable by `apexadmin`
- **PRIVILEGES:** `apexadmin` NOPASSWD sudo and Docker-group membership
  PRESERVED (untouched) at this checkpoint

---

## ADMIN-AUTH-PROD-01

- **Status:** PASS
- **Purpose:** deterministic Production deployment of Admin Auth V1 (dedicated
  administrator Email + Password boundary, manual provisioning, single ADMIN
  role) on the preserved `apexhomefit_prod_db` volume
- **Source:** `3cf9cb682514169154a6f278c8b6afec9cd911ba` (baseline `c09e34c` +
  PR #11 fix `f6f90d4`)
- **Image:** `apex-home-fit:adminauth-3cf9cb6`
- **Image ID:** `sha256:dec85f493fde5eceab9d6b53f8980783d728b1ee995e784176de153f72b5fe0e`
- **BUILD_ID:** `vwN2sF-2d1BwbdkDjNPIx`
- **DEPLOY_TIME:** 2026-08-31T14:42:31Z (container `apex-home-fit-app-1`)
- **DB_STATE:** integrity `ok`; **13 migrations**, latest
  `20260831120000_add_admin_auth`; admin tables
  `[AdminAccount, AdminSession]`; volume owned `100:101`; DB SHA-256
  `bf05892dff202238cca338b1916d85a1bf5f4e916e85653ec6d96f101db39392`
  (post-acceptance; pre-migration `241d4b15…783c`, post-migration
  `a65fdcdf…9414`)
- **ROLLBACK_REFERENCE:**
  `/opt/apex-home-fit/compose.yml.rollback-adminauth-3cf9cb6` (previous image
  `apex-home-fit:adminauth-c09e34c`, ID `d989e4300dde…`); chain continues
  through `compose.yml.rollback-adminauth-c09e34c` (`auth-buildfix-3c89609`)
- **BROWSER_ACCEPTANCE:** real-browser (system Chrome via Playwright) against
  `https://apexhomefit.ir`: **22/22 PASS** — `/admin/login` render; real login
  → dashboard (FEATURE); fresh-navigation session retention; logout + session
  invalidation; protected route blocked after logout; wrong-credential generic
  failure (no enumeration); public route regression `/`, `/en`, `/fa`,
  `/en/dashboard`, `/en/auth/login`, `/manifest.json`; delayed recheck after
  45s. Benign warnings only: `/favicon.ico` 404 on `/admin/login` (admin
  layout metadata gap — tracked debt), expected 401 console noise from the
  wrong-credential probe, `net::ERR_ABORTED` RSC prefetches. RestartCount 0.
  Post-acceptance: 0 active admin sessions (all revoked); provisioned
  `admin@apexhomefit.ir` has `lastLoginAt` set.
- **FINAL_STATUS:** PASS

## Production persistence baseline

- **Engine:** SQLite via Prisma
- **Volume:** `apexhomefit_prod_db:/data`
- **DATABASE_URL:** `file:/data/app.db`
- **Migrations:** 13, latest `20260831120000_add_admin_auth`
- **PostgreSQL:** deferred independent infrastructure task (evaluate before
  significant real customer data accumulates)
- **External/Supabase resilience evaluation:** accepted/deferred architecture
  need in `docs/architecture/ARCHITECTURE-PRINCIPLES.md`; not executable unless
  separately authorized in `docs/TASKS.md`.
