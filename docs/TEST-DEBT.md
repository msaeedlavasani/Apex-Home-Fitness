# Test Debt — Ledger

Durable registry of confirmed stale/incorrect test expectations that do NOT
reflect application regressions. Each entry records the evidence, the root
cause of the drift, and the proposed remediation. Entries are fixed by a
dedicated spec-reconciliation task, never silently.

> Creation context: both entries below were reproduced identically on clean
> `main` during S-04 validation (2026-09-01) — the S-04 investigation proved
> they are pre-existing spec drift against current public markup, not
> regressions. Neither spec runs in CI's e2e gate (`test:e2e:auth` /
> `test:e2e:smoke` only).

---

## TD-01 — `tests/rtl-layout.spec.ts` "nav order and active state stay consistent in both directions" (line ~116)

- **Status:** FIXED 2026-09-01 (STABILIZATION BATCH S06+S05; verify via the
  full local E2E suite). Previously CONFIRMED STALE (reproduced on clean
  `main`, 2026-09-01).
- **Failure (recorded):** `nav.getByRole('link').nth(3)` expected
  `"Profile"` (fa: `"پروفایل"`), received `"Training preferences"`.
- **Root cause:** the spec hardcodes a four-item nav
  (`['Home', 'History', 'Analytics', 'Profile']` / fa
  `['خانه', 'تاریخچه', 'آمار', 'پروفایل']`), but the public sidebar is
  driven by `APP_NAV` in `src/components/layout/nav.tsx`, which has FIVE
  items with `preferences` at index 3:
  `dashboard, history, analytics, preferences, profile`.
- **Evidence:** `src/components/layout/nav.tsx:26-35` (`APP_NAV` order);
  error context from the clean-main reproduction.
- **Remediation applied:** label arrays updated to the five-item order — EN
  `['Home', 'History', 'Analytics', 'Training preferences', 'Profile']`,
  fa `['خانه', 'تاریخچه', 'آمار', 'تنظیمات تمرین', 'پروفایل']` (fa label from
  the same catalog message as `APP_NAV`'s `preferences` key); the
  `aria-current` assertion on `History` is unchanged.

## TD-02 — `tests/rtl-layout.spec.ts` "quiz page is RTL in Persian with localized controls" (line ~67)

- **Status:** FIXED 2026-09-01 (STABILIZATION BATCH S06+S05; verify via the
  full local E2E suite). Previously CONFIRMED STALE (reproduced on clean
  `main`, 2026-09-01).
- **Failure (recorded):** `page.getByRole('radiogroup')` → strict-mode
  violation (2 elements): the quiz's own options radiogroup plus the
  language switcher's radiogroup (`aria-label="زبان"`).
- **Root cause:** the unscoped `getByRole('radiogroup')` predates the
  language switcher's radiogroup markup; the quiz page now legitimately
  contains two radiogroups (locale switcher + quiz options).
- **Evidence:** error context strict-mode message showing both elements
  (e.g. quiz options aria-label `چه سبک نمایشی رو ترجیح می‌دی؟`).
- **Remediation applied:** the unscoped role lookup is replaced with a
  scoped assertion on the quiz step's own options container
  (`page.locator('.quiz-step__options')`); the `بعدی` button check is
  unchanged.

---

## Fix workflow

1. ~~Authorize a `SPEC-RECONCILIATION` task~~ — authorized as part of
   STABILIZATION BATCH S06+S05 (2026-09-01); fixes applied in that batch.
2. Verify the full local E2E suite (all `tests/*.spec.ts`) is green.
3. Optionally extend CI's e2e gate to include the RTL spec in a follow-up
   (governance decision, not automatic).
