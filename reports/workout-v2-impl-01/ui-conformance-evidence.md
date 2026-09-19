# UI Conformance Evidence — WORKOUT-V2-IMPL-01 (first slice: START + PREPARING)

> UI_CHANGED: YES · UI_CONFORMANCE: PASS · UI_CONFORMANCE_DECISION: **EXTEND**
> Evidence per `docs/governance/UI-CONFORMANCE-GATE.md` §2 (discovery → reuse →
> preserve → conventions → justification → decision → evidence → composition map).

## 1. Discovery before implement

Existing surfaces read before any UI code was written:

- Design system + tokens: `docs/DESIGN_SYSTEM.md`, `src/app/globals.css`
  (Apex tokens, `animate-phase-enter`, reduced-motion media gate).
- Platform kit: `src/components/ui/platform` (platform dispatcher, primitives)
  — KIT-FIRST rule applied (no new kit dir, no MUI usage).
- Existing workout presentation: `WorkoutPlayer.tsx`, `CircularProgressRing`,
  `CountdownTimer`, `RepSetCounter`, `workoutTokens.ts` (V1 — untouched).
- Providers: `ThemeProvider`/`ThemeScript` (`.dark` class + localStorage),
  `PlatformProvider` (`data-platform`), `useReducedMotion` hook.
- Layout conventions: `AppShell` (IOS/Android/Web dispatchers), safe-area
  insets in the shipped player, 360px minimum contract, `max-w-md/lg/xl`
  content column on `/workout`.
- Localization architecture: next-intl `/en` + `/fa`, RTL, messages files.
- Motion/a11y baseline: `animate-phase-enter` (transform/opacity only,
  240ms) gated by `@media (prefers-reduced-motion: reduce)` in globals.css.

## 2. Reuse / Extend decision — EXTEND (bounded)

**Reused:** Apex tokens (`--apex-primary/-hover/-active`, `--apex-text`,
`--apex-fill`, `--apex-focus-ring`, `--app-background`), `card-surface`
conventions, `cn()` utility, `animate-phase-enter` + its reduced-motion CSS
gate, `useReducedMotion` conventions, `ThemeProvider` (theme resolution),
next-intl messages (`WorkoutV2` namespace, fa/en), AppShell composition
(max-width column + safe-area insets), WallClockAccumulator pattern.

**Extended (why REUSE was insufficient):** the V1 player is a fixed
four-phase engine presentation with no module vocabulary, no
experience-shell/environment layer, and no orchestration-owned view-model.
The approved V2 architecture requires a shell boundary (plan §3) that V1
cannot express without being rewritten (which would violate "V1 stays the
operational fallback"). The extension is bounded and additive:
`src/components/workout/experience/*` (new namespace) + a new `WorkoutV2`
message namespace + the additive review route `/[locale]/workout/v2`.
No parallel/competing visual system: same tokens, same fonts, same
dark/light architecture, same RTL/localization architecture.

## 3. Composition Map (Design Brain VNext P0 §3.1)

| Element | Record |
|---|---|
| Semantic regions | (1) Backstage environment (full-bleed, behind); (2) stage content region (centered, max-w-sm column); (3) module control region (bottom of stage column). |
| Primary visual anchor | The Backstage environment (Owner-approved reference family) — cinematic spatial depth, central negative space. |
| Primary CTA/action | START: single primary CTA, centered in the stage column (the only control on the START stage). |
| Initial-viewport priority | START CTA + shell title fully inside the first viewport at 360×640; no scroll required to act. |
| Grouping rationale | Stage content is one semantic group (title/hint/CTA or label/countdown/control) so assistive tech reads it in order; environment is `aria-hidden`. |
| Responsive reflow | Compact Portrait default (mobile reference family); Medium/Expanded switches to the desktop reference family at 768px; stage column stays centered with fluid padding; the shell grows (`min-h-[60svh]` → `70svh` ≥sm). |
| Invariant visual anchor | Central negative space of the Backstage (focus gradient) stays behind the stage content at every breakpoint/density; CTA never leaves the initial viewport. |
| Persistent vs contextual controls | START: single contextual CTA. PREPARING: one contextual PAUSE/RESUME control (dispatches orchestration only). No chrome, no global controls in this slice. |
| Camera/body-safe regions | N/A — no camera/body overlays in this slice (observation remains separately gated; the central region stays clean, which also satisfies future-safe framing). |

## 4. Owner-approved Backstage steering delta (presentation-only)

The four attached references (dark/light × mobile/desktop, one coordinated
family) are consumed as the WP-04 environment direction. Handling:

- Purpose-built variants: four separate assets — NOT brightness-filter or
  overlay derivations of one another (steering rule).
- Environment only: the shipped assets contain no baked-in UI, text, timers,
  controls, or branding (verified in the review family; the shell renders
  all product UI as DOM).
- No stretching: `object-cover` cropping; intrinsic sizes preserved
  (909×1731 mobile, 1672×941 desktop); focal/central-space emphasis via a
  theme-specific gradient overlay; readability over incidental props.
- Repository-native asset approach: static `public/backstage/workout/*.webp`
  served by root path per `docs/ASSETS.md` (no bundler import, no
  `next/image`, no new dependency; converted with the repo toolchain at q82,
  ≈0.4 MB total). No CSP change needed (`img-src 'self'` already covers).
- Canonicalization status: the reference family is being canonicalized
  through governance separately; this branch records provenance only.
- Responsive family behavior: mobile composition is the base; desktop
  composition engages at ≥768px via `matchMedia` (post-mount, no hydration
  mismatch); crop/positioning adapt — exact prop geometry is not a
  product requirement (steering rule).

## 5. Conformance checks

- 360px contract: single-column stage, full-width CTA, no horizontal
  overflow (covered by `tests/workout-v2-start-reliability.spec.ts`).
- Accessibility: native `<button>` CTAs with focus-visible rings and
  ≥56px touch targets; PREPARING countdown is text (`role="status"`,
  single `aria-live="polite"` region) — never audio-only or motion-only;
  environment layer is `aria-hidden`.
- Reduced motion: stage swap reuses `animate-phase-enter` (transform/opacity
  only), disabled by the existing CSS media query; no animation carries
  essential state; backdrop is a static still image.
- RTL/locale: all copy through `WorkoutV2` messages; fa/en parity asserted
  by unit test; RTL verified by targeted spec (`dir="rtl"`, Persian copy).
- Dark/Light: theme resolved from the existing ThemeProvider (`.dark` class
  architecture untouched); purpose-built Backstage variant per theme.

## 6. Subsequent admitted-slice conformance

The same evidence contract was extended for the admitted WP-08 and WP-12
surfaces. The implementation reused the platform `Button` primitive, the
existing token/theme/RTL stack, native focus semantics, and the existing
orchestration view-model. No parallel kit, hard-coded color system, or second
navigation authority was introduced.

- WP-08: pause/resume, set restart, defer/skip, deferred resolution, and
  outcome summaries are consumer surfaces; all state changes dispatch typed
  orchestration actions. Controls and status summaries are accessible DOM,
  and no presentation component sequences the session.
- WP-12: `WORKOUT_RESULT` renders semantic orchestration-derived counts; the
  exit confirmation is a bounded dialog; confirmation emits the existing
  locale-router navigation intent and cancellation restores the prior context.
- Both locales retain structurally identical `WorkoutV2` message namespaces;
  reduced motion continues to remove only non-essential phase animation.

The complete-flow Owner visual gate remains downstream of program-driven
composition and machine verification.
