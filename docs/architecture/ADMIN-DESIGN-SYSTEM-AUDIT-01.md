# ADMIN-DESIGN-SYSTEM-AUDIT-01 — Admin Console vs Design System

> **STATUS: AUDIT COMPLETE — REMEDIATION NOT AUTHORIZED, NOT IMPLEMENTED**
>
> Task: `BATCH-DELIVERY-AND-ADMIN-AUDIT-01` (Analysis Gate, 2026-09-01).
> Audit scope: determine from the actual repository **why** the Admin
> Console diverged from the main Apex Home Fit Design System and why existing
> shared design infrastructure/components were not reused where appropriate.
> No redesign or implementation was performed.
>
> Backlog authority: `docs/TASKS.md` remains the only executable backlog; the
> tasks proposed in §6 are PROPOSED and require explicit Owner authorization.

## 1. Audit method

Evidence-based comparison of the Admin Console (`src/app/admin`,
`src/components/admin`, `src/lib/admin`) against the shared design
infrastructure (`src/app/globals.css`, `infra/config/tailwind.config.js`,
`src/components/ui/platform`, `src/components/providers`,
`src/components/layout`, `src/lib/ui/muiTheme.ts`) and the canonical
`docs/DESIGN_SYSTEM.md` (v2.1). Both static inspection and Git history
(commit ordering) were used; no runtime screenshots were taken and no code
was changed.

## 2. Shared design system — what exists to be reused

| Layer | Location | Status |
|---|---|---|
| Multi-platform design tokens (Apple HIG + Material 3 + Apex brand + workout states, light/dark) | `src/app/globals.css` (`:root` / `.dark` / `[data-platform='material']`) | **CURRENT** and enforced by `tests/design-system-audit.test.ts` |
| Tailwind token mapping | `infra/config/tailwind.config.js` | **CURRENT** (apex/apple/material colors, fonts, radius, shadows, easing) |
| Component-layer surfaces (`.glass`, `.glass-strong`, `.card-surface`, `.list-row`, `.surface-1..5`, `.input-apple`) | `src/app/globals.css` | **CURRENT**, safelisted |
| Platform UI kit (`Button`, `Card`, `TextField`, `Switch`, `SegmentedControl`, `Checkbox`, `Slider`, `PlatformProvider`) | `src/components/ui/platform` | **CURRENT**; used by consumer app (Library, VideoPlayer, Social, challenges) wiring through `@/components/ui/platform` |
| Theme (light/dark/system + FOUC-free `ThemeScript`) | `src/components/providers/ThemeProvider.tsx` | **CURRENT**; consumed only by `[locale]` layout |
| Platform resolution (`data-platform`, UA detection) | `PlatformProvider`, `lib/platform.ts` | **CURRENT**; consumed only by `[locale]` layout |
| MUI foundation (`@mui/material` 9.3.1 + Emotion, `apexMuiTheme` token bridge) | `package.json`, `src/components/providers/MuiProvider.tsx`, `src/lib/ui/muiTheme.ts` | **CURRENT but unused**: zero `@mui/material` imports outside the provider itself — documented DEBT (DESIGN_SYSTEM.md §3.0 claims MUI as active second foundation) |
| Self-hosted fonts (Inter, Roboto, Vazirmatn) via `next/font/local` | `src/app/[locale]/layout.tsx`, `src/app/fonts/` | **CURRENT** on the consumer layout only |
| RTL/Persian (next-intl, `routing`, per-locale `dir`, Vazirmatn-first font rule) | `src/i18n`, `src/app/[locale]/layout.tsx`, `src/messages`, `globals.css` | **CURRENT** on the consumer app only |
| PWA icons/favicon metadata, manifest, OG/JSON-LD | `src/app/[locale]/layout.tsx`, `public/icons`, `public/manifest.json` | **CURRENT** on the consumer layout only |

## 3. Admin Console — what exists today

- **Structure:** dedicated root layout `src/app/admin/layout.tsx`
  (`<html lang="en" dir="ltr">`, `bg-apex-surface`, imports `globals.css`)
  and protected layout `src/app/admin/(protected)/layout.tsx` (header +
  `AdminNav` + `AdminLogoutButton`). Surfaces: Overview, Users, Workout
  Plans, Exercises, Operations, Admin/Sessions.
- **Components:** only `AdminNav.tsx` and `AdminLogoutButton.tsx` live in
  `src/components/admin`. All page layouts are inline Tailwind in Server
  Components (stat cards, section cards, tables).
- **Data:** read-only projections from `src/lib/admin/console.ts` behind
  `requireAdmin()` (safe; no credential columns).
- **Shared infrastructure actually reused:** only the **token layer**
  (`bg-apex-*`, `text-apex-*`, `border-apex-*`, `shadow-apple-sm`,
  `.input-apple`) from `globals.css`/tailwind config. Nothing else.

## 4. Axis-by-axis comparison (evidence)

| Axis | Shared design system (consumer app) | Admin Console today | Divergence |
|---|---|---|---|
| **Design tokens** | Full apex/apple/material token set, light+dark | Apex neutrals + primary + alert-text tokens only; no `apple-*`/`material-*`, no state tokens | Partial reuse — no wrong-token usage found (tokens are the shared glue), but a narrow subset |
| **Components** | `ui/platform` kit consumed by Library/VideoPlayer/Social | **Zero imports** of `@/components/ui/platform` anywhere under `src/app/admin` (grep-verified) | Full divergence — duplicated card/stat/pill/table markup per page instead of shared primitives |
| **Typography** | Inter/Roboto/Vazirmatn via `next/font` vars on `<body>`; HIG tracking rules | No font variables on admin `<body>` (falls back to stack order; `--font-inter` etc. undefined); no `tracking-[0.12em]`-style discipline beyond manual classes | Font infrastructure missing; visual type stack still acceptable but degraded (system fallbacks) |
| **Colors/themes** | Light + dark via `.dark` + `ThemeProvider`/`ThemeScript` | Light only; no `ThemeScript`/`ThemeProvider` in admin root; no `dark:` variants; `color-scheme` never set | **No Dark Mode in Admin** |
| **Spacing/layout** | Design-system grid/touch-target idioms (44/48px), `AppShell` responsive shells | Manual `px-5 py-8`, `max-w-6xl`, `grid-cols-2…lg:grid-cols-4`; desktop-first back-office layout | Acceptable variation in substance; duplicated conventions instead of shared layout primitives |
| **Navigation patterns** | Responsive Sidebar/Bottom Nav via `AppShell` (consumer) | Custom `AdminNav` pill tabs (flex wrap) | Intentionally different pattern (back-office tabs) — **justified admin-specific**, but the styling duplicates kit styling manually |
| **Surfaces/cards** | `.card-surface`, `.glass`, `.surface-1..5` | `rounded-2xl/3xl border bg-apex-card shadow-apple-sm` repeated inline in 6+ files | Divergence — repeated literal markup; could consume shared surface primitives/Card |
| **Forms** | `TextField`/`Switch`/`SegmentedControl`/`Slider` kit components; `.input-apple` | Raw `<input>` + `.input-apple` on `/admin/login`; no kit components anywhere | Divergence — kit `TextField` exists and would fit |
| **Tables** | No shared table primitive exists (consumer app has no admin tables) | Inline `<table>` markup duplicated across Users/Operations/Exercises/Sessions pages | **Genuine gap in the shared system**: no shared Table/DataTable primitive; justified admin-specific, but should become a shared-admin primitive |
| **Responsive behavior** | 360px min viewport verified; responsive-layout spec | `overflow-x-auto` tables with `min-w-[760px]`; grids collapse; no admin-specific responsive spec | Partial — functional but unverified against the 360px contract; no browser coverage |
| **Dark Mode** | ThemeProvider + ThemeScript + `.dark` tokens | Absent entirely (see Colors/themes) | **Gap** |
| **Persian localization** | next-intl, `src/messages` en/fa, per-locale metadata | Hard-coded English strings; no `next-intl`; `lang="en"` fixed | **Gap** — admin is a back-office tool; full fa parity may be intentionally lower priority (see causes) |
| **RTL** | `dir` per locale, mirrored icons, Vazirmatn-first | `dir="ltr"` fixed; no RTL consideration in markup (e.g. `text-right` columns assume LTR) | **Gap** — structural (root layout), not incidental |
| **Loading states** | Suspense skeletons (History/Analytics) | None — server components block on data fetch; no `loading.tsx` anywhere in `src/app` | **Gap** — no loading boundary for slow admin queries |
| **Empty states** | Consumer empty states inside specific features | Inline `No users yet.` / `No operations yet.` `<p>` in one branch per list; no shared EmptyState component | Partial — exists but inconsistent, unstyled as a state, duplicated |
| **Error states** | Consumer error handling (MonitoringProvider, localized messages) | No `error.tsx` in `src/app` at all; login page handles its own fetch error inline; data pages have no error boundary | **Gap** — no global/route error boundary; a failed query renders a 500 with no admin UI |
| **Accessibility** | Focus rings (`--apex-focus-ring`), aria spec (`tests/accessibility-aria.spec.ts`, `keyboard-focus.spec.ts`), contrast tests (`quiz-contrast.spec.ts`) | `aria-current` on nav, `role="alert"` on login error, `aria-label` on nav — good basics; but: tables have no `<caption>`/`scope`, focus-visible styling is not applied on admin links/buttons, no admin a11y coverage in the shared specs | Partial — basics present; systematic a11y pass missing |
| **Favicon / cosmetic debt** | Icons metadata in locale layout (`public/icons/…`), manifest, theme-color | Admin root layout defines **no metadata at all** (no `Metadata`, no icons, no title) — admin pages render the Next.js default favicon/title | **Gap** — admin has default Next favicon and untitled browser tab; no admin-brand icon |

## 5. Root Cause Analysis

### 5.1 Why the Admin Console diverged — root causes (evidence-based)

**R1 — Architectural: separate app root outside the provider stack (primary
cause).**
`src/app/admin/layout.tsx` is a second root layout that mounts without the
`[locale]` layout's provider cluster: `ThemeScript`/`ThemeProvider`,
`PlatformProvider`, `MuiProvider`, `NextIntlClientProvider`, font variables,
and PWA/monitoring providers. Every shared capability that lives in that
cluster (dark mode, platform resolution, i18n, MUI theme, fonts) is
structurally unavailable to `/admin/*` unless deliberately re-wired. The
platform kit components *would* work without the provider (they self-detect
to `web`), so R1 explains dark mode/fonts/i18n gaps — not the kit gap (R2).

**R2 — Implementation: ADMIN-CONSOLE-01 was built Server-Component-first
with flat Tailwind, and shared primitives were not considered at review
time.**
Git history shows the multi-platform design system (`5461198`) and theme
infrastructure (`5b8a693`) long predate Admin Console (`fe2dd8d`), so the
kit was available. The console was implemented as pure Server Components
with inline utility classes and one-off components (`Stat` function, inline
section/tables) — the same card/table/stat patterns were copy-pasted across
six pages instead of extracting primitives. No acceptance criterion in
`ADMIN-CONSOLE-01` referenced the UI kit, dark mode, i18n, or design-system
conformance, so the implementation met its acceptance without them.

**R3 — Task-specification/governance: bounded scope + security-first framing
crowded out design-system goals.**
The task delta for `ADMIN-CONSOLE-01` bounded scope around real data,
safe projections, and server-side authorization ("Every surface uses only
current Prisma schema… services/routes that actually exist"). Visual
conformance, dark mode, and fa parity were never in the acceptance set.
Exclusions in related tasks (`AUTONOMOUS-PROD-OPS-01`) explicitly ruled out
"Admin Console feature code", keeping the console out of other lifecycles.
Result: correctness-first delivery with design-system debt accepted
implicitly at gate.

**R4 — Governance/documentation: DESIGN_SYSTEM.md is consumer-app-facing and
its own MUI claim is stale.**
`DESIGN_SYSTEM.md` describes a product UI system for the PWA consumer
journey (workouts, RTL/Persian, platform idioms); nothing in it speaks to
back-office surfaces. Separately, §3.0 claims MUI 9.3.1 is an active second
foundation, but zero MUI components exist in `src` — so an implementer
consulting the doc cannot rely on "consume MUI first" (it is unused
everywhere, admin included). The doc's foundation statements are DEBT/UNKNOWN
relative to code.

**R5 — Intentional differences (legitimate):**
- Back-office navigation (tab strip) vs consumer Sidebar/Bottom Nav — a
  different job; not a defect.
- Read-only, dense table-first surfaces vs consumer card-first content —
  appropriate for an operations tool.- English-only, LTR for the internal ops tool was a plausible product
  framing, but the owner decision (2026-09-01) resolves it as a GAP: fa/RTL
  is REQUIRED remediation (`ADMIN-DS-05`) sequenced after foundational
  work — not an accepted stay-as-is decision.
- Flat solid surfaces instead of consumer glassmorphism — quieter, more
  legible for dense data; acceptable style choice, but unrecorded.

### 5.2 Components/tokens: shared vs admin-specific

**Should be shared (and are not):**
- Dark-mode plumbing (ThemeScript/ThemeProvider) on the admin root layout —
  or an explicit recorded decision that admin is light-only.
- Font variable wiring (Inter/Roboto/Vazirmatn) on admin `<body>`.
- Platform kit `Button`, `TextField`, focus-ring utilities, surface/card
  primitives — where admin markup maps 1:1 (login button/inputs, pill
  buttons, cards).
- Global route boundaries: `error.tsx`, `loading.tsx`, `not-found.tsx`
  (these do not exist anywhere; the shared system lacks them for admin).
- Metadata/favicon linkage (small, admin-branded).

**Should remain Admin-specific:**
- Table/DataTable primitive (no shared counterpart exists in the consumer
  kit; creating one belongs in the admin component area first, promotable
  later).
- `AdminNav`, `AdminLogoutButton`, page sections, stat tiles — domain UI;
  may consume shared tokens/primitives but stay admin-owned.
- Any impersonation or RBAC-related admin UI (deferred; see
  `docs/ADMIN_IMPERSONATION_01.md`).

**Token layer:** already shared (apex tokens consumed by admin) — keep; do
not move admin to a separate token namespace.

### 5.3 Dark Mode / Persian / RTL findings

- **Dark Mode:** fully supported at the token level (`.dark` redefines all
  apex/apple/material variables) and proven in the consumer app; admin never
  joins it because the admin root layout lacks `ThemeScript` +
  `ThemeProvider` and admin utility classes never use `dark:` variants.
  Existing admin markup is ~100% token-based, so dark mode is
  **low-effort/low-risk** once the provider stack exists on the admin root.
- **Persian/RTL:** consumer app has full next-intl en/fa + RTL + Vazirmatn.
  Admin is hard-coded `en`/`ltr` with hard-coded English copy and
  LTR-assuming markup (`text-right` alignment, tracking). Admin fa parity is
  a **larger** task (copy extraction into messages, dir handling, RTL table
  alignment, fa tests). **Owner decision 2026-09-01: REQUIRED remediation**
  (`ADMIN-DS-05`), sequenced after the foundational batch because it depends
  on the admin root-layout wiring (ADMIN-DS-01) and benefits from the
  primitives/kit work (ADMIN-DS-02/03).

### 5.4 Accessibility / state-consistency findings

- Present: `aria-current` (nav), `role="alert"` (login), `min-h-12` login
  button (44px touch), `aria-label` on nav landmark.
- Missing: table `<caption>`/`scope`; focus-visible rings on admin nav
  links/stat actions; `error.tsx`/`loading.tsx`; shared empty-state
  component; admin coverage in `accessibility-aria.spec.ts` /
  `keyboard-focus.spec.ts`.
- No `not-found.tsx` anywhere; default Next 404 for admin typos.

### 5.5 Cosmetic debt

- Next.js default favicon + generic page title on `/admin/*` (no metadata
  in admin root).
- Repeated literal section/card/stat/table markup across six pages (single
  source of drift).
- `shadow-apple-sm` on cards while consumer surfaces use `.card-surface`/
  `.surface-*` (cosmetic inconsistency in elevation language).

## 6. Gap Matrix

| # | Gap | Severity | Where fixed | Effort | Blocks anything? |
|---|---|---|---|---|---|
| G1 | No admin dark mode (provider stack missing on admin root) | High (product parity) | `src/app/admin/layout.tsx` | S | No |
| G2 | Shared platform kit not reused (Button/TextField/Card/surfaces) | Medium (maintainability) | admin login/nav + primitives | S–M | No |
| G3 | No shared admin primitives (Section/Stat/Table/EmptyState) — copy-paste drift | Medium (maintainability) | `src/components/admin` (new) | S–M | No |
| G4 | No loading/error/not-found boundaries for admin | High (UX/ops) | new `loading.tsx`/`error.tsx`/`not-found.tsx` (app-wide gap) | S | No |
| G5 | No admin a11y pass (tables, focus, spec coverage) | Medium (a11y) | admin pages + shared specs | S–M | No |
| G6 | No admin metadata/favicon (default Next favicon, untitled) | Low (cosmetic) | admin root layout | XS | No |
| G7 | Fonts not wired into admin body | Low (typography) | admin root layout | XS | No |
| G8 | No Persian/RTL in admin (hard-coded en/ltr) | Medium (REQUIRED remediation — owner decision 2026-09-01; NOT deferred) | admin layout + i18n + messages | M–L | No (sequenced after foundational work as ADMIN-DS-05) |
| G9 | DESIGN_SYSTEM.md MUI foundation claim stale (0 usages) | Low (doc drift) | DESIGN_SYSTEM.md + optional MUI decision | XS–S | No |
| G10 | Empty states inconsistent/unstyled | Low | shared EmptyState in G3 | S | No |

## 7. Remediation Plan (PROPOSED — not implemented)

0. **Owner decisions (2026-09-01, recorded):** Batch Delivery V1 + first
   batch authorization still pending final Owner review; admin fa/RTL is
   **REQUIRED remediation** sequenced after the foundational batch
   (ADMIN-DS-05); **KIT-FIRST adopted** as the current Admin UI rule — reuse
   the existing Apex platform kit first; MUI must NOT become a second
   competing design foundation unless a concrete unmet requirement is
   documented; `DESIGN_SYSTEM.md` §3.0 amended locally (uncommitted) to
   match code evidence, promoted with ADMIN-DS-06.
1. **Phase A — Admin foundation (G1, G6, G7):** wire `ThemeScript`+
   `ThemeProvider` (default `light`; optional UI to switch), font variables,
   metadata/icons into the admin root layout. Dark mode then works with zero
   page rewrites because tokens flip automatically; add `dark:` verification
   screenshot/browser check.
2. **Phase B — Admin primitives (G3, G10):** extract `AdminPageSection`,
   `AdminStat`, `AdminTable`, `AdminEmptyState`, `AdminBadge` into
   `src/components/admin` (tokens-only, no platform dependency), refactor
   six pages to consume them (behavior-neutral).
3. **Phase C — Kit adoption + a11y/state boundaries (G2, G4, G5):** reuse
   kit `Button`/`TextField` where admin mapping is 1:1; add
   `loading.tsx`/`error.tsx`/`not-found.tsx`; table captions/scope, focus
   rings; extend `accessibility-aria.spec.ts` + new `admin-console` browser
   coverage (dark mode, loading, empty, error, 360px).
4. **Phase D — fa/RTL (G8, REQUIRED remediation — ADMIN-DS-05):** move
   admin copy to `next-intl` messages, dir switching, RTL table alignment,
   EN/FA parity spec. Sequencing: after ADMIN-DS-01 provider/layout wiring
   and the ADMIN-DS-02/03 primitives it should consume.
5. **Phase E — Doc reconciliation (G9):** correct `DESIGN_SYSTEM.md` §3.0
   (MUI status: wired but unused) and record the admin design contract in a
   canonical admin doc (or in DESIGN_SYSTEM.md scope notes).

## 8. Proposed executable task decomposition (PROPOSED — requires owner authorization in docs/TASKS.md)

### First Batch Delivery V1 batch (4 members — unchanged after post-audit rationalization; ADMIN-DS-05 and MOBILE-READINESS-01 are intentionally NOT forced into Batch 1)

| Field | ADMIN-DS-01 | ADMIN-DS-02 | ADMIN-DS-03 | ADMIN-DS-04 |
|---|---|---|---|---|
| Title | Admin foundation: dark mode, fonts, metadata/favicon | Admin shared primitives (Section/Stat/Table/EmptyState/Badge) | Platform-kit adoption for admin controls (login, nav, logout) | Admin state boundaries + accessibility pass |
| TASK_ID | ADMIN-DS-01 | ADMIN-DS-02 | ADMIN-DS-03 | ADMIN-DS-04 |
| EXECUTION_CLASS | ISOLATED | PARALLEL_SAFE | PARALLEL_SAFE | PARALLEL_SAFE |
| DEPENDENCIES | None (root layout only) | None (new files only) | None (kit exists; login/nav/logout files) | None (pages + new boundary files) |
| ISOLATION_REQUIREMENT | Own worktree/branch; touches only `src/app/admin/layout.tsx` (+ metadata) | Own worktree/branch; only new files under `src/components/admin` | Own worktree/branch; only `src/app/admin/login/page.tsx`, `src/components/admin/AdminNav.tsx`, `AdminLogoutButton.tsx` | Own worktree/branch; admin pages + new `loading/error/not-found` files + shared a11y specs |
| VALIDATION_REQUIREMENT | typecheck, lint, build, dark-mode + favicon browser check (admin spec) | typecheck, lint, unit smoke, build | typecheck, lint, build, login browser spec | typecheck, lint, build, a11y/keyboard spec, admin browser spec |
| PRODUCTION_IMPACT | Admin-only; new visual capability; no public/auth/schema change (`DB_CHANGED=NO`) | Admin-only; behavior-neutral refactor | Admin-only; visual-only | Admin-only; error/loading UX only |
| WHY_BATCHABLE | Admin-only, disjoint file set, independent validation, one shared release path | Same | Same | Same |

Batch integration order: ADMIN-DS-02 → ADMIN-DS-01 → ADMIN-DS-03 →
ADMIN-DS-04 (integration branch), then ONE branch CI + ONE PR/Main CI + ONE
Production release via the Deployment Gateway (per `docs/BATCH_DELIVERY_V1.md`).
A member failure quarantines only that member; the rest still release.

### After Batch 1 (proposed sequencing)

- `MOBILE-READINESS-01` — mobile-lock-in architecture AUDIT (docs-only
  output; no app code). See [`MOBILE-READINESS-01.md`](MOBILE-READINESS-01.md).
- Batch 2 candidate — `ADMIN-DS-05` (fa/RTL, REQUIRED remediation,
  SEQUENTIAL after ADMIN-DS-01/02/03) + `ADMIN-DS-06` (KIT-FIRST decision
  record + DESIGN_SYSTEM.md §3.0 reconciliation, DOCS_ONLY member that
  supports the code change).
- `ADMIN-IMPERSONATION-01` — DEFERRED / NOT AUTHORIZED (see dedicated doc).

### Control rule — KIT-FIRST (owner decision 2026-09-01)

For ALL new Admin UI (and consumer UI unless a recorded exception exists):
reuse the shared Apex design system / `src/components/ui/platform` kit and
shared primitives FIRST (`reuse → extend → compose → create`). MUI is wired
but unused; it must not become a second competing design foundation. MUI may
be used only when a concrete, documented requirement cannot be met by the
kit, and that decision must be recorded before use.

## 9. Compliance notes

- Audit only; zero source files modified by this audit.
- No commits, pushes, PRs, CI, merges, or releases performed.
- All proposed artifacts remain LOCAL and UNCOMMITTED until Owner review.
- Admin security boundary observations (safe projections, `requireAdmin()`,
  no new admin API) are consistent with `docs/ADMIN_AUTH.md`; nothing in
  this audit weakens them.