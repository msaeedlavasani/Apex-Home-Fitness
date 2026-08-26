# ADR-0003: Quiz / Onboarding Domain Migration

`STATUS: ACCEPTED — 2026-08-27`

`IMPLEMENTATION CLASSIFICATION: DO WHEN TOUCHED — NOT part of the immediate
Architecture Stabilization execution.`

## Context

The onboarding/quiz domain is a **JavaScript island** in an otherwise
TypeScript codebase:

- `src/components/quiz/*` (`.jsx`/`.js`) implements the quiz UI with its own
  `i18n.js`, `theme.js`, `restDays.js` and `exerciseStyles.js`;
- `src/lib/quiz/*` (`.ts`) holds the TS flow/schema/draft layer and mirrors the
  JS component ids by hand (`quizFlow.ts` vs `OnboardingQuiz.jsx` vs
  `requestSecurity.ts` — R-08);
- `quiz/restDays.js` duplicates `src/lib/ai/restDays.ts`;
  `quiz/exerciseStyles.js` duplicates `src/lib/exerciseStyles.ts`;
  `quiz/theme.js` duplicates the `ThemeProvider.tsx` contract (its own barrel
  comment acknowledges the app-wide contract lives elsewhere);
  `quiz/i18n.js` duplicates next-intl.

This was audit risk R-03 (`docs/architecture/COUPLING-RISK-REGISTER.md`): two
sources of truth for rest-day and exercise-style rules, and the quiz UI cannot
reuse app services.

## Decision

**ACCEPTED AS FUTURE WORK.** The quiz/onboarding island should eventually
migrate toward:

- TypeScript (`.tsx`/`.ts`);
- canonical app contracts (single source for the answer vocabulary);
- the shared rest-day vocabulary (`src/lib/ai/restDays.ts`);
- the shared exercise-style vocabulary (`src/lib/exerciseStyles.ts`);
- shared theme/design tokens (`ThemeProvider` contract);
- canonical localization (next-intl), removing `quiz/i18n.js` and
  `quiz/theme.js` fallbacks.

**Scope guard:** this is NOT part of the immediate Architecture Stabilization
execution. It is `DO WHEN TOUCHED` — the migration happens when a direct
dependency requires touching the quiz domain (or when a dedicated, separately
approved task schedules it). The immediate stabilization must not expand into a
broad Quiz rewrite.

## Compatibility

- Quiz behavior, steps and answer values remain identical during migration.
- Existing persisted quiz answers and drafts remain readable (shape-compatible).
- Server contracts (`POST /api/quiz/save`, `POST /api/generate-program`) are
  unchanged by the migration.

## Consequences

Positive:

- one source of truth for rest-day/exercise-style rules;
- quiz UI can reuse app services and types;
- TS type safety across the onboarding flow;
- removes duplicated i18n/theme plumbing.

Costs:

- a dedicated migration with regression coverage (quiz E2E + unit suites);
- coordination with quiz-dependent features (rest-day enforcement, preferences
  editor) so behavior stays identical.

## Not Decided Yet

- Exact file layout for the migrated components (no premature restructure).
- Whether the migration bundles the `quiz/theme.js` and `i18n.js` removal in
  one pass or splits it — decided when the migration is scheduled.

## Relationship

- Decision id: AD-3 (approved 2026-08-27, classified DO WHEN TOUCHED).
- Implements: Architecture Principle §4 / §10 (contract ownership, explicit
  boundaries).
- Recorded in: `docs/architecture/ARCHITECTURE-STABILIZATION-PLAN.md`
  (excluded from immediate scope) and the risk register R-03.
