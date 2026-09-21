# AHF Beta Deployment Capability — `BETA-DEPLOYMENT-CAPABILITY`

> **STATUS: CURRENT — OWNER-AUTHORIZED 2026-09-19**
>
> This is the canonical architecture record for the Beta deployment path. It
> extends the existing constrained Deployment Gateway; it does not create a
> second deployment authority and it does not change Production authority.

## Target identity

| Boundary | Canonical value |
|---|---|
| Public URL | `https://beta.apexhomefit.ir` |
| Host | existing AHF host `sabtbrooker` |
| Reverse proxy | Nginx TLS server block for `beta.apexhomefit.ir` |
| App binding | `127.0.0.1:3100` → container `3000` |
| Compose | `/opt/ahf-beta/compose.yml`, installed from `ops/deploy-gateway/beta-compose.yml` |
| Database volume | `ahf_beta_db` only |
| Image namespace | `ahf-home-fit:beta-<12-char SHA>` and `ahf-home-fit:beta-migrate-<12-char SHA>` |
| Environment | `/opt/ahf-beta/.env`, root-owned `0600`; values are never returned or logged |

The Production gateway remains bound to `/opt/apex-home-fit/compose.yml`,
`127.0.0.1:3000`, `apexhomefit_prod_db`, `apex-home-fit:release-*`, and
authoritative `main`. Beta requests use a separate action and explicit
allowlist. A Beta request fails closed if any target, volume, port, image
namespace, or environment boundary is ambiguous.

## Source and build identity

The first governed Beta candidate is the current Workout V2 feature branch
`feat/workout-v2-first-slice` / PR #72. The gateway accepts a Beta source only
when the requested full SHA simultaneously matches the branch head, the open
PR head, the branch CI run, and the PR CI run. It downloads that exact SHA
archive, builds immutable app and migration images, and records image IDs plus
the Next build identity. A schema-changing Beta request is separately gated by
`DB_CHANGED=true` and an in-volume byte-identical clone preflight; a no-op
request retains the existing before/after hash invariant.

## Rollout and rollback

The gateway acquires the existing exclusive deployment/DB lock, validates the
Beta topology, performs disk admission, builds from the exact archive, and
snapshots the Beta Compose file and SQLite database. For `DB_CHANGED=true`, it
first runs the checked-in migration command against a byte-identical clone and
requires that clone to change before applying the migration to the backed-up
Beta database. For `DB_CHANGED=false`, the before/after hash must remain equal.
It then switches only the Beta app image and verifies loopback health. On
failure it restores the Beta Compose snapshot and database backup, then
recreates only the Beta app. Production is never stopped, recreated, or
mounted by the Beta action.

Successful releases persist root-only proof containing source SHA, image IDs,
Next build identity, database hashes, target identity, and rollback artifact.

## Runtime acceptance boundary

The Beta deployment checkpoint additionally verifies HTTPS/browser behavior on
the normal authenticated product path:

`Dashboard → assigned QA Program/workout → localized normal workout route →
Workout Experience V2 → Result/Exit → Dashboard`.

The QA Program is existing persisted domain data. No product code branches on
test identity, and the isolated review URL is not an acceptance substitute.
Real iPhone Add-to-Home-Screen behavior remains part of RUN-5 Owner acceptance.
