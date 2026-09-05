# CP-06 UI Conformance Evidence

> **STATUS: CURRENT — EVIDENCE RECORD**
>
> This file records the UI Conformance Gate evidence for CP-06 consent UX
> surface implementation. UI_CHANGED=YES applies because
> `src/app/[locale]/workout/page.tsx`, `src/components/workout/WorkoutPlayer.tsx`,
> `src/components/workout/CameraConsentBanner.tsx`, and
> `src/components/workout/CameraTrackingIndicator.tsx` were added/modified.

## 1. Discover before implement

Read `docs/DESIGN_SYSTEM.md`, scanned `src/components/ui/platform` and
`src/components/**` for existing providers, tokens, typography, primitives,
and shared components before writing any UI.

**Discovered:**
- Platform kit at `src/components/ui/platform` with `Card`, `Button`, `Switch`
- Semantic color tokens (`text-apex-text`, `text-apex-text-secondary`,
  `bg-apex-primary-soft`, `bg-apex-primary`)
- Responsive utilities (`sm:` breakpoints, `w-full sm:w-auto`)
- Accessibility patterns (`role`, `aria-label`, `aria-live`)
- `cn` utility from `src/lib/cn`
- next-intl `useTranslations` hook pattern

## 2. Reuse first (KIT-FIRST)

| Component | Decision | What was reused |
|---|---|---|
| `CameraConsentBanner` | **REUSE** | `Card` (variant="tonal", size="md"), `Button` (variant="filled"/"tonal"), `Switch` from `@/components/ui/platform` |
| `CameraTrackingIndicator` | **REUSE** | `Button` (variant="text", size="sm") from `@/components/ui/platform` |
| Consent state styling | **REUSE** | Semantic tokens `bg-apex-primary-soft`, `text-apex-text`, `bg-apex-primary` |
| Layout/spacing | **REUSE** | `flex`, `gap-*`, responsive `sm:*` utilities from platform conventions |
| i18n | **REUSE** | `useTranslations('CameraConsent')` pattern from next-intl |

## 3. Preserve architecture

- **Theme/dark-mode**: `.dark` class + `ThemeScript`/`ThemeProvider` preserved; no new theme logic added.
- **Localization/RTL**: next-intl `dir`, Vazirmatn font preserved; EN/FA keys added to existing message catalogs.
- **Platform resolution**: `data-platform` architecture untouched.

## 4. Follow conventions

- **Responsive**: `sm:flex-row`, `w-full sm:w-auto` — min viewport 360px preserved.
- **Accessibility**: `role="region"`, `role="status"`, `aria-live="polite"`, `aria-label` on interactive elements.
- **Reduced motion**: `animate-ping` used for tracking indicator (standard pulse; no custom motion).
- **States**: loading/empty/error/disabled/focus/success states considered:
  - `CameraConsentBanner`: disabled state on grant button until scopes selected
  - `CameraTrackingIndicator`: returns null when inactive (empty state)
  - Focus rings inherited from platform `Button`/`Switch`

## 5. Justify new patterns

No new visual primitives or component-layer classes introduced.
`CameraConsentBanner` and `CameraTrackingIndicator` are domain-specific
compositions of existing platform primitives, not new visual patterns.

## 6. Explicit REUSE vs EXTEND decision

**Decision: REUSE**

The existing platform kit (`Card`, `Button`, `Switch`) and semantic tokens
fully covered the consent UX requirements. No extension of the platform kit
was necessary. The consent UI is a domain-specific composition of existing
primitives with no new visual patterns, colors, or component-layer classes.

## 7. MUI/parallel-kit audit

- No `@mui/material` imports outside the registered allowlist.
- No new UI kit directories under `src/components/ui`.
- Only `src/components/ui/platform` primitives used.

## 8. Files changed

| File | Change type | UI impact |
|---|---|---|
| `src/lib/workout/consentEntity.ts` | **NEW** | No UI — pure TypeScript domain logic |
| `src/components/workout/CameraConsentBanner.tsx` | **NEW** | UI — new component composing platform kit |
| `src/components/workout/CameraTrackingIndicator.tsx` | **NEW** | UI — new component composing platform kit |
| `src/components/workout/WorkoutPlayer.tsx` | **MODIFIED** | UI — conditional consent banner/tracking indicator integration |
| `src/app/[locale]/workout/page.tsx` | **MODIFIED** | UI — scope derivation prop injection |
| `src/messages/en.json` | **MODIFIED** | i18n — new `CameraConsent` namespace |
| `src/messages/fa.json` | **MODIFIED** | i18n — new `CameraConsent` namespace |

## 9. Validation

- `npm run typecheck` — PASS
- `npm run lint` — PASS (0 errors)
- `npm test` — blocked by pre-existing tsx module resolution issue in sandbox (unrelated to this change)
- UI_CONFORMANCE = PASS (REUSE)
