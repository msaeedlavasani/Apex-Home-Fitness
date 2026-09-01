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
> **CURRENT VERIFIED PRODUCTION CHECKPOINT: S-04-SESSION-CORE-CONTRACT**

---

## S-04-SESSION-CORE-CONTRACT

- **Status:** PASS (deployment + verified acceptance; signed-in Production recheck PENDING — standing credential-holder item)
- **Purpose:** S-04 — Stable Session State Contract / Session Core Contract Adoption. Removed residual consumer/type coupling to the `useWorkoutEngine` hook; the canonical `sessionContracts`/`sessionCore` boundary now owns the stable session-state contract. S03 extraction stayed CLOSED (no re-extraction/redesign). Runtime behavior unchanged (`UI_CHANGED = NO`, `DB_CHANGED = NO`).
- **Source:** `8e06d70bc75f9b02e585c091c96272e043149246` (authoritative GitHub `main` HEAD; integration via PR #17; branch `batch/s04-session-core-contract` retired)
- **Image:** `apex-home-fit:release-8e06d70bc75f` (ID `sha256:02ffdcb4fef1c7b5b2a976e5045b79fb995171370b711612c5555219615951da`)
- **DB_STATE:** `db_changed=false` (gateway-verified); no schema change; rollback snapshot `compose.yml.rollback-s04-session-core-contract` (root-only)
- **ACCEPTANCE:** Main CI PASS on `8e06d70` (run `33487427362`); branch CI PASS (build + e2e, run `33486695026`); gateway release `s04-session-core-contract` phase `normal` health PASS, secret boundary `PROTECTED`; local validation on the exact release code — typecheck PASS, eslint 0 errors, unit 524/524 (golden-trace parity GT-01..GT-12 preserved), production build PASS, real-browser workout-route E2E 5/5 (incl. live player session); Production real-browser (system Chrome) 8/8 PASS — public `/en` `/fa` `/en/auth/login` `/manifest.json` unchanged, signed-out `/en/dashboard` redirects, workout route auth boundary + locale preservation (`/en/workout`→`/en/auth/login` lang=en dir=ltr; `/fa/workout`→`/fa/auth/login` lang=fa dir=rtl), zero fatal console errors
- **MEMBER-LEVEL:** single reviewable commit (`8e06d70`); consumer boundary test `tests/session-contract-consumers.test.ts` enforces no hook-internal imports from `src/lib` and no runtime exports from the contracts module
- **PRE-EXISTING (not regressions):** `rtl-layout.spec.ts` 2 specs fail identically on clean main — public sidebar nav-order drift ("Training preferences" at index 3 vs expected "Profile") and quiz-page `radiogroup` strict-mode scope (language switcher adds a second radiogroup); neither spec runs in CI's e2e gate (`test:e2e:auth`/`test:e2e:smoke` only); flagged for separate spec-reconciliation
- **OPEN ITEM:** signed-in Production acceptance recheck (workout session journey + session retention) requires the operator-held credential — standing item from batch 1, unchanged; local signed-in journey on identical release code PASS
- **FINAL_STATUS:** PASS / CLOSED (signed-in Production recheck outstanding; credential-holder action)

---

## ADMIN-DS-BATCH-2

- **Status:** PASS (deployment + verified acceptance; signed-in Production recheck PENDING — see note)
- **Purpose:** Batch Delivery V1 batch 2 — Admin Persian/RTL + i18n parity (ADMIN-DS-05: `admin-locale` cookie persistence, `html lang/dir`, shared next-intl catalogs `admin.*` namespace, localized pages/nav/login/boundaries, fa-IR dates, logical utilities, shared typography contract) and DESIGN_SYSTEM reconciliation (ADMIN-DS-06: ratified typography contract §4.1 + Admin i18n/RTL architecture §4.2; KIT-FIRST formalized)
- **Source:** `c6a4e591c1e3fce89c6a8d4121c5bf81d3772342` (authoritative GitHub `main` HEAD; integration via PR #16; branch `batch/admin-ds-05-06` retired)
- **Image:** `apex-home-fit:release-c6a4e591c1e3` (ID
  `sha256:623afd424b41cc9d365ac77566123c96bc3a123ee64324d84c622bba5b42218f`)
- **DB_STATE:** `db_changed=false` (gateway-verified); no schema change; rollback snapshot
  `compose.yml.rollback-batch2-admin-ds-05-06` (root-only)
- **ACCEPTANCE:** Main CI PASS on `c6a4e59` (run `33482982507`); branch CI PASS (build + e2e, run `33482319310`); gateway release `batch2-admin-ds-05-06` phase `normal` health PASS, secret boundary `PROTECTED`; local real-browser admin suite 6/6 PASS on the exact release code (admin-console 4/4 EN regression + admin-i18n 2/2: switching, RTL, typography, persistence, Persian surfaces); Production real-browser (system Chrome) 4/4 PASS — public `/en` `/fa` `/en/auth/login` `/manifest.json` unchanged, signed-out `/en/dashboard` redirects, all six protected admin surfaces redirect to `/admin/login`, admin login EN default + fa/RTL switch (computed font leads `inter`/`vazirmatn`) + persistence across reload, zero fatal console errors
- **MEMBER-LEVEL:** ADMIN-DS-05 (`fd8650f`) + ADMIN-DS-06 (`b92e3a8`) individually committed with per-member validation + UI Conformance evidence (REUSE + bounded EXTEND / DOCS_ONLY); carried governance docs commit `1d1966e` (ADR-0005 ratification, S-04 promotion)
- **OPEN ITEM:** signed-in Production acceptance recheck (dashboard dark-mode toggle, session retention, fa signed-in surfaces) requires the operator-held admin credential — local signed-in journey on identical release code PASS; Production signed-in recheck PENDING (batch 1 open item, unchanged)
- **FINAL_STATUS:** PASS / CLOSED (signed-in Production recheck outstanding; credential-holder action)

---

## ADMIN-DS-BATCH-1

- **Status:** PASS (deployment + verified acceptance; signed-in Production recheck PENDING — see note)
- **Purpose:** Batch Delivery V1 first batch — Admin design-system conformance (ADMIN-DS-01 foundation: dark mode/fonts/metadata+favicon; ADMIN-DS-02 shared admin primitives + six-page refactor; ADMIN-DS-03 platform-kit adoption for login/logout; ADMIN-DS-04 state boundaries + accessibility pass)
- **Source:** `4de75ae969c8d1f260e6c660b5c7fac5008f3541` (authoritative GitHub `main` HEAD; integration via PR #15; branch `batch/admin-ds-01-04` retired)
- **Image:** `apex-home-fit:release-4de75ae969c8` (ID
  `sha256:1908710b640ab39e969add232e2a27d423c892f631dfa341138ad6c216333e55`)
- **DB_STATE:** `db_changed=false` (gateway-verified, DB hash unchanged across no-op migration gate); no schema change; rollback snapshot
  `compose.yml.rollback-batch1-admin-ds-01-04` (root-only 0600)
- **ACCEPTANCE:** Main CI PASS on `4de75ae` (run `33454929053`); gateway release `batch1-admin-ds-01-04` phase `normal` health PASS, secret boundary `PROTECTED`; local real-browser admin-console spec 4/4 PASS on the exact release code (sign-in → all six surfaces, labelled nav/accessible tables, no credential material, unauth boundary); Production real-browser (system Chrome) 4/4 PASS — all six protected surfaces redirect to `/admin/login`, admin login renders with title metadata + theme script + admin icons (favicon 404 resolved), public `/en` `/fa` `/en/dashboard` `/en/auth/login` `/manifest.json` unchanged, zero fatal console errors
- **MEMBER-LEVEL:** ADMIN-DS-01..04 individually committed (`c87d0a8`, `1442574`, `bf116eb`, `61e62ef`), each with per-member validation + UI Conformance evidence (REUSE/EXTEND declared)
- **OPEN ITEM:** signed-in Production acceptance recheck (dashboard dark-mode toggle, fresh-navigation session behavior) requires the operator-held admin credential — local signed-in journey on identical release code PASS; Production signed-in recheck PENDING (reports/`AHF-FB-20260901-ADMIN-DS-BATCH-1.md`)
- **FINAL_STATUS:** PASS / CLOSED (signed-in Production recheck outstanding; credential-holder action)

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

## ADMIN-CONSOLE-01

- **Status:** PASS
- **Purpose:** Admin Console V1 — read-oriented administration surface
  (Overview, Users, Workout Plans, Exercises, Operations, Admin/Sessions)
  delivered through the canonical Production Deployment Gateway
- **Source:** `2d131fc604531f8327446f1f36a5acf142f11d2a` (authoritative GitHub
  `main` HEAD; integration via PR #13)
- **Image:** `apex-home-fit:release-2d131fc60453` (ID
  `sha256:68ff5b329760574d05d5400fb18dd1d0a4463cedae953781fffa770374c953ec`)
- **DB_STATE:** integrity `ok`; **13 migrations**; volume owned `100:101`;
  `db_change=false`, DB hash unchanged; rollback snapshot
  `compose.yml.rollback-adminconsole-01` (root-only 0600);
  `verify-rollback` via client PASS, `previous_image AVAILABLE`; proof
  root-only at `/var/lib/apex-deploy-gateway/proof-normal.json`
- **ACCEPTANCE:** exact-main release ran through `/usr/local/bin/apex-deploy`
  with zero privilege elevation (legacy privileges already revoked); health
  `/en` 200, `/admin/login` 200; all six protected console surfaces redirect
  unauthenticated visitors to `/admin/login` (server-side `requireAdmin()`
  boundary verified against Production); real-browser (system Chrome via
  Playwright) signed-in acceptance **14/14 PASS** (login → dashboard, all six
  surfaces render, no credential material rendered); public Phone + OTP and
  admin API boundary (`login`+`logout` only) unchanged; `DB_CHANGED = NO`
- **FINAL_STATUS:** PASS / CLOSED

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
