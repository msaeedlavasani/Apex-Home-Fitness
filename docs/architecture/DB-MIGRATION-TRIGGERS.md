# Database Migration Triggers — SQLite → PostgreSQL Runbook (PREPARED)

> **STATUS: PREPARED RUNBOOK — MIGRATION NOT AUTHORIZED**
> Owner decision D4 (OPTION A, 2026-09-14) authorized authoring this runbook
> ONLY. It authorizes no migration, no schema change, no infrastructure change.
> Evidence base: [`AHF-ARCHITECTURE-SCALE-READINESS-AUDIT.md`](./AHF-ARCHITECTURE-SCALE-READINESS-AUDIT.md) §6, §9 (E-1).
> When a trigger fires, this document's ONLY effect is to define the task that
> an owner must then explicitly authorize.

## CURRENT STATE

- Prisma 6.19 with `provider = "sqlite"` (`prisma/schema.prisma`); 13 migrations; production DB is the Docker volume `apexhomefit_prod_db:/data` on a single host.
- Server access is already bounded: `@/lib/prisma` is imported by exactly 10 files (6 route handlers, `src/lib/admin/{auth,console,provision}.ts`, `src/services/movementGraphStore.ts`); domain logic sits in `src/services/*` and pure `src/lib/*` per ARCHITECTURE-PRINCIPLES §4.
- SQLite on the Prisma plane serves low write concurrency today (pre-launch; OTP public launch still gated by `docs/OTP_LAUNCH_READINESS.md`).
- Deployments/mutations run through the `apex-deploy-gateway` with `db_change` requests **rejected fail-closed** (`docs/PRODUCTION_DEPLOYMENT_GATEWAY.md`); `docs/RELEASE_POLICY.md` requires verified backup + rollback before any deploy or migration.

## WHY NO MIGRATION NOW

- No measured write contention, no multi-instance requirement, no HA requirement in evidence (audit §6: 10x does not stress SQLite for this workload's shape; the write path is low-volume).
- The services-layer boundary means deferring does not increase *code* cost — only the *data/migration-history* cost grows slowly (each new migration adds rows to move).
- Bounded-migration principle: no migration without evidence (audit §8E, PRINCIPLES §9/§12 posture).

## TRIGGERS (any ONE of these starts the pre-migration evidence phase)

- T1 **Horizontal/multi-instance requirement** — a second app instance is planned or deployed (writes to one SQLite volume from two instances are unsafe).
- T2 **Observed writer contention** — sustained `SQLITE_BUSY` / lock timeouts or measured write-latency degradation attributable to SQLite under real workload.
- T3 **HA/backup objectives not satisfiable** — required RPO/RTO or point-in-time recovery cannot be met by the single-host volume + file backup.
- T4 **Deployment topology beyond single host** — managed hosting, PaaS, or multi-node topology is otherwise approved.
- T5 **Managed/server database requirement** — an operational or compliance requirement mandates a managed database service.
- T6 **Measured persistence bottleneck** — profiling attributes a material bottleneck to the SQLite plane (not to the AI path, Supabase, or network).

## NON-TRIGGERS (explicitly do NOT start migration)

- Traffic/read growth alone without write contention (reads scale with the app tier; SQLite reads are fast).
- "Modernization" or stack fashion; runtime/tooling changes (D5 resolved: Node 22 kept; trigger-based revisit only).
- CDN/media needs (that is the MG-07 media track, unrelated to this plane).
- Supabase-side scaling concerns (that is the separate Principle-12 evaluation, D3-deferred).
- Spec Kit / workflow changes (no runtime effect).

## PRE-MIGRATION EVIDENCE REQUIRED (before any owner decision)

- The firing trigger documented with measurements/logs (e.g., which T, observed under what real workload).
- Current DB size, row counts per model, migration count, and a fresh verified backup + **restore rehearsal** result (RELEASE_POLICY backup rules).
- Target Postgres hosting decision inputs (provider, region — including Iran-egress reachability, cost, PITR availability).
- Gateway impact assessment: the `db-operation`/`db_change` fail-closed contract must be explicitly extended/authorized for this task (see PRODUCTION GATE).

## DATA MIGRATION PLAN OUTLINE (sketch only — to be specified inside the authorized task)

1. Additive preparation on SQLite (nothing destructive): confirm all migrations clean-apply; freeze destructive changes.
2. Stand up the target Postgres instance; create a **new Prisma datasource path** in a task branch (`provider` switch + `DATABASE_URL`), regenerate client; run `prisma migrate deploy` on the empty target.
3. Move data with a governed, idempotent copy script (per-table, verify row counts + checksums), using the existing services boundary — no direct client-to-DB rewrites.
4. Dual-run/verify window (read parity checks on key flows), then switch the app's `DATABASE_URL`; keep the SQLite volume intact and untouched until the verification window closes.
5. Prisma-specific considerations: SQLite `Json` columns are supported on PostgreSQL; enum columns are text in SQLite and must be mapped deliberately; `migration_lock.toml` provider switch; connection pooling (e.g., pgbouncer) for multi-instance; shadow-DB requirements for `migrate dev` in CI.

## BACKUP REQUIREMENTS

- Verified full backup immediately before each migration step; restore rehearsal recorded (not assumed) per RELEASE_POLICY.
- The SQLite volume remains the rollback reference until the Postgres plane has passed its verification window.

## ROLLBACK REQUIREMENTS

- Rollback = switch `DATABASE_URL` back to the untouched SQLite volume (image/env-level rollback via the existing gateway rollback machinery); no data written to Postgres during the window is lost by design (outbox/retry semantics cover client writes; server writes re-apply through normal flows).
- The gateway's exact-SHA + rollback-snapshot pattern applies to the app image; the DB switch itself must be its own reversible step.

## VALIDATION REQUIREMENTS

- Targeted: DB-touching unit/contract tests against the new provider; `preflight-db` script (`scripts/preflight-db.mjs`) against Postgres.
- Lanes: build + targeted E2E affected lanes; full E2E on the release path (nightly covers the rest per `docs/CI.md`).
- Production: real-browser post-deploy smoke (RELEASE_POLICY RULE 6/7).

## PRODUCTION GATE

- Production application of any step requires the `PRODUCTION_DEPLOYMENT_GATEWAY` path with an **explicitly authorized** `db_change`/`db-operation` extension (currently fail-closed rejected) — a separate, owner-approved tooling task.
- Task profile for the migration task: `DB_CHANGE` (machine-required docs: RELEASE_POLICY, ENVIRONMENT_CONTRACT, PRODUCTION_CHECKPOINTS).

## OWNER DECISION REQUIRED

Trigger firing does **NOT** authorize migration. It creates a **CRITICAL / DB_CHANGE task requiring owner approval** (spec + plan + tasks under the approved Spec Kit workflow; owner gate on the hosting choice, the data-copy window, and the production switch). The hosting/provider choice is an owner decision (cost + Iran-egress reachability are owner-relevant facts).

## STOP CONDITIONS

- Any failed restore rehearsal → STOP; fix backup posture first.
- Any unexplained data divergence during the copy verification window → STOP; reconcile before switch.
- Gateway `db_change` extension not yet authorized → STOP at the production boundary; local/staging work may continue only if independently authorized.
- If two triggers conflict (e.g., T4 topology move without T1-T3 evidence), resolve via owner decision before proceeding.
