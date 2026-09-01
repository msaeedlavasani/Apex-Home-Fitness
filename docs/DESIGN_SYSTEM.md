# Apex Home Fitness — Design System & UI Architecture (v2.2)

> **Version:** 2.2 · **Status:** Frontend source of truth · **Last updated:** 2026-09-01
>
> این سند منبع حقیقت بصری Apex Home Fitness است. قوانین آن برای وب Next.js، تجربه‌ی RTL/LTR، PWA و مسیرهای تمرین/کوییز نوشته شده و جایگزین طراحی‌های پراکنده‌ی صفحه‌ای است.

---

## 1. Core Principles

- **Energetic & Focused:** High-energy primary colors (Coral) motivate, while calm neutrals maintain focus.
- **Platform Native (Native-First):** Respect platform idioms (Apple HIG / Material 3) for navigation, modals, and interaction. Brand is the "paint," Platform is the "architecture."
- **Exercise-Safe UX:** High-visibility, large touch targets, and clear state-based color coding for use during intense physical activity.
- **Inclusive & Accessible:** Native support for RTL (Persian), screen readers, and high-contrast accessibility from day one.

---

## 2. Design Tokens

### 2.1 Brand Primary — Apex Coral `#FF4500`

| Token | Light Value | Dark Value | Purpose |
| :--- | :--- | :--- | :--- |
| `--apex-primary` | `#FF4500` | `#FF6B3D` | Primary fill (Buttons, Active phase) |
| `--apex-on-primary` | `#FFFFFF` | `#1C1C1E` | Text/Icon on primary fill |
| `--apex-primary-hover` | `#E63E00` | `#FF7F57` | Primary fill (hover / pressed-up) |
| `--apex-primary-active` | `#CC3800` | `#E65C2E` | Primary fill (pressed) |
| `--apex-primary-text` | `#D93D00` | `#FF8A5C` | Accessible text on neutral backgrounds |
| `--apex-primary-soft` | `rgba(255, 69, 0, 0.10)` | `rgba(255, 107, 61, 0.16)` | Selected state / Soft highlight |
| `--apex-primary-soft-strong` | `rgba(255, 69, 0, 0.18)` | `rgba(255, 107, 61, 0.28)` | Selected state (stronger) |
| `--apex-primary-border` | `rgba(255, 69, 0, 0.35)` | `rgba(255, 107, 61, 0.45)` | Subtle primary outlines |
| `--apex-focus-ring` | `rgba(255, 69, 0, 0.35)` | `rgba(255, 107, 61, 0.45)` | Keyboard focus ring (2px offset) |

> Also defined in `globals.css`: `--apex-gradient-brand` (brand gradient used by
> the web logo), `--apex-media-overlay` / `--apex-media-scrim` (mode-independent
> video-player chrome).

### 2.2 Neutral System (Semantic Ramp)

The neutral ramp is purely semantic to avoid developer error in dark mode.

| Token | Light | Dark | Purpose |
| :--- | :--- | :--- | :--- |
| `--apex-bg` | `#FFFFFF` | `#000000` | Main app background |
| `--apex-surface` | `#F2F2F7` | `#1C1C1E` | Secondary background / Grouped lists |
| `--apex-card` | `#FFFFFF` | `#2C2C2E` | Card / Dialog / Sheet surface |
| `--apex-text-primary` | `#000000` | `#FFFFFF` | Primary headings and body |
| `--apex-text-secondary`| `rgba(60,60,67, 0.6)` | `rgba(235,235,245, 0.6)` | Subtitles and captions |
| `--apex-text-tertiary` | `rgba(60,60,67, 0.3)` | `rgba(235,235,245, 0.3)` | Captions, placeholders |
| `--apex-text` | alias of `--apex-text-primary` | alias of `--apex-text-primary` | Generic text (workout/social) |
| `--apex-border` | `rgba(60,60,67, 0.2)` | `rgba(84,84,88, 0.6)` | Hairlines and separators |
| `--apex-fill` | `rgba(120,120,128, 0.2)`| `rgba(120,120,128, 0.36)`| Control fills (chips, inputs) |

> `--apex-text` is a pure alias of `--apex-text-primary` (kept for workout/social
> components). `--apex-fill` dark (`0.36`) matches Apple HIG `systemFill` dark.

### 2.3 Workout State Tokens

| State | Fill (L/D) | On-Fill (L/D) | Soft BG (L/D) | Border (L/D) |
| :--- | :--- | :--- | :--- | :--- |
| **Idle** | `#8E8E93` | `#FFFFFF` | `rgba(142,142,147, 0.1)` | `#C7C7CC` / `#48484A` |
| **Start** | `#FF4500` / `#FF6B3D` | `#FFFFFF` / `#1C1C1E` | `rgba(255,69,0, 0.1)` | `rgba(255,69,0, 0.35)` |
| **Rest** | `#FF9500` / `#FF9F0A` | `#1C1C1E` / `#1C1C1E` | `rgba(255,149,0, 0.1)`| `rgba(255,149,0, 0.35)` |
| **Success**| `#34C759` / `#30D158` | `#1C1C1E` / `#1C1C1E` | `rgba(52,199,89, 0.1)` | `rgba(52,199,89, 0.35)` |
| **Alert** | `#FF3B30` / `#FF453A` | `#FFFFFF` / `#FFFFFF` | `rgba(255,59,48, 0.1)` | `rgba(255,59,48, 0.40)` |

---

## 3. Foundation و Platform Idioms

### 3.0 Foundation فعلی

- **CURRENT:** Tailwind CSS و tokenهای CSS در `src/app/globals.css` منبع اصلی ظاهر موجود هستند.
- **CURRENT:** MUI `9.3.1` با Emotion نصب و `MuiProvider` آن در layout فعال است، اما **هیچ component واقعی از MUI در `src` مصرف نمی‌شود** (فقط خود provider).
- **RULE (KIT-FIRST — مصوب 2026-09-01 پس از POST-AUDIT-RATIONALIZATION-01):** برای همه‌ی UI جدید (شامل Admin Console) ابتدا platform kit مشترک `src/components/ui/platform` و primitiveهای مشترک را reuse کن (ترتیب `reuse → extend → compose → create`). MUI نباید foundation دوم رقیب شود؛ استفاده از MUI فقط با نیاز مشخص و مستند که kit آن را پوشش نمی‌دهد و با ثبت تصمیم صریح مجاز است.
- **CONSTRAINT:** فعلاً هیچ صفحه‌ای بازنویسی گسترده نمی‌شود؛ تغییرات تدریجی، component-by-component و با حفظ ظاهر فعلی انجام می‌شود.
- `MuiProvider` فقط یک بار در layout locale قرار می‌گیرد. provider موازی یا نصب نسخه‌ی دوم MUI ممنوع است.
- **NOTE:** بند KIT-FIRST مطابق `GOVERNANCE-UI-GATE-01` (مصوب 2026-09-01) به‌روزرسانی شده است؛ **ثبت رسمی همراه `ADMIN-DS-06` انجام شد (Batch 2، 2026-09-01)** — KIT-FIRST قاعده‌ی جاری و الزام‌آور Admin UI است.

### MUI usage example

```tsx
import {Button} from '@mui/material';

<Button variant="contained" color="primary">
  Start workout
</Button>
```

مقادیر رنگ و typography را در component hard-code نکن؛ theme bridge آن‌ها را از tokenهای Apex می‌گیرد.

## 3. Platform Idioms

### 3.1 iOS (Apple HIG)
- **Navigation:** Tab Bar (bottom). Navigation Bar with Large Titles.
- **Controls:** Standard Buttons (`RoundedRectangle` with `continuous` style).
- **Feedback:** Haptic (`UIImpactFeedbackGenerator`).
- **Touch Target:** Minimum **44 × 44 pt**.

### 3.2 Android (Material 3)
- **Navigation:** Navigation Bar (bottom). Top App Bar (centered title).
- **Controls:** M3 Filled/Tonal/Outlined Buttons.
- **Feedback:** Standard vibration.
- **Touch Target:** Minimum **48 × 48 dp**. (Visual size can be 40dp, but touch area must be 48dp).

### 3.3 Web / Desktop
- **Navigation:** Responsive Sidebar (Desktop/Tablet) or Bottom Nav (Mobile).
- **Interaction:** Hover states (10% darkening/elevation increase), Focus rings.
- **Touch Target:** 48px for mobile, 32px for mouse.

---

## 4. RTL & Persian (fa) Support

- **Tracking:** Set to `0` for Persian. **Negative tracking is strictly forbidden** for RTL.
- **Directionality:**
  - `lang="fa" dir="rtl"` on the `<html>` tag.
  - Mirror icons with directional meaning (back arrows, progress flow).
  - Navigation order: Dashboard (Right-most) → Profile (Left-most).
  - Use **logical CSS utilities** (`ms/me/ps/pe/start/end`) so layout mirrors
    automatically; physical `left/right` spacing is reserved for genuinely
    directional UI.

### 4.1 TYPOGRAPHY CONTRACT (RATIFIED — binding)

`DECISION 2026-09-01 — Owner ratification (ADMIN DESIGN SYSTEM BATCH 2);
implemented by ADMIN-DS-05; binding for ALL surfaces (consumer app AND
Admin Console).`

| Locale | Direction | Primary UI font | Source |
| :--- | :--- | :--- | :--- |
| **fa** (Persian) | RTL | **Vazirmatn** | Official project — <https://github.com/rastikerdar/vazirmatn>; self-hosted web font assets |
| **en** (English) | LTR | **Inter** | Self-hosted web font assets |

Rules:

1. **Typography is shared across the consumer app and Admin.** There is
   NO separate Admin font stack — the Admin console links the SAME
   self-hosted next/font variables (`--font-inter`, `--font-roboto`,
   `--font-vazirmatn`) as the public app (`src/app/fonts/`).
2. **Locale determines the primary UI font:** `fa → Vazirmatn`,
   `en → Inter`. Mechanism: `<html dir>` per locale + the shared
   `globals.css` rule `html[dir='rtl'] body { font-family: var(--font-vazirmatn), … }`;
   LTR keeps the sans stack led by Inter (SF Pro system-first on Apple).
3. **Preserve sensible system sans-serif fallbacks** (SF Pro on Apple,
   Roboto/Segoe on Android/Windows, etc.) — never a bare `font-family: Vazirmatn`.
4. **Reuse the existing shared typography/theme architecture** —
   `next/font/local` woff2 files in `src/app/fonts/` (same-origin,
   CSP `font-src 'self'`-compliant, offline through the service worker),
   the `globals.css` token/family rules, and the per-locale `<html lang/dir>`
   wiring. Do not create a parallel font-loading mechanism.
5. **Avoid unnecessary font weights/assets** — Vazirmatn is a single
   variable woff2 (weight 100–900); Inter is a single variable woff2.
   Only add weights/assets when a concrete design requirement exists.

Implementation record: `src/lib/admin/locale.ts` (locale contract),
`src/app/admin/layout.tsx` (lang/dir + provider), Vazirmatn applied via the
shared `html[dir='rtl']` rule — verified in real-browser E2E
(`tests/admin-i18n.spec.ts`: computed `font-family` leads with `inter` in
LTR and `vazirmatn` in RTL).

### 4.2 Admin Console i18n & RTL architecture (ADMIN-DS-05)

- **Locale source:** the `admin-locale` cookie (values `en` | `fa`, default
  `en`). Admin routes live OUTSIDE the public `[locale]` segment (the
  middleware matcher excludes `/admin`), so locale is resolved and persisted
  server-side via the cookie — SSR-correct, no client-only storage.
- **Switching:** `AdminLocaleSwitcher` (radio group, EN ⇄ FA) writes the
  cookie and refreshes the server tree; `<html lang/dir>`, metadata, and all
  translations re-render. Mirrors the public `LanguageSwitcher` a11y pattern.
- **Shared next-intl architecture:** the `admin.*` namespace lives in the
  SAME catalogs as the public app (`src/messages/{en,fa}.json`); the root
  admin layout provides `NextIntlClientProvider` with the cookie locale, and
  server components resolve via `getTranslations({locale, namespace})`.
- **Dates:** `formatAdminDate(value, locale)` follows the consumer app
  convention — `fa-IR` (Persian calendar + Persian digits) vs `en-GB`.
- **RTL layout:** admin tables/cells use logical utilities (`pe-4`, `text-end`,
  `text-start`) so numeric columns and padding mirror correctly.

---

## 5. Component Specifications

### 5.1 Buttons
- **Primary:** `--apex-primary` fill, `--apex-on-primary` text. Radius: 12pt (xl).
- **Secondary:** `--apex-primary-soft` fill, `--apex-primary-text`.
- **Tertiary:** Transparent fill, `--apex-primary-text`.
- **Destructive:** `--apex-state-alert` fill, white text.

### 5.2 Exercise Card
- **Radius:** 20pt (Continuous corners).
- **Style:** `.glass` for iOS, `.surface-1` for Android.
- **Content:** Large image, Bold Title 2, localized labels.

### 5.3 Timer & Progress
- **Circular Progress Ring:** 8pt width. Starts at Top (12 o'clock). Color-coded by state (Start/Rest).
- **Countdown Timer:** Large Title font, Mono stack. Tabular numerals. Pulse animation below 5s.

### 5.4 Navigation
- **Mobile Bottom Nav:** 56pt (iOS) / 80dp (Android) height. 4-5 slots maximum.
- **Desktop Sidebar:** 280px width. Fixed position. Glassmorphism background.

---

## 6. Accessibility & Motion

- **WCAG 2.1 AA:** All color pairs verified for 4.5:1 ratio (Body) or 3:1 (UI).
- **Reduced Motion:** Disable non-essential scaling/sliding animations via `prefers-reduced-motion`.
- **Screen Readers:** Mandatory `aria-label` for all icon-only buttons (Start, Pause, Skip).
- **Keyboard:** Logical tab order. Persistent focus ring (coral, 2px offset).

---

## 7. تصمیم‌های معماری UI

- قبل از ساخت component، `src/components` و primitiveهای موجود را جست‌وجو کن.
- یک Section را فقط وقتی Card کن که واقعاً یک واحد اطلاعاتی مستقل باشد؛ صفحه نباید به مجموعه‌ای از کارت‌های تزئینی تبدیل شود.
- سطح‌بندی بصری Apex بر این ترتیب است: **هدف کاربر → وضعیت/پیشرفت → اقدام اصلی → جزئیات ثانویه**.
- مسیرهای اصلی Landing → Quiz → Auth → Dashboard باید از یک زبان بصری مشترک استفاده کنند، اما هر صفحه hierarchy مخصوص خود را حفظ کند.
- حالت‌های interaction باید علاوه بر رنگ با متن، آیکون، border، تغییر position یا status قابل تشخیص باشند.
- componentهای تخصصی مانند player یا نمودار فقط capability می‌دهند؛ tokenها و قواعد Apex هویت بصری را تعیین می‌کنند.

## 8. UI Completion Checklist

- [ ] tokenهای semantic موجود استفاده شده‌اند
- [ ] مسیرهای `en` و `fa` بررسی شده‌اند
- [ ] در viewportهای 360px به بالا overflow ناخواسته وجود ندارد
- [ ] loading، empty، error، disabled و success state مشخص است
- [ ] focus، keyboard، aria label و contrast بررسی شده است
- [ ] reduced motion رعایت شده است
- [ ] component یا dependency موازی بدون دلیل ساخته نشده است
- [ ] تغییر فقط در scope موردنظر انجام شده است

## 9. Implementation Snippets

### Tailwind Config (Updated)
```js
apex: {
  primary: 'var(--apex-primary)',
  'primary-text': 'var(--apex-primary-text)',
  state: {
    start: 'var(--apex-state-start)',
    'start-soft': 'var(--apex-state-start-soft)',
    'start-text': 'var(--apex-state-start-text)',
    // ... all other states mapped 1:1
  }
}
```

### SwiftUI (iOS)
```swift
Button(action: startWorkout) {
    Text("Start Workout")
        .font(.headline)
        .padding()
        .background(Color("ApexPrimary"))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
}
```

### Jetpack Compose (Android)
```kotlin
Button(
    onClick = { startWorkout() },
    modifier = Modifier.height(56.dp).fillMaxWidth(), // 48dp target
    shape = RoundedCornerShape(16.dp)
) {
    Text("Start Workout")
}
```
