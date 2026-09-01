# S02-E — Exercise Identity Backfill: Preflight & Capability-Gap STOP

> **STATUS: BLOCKED / HUMAN_GATE — 2026-09-01.** S02-E was authorized by the
> Owner delta `S02-E EXERCISE IDENTITY BACKFILL` (own isolated Production-DB
> lifecycle, dry-run first, fail closed, gateway-bounded). The prescribed
> read-only Production dry-run/preflight **cannot be executed** and the apply
> phase **cannot be executed** because the Production Deployment Gateway (the
> only Production capability) has **no read-only row-access action** and
> **hard-rejects `db_change != false`**. Per the task contract — *"If the
> existing Production gateway cannot safely execute DB_CHANGED=YES under the
> approved contract, STOP before mutation and return HUMAN_DECISION_REQUIRED
> with the exact missing capability. Do not bypass the gateway or Production
> security boundary."* — **no mutation was attempted and none will be outside
> the gateway.** This record persists the authorization reconciliation, the
> provable preflight evidence, the exact missing capabilities, and the
> fail-closed outcome.

## 1. Authorization reconciliation

- **Baseline main:** `caec244` (STABILIZATION BATCH S06+S05 close-out;
  `4ada1da` = PR #19 merge; clean working tree at start).
- **Canonical contract (source of truth):** GATE A decision package
  [`S02-EXERCISE-IDENTITY-GATE-A.md`](./S02-EXERCISE-IDENTITY-GATE-A.md)
  GA-07 (backfill: classify → dry-run → apply → verify; idempotent; never
  guess) + GA-06 (`Exercise.slug String? @unique` + `faName String?` — already
  applied by S02-B, migration `20260827011500_add_exercise_canonical_identity_fields`),
  GA-04 (resolver precedence), GA-05 (unknown policy), GA-08 (compatibility),
  plus Architecture Stabilization Plan §7 (additive-first, replayable, never
  destructive).
- **Prerequisites satisfied:** S02-A..D2 COMPLETE (contracts, catalog,
  resolver, schema, generation normalization, client adoption);
  `POST-S04-PRIORITY-01` re-rank: S02-E = own isolated lifecycle, NOT
  batchable; `docs/TASKS.md` next-authorized-task row pointed at S02-E.
- **This delta** is the Owner promotion/authorization for the S02-E lifecycle.

## 2. Preflight evidence (provable without Production row access)

### 2.1 Read-only dry-run classifier (new, local-only)

`scripts/backfill-dry-run.mjs` — READ-ONLY (SELECTs only), requires an
explicit `--db <path>` (no default, so it can never point at Production),
classifies every `Exercise` row per GA-07 against the source-controlled
canonical catalog (`src/lib/exercise/catalog.ts` + `resolver.ts`) and emits an
**executable-by-design apply decision** per row:

| Decision | Condition | Apply behavior |
|---|---|---|
| `APPLY` | AUTO (name = canonical name) or ALIAS (name = catalog alias) and the target slug is claimed by no other row | set `slug` (and `faName` when a corpus exists) |
| `BLOCKED_COLLISION` | AUTO/ALIAS whose target slug another row also claims (`Exercise.slug @unique` conflict) | **skip**; surface for catalog/owner review (GA-05 — never guess) |
| `SKIP_AMBIGUOUS` | resolver reports multiple candidates | **skip**; candidates listed (GA-04) |
| `SKIP_UNRESOLVED` | no candidate | **skip**; recorded for catalog review (GA-05) |

### 2.2 Proven results (local corpora only — NOT Production)

- **Dev DB (`prisma/dev.db`, 40 seed rows, slug/faName all NULL — the exact
  S02-B state):** `AUTO=40, ALIAS=0, AMBIGUOUS=0, UNRESOLVED=0`,
  `apply = 40 × APPLY`, **0 collisions**, `--verify` **PASS** (exit 0).
- **Edge corpus (scratch copy + variant rows):** `AUTO=40, ALIAS=2, AMBIGUOUS=1,
  UNRESOLVED=1`; apply decisions `40 × APPLY`, `Burpees → BLOCKED_COLLISION
  (burpee)`, `Cat Cow → BLOCKED_COLLISION (cat-cow)`, `Glute Bridge →
  SKIP_AMBIGUOUS (glute-bridge-hold | glute-bridge)`, `Quantum Leap →
  SKIP_UNRESOLVED`; `--verify` **PASS** (exit 0). This proves the fail-closed
  machinery: name variants that collide with their canonical row are never
  applied over it; ambiguous and unknown names are never guessed.
- **Invariants verified:** catalog slug/name uniqueness, apply-slug
  exclusivity, ambiguous/unresolved never mapped, collided rows never applied.

### 2.3 Backup / rollback readiness (per GATE A §13 + plan §7)

- Backfill is **additive + replayable + never destructive**: only
  `slug`/`faName` (nullable columns) are written for APPLY rows; `name` is
  never changed or removed; reruns are idempotent.
- Rollback = replay forward-compatible fields; no data-loss path exists.
- The gateway already snapshots the DB (hash before/after, quiesced copy)
  for every release, but that machinery is wired to the **no-op migration
  gate** and does not expose a row-mutation path (see §3).

### 2.4 Post-backfill verification plan (locked for the future apply)

1. Re-run the classifier against the Production DB → every formerly-APPLY row
   now resolves with `slug` set; `ALREADY_BACKFILLED` count == dry-run APPLY
   count.
2. UNRESOLVED/AMBIGUOUS/BLOCKED_COLLISION lists recorded in the backfill
   report for catalog/owner review (never silently mapped).
3. Application regression: full unit/build/E2E gates + targeted program
   persistence path (`upsertCanonicalExercise` slug-first).
4. `Exercise.slug @unique` constraint acts as the hard backstop — any
   uncaught collision fails the apply transaction, not the data.

## 3. Exact missing capabilities (HUMAN_DECISION_REQUIRED)

Verified against the live gateway (client `/usr/local/bin/apex-deploy`,
daemon `/usr/local/sbin/apex-deploy-gateway-daemon`, socket
`/run/apex-deploy-gateway/gateway.sock`, `apex-deploy status` READY on
`release-4ada1dae2c3e`, secret boundary PROTECTED):

1. **No read-only Production DB row access.** Gateway actions are exactly
   `status | release | verify-rollback`; `REQUEST_KEYS` allows no query
   surface; the gateway returns only status/identity/invariant evidence,
   never values (docs/PRODUCTION_DEPLOYMENT_GATEWAY.md §Authorization).
   Direct Docker and `.env` reads are denied by design. GATE A recorded the
   same gap ("no established read-only mechanism"). → **The prescribed
   read-only Production dry-run (GA-07 step 2) cannot be performed.**
2. **No governed DB_CHANGED=YES execution path.** Request validation
   hard-rejects any release with `db_change is not False` —
   `raise GateError("database-changing releases unsupported")` — and the V1
   contract states "V1 requests require DB_CHANGED=false". There is no
   backfill/migration-execution action in the allowlist. → **The apply phase
   (GA-07 step 3) cannot be executed through the approved Production
   security boundary.**

Because of (1), the exact affected-row scope of the Production corpus is
**unproven by design** (GATE A §15 open risk: real production name-variant
density unknown); because of (2), no governed mutation is possible at all.

## 4. Fail-closed outcome / STOP

- **No mutation attempted.** No Production writes, no schema change, no
  bypass of the gateway, no credential exposure, no ungoverned apply path
  created (the apply step is deliberately NOT implemented in the dry-run
  tool; it must ride a governed capability).
- **Lifecycle state:** S02-E = `HUMAN_GATE` (blocked). No branch, no PR, no
  push, no CI, no release was started — the delta's Git/Main/CI/closure
  steps are not applicable while the capability question is open.
- **Local changes (uncommitted, by design):** `scripts/backfill-dry-run.mjs`
  (new), `docs/TASKS.md` (S02-E status row), this record, and the final
  report. They are ready to ride the next authorized S02-E lifecycle.

## 5. Options for the Owner

1. **Provide the two capabilities** (highest alignment with the approved
   contract): extend the gateway with (a) a read-only row-inspection action
   and (b) a governed `DB_CHANGED=YES` backfill action (bounded, idempotent,
   dry-run-gated, snapshot/rollback-preserving) — then re-authorize S02-E.
2. **Authorize a narrower governed path** for a one-time, dry-run-gated
   backfill with explicit Owner review of the dry-run output before apply
   (still through the gateway security boundary; no direct host/docker).
3. **Defer S02-E** until a future capability/architecture decision provides
   a governed DB-mutation path; the preflight tooling and this record remain
   the standing S02-E evidence.

*This is the mandated STOP: the exact missing capability is a gateway that
can (a) read Production rows read-only for the dry-run and (b) execute the
authorized backfill under `DB_CHANGED=YES` within its security boundary.*

## 6. Capability provided (2026-09-01) — status update

`GOVERNED-PROD-DB-CAPABILITY-01` implemented the missing capability as the
gateway v2 `db-operation` action (see
[`GOVERNED-DB-MUTATION-01.md`](./GOVERNED-DB-MUTATION-01.md) and
`docs/PRODUCTION_DEPLOYMENT_GATEWAY.md` §db-operation):

- **Read-only inspection/dry-run**: `db-operation` `mode=dry-run` mounts the
  Production volume read-only and stores root-only dry-run evidence
  (`db-op-dryrun-s02e-exercise-identity-backfill-<sha12>.json`) with a
  `report_sha`; the dry-run classifier is the allowlisted
  `scripts/gateway-db-ops/s02e-exercise-identity-backfill.mjs`.
- **Governed apply**: `mode=apply` is refused without the matching
  `dry_run_evidence_sha`; mandatory pre-mutation backup, before/after hashes,
  post-mutation verification, rollback restore, exclusive lock.
- **Proven without mutation**: the real Production DB dry-run evidence was
  produced, and the apply pipeline was proven via `mode=rehearsal` (clone of
  app.db; real DB hash unchanged) plus a zero-pending-migrations
  `prisma-migrate-deploy` apply.

**S02-E apply on the real Production DB remains NOT executed.** S02-E is
again the next authorized isolated lifecycle: run the now-supported
`dry-run` → review the UNRESOLVED/AMBIGUOUS/BLOCKED_COLLISION report →
(re)authorize the apply with the exact `dry_run_evidence_sha`.

## 7. Final lifecycle — DELIVERED / CLOSED (2026-09-01)

Owner delta `S02-E FINAL LIFECYCLE` authorized the final isolated lifecycle:

1. **Dry-run evidence reconciled** — gateway v2 `db-operation`
   `s02e-exercise-identity-backfill` dry-run on the real Production DB
   returned `dry_run_evidence_sha 8cf8a5358dbb…`, byte-identical across
   `a0a47ed` and `5e77298` source SHAs (deterministic report).
2. **Ambiguous row surfaced** — `Side-Lying Leg Lift` (id
   `cmtdmzmw80008k101j3a2gd2z`, slug NULL); candidates
   `side-kick-side-leg-lifts` (`Side Kick (Side Leg Lifts)`, alias) and
   `side-lying-leg-lift` (`Side-Lying Leg Lift`, exact name). Owner decision
   (2026-09-01): **leave unmapped / close** (fail-closed; alias collision
   deferred as `EXERCISE-CATALOG-DISAMBIGUATION-01`, PROPOSED).
3. **Governed apply** — bound to evidence `8cf8a535…`; backup
   `gateway-backup-s02e-exercise-identity-backfill-5e7729863abc.db`;
   `applied_count 0`; DB hash unchanged `2e558a90…` (before == after);
   verification PASS; 8 already-backfilled rows untouched; `faName` untouched
   (GA-05).
4. **Post-state/idempotency** — post-apply dry-run returns the same evidence
   sha; app healthy `/en` `/fa` 200.
5. **Production acceptance** — real-browser 6/6 PASS on `apexhomefit.ir`
   (public EN/FA, auth boundary, exercise library catalog/resolver path,
   workout-route EN+FA RTL boundaries, manifest, zero fatal console errors).
6. **Closure** — S02-E CLOSED; no subsequent task started.

**FINAL_STATUS: CLOSED / PRODUCTION_ACCEPTED** (DB_CHANGED=YES lifecycle with
0-row mutation; real DB hash unchanged; backup on file).

