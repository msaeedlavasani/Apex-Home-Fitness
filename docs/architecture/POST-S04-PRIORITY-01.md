# POST-S04-PRIORITY-01 — Architecture Backlog Re-Rank (S02-E / S-05 / S-06)

> **STATUS: DECISION / PLANNING RECORD — 2026-09-01.** Docs/Governance only.
> Nothing implemented. Re-ranks the remaining canonical architecture backlog
> (S02-E, S-05, S-06) after S-04 closed (PR #17 → `8e06d70`). Also persists
> the two confirmed stale `rtl-layout.spec.ts` expectations as test debt
> (see `docs/TEST-DEBT.md`). No execution authorized by this record; each
> item still requires its named owner checkpoint + promotion to
> `docs/TASKS.md` (per `ARCHITECTURE-STABILIZATION-PLAN.md` §3).

## 1. Inventory and dependency resolution

| ID | Scope (canonical) | Dependencies | Gate / checkpoint | Domain |
|---|---|---|---|---|
| **S02-E** | Exercise identity **backfill** — idempotent, replayable mapping of existing exercise rows through the resolution layer (dry-run + verification; unresolvable names surfaced, never guessed); part of the S02 canonical-identity lineage (S02-A..D2 COMPLETE) | S02-A..D2 (COMPLETE — resolution layer, runtime integration, client adoption); GATE A APPROVED (2026-08-27). **No dependency on S-04/S-05/S-06.** | Owner promotion; migration/backfill strategy §7 of the stabilization plan (additive-first, replayable, never destructive) | DB data backfill (Production DB rows) |
| **S-05** | Snapshot **Versioning** — explicit `version` discipline for persisted `workoutStates` (IndexedDB), additive evolution only; hydration adapter; unknown-newer-version behavior | **S-04 (CLOSED)** — versioning must align with the core's serialization contract; S-04's consumer boundary is now stable | **GATE C** (owner checkpoint before modifying the snapshot structure) | Code — `src/lib/offline` (`workoutPersistence.ts`, `conflictPolicy.ts` untouched except honoring the version contract) |
| **S-06** | Exercise **Library / Catalog Role** — decision + documentation of canonical vs sample/demo role of the current library | **None** — decision-only, may run at any point; must complete before any post-GATE-A schema work (its output feeds the S-02 design review) | Owner checkpoint | Docs-only (decision record) |

Dependency graph (post-S-04):

```
S02-A..D2 (CLOSED) ──► S02-E (backfill)              [independent of S-04/S-05/S-06]
S-04 (CLOSED 8e06d70) ──► S-05 (versioning)          [hard dependency, satisfied]
S-06 (decision-only)  ─── no dependency ───► any     [constrains post-GATE-A schema work]
```

There is **no cross-dependency between S02-E and S-05/S-06**: exercise-row
backfill and IndexedDB snapshot versioning touch disjoint stores with
disjoint consumers. S-05's only hard dependency (S-04) is satisfied and
closed.

## 2. Recommended execution order

1. **S-06 — Exercise Library / Catalog Role** (first): zero-code decision
   record; cheapest; unblocks the S-02 design-review input; no risk.
2. **S-05 — Snapshot Versioning** (second): the only remaining *code*
   architecture debt that depends on the now-closed S-04 lineage; GATE C
   checkpoint required before snapshot-structure changes.
3. **S02-E — Exercise Identity Backfill** (third/last): the only
   Production-DB-touching item; highest operational risk; requires the
   strongest isolation and its own lifecycle with dry-run + verification.

Rationale: **cheapest-first, risk-ascending, owner checkpoints ascending.**
S-06 and S-05 have no DB impact; S02-E mutates Production data rows and is
therefore deliberately last and alone.

## 3. Batchability analysis

| Candidate batch | Verdict | Reason |
|---|---|---|
| **S-06 + S-05 in one lifecycle** | **SAFE / RECOMMENDED (optional)** | Same domain family (post-S-04 stabilization), disjoint changes (S-05 = `src/lib/offline` code; S-06 = docs-only decision record), one integration validation. The batch-delivery doctrine (same domain, one validation, one lifecycle) is satisfied. Risk LOW. |
| S02-E + anything | **NOT batchable** | DB backfill (Production data mutation, `DB_CHANGED=YES` path) must never ride a batch with non-DB code; separate lifecycle, separate validation gate, dry-run + verification, rollback = replayable forward-compatible fields. Risk isolation is mandatory. |
| S02-E ∥ S-05 (parallel worktrees) | Technically independent (disjoint stores), but **serial recommended** under the current one-active-session doctrine; no lifecycle saving justifies interleaving DB backfill with IndexedDB refactors. | — |

## 4. Gates and promotion requirements (unchanged, restated)

- S-05: **GATE C** owner checkpoint before any snapshot-structure change;
  promotion to `docs/TASKS.md`.
- S-06: owner checkpoint; promotion; decision recorded and reflected in
  `docs/INDEX.md`/catalog row.
- S02-E: owner promotion; backfill strategy per stabilization plan §7
  (idempotent, dry-run + verification, unresolved names surfaced in a
  report/registry, never silently mapped, ambiguity → owner input).

## 5. Relationship to other backlog (unchanged)

AD-3 (quiz TS migration), AD-4 (S-01 shared contract ownership — COMPLETE),
AD-5 (offline DB split), Workout V2, ADMIN-IMPERSONATION-01 (DEFERRED /
NOT AUTHORIZED) are untouched by this re-rank. Mobile-readiness guardrails
(ADR-0005) remain binding.

## 6. Test debt

Two confirmed stale expectations in `tests/rtl-layout.spec.ts` (reproduced
identically on clean main; not part of CI's e2e gate; not addressed by
S-04) are now persisted in `docs/TEST-DEBT.md` as TD-01 and TD-02, with a
proposed remediation as a future spec-reconciliation task.
