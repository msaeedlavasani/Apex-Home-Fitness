# ADMIN-THEME-SWITCH-01 — Admin Light/Dark Theme Switch

> **STATUS: DEFERRED / NOT AUTHORIZED FOR IMPLEMENTATION** (observed and
> persisted 2026-09-01 during MOBILE-READINESS-01 — Admin follow-up debt;
> recorded here only, NOT implemented).
>
> Profile: UI remediation (future). `DB_CHANGED = NO`. No Production impact
> while deferred.

## 1. Observation

The Admin Console currently has **no visible Light/Dark switch** and is
effectively **Dark-only** (dark theme fixed by the admin layout's theme
wiring from ADMIN-DS-01). This is a UX debt against the shared Apex Design
System, which supports a persistent, user-selectable Light/Dark theme on the
public app.

## 2. Mandatory future implementation requirements

When authorized, the implementation MUST:

- **Reuse the existing shared theme architecture** — `src/components/providers/
  ThemeProvider.tsx` (persisted `localStorage` key, system-preference
  detection, `ThemeScript` hydration) and the existing design tokens
  (`globals.css`, `theme` tokens). Do NOT build a parallel admin theme
  system (KIT-FIRST; parallel visual systems fail closed unless authorized).
- **Support persistent Light/Dark selection** for the admin surface, matching
  public-app behavior (selection survives reload; system preference respected
  when no explicit choice).
- Keep the admin theme switch discoverable in the admin chrome (e.g. admin
  nav/shell), consistent with the platform design system.
- Preserve the ADMIN-DS-01 dark-mode wiring (already shipped in Batch 1) as
  the default when no explicit user selection exists.
- Follow the UI Conformance Gate (`docs/governance/UI-CONFORMANCE-GATE.md`):
  `UI_CHANGED=YES` ⇒ REUSE decision + evidence; dark-mode architecture
  preserved; accessibility (contrast in both themes, focus-visible) intact.
- Pass real-browser validation for both themes on the exact release code.

## 3. Acceptance criteria (future, when authorized)

- Light and Dark themes both render correctly across admin surfaces
  (login, dashboard, tables, forms, state boundaries).
- Selection persists across navigation and reload.
- No regression in public-app theme behavior.
- UI Conformance Gate PASS with REUSE evidence citing the shared
  ThemeProvider/design tokens.

## 4. Sequencing note

Independent of ADMIN-DS-05 (Persian/RTL) — theme switching is orthogonal to
localization. Candidate for a future admin batch; not part of Batch 1, not
part of the current MOBILE-READINESS-01 task.
