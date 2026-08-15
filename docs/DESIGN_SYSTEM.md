# Apex Home Fitness — Multi-Platform Design System (v2.0)

> **Version:** 2.0 · **Status:** Production-Ready · **Last updated:** 2026-08-15
>
> A unified design language for home fitness, ensuring a consistent brand identity across **iOS**, **Android**, and **Web**, while respecting the native user experience patterns of each platform.

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
| `--apex-primary-text` | `#D93D00` | `#FF8A5C` | Accessible text on neutral backgrounds |
| `--apex-primary-soft` | `rgba(255, 69, 0, 0.10)` | `rgba(255, 107, 61, 0.16)` | Selected state / Soft highlight |
| `--apex-primary-border` | `rgba(255, 69, 0, 0.35)` | `rgba(255, 107, 61, 0.45)` | Subtle primary outlines |

### 2.2 Neutral System (Semantic Ramp)

The neutral ramp is purely semantic to avoid developer error in dark mode.

| Token | Light | Dark | Purpose |
| :--- | :--- | :--- | :--- |
| `--apex-bg` | `#FFFFFF` | `#000000` | Main app background |
| `--apex-surface` | `#F2F2F7` | `#1C1C1E` | Secondary background / Grouped lists |
| `--apex-card` | `#FFFFFF` | `#2C2C2E` | Card / Dialog / Sheet surface |
| `--apex-text-primary` | `#000000` | `#FFFFFF` | Primary headings and body |
| `--apex-text-secondary`| `rgba(60,60,67, 0.6)` | `rgba(235,235,245, 0.6)` | Subtitles and captions |
| `--apex-border` | `rgba(60,60,67, 0.2)` | `rgba(84,84,88, 0.6)` | Hairlines and separators |
| `--apex-fill` | `rgba(120,120,128, 0.2)`| `rgba(120,120,128, 0.3)`| Control fills (chips, inputs) |

### 2.3 Workout State Tokens

| State | Fill (L/D) | On-Fill (L/D) | Soft BG (L/D) | Border (L/D) |
| :--- | :--- | :--- | :--- | :--- |
| **Idle** | `#8E8E93` | `#FFFFFF` | `rgba(142,142,147, 0.1)` | `#C7C7CC` / `#48484A` |
| **Start** | `#FF4500` / `#FF6B3D` | `#FFFFFF` / `#1C1C1E` | `rgba(255,69,0, 0.1)` | `rgba(255,69,0, 0.35)` |
| **Rest** | `#FF9500` / `#FF9F0A` | `#1C1C1E` / `#1C1C1E` | `rgba(255,149,0, 0.1)`| `rgba(255,149,0, 0.35)` |
| **Success**| `#34C759` / `#30D158` | `#1C1C1E` / `#1C1C1E` | `rgba(52,199,89, 0.1)` | `rgba(52,199,89, 0.35)` |
| **Alert** | `#FF3B30` / `#FF453A` | `#FFFFFF` / `#FFFFFF` | `rgba(255,59,48, 0.1)` | `rgba(255,59,48, 0.40)` |

---

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

- **Typography:** `Vazirmatn` MUST be the first priority for Persian.
- **Tracking:** Set to `0` for Persian. **Negative tracking is strictly forbidden** for RTL.
- **Directionality:**
  - `lang="fa" dir="rtl"` on the `<html>` tag.
  - Mirror icons with directional meaning (back arrows, progress flow).
  - Navigation order: Dashboard (Right-most) → Profile (Left-most).

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

## 7. Implementation Snippets

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
