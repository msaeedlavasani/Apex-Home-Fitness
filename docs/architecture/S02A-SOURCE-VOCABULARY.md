# S02-A — Exercise Source Vocabulary Analysis

`STATUS: DEVELOPMENT-TIME ANALYSIS (S02-A) — NOT AN IMPLEMENTATION`

Source-controlled catalogs reviewed for S02-A (GATE A canonical exercise
identity foundation). Same-movement equivalence is asserted ONLY where the
display name is identical or a documented alias; distinct display names are kept
as UNRESOLVED (no invented semantic merges).

## Sources

| Source | Entries | File |
|---|---|---|
| Seed (DB `Exercise` seed) | 40 | `prisma/seed.ts` |
| Rules engine | 36 | `src/lib/ai/ruleBasedProgram.ts` |
| Sample plan | 9 nameKeys | `src/lib/workout/samplePlan.ts` |
| Library (demo) | 10 | `src/app/[locale]/library/ExerciseLibraryPage.tsx` |
| System catalog (S02-A) | union of seed + rules | `src/lib/exercise/catalog.ts` (`CANONICAL_CATALOG`) |

## Classification per entry (development-time)

`CANONICALIZED` — entered into `CANONICAL_CATALOG` with a stable slug.
`CONFIDENT_ALIAS` — variant display spelling of a canonicalized movement
represented as an alias on the canonical entry.
`UNRESOLVED` — distinct name with no asserted equivalence; kept OUT of the
system catalog unless it is a canonical seed/rules entry.
`AMBIGUOUS` — a single name maps to more than one distinct movement.

### Seed vocabulary (40)

- 40 `CANONICALIZED` (exact seed names → deterministic slugs).
- 1 `CONFIDENT_ALIAS` applied back onto seed entries: `Burpee` ← `burpees`
  (sample-plan/library spelling), `Glute Bridge Hold` ← `glute-bridge` /
  `glute bridge` (library), `Plank Hold` ← `plank` (library/sample),
  `Mountain Climbers` ← `mountain-climbers`, `Push-Up` ← `push-up`/`pushups`,
  `Pull-Up` ← `pull-up`, `Cat-Cow` ← `cat cow` (rules spelling `Cat Cow`),
  `Side Kick (Side Leg Lifts)` ← `side-lying leg lift` / `side leg lift`.

### Rules vocabulary (36)

- 35 `CANONICALIZED` (each an exact rules-engine name in `RULES_CATALOG`).
- `Wall Sit` — `UNRESOLVED`-as-own-entry but **resolvable via the seed entry**
  (`Wall Sit` is also a seed entry; the seed canonical name matches the rules
  name exactly, so the resolver's normalized-name step resolves it to the seed
  entry — no separate rules entry needed, which keeps slugs unique).
- `Cat Cow` — `CONFIDENT_ALIAS` of seed `Cat-Cow` (same movement, hyphen
  spelling), carried as an alias; not duplicated in `RULES_CATALOG`.
- Note: rules names that differ from seed names (e.g. `Tempo Bodyweight Squat`
  vs seed `Bodyweight Squat`) are kept as **distinct** entries (UNRESOLVED —
  no asserted equivalence), as required.

### Sample-plan vocabulary (9 nameKeys)

- All 9 (`jumpingJacks`, `burpees`, `squats`, `pushUps`, `mountainClimbers`,
  `plank`, `gluteBridge`, `lunges`, `hipMobility`, `yogaFlow`) — `UNRESOLVED`
  as distinct display keys; several are library/sample only (`hipMobility`,
  `yogaFlow`) and have NO system-catalog entry in S02-A (no evidence they are
  canonical seed/rules exercises).

### Library vocabulary (10)

- Kept as its own `LIBRARY_CATALOG` (demo id namespace mirroring page ids).
  They are intentionally NOT merged into the system catalog. Resolver never
  resolves across them (no fuzzy cross-catalog guessing).

## Ambiguity

No single input maps to multiple canonical entries in `CANONICAL_CATALOG`
(guarded by the `CANONICAL_CATALOG` unique-slug unit test and the alias
collision invariant test). Ambiguous future inputs surface via
`resolveWithAmbiguity` (status `AMBIGUOUS`) and are never guessed.

## Persian names

GATE A found no Persian exercise-name corpus in the repo; `faName` is left
**undefined** on every entry (no invented translations; `prisma/seed.ts`
instructions are English, and localization uses `Library.exercises.*` keys for
demo pages only).

## Residual risk for S02-B

- The seed + rules vocabularies are curated by hand; a future S02-B backfill
  should treat any DB row whose name is not in this corpus as `UNRESOLVED`
  (catalog-review queue) rather than auto-creating a slug.