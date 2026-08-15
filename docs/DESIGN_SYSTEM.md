# Apex Home Fitness — Design System

> **Version:** 1.0 · **Status:** Active · **Last updated:** 2026-08-15
>
> Single source of truth for brand tokens: color, typography, spacing, and workout
> state colors. Tokens are defined as CSS custom properties (light + dark) and
> consumed through Tailwind utilities in this repo (`src/app/globals.css`,
> `tailwind.config.js`). The same token values map 1:1 to iOS (Swift/SwiftUI) and
> Android (Kotlin/Compose) consumers.

## 1. Platform & Scope

| Platform | Font Family | Grid / Spacing | Dark Mode |
|---|---|---|---|
| iOS (native) | SF Pro (Display / Text / Rounded) | Apple HIG · 8 pt grid | System appearance |
| Android (native) | Roboto | Material 3 · 8 dp grid | System theme |
| Web (this repo, Next.js) | Inter + SF Pro system stack fallback | Apple HIG · 8 px grid | Class-based (`.dark` on `<html>`) |

Brand voice: **energetic, precise, trustworthy.** The coral-orange primary conveys
effort and intensity; neutral surfaces stay calm and Apple-like; state colors carry
the workout rhythm (idle → start → rest → success / alert).

---

## 2. Color Palette

### 2.1 Brand Primary — Coral / Orange `#FF4500`

The single brand accent. Use it for primary actions, the active exercise phase,
progress highlights, and brand moments. Never re-tint it — use the `soft` variant
for tinted surfaces instead.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--apex-primary` | `#FF4500` | `#FF6B3D` | Primary fill (buttons, active phase, focus) |
| `--apex-primary-hover` | `#E63E00` | `#FF7F57` | Hover state (web) |
| `--apex-primary-active` | `#CC3800` | `#E65C2E` | Pressed / selected state |
| `--apex-on-primary` | `#FFFFFF` | `#1C1C1E` | Text/icon on primary fill (see §2.4) |
| `--apex-primary-text` | `#D93D00` | `#FF8A5C` | Accessible primary text on neutral bg (links, body) |
| `--apex-primary-soft` | `rgba(255, 69, 0, 0.10)` | `rgba(255, 107, 61, 0.16)` | Tinted chip / selected row background |
| `--apex-primary-soft-strong` | `rgba(255, 69, 0, 0.18)` | `rgba(255, 107, 61, 0.28)` | Selected chip border/background, strong tint |
| `--apex-focus-ring` | `rgba(255, 69, 0, 0.35)` | `rgba(255, 107, 61, 0.45)` | Focus outline (a11y) |

**Brand gradient** (hero moments, empty states, progress arcs):

```css
--apex-gradient-brand: linear-gradient(135deg, #FF4500 0%, #FF9500 100%);
```

### 2.2 Neutrals

Two views of the neutral scale: a **numerical ramp** (charts, diagrams, grayscale
illustrations) and **semantic tokens** (surfaces, text, borders). Semantic tokens
mirror Apple HIG system colors already in `globals.css`.

**Neutral ramp**

| Token | Light | Dark | | Token | Light | Dark |
|---|---|---|---|---|---|---|
| `--apex-neutral-50` | `#F9F9FB` | `#1C1C1E` | | `--apex-neutral-600` | `#8E8E93` | `#AEAEB2` |
| `--apex-neutral-100` | `#F2F2F7` | `#2C2C2E` | | `--apex-neutral-700` | `#636366` | `#C7C7CC` |
| `--apex-neutral-200` | `#E5E5EA` | `#3A3A3C` | | `--apex-neutral-800` | `#48484A` | `#D1D1D6` |
| `--apex-neutral-300` | `#D1D1D6` | `#48484A` | | `--apex-neutral-900` | `#3A3A3C` | `#E5E5EA` |
| `--apex-neutral-400` | `#C7C7CC` | `#636366` | | `--apex-neutral-950` | `#1C1C1E` | `#F2F2F7` |
| `--apex-neutral-500` | `#AEAEB2` | `#8E8E93` | | | | |

**Semantic neutrals**

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--apex-bg` | `#FFFFFF` | `#000000` | App background |
| `--apex-bg-secondary` | `#F2F2F7` | `#1C1C1E` | Grouped / section background (iOS Settings style) |
| `--apex-surface` | `#FFFFFF` | `#1C1C1E` | Card / sheet surface |
| `--apex-surface-raised` | `#FFFFFF` | `#2C2C2E` | Raised surface (modals, popovers) |
| `--apex-text` | `#000000` | `#FFFFFF` | Primary label |
| `--apex-text-secondary` | `rgba(60, 60, 67, 0.60)` | `rgba(235, 235, 245, 0.60)` | Secondary label |
| `--apex-text-tertiary` | `rgba(60, 60, 67, 0.30)` | `rgba(235, 235, 245, 0.30)` | Tertiary label / hints |
| `--apex-text-disabled` | `rgba(60, 60, 67, 0.18)` | `rgba(235, 235, 245, 0.18)` | Disabled content |
| `--apex-border` | `rgba(60, 60, 67, 0.29)` | `rgba(84, 84, 88, 0.60)` | Separators, hairline borders |
| `--apex-fill` | `rgba(120, 120, 128, 0.20)` | `rgba(120, 120, 128, 0.36)` | Neutral fill (chips, inputs) |

### 2.3 Color usage rules

- **Primary fill** → only for the single most important action on a screen.
- **`primary-soft`** → selected states, active exercise background, tags. Never pair
  `primary-soft` with `primary-text` at body size (insufficient separation).
- **Neutrals** → everything else. Keep color usage under ~10 % of any screen.
- **Gradient** → hero/empty-state accents only; never on text.

### 2.4 Accessibility & contrast

Measured against WCAG 2.1 AA (verified 2026-08-15):

| Pairing | Ratio | Verdict |
|---|---|---|
| White on `#FF4500` (light primary fill) | 3.44 : 1 | ✅ AA Large / UI components (3:1) — buttons, icons; ⚠️ not body text |
| `#D93D00` on white (`--apex-primary-text`) | 4.55 : 1 | ✅ AA body text |
| `#1C1C1E` on `#FF6B3D` (dark primary fill) | 6.02 : 1 | ✅ AA body text |
| `#FF8A5C` on `#1C1C1E` (dark `primary-text`) | 7.33 : 1 | ✅ AA body text |
| `#1C1C1E` on `#FF9F0A` (dark rest fill) | 8.28 : 1 | ✅ AA body text |
| `#FFFFFF` on `#FF3B30` (alert fill) | 3.55 : 1 | ✅ AA Large / UI components |
| `#D70015` on white (`--apex-state-alert-text`) | 5.38 : 1 | ✅ AA body text |

Rules:

1. Button labels ≤ 16 px on a **light-mode primary fill** must use a darker fill
   (`--apex-primary-active`) or move the label to `--apex-primary-text` styling.
2. In **dark mode**, primary/rest/success fills take **dark text** (`#1C1C1E`) —
   the semantic `--apex-on-*` tokens already resolve to the accessible choice.
3. Every interactive element needs a visible focus ring (`--apex-focus-ring`,
   offset 2 px) in addition to color.

---

## 3. Typography

### 3.1 Font families

| Context | Stack (first match wins) |
|---|---|
| iOS | SF Pro Text (body) · SF Pro Display (headings) · SF Pro Rounded (brand/health elements, badges, timers) |
| Android | Roboto (incl. `Roboto Mono` for numerals) |
| Web / Desktop | Inter (primary), Roboto fallback, then SF Pro system stack |
| RTL (Persian) | Vazirmatn → IRANSansX → Tahoma (must always follow Latin stack) |

```css
--apex-font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
  "SF Pro Rounded", "Helvetica Neue", Inter, Roboto, "Segoe UI", Vazirmatn,
  IRANSansX, Tahoma, sans-serif;
--apex-font-rounded: "SF Pro Rounded", -apple-system, BlinkMacSystemFont,
  "SF Pro Display", "SF Pro Text", Inter, Roboto, Vazirmatn, IRANSansX, Tahoma, sans-serif;
--apex-font-mono: "SF Mono", ui-monospace, SFMono-Regular, Menlo, Monaco,
  Consolas, "Roboto Mono", monospace;
```

### 3.2 Weights

| Token | Weight | Usage |
|---|---|---|
| `--apex-font-weight-regular` | 400 | Body, captions |
| `--apex-font-weight-medium` | 500 | Controls, tab labels |
| `--apex-font-weight-semibold` | 600 | Headlines, button labels |
| `--apex-font-weight-bold` | 700 | Large titles, emphasis |

### 3.3 Type scale (Apple HIG, Material 3 mapping)

Base size 16 px (1 rem). Display text uses negative tracking; body uses `0`.

| Style | Size (px / rem) | Line-height | Tracking | Weight | Material 3 map | Usage |
|---|---|---|---|---|---|---|
| Large Title | 34 / 2.125 | 41 / 2.5625 | −0.02em | 700 | Display Small | Screen hero, workout name |
| Title 1 | 28 / 1.75 | 34 / 2.125 | −0.02em | 700 | Headline Large | Primary section headers |
| Title 2 | 22 / 1.375 | 28 / 1.75 | −0.02em | 600 | Title Large | Card titles, modal headers |
| Title 3 | 20 / 1.25 | 25 / 1.5625 | −0.02em | 600 | Headline Medium | Sub-section headers |
| Headline | 17 / 1.0625 | 22 / 1.375 | −0.01em | 600 | Title Medium | Emphasized body, list titles |
| Body | 17 / 1.0625 | 22 / 1.375 | 0 | 400 | Body Large | Default reading text |
| Callout | 16 / 1 | 21 / 1.3125 | 0 | 400 | Body Large | Supplementary text, timers |
| Subheadline | 15 / 0.9375 | 20 / 1.25 | 0 | 400 | Body Medium | Secondary lists, meta |
| Footnote | 13 / 0.8125 | 18 / 1.125 | 0 | 400 | Body Small | Legal, helper text |
| Caption 1 | 12 / 0.75 | 16 / 1 | 0 | 400 | Label Medium | Tags, badges, captions |
| Caption 2 | 11 / 0.6875 | 13 / 0.8125 | 0 | 400 | Label Small | Micro-labels, timestamps |

### 3.4 Typography rules

- Numerals in timers/countdowns: use `font-variant-numeric: tabular-nums` so digits
  don't jump (mono variant for big timer digits, e.g. Large Title + mono).
- Headings: `letter-spacing: -0.02em` (already applied in `globals.css` `h1–h6`).
- Always render with `-webkit-font-smoothing: antialiased` on web.
- Minimum touch/reading size: **11 px** (Caption 2); never smaller.
- Persian/RTL: reverse tracking sign, keep Vazirmatn in stack (see `tailwind.config.js`).

---

## 4. Spacing

### 4.1 Base unit & scale

Base unit = **4 px / 4 pt / 4 dp** (Apple's 8 pt grid and Material's 8 dp grid both
subdivide into 4; use only even multiples of 8 for layout rhythm, 4 only for
micro-corrections). All spacing tokens are multiples of the base unit.

| Token | px / pt / dp | rem | Typical use |
|---|---|---|---|
| `--apex-space-0` | 0 | 0 | None |
| `--apex-space-1` | 2 | 0.125 | Icon-to-text micro gap (never layout) |
| `--apex-space-2` | 4 | 0.25 | Micro gaps, chip padding (tight) |
| `--apex-space-3` | 8 | 0.5 | Default inner padding, gap between related items |
| `--apex-space-4` | 12 | 0.75 | Card internal padding (tight), list gaps |
| `--apex-space-5` | 16 | 1 | **Default screen margin (mobile)** |
| `--apex-space-6` | 20 | 1.25 | Screen margin (tablet/desktop), card padding |
| `--apex-space-7` | 24 | 1.5 | Section gaps, modal padding |
| `--apex-space-8` | 32 | 2 | Large section separation |
| `--apex-space-9` | 40 | 2.5 | Screen-level padding (settings) |
| `--apex-space-10` | 48 | 3 | Hero / empty-state spacing |
| `--apex-space-11` | 56 | 3.5 | Major block separation |
| `--apex-space-12` | 64 | 4 | Page-level gutters (desktop) |
| `--apex-space-16` | 80 | 5 | Oversized separations (rare) |
| `--apex-space-24` | 96 | 6 | Full-screen breathing room |

```css
--apex-space-0: 0;        --apex-space-1: 0.125rem;  --apex-space-2: 0.25rem;
--apex-space-3: 0.5rem;   --apex-space-4: 0.75rem;   --apex-space-5: 1rem;
--apex-space-6: 1.25rem;  --apex-space-7: 1.5rem;    --apex-space-8: 2rem;
--apex-space-9: 2.5rem;   --apex-space-10: 3rem;     --apex-space-11: 3.5rem;
--apex-space-12: 4rem;    --apex-space-16: 5rem;     --apex-space-24: 6rem;
```

### 4.2 Apple (HIG) spacing rules

- Screen margins: **16 pt** (iPhone) · **20 pt** (iPad).
- Grouped list inset: 20 pt sides, 16 pt top/bottom; rows 44 pt min height.
- Controls: min touch target **44 × 44 pt**; inline buttons 44 pt high.
- Cards: 16 pt padding, 16 pt corner radius, 12 pt gap between cards.
- Between distinct content groups: 24 pt.

### 4.3 Material (3) spacing rules

- Screen margins: **16 dp** (8 dp on tablet for content columns).
- Component heights: buttons **40 dp**, text fields **56 dp** (dense 48 dp),
  list rows **56 dp** (dense 40 dp).
- Touch target: **48 × 48 dp** minimum (44 dp absolute floor).
- Section spacing: 24 dp between groups, 8 dp between related items.

### 4.4 Radii, heights, motion

Continuous corner scale (Apple HIG) — used for all surfaces:

```css
--apex-radius-sm: 0.5rem;    /* 8 pt  — chips, inputs, small badges */
--apex-radius-md: 0.625rem;  /* 10 pt — controls, segmented controls */
--apex-radius-lg: 0.75rem;   /* 12 pt — buttons, cards (tight) */
--apex-radius-xl: 1rem;      /* 16 pt — default cards, sheets (mobile) */
--apex-radius-2xl: 1.25rem;  /* 20 pt — cards (tablet/desktop), sheets */
--apex-radius-3xl: 1.5rem;   /* 24 pt — large modals, hero panels */
--apex-radius-full: 9999px;  /* pills, circular avatars */
--apex-control-height: 2.75rem; /* 44 px — standard button/input height */
--apex-control-height-sm: 2.25rem; /* 36 px — compact controls */
```

Motion: `cubic-bezier(0.25, 0.1, 0.25, 1)` (Apple standard ease); 200 ms default
transitions; respect `prefers-reduced-motion` (already wired in `globals.css`).

---

## 5. State Colors

Semantic workout states drive the timer ring, phase banner, and action buttons.
Each state ships fill, on-fill text, soft background, border, and (where needed)
an accessible text color.

| State | Meaning | Fill (light) | On (light) | Soft / border (light) | Fill (dark) | On (dark) | Soft / border (dark) |
|---|---|---|---|---|---|---|---|
| **Idle** | Waiting, default, paused | `#8E8E93` | `#FFFFFF` | `rgba(142,142,147,0.16)` / `#C7C7CC` | `#8E8E93` | `#FFFFFF` | `rgba(142,142,147,0.24)` / `#48484A` |
| **Start** | Exercise active, set in progress | `#FF4500` | `#FFFFFF` | `rgba(255,69,0,0.10)` / `rgba(255,69,0,0.35)` | `#FF6B3D` | `#1C1C1E` | `rgba(255,107,61,0.16)` / `rgba(255,107,61,0.40)` |
| **Rest** | Rest between sets, cooldown | `#FF9500` | `#1C1C1E` | `rgba(255,149,0,0.12)` / `rgba(255,149,0,0.35)` | `#FF9F0A` | `#1C1C1E` | `rgba(255,159,10,0.18)` / `rgba(255,159,10,0.40)` |
| **Success** | Set completed, goal hit, positive | `#34C759` | `#1C1C1E` | `rgba(52,199,89,0.12)` / `rgba(52,199,89,0.35)` | `#30D158` | `#1C1C1E` | `rgba(48,209,88,0.16)` / `rgba(48,209,88,0.40)` |
| **Alert** | Error, missed set, injury flag, expiry | `#FF3B30` | `#FFFFFF` | `rgba(255,59,48,0.12)` / `rgba(255,59,48,0.40)` | `#FF453A` | `#FFFFFF` | `rgba(255,69,58,0.18)` / `rgba(255,69,58,0.45)` |

CSS variables (`--apex-state-*`):

```css
/* Light */
--apex-state-idle: #8E8E93;            --apex-state-idle-soft: rgba(142, 142, 147, 0.16);
--apex-state-start: #FF4500;           --apex-state-start-soft: rgba(255, 69, 0, 0.10);
--apex-state-start-border: rgba(255, 69, 0, 0.35);
--apex-state-rest: #FF9500;            --apex-state-rest-soft: rgba(255, 149, 0, 0.12);
--apex-state-rest-border: rgba(255, 149, 0, 0.35);
--apex-state-success: #34C759;         --apex-state-success-soft: rgba(52, 199, 89, 0.12);
--apex-state-success-border: rgba(52, 199, 89, 0.35);
--apex-state-alert: #FF3B30;           --apex-state-alert-soft: rgba(255, 59, 48, 0.12);
--apex-state-alert-border: rgba(255, 59, 48, 0.40);
--apex-state-alert-text: #D70015;      /* accessible alert text on light bg */

/* Dark */
--apex-state-idle: #8E8E93;            --apex-state-idle-soft: rgba(142, 142, 147, 0.24);
--apex-state-start: #FF6B3D;           --apex-state-start-soft: rgba(255, 107, 61, 0.16);
--apex-state-start-border: rgba(255, 107, 61, 0.40);
--apex-state-rest: #FF9F0A;            --apex-state-rest-soft: rgba(255, 159, 10, 0.18);
--apex-state-rest-border: rgba(255, 159, 10, 0.40);
--apex-state-success: #30D158;         --apex-state-success-soft: rgba(48, 209, 88, 0.16);
--apex-state-success-border: rgba(48, 209, 88, 0.40);
--apex-state-alert: #FF453A;           --apex-state-alert-soft: rgba(255, 69, 58, 0.18);
--apex-state-alert-border: rgba(255, 69, 58, 0.45);
--apex-state-alert-text: #FF6961;      /* accessible alert text on dark bg */
```

State semantics in the app:

- **Idle** — paused timer, disabled buttons, "before workout" banner.
- **Start** — exercise phase: timer ring fill, "In progress" chip, primary CTA.
- **Rest** — rest phase: countdown ring, "Rest" banner, skip-rest button.
- **Success** — set completed, workout finished, personal record, confetti moments.
- **Alert** — missed set, form warning, connectivity error, destructive actions.

On-fill text is resolved per mode (see §2.4): light-mode Start/Alert use white,
light-mode Rest/Success use `#1C1C1E`; dark-mode Start/Rest/Success use `#1C1C1E`.

---

## 6. CSS Variables — Light Mode (`:root`)

Drop-in block for `src/app/globals.css` (mirrors the existing `apple-*` pattern;
`.dark` block in §7 flips every token automatically).

```css
:root {
  color-scheme: light;

  /* ── Brand primary (Coral/Orange) ─────────────────────── */
  --apex-primary: #ff4500;
  --apex-primary-hover: #e63e00;
  --apex-primary-active: #cc3800;
  --apex-on-primary: #ffffff;
  --apex-primary-text: #d93d00;          /* AA body text on light bg */
  --apex-primary-soft: rgba(255, 69, 0, 0.10);
  --apex-primary-soft-strong: rgba(255, 69, 0, 0.18);
  --apex-focus-ring: rgba(255, 69, 0, 0.35);
  --apex-gradient-brand: linear-gradient(135deg, #ff4500 0%, #ff9500 100%);

  /* ── Neutrals (ramp) ──────────────────────────────────── */
  --apex-neutral-50: #f9f9fb;  --apex-neutral-100: #f2f2f7;
  --apex-neutral-200: #e5e5ea; --apex-neutral-300: #d1d1d6;
  --apex-neutral-400: #c7c7cc; --apex-neutral-500: #aeaeb2;
  --apex-neutral-600: #8e8e93; --apex-neutral-700: #636366;
  --apex-neutral-800: #48484a; --apex-neutral-900: #3a3a3c;
  --apex-neutral-950: #1c1c1e;

  /* ── Neutrals (semantic) ──────────────────────────────── */
  --apex-bg: #ffffff;
  --apex-bg-secondary: #f2f2f7;
  --apex-surface: #ffffff;
  --apex-surface-raised: #ffffff;
  --apex-text: #000000;
  --apex-text-secondary: rgba(60, 60, 67, 0.60);
  --apex-text-tertiary: rgba(60, 60, 67, 0.30);
  --apex-text-disabled: rgba(60, 60, 67, 0.18);
  --apex-border: rgba(60, 60, 67, 0.29);
  --apex-fill: rgba(120, 120, 128, 0.20);

  /* ── State colors ─────────────────────────────────────── */
  --apex-state-idle: #8e8e93;            --apex-state-idle-soft: rgba(142, 142, 147, 0.16);
  --apex-state-start: #ff4500;           --apex-state-start-soft: rgba(255, 69, 0, 0.10);
  --apex-state-start-border: rgba(255, 69, 0, 0.35);
  --apex-state-rest: #ff9500;            --apex-state-rest-soft: rgba(255, 149, 0, 0.12);
  --apex-state-rest-border: rgba(255, 149, 0, 0.35);
  --apex-state-success: #34c759;         --apex-state-success-soft: rgba(52, 199, 89, 0.12);
  --apex-state-success-border: rgba(52, 199, 89, 0.35);
  --apex-state-alert: #ff3b30;           --apex-state-alert-soft: rgba(255, 59, 48, 0.12);
  --apex-state-alert-border: rgba(255, 59, 48, 0.40);
  --apex-state-alert-text: #d70015;

  /* ── Typography ───────────────────────────────────────── */
  --apex-font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display",
    "SF Pro Text", "SF Pro Rounded", "Helvetica Neue", Inter, Roboto,
    "Segoe UI", Vazirmatn, IRANSansX, Tahoma, sans-serif;
  --apex-font-rounded: "SF Pro Rounded", -apple-system, BlinkMacSystemFont,
    "SF Pro Display", "SF Pro Text", Inter, Roboto, Vazirmatn, IRANSansX,
    Tahoma, sans-serif;
  --apex-font-mono: "SF Mono", ui-monospace, SFMono-Regular, Menlo, Monaco,
    Consolas, "Roboto Mono", monospace;

  --apex-font-weight-regular: 400;
  --apex-font-weight-medium: 500;
  --apex-font-weight-semibold: 600;
  --apex-font-weight-bold: 700;

  --apex-text-large-title: 2.125rem;    /* 34 px */
  --apex-text-title-1: 1.75rem;         /* 28 px */
  --apex-text-title-2: 1.375rem;        /* 22 px */
  --apex-text-title-3: 1.25rem;         /* 20 px */
  --apex-text-headline: 1.0625rem;      /* 17 px */
  --apex-text-body: 1.0625rem;          /* 17 px */
  --apex-text-callout: 1rem;            /* 16 px */
  --apex-text-subheadline: 0.9375rem;   /* 15 px */
  --apex-text-footnote: 0.8125rem;      /* 13 px */
  --apex-text-caption-1: 0.75rem;       /* 12 px */
  --apex-text-caption-2: 0.6875rem;     /* 11 px */

  --apex-tracking-display: -0.02em;
  --apex-tracking-headline: -0.01em;
  --apex-tracking-body: 0;

  /* ── Spacing (4 px base; Apple/Material grids) ─────────── */
  --apex-space-0: 0;        --apex-space-1: 0.125rem;  --apex-space-2: 0.25rem;
  --apex-space-3: 0.5rem;   --apex-space-4: 0.75rem;   --apex-space-5: 1rem;
  --apex-space-6: 1.25rem;  --apex-space-7: 1.5rem;    --apex-space-8: 2rem;
  --apex-space-9: 2.5rem;   --apex-space-10: 3rem;     --apex-space-11: 3.5rem;
  --apex-space-12: 4rem;    --apex-space-16: 5rem;     --apex-space-24: 6rem;

  /* ── Radii & controls ─────────────────────────────────── */
  --apex-radius-sm: 0.5rem;    --apex-radius-md: 0.625rem;
  --apex-radius-lg: 0.75rem;   --apex-radius-xl: 1rem;
  --apex-radius-2xl: 1.25rem;  --apex-radius-3xl: 1.5rem;
  --apex-radius-full: 9999px;
  --apex-control-height: 2.75rem;      /* 44 px */
  --apex-control-height-sm: 2.25rem;   /* 36 px */
}
```

---

## 7. CSS Variables — Dark Mode (`.dark`)

```css
.dark {
  color-scheme: dark;

  /* ── Brand primary (Coral/Orange) ─────────────────────── */
  --apex-primary: #ff6b3d;
  --apex-primary-hover: #ff7f57;
  --apex-primary-active: #e65c2e;
  --apex-on-primary: #1c1c1e;           /* dark text on bright fill = AA */
  --apex-primary-text: #ff8a5c;         /* AA body text on dark bg */
  --apex-primary-soft: rgba(255, 107, 61, 0.16);
  --apex-primary-soft-strong: rgba(255, 107, 61, 0.28);
  --apex-focus-ring: rgba(255, 107, 61, 0.45);
  --apex-gradient-brand: linear-gradient(135deg, #ff6b3d 0%, #ff9f0a 100%);

  /* ── Neutrals (ramp — inverted) ───────────────────────── */
  --apex-neutral-50: #1c1c1e;  --apex-neutral-100: #2c2c2e;
  --apex-neutral-200: #3a3a3c; --apex-neutral-300: #48484a;
  --apex-neutral-400: #636366; --apex-neutral-500: #8e8e93;
  --apex-neutral-600: #aeaeb2; --apex-neutral-700: #c7c7cc;
  --apex-neutral-800: #d1d1d6; --apex-neutral-900: #e5e5ea;
  --apex-neutral-950: #f2f2f7;

  /* ── Neutrals (semantic) ──────────────────────────────── */
  --apex-bg: #000000;
  --apex-bg-secondary: #1c1c1e;
  --apex-surface: #1c1c1e;
  --apex-surface-raised: #2c2c2e;
  --apex-text: #ffffff;
  --apex-text-secondary: rgba(235, 235, 245, 0.60);
  --apex-text-tertiary: rgba(235, 235, 245, 0.30);
  --apex-text-disabled: rgba(235, 235, 245, 0.18);
  --apex-border: rgba(84, 84, 88, 0.60);
  --apex-fill: rgba(120, 120, 128, 0.36);

  /* ── State colors ─────────────────────────────────────── */
  --apex-state-idle: #8e8e93;            --apex-state-idle-soft: rgba(142, 142, 147, 0.24);
  --apex-state-start: #ff6b3d;           --apex-state-start-soft: rgba(255, 107, 61, 0.16);
  --apex-state-start-border: rgba(255, 107, 61, 0.40);
  --apex-state-rest: #ff9f0a;            --apex-state-rest-soft: rgba(255, 159, 10, 0.18);
  --apex-state-rest-border: rgba(255, 159, 10, 0.40);
  --apex-state-success: #30d158;         --apex-state-success-soft: rgba(48, 209, 88, 0.16);
  --apex-state-success-border: rgba(48, 209, 88, 0.40);
  --apex-state-alert: #ff453a;           --apex-state-alert-soft: rgba(255, 69, 58, 0.18);
  --apex-state-alert-border: rgba(255, 69, 58, 0.45);
  --apex-state-alert-text: #ff6961;

  /* ── Typography (identical stacks/sizes in both modes) ── */
  /* font-sans / font-rounded / font-mono, weights, sizes,
     tracking: reuse the :root definitions unchanged.        */

  /* ── Spacing / radii / controls: mode-independent ─────── */
  /* space-*, radius-*, control-height: reuse :root values. */
}
```

Mode-independent tokens (typography, spacing, radii, control heights) are defined
once in `:root` and intentionally **not** overridden in `.dark`.

---

## 8. Light / Dark Quick Reference

| Token | Light | Dark |
|---|---|---|
| Primary fill | `#FF4500` | `#FF6B3D` |
| Text on primary | `#FFFFFF` | `#1C1C1E` |
| App background | `#FFFFFF` | `#000000` |
| Grouped background | `#F2F2F7` | `#1C1C1E` |
| Card surface | `#FFFFFF` | `#1C1C1E` |
| Raised surface | `#FFFFFF` | `#2C2C2E` |
| Primary label | `#000000` | `#FFFFFF` |
| Start (active) | `#FF4500` | `#FF6B3D` |
| Rest | `#FF9500` | `#FF9F0A` |
| Success | `#34C759` | `#30D158` |
| Alert | `#FF3B30` | `#FF453A` |

---

## 9. Tailwind Integration (this repo)

Map the CSS variables into `theme.extend` so `bg-apex-primary`, `text-apex-text-secondary`,
`border-apex-border`, etc. work alongside the existing `apple-*` utilities. Tokens
flip automatically because they reference custom properties.

```js
// tailwind.config.js — add to theme.extend.colors
apex: {
  primary: 'var(--apex-primary)',
  'primary-hover': 'var(--apex-primary-hover)',
  'primary-active': 'var(--apex-primary-active)',
  'on-primary': 'var(--apex-on-primary)',
  'primary-text': 'var(--apex-primary-text)',
  'primary-soft': 'var(--apex-primary-soft)',
  'primary-soft-strong': 'var(--apex-primary-soft-strong)',
  bg: 'var(--apex-bg)',
  'bg-secondary': 'var(--apex-bg-secondary)',
  surface: 'var(--apex-surface)',
  'surface-raised': 'var(--apex-surface-raised)',
  text: 'var(--apex-text)',
  'text-secondary': 'var(--apex-text-secondary)',
  'text-tertiary': 'var(--apex-text-tertiary)',
  border: 'var(--apex-border)',
  fill: 'var(--apex-fill)',
  'state-idle': 'var(--apex-state-idle)',
  'state-start': 'var(--apex-state-start)',
  'state-rest': 'var(--apex-state-rest)',
  'state-success': 'var(--apex-state-success)',
  'state-alert': 'var(--apex-state-alert)',
  'state-alert-text': 'var(--apex-state-alert-text)',
},
// theme.extend.spacing (optional): map apex-space-* → var()
```

Usage examples:

```tsx
<button className="bg-apex-primary text-apex-on-primary active:bg-apex-primary-active">
  Start Workout
</button>
<span className="bg-apex-state-success-soft text-apex-state-success">Set completed</span>
<div className="bg-apex-bg-secondary text-apex-text-secondary">…</div>
```

---

## 10. Token Naming Conventions

- Namespace: `--apex-*` (project: Apex Home Fitness).
- Group prefixes: `primary`, `neutral-*`, `state-*`, `text-*`, `space-*`, `radius-*`.
- Suffixes: `-hover`, `-active`, `-soft`, `-border`, `-text` (accessible text color).
- `on-*` = foreground guaranteed to contrast with the paired fill (`--apex-on-primary`).
- All colors are theme-aware: define in `:root`, override in `.dark`, never hardcode
  a mode-specific hex in components.
- Prefer semantic tokens (`--apex-text-secondary`) over ramp values
  (`--apex-neutral-600`) in UI; use the ramp for data visualization only.
