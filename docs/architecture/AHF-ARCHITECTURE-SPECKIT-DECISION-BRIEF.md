# AHF — Architecture / Spec Kit Decision Brief

`STATUS: AUDIT RECORD — DECISION BRIEF (DECISIONS D1/D4/D5 DECIDED 2026-09-14 — SEE OWNER_DECISION_GATE)`
> **Provenance:** placed into the repository 2026-09-14 via `docs/spec-kit-adoption-stage-0` (Stage 0 of SPECKIT-ADOPTION-01). Content preserved as issued.
Refs: MAIN `ff1202c6` · DEV `prototype/workout-layout-blueprint` @ `a62a7ce` (19 ahead, 0 behind) · Production checkpoint `4ada1dae` (97 commits behind main) · Full evidence: [`AHF-ARCHITECTURE-SCALE-READINESS-AUDIT.md`](./AHF-ARCHITECTURE-SCALE-READINESS-AUDIT.md)

---

## What is healthy (keep, protect)

- Layered architecture with verified direction (pages → components → services → lib → infra); DB access concentrated in 10 files; supabase-js confined to 9 files; AI provider behind resolver + deterministic fallback; pure session core with React adapter; offline outbox with idempotent sync and tested conflict policy.
- Governance machinery most repos of this size never have: 21 ADRs, machine-validated task profiles (`governance-runtime.mjs`), authority hierarchy with Find-Before-Create, one executable backlog, release gateway with fail-closed exact-SHA deploys and verified rollback, targeted-vs-nightly CI split.
- Security posture: strict CSP with per-origin justifications, digest-pinned images, immutable-build rules, privacy-by-default (raw video never leaves device; non-persistence default for camera signals).

## What to abstract now (keep implementation, create/hold boundary)

- **Supabase identity coupling** — seam exists; make the 9-file confinement an explicit rule; schedule the already-accepted Principle-12 evaluation.
- **Analytics log-only sink** — add persistence behind the same route when product needs event data (cheap now, impossible to backfill later).
- **DEV 3D prototype** — exemplary isolation (`prototype/` namespace); `MentorStage.tsx` + `three@r180` + CSP `connect-src blob:` must not reach main without spec treatment.

## What to migrate now

**Nothing qualifies.** Pre-launch product, no measured load, all expensive paths have clean insertion points. Zero MIGRATE NOW is the evidence-based verdict — approving one now would violate the repo's own evidence-before-migration principle.

## Node/Bun verdict

Node 22 is not the bottleneck at any realistic scale for this I/O-bound workload (SQLite file, Supabase REST, AI HTTP, SSR; heavy compute is on-device by design). First real bottlenecks: single host → SQLite single-writer → AI provider limits → Supabase plan/region. Bun as CI tooling experiment at most; runtime change adds deployment-identity risk for no evidenced gain. Revisit triggers documented (audit §8E).

## Spec Kit verdict

**Adopt, thin and by-reference.** AHF already owns constitution-equivalent rules (AGENTS.md + ARCHITECTURE-PRINCIPLES + RELEASE_POLICY + governance) and one backlog; what's missing is a repeatable artifact-based *feature specification* flow. Design: `.specify/` templates + by-reference constitution + `docs/specs/NNNN-slug/` + LIGHT/STANDARD/CRITICAL classes mapped onto existing task profiles + baseline doc. Stages 0–3 are docs-only; pilot is design-only; nothing is initialized or ratified without the owner.

## Top future migration risk

**SQLite→PostgreSQL** (Prisma plane) is the single most expensive deferred change — every scaling path (multi-instance, HA, managed hosting) passes through it. Correct to defer; must carry a written trigger runbook. Runner-up: cross-plane identity swap (Supabase) if coupling discipline erodes.

## Top 5 recommended actions

1. Approve Spec Kit adoption design and authorize docs-only Stages 0–3 (branch `docs/spec-kit-adoption-stage-0`).
2. Author the SQLite→Postgres trigger runbook (docs-only) inside Stage 0.
3. Add the identity-seam rule (supabase-js confinement + opaque userId) to governance as a CANDIDATE constitution item.
4. Record the DEV-branch decision: keep the 3D prototype isolated until the Workout Experience Specification passes owner review; no merge of `MentorStage.tsx`/CSP change before spec treatment.
5. Fill the two owner-facts gaps into `docs/ENVIRONMENT_CONTRACT.md`: Supabase plan/limits/region; any traffic expectations (both currently UNKNOWN in-repo).

## Owner decisions

Blocking: **D1 — adopt Spec Kit brownfield design + authorize Stages 0–3** (see `OWNER_DECISION_GATE.md`). Non-blocking: pilot vehicle (D2), Principle-12 evaluation timing (D3). Safe-to-defer: Postgres runbook folding (D4), Bun triggers (D5), quiz TS port (D6). Pre-existing owner gates (MG-09 apply, TS-03 deletion acceptance, CP-05 physical acceptance, dual compose file) are noted, not reopened.

## Recommended first implementation task

After D1 approval: `docs/spec-kit-adoption-stage-0` — land audit + design + gate docs + `INDEX.md` rows + baseline + templates + candidate constitution, all docs-only, each stage independently revertible, `governance:check` green. Then stop for the Stage-4 pilot authorization (Workout Experience Specification).
