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

## TD-03 — `tests/profile-shell.spec.ts` — Profile Back control (5 tests)

- **Status:** FIXED 2026-09-03 (SPEC-RECONCILIATION-02; verified by the
  full local E2E suite). Previously CONFIRMED STALE (nightly CI failures
  08-27 → 09-02, e.g. run 33696672863).
- **Failure (recorded):** all five tests wait for a `Back`/`بازگشت` link on
  `/profile` (visible, ≥44px, `rtl:rotate-180` chevron, keyboard-Enter to
  dashboard) — element never appears.
- **Root cause:** the dedicated Profile Back control was removed **by
  design** in commit `aa2b1db` (2026-08-26) "Mobile nav & profile polish:
  preferences tab, no stale back buttons, brand name" — Profile is a
  top-level nav destination (sidebar/pill nav), unlike pushed screens such
  as FAQ which keep `backHref`. The specs pinned the pre-rework chrome.
- **Evidence:** profile failure snapshots show the current page (sidebar +
  signed-out card, no Back link); `WebLayout.tsx` renders the Back link
  only when `backHref` is passed (FAQ passes it, Profile does not).
- **Remediation applied:** tests now pin the current shell-navigation
  paradigm — sidebar/pill `aria-current="page"` on Profile, sidebar Home /
  pill Home returning to the dashboard, ≥44px Profile pill, RTL sidebar
  hugging the inline-start edge with localized labels, and a keyboard
  journey from the dashboard to Profile via the sidebar link (focus ring
  + Enter). No coverage intent was dropped.

## TD-04 — `tests/faq.spec.ts` — FAQ brand text (fa)

- **Status:** FIXED 2026-09-03 (SPEC-RECONCILIATION-02).
- **Failure (recorded):** `getByText('اپکس فیتنس خانگی چیست؟')` not found.
- **Root cause:** brand renamed to «اپکس هوم فیتنس» in commit `aa2b1db`
  (2026-08-26, "brand name"); `src/messages/fa.json` line 384 is now
  «اپکس هوم فیتنس چیست؟». The en spec already matched the new brand.
- **Evidence:** nightly faq failure context; current `fa.json` question
  text; `git log` showing the rename commit.
- **Remediation applied:** `QUESTIONS.fa[0]` updated to the current brand;
  all other faq assertions (Back control, disclosure, profile→faq flow)
  were already green and untouched.

## TD-05 — `tests/accessibility-aria.spec.ts` + `tests/keyboard-focus.spec.ts` — quiz drift (2 tests)

- **Status:** FIXED 2026-09-03 (SPEC-RECONCILIATION-02).
- **Failure (recorded):** (a) onboarding ARIA test asserts
  `aria-valuemax="7"`, receives `"8"`; (b) onboarding keyboard test's
  unscoped `getByRole('radiogroup')` hits a strict-mode violation (2
  elements: shell Language switcher + quiz options).
- **Root cause:** (a) the quiz grew 7 → 8 steps when the rest-days feature
  added `RestDaysStep` (the 8-step flow is already pinned by
  `tests/rest-days.spec.ts` and the keyboard "all eight steps" test);
  (b) the unscoped lookup predates the shell Language radiogroup — the
  same class of issue already fixed for rtl-layout in TD-02.
- **Evidence:** nightly error contexts (`aria-valuemax="8"`;
  strict-mode listing both radiogroups); `OnboardingQuiz.jsx`
  `STEP_CONFIG` with 8 steps.
- **Remediation applied:** (a) progress assertions updated to 8; (b) the
  radiogroup assertion is scoped to the quiz step's options
  (`name: 'What visual style do you prefer?'`).

## TD-06 — `tests/keyboard-focus.spec.ts` — theme toggle location

- **Status:** FIXED 2026-09-03 (SPEC-RECONCILIATION-02).
- **Failure (recorded):** `getByRole('complementary').getByRole('button',
  {name: 'Light'})` times out — no theme toggle in the sidebar.
- **Root cause:** the theme toggle moved from the sidebar footer to the
  desktop corner controls / mobile top bar (WebLayout renders it in the
  `div.glass-strong.fixed` corner pill; the sidebar has none). The spec's
  comment ("exists in both the sidebar footer and the mobile top bar")
  predates the move; the responsive touch-targets test already scopes it
  correctly to the header.
- **Evidence:** nightly failure snapshot shows `button "Light"` in the top
  corner region next to the Language radiogroup, none inside
  `complementary`; `WebLayout.tsx:55`.
- **Remediation applied:** the test scopes to the corner controls
  (`div.glass-strong.fixed`); the full Light → Dark → System cycle,
  persistence and focus-retention assertions are unchanged.

## TD-07 — `tests/responsive-layout.spec.ts` — pill count + quiz-ring tab order (2 tests)

- **Status:** FIXED 2026-09-03 (SPEC-RECONCILIATION-02).
- **Failure (recorded):** (a) `header nav a` expected 4, received 5;
  (b) first-Tab on `/en/quiz` lands on the language switcher, so the
  `quiz-option` class assertion reads the wrong element.
- **Root cause:** (a) the nav grew to five items when the preferences tab
  was added — the same five-item `APP_NAV` already reconciled for
  rtl-layout in TD-01; (b) the shell language switcher sits above the quiz
  options in tab order, so the first tabbable is no longer an option card.
- **Evidence:** nightly error contexts (`Expected: 4, Received: 5`;
  received className = the language-switcher radio's Tailwind classes).
- **Remediation applied:** (a) pill counts updated to 5 (en + fa); (b) the
  quiz-ring test Tabs until the first `quiz-option` element owns focus
  (still a real keyboard journey), then asserts the focus ring as before.

## TD-08 — Dashboard data-dependent specs (8 tests) + nightly harness

- **Status:** FIXED 2026-09-03 (SPEC-RECONCILIATION-02).
- **Failure (recorded):** week-calendar-order ×4, accessibility-aria
  Dashboard, keyboard-focus Dashboard, offline-pwa ×2 — all wait for the
  "Weekly calendar" region / 7 day buttons that never render.
- **Root cause:** the 08-27 dashboard rework made the calendar
  program-gated: it renders only when `/api/profile` reports
  `quizCompleted` AND `/api/program/current` returns a program. Both routes
  are auth-gated, and CI has no session backend by design
  (AUTH_OTP_MODE=mock never mints sessions — `src/lib/auth/mode.ts`), so
  the calendar could never render in CI. The intended no-program state (the
  "Finish your setup first" CTA) is already pinned by main-flows.spec.ts.
  The suite also cannot run in a single invocation: auth-flow.spec.ts
  requires `AUTH_OTP_MODE=mock` while every other spec runs open-mode.
- **Evidence:** nightly failure snapshots showing the CTA state; the
  dashboard rework diff (`04df5f5..871bcfa`); identical failure set on
  six nightly runs (08-27 → 09-02) across different SHAs.
- **Remediation applied:**
  1. New fixture `tests/helpers/dashboardData.ts` — deterministic
     `/api/profile` + `/api/program/current` payloads injected via
     Playwright route interception (page routes take precedence over the
     offline cache recorder). Every calendar assertion still runs against
     the real client-rendered markup; no app/auth behavior changed.
  2. `tests/week-calendar-order.spec.ts` completion-summary expectations
     are now locale-aware (the dashboard counts completed workout days
     inside each locale's own week window — en Monday-start, fa
     Saturday-start — which legitimately differ on week-boundary days).
  3. `.github/workflows/ci-full-e2e.yml` split into an auth-mock step
     (`test:e2e:auth` with `AUTH_OTP_MODE=mock`) + the open-mode full
     suite, mirroring per-commit CI.

## TD-09 — Profile duplicate "Language" radiogroup (a11y naming)

- **Status:** FIXED 2026-09-03 (SPEC-RECONCILIATION-02).
- **Failure (recorded):** `accessibility-aria.spec.ts` Profile test —
  `getByRole('radiogroup', {name: 'Language'})` strict-mode violation: two
  groups with the identical accessible name on `/en/profile`.
- **Root cause:** the shell header's LanguageSwitcher (`Language.label`)
  and the Apple-styled in-page preference row
  (`Profile.preferences.language` = "Language") both used the name
  "Language" — a genuine duplicate-accessible-name a11y issue, not just a
  test bug.
- **Evidence:** nightly strict-mode error listing both elements (header EN
  pill + `bg-apple-*` in-page radios); `ProfileView.tsx` Segmented
  `ariaLabel={t('preferences.language')}`.
- **Remediation applied:** the in-page control's accessible name is now
  distinct — "Interface language" (en) / «زبان رابط کاربری» (fa) —
  without hiding any valid UI. The Profile ARIA test pins both names: the
  header group (count 1, name "Language") and the in-page group (name
  "Interface language", checked state).

---

## Fix workflow

1. ~~Authorize a `SPEC-RECONCILIATION` task~~ — authorized as part of
   STABILIZATION BATCH S06+S05 (2026-09-01); fixes applied in that batch.
2. ~~SPEC-RECONCILIATION-02 (2026-09-03)~~ — nightly repair authorized by
   the Owner; fixes applied (TD-03..TD-09).
3. Verify the full local E2E suite (all `tests/*.spec.ts`) is green.
4. Run the nightly-equivalent CI split (auth mock + open-mode full suite)
   and confirm a PASS before close-out.
