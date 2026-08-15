# Apex Home Fitness — Multi-Platform Design System (v2.0)

> **Status:** Production-Ready · **Last updated:** 2026-08-15
>
> A unified design language for home fitness, ensuring a consistent brand identity across **iOS**, **Android**, and **Web**, while respecting the native user experience patterns of each platform.

---

## 1. Core Principles

- **Energetic & Focused:** Use warm, high-energy primary colors to motivate, paired with calm neutrals to maintain focus.
- **Platform Native (Native-First):** Respect Apple HIG (iOS) and Material 3 (Android) navigation and interaction patterns. Brand is the "paint," Platform is the "architecture."
- **Exercise-Safe UX:** High-contrast, large touch targets, and clear state-based color coding for use during intense physical activity.
- **Inclusive & Accessible:** Native support for RTL (Persian), screen readers, and high-contrast accessibility from day one.

---

## 2. Design Tokens

### 2.1 Brand Primary — Apex Coral `#FF4500`

Used for primary CTAs, active exercise phases, and progress arcs.

| Token | Light Value | Dark Value | Purpose |
| :--- | :--- | :--- | :--- |
| `--apex-primary` | `#FF4500` | `#FF6B3D` | Primary fill (Buttons, Active phase) |
| `--apex-on-primary` | `#FFFFFF` | `#1C1C1E` | Text/Icon on primary fill |
| `--apex-primary-text` | `#D93D00` | `#FF8A5C` | AA body text on neutral backgrounds |
| `--apex-primary-soft` | `rgba(255, 69, 0, 0.10)` | `rgba(255, 107, 61, 0.16)` | Selected state background |
| `--apex-primary-border` | `rgba(255, 69, 0, 0.35)` | `rgba(255, 107, 61, 0.45)` | Subtle primary outlines |

### 2.2 Neutral System (Semantic)

The neutral ramp is semantic. Light mode uses a "calm cool gray" scale; Dark mode uses "deep obsidian."

| Token | Light | Dark | Purpose |
| :--- | :--- | :--- | :--- |
| `--apex-bg` | `#FFFFFF` | `#000000` | Main app background |
| `--apex-surface` | `#F2F2F7` | `#1C1C1E` | Secondary background / Grouped lists |
| `--apex-card` | `#FFFFFF` | `#2C2C2E` | Card / Dialog / Sheet surface |
| `--apex-text-primary` | `#000000` | `#FFFFFF` | Primary headings and body |
| `--apex-text-secondary`| `rgba(60,60,67, 0.6)` | `rgba(235,235,245, 0.6)` | Subtitles and secondary info |
| `--apex-border` | `rgba(60,60,67, 0.2)` | `rgba(84,84,88, 0.6)` | Separators and outlines |
| `--apex-fill` | `rgba(120,120,128, 0.2)`| `rgba(120,120,128, 0.3)`| Neutral control background |

### 2.3 Workout State Tokens

| State | Fill (L/D) | On-Fill (L/D) | Soft BG (L/D) | Accessible Text (L/D) |
| :--- | :--- | :--- | :--- | :--- |
| **Idle** | `#8E8E93` / `#8E8E93` | `#FFFFFF` / `#FFFFFF` | `rgba(142,142,147, 0.1)` | `#636366` / `#AEAEB2` |
| **Start** | `#FF4500` / `#FF6B3D` | `#FFFFFF` / `#1C1C1E` | `rgba(255,69,0, 0.1)` | `#D93D00` / `#FF8A5C` |
| **Rest** | `#FF9500` / `#FF9F0A` | `#1C1C1E` / `#1C1C1E` | `rgba(255,149,0, 0.1)`| `#A05A00` / `#FFB340` |
| **Success**| `#34C759` / `#30D158` | `#1C1C1E` / `#1C1C1E` | `rgba(52,199,89, 0.1)` | `#1E7A31` / `#40FF7C` |
| **Alert** | `#FF3B30` / `#FF453A` | `#FFFFFF` / `#FFFFFF` | `rgba(255,59,48, 0.1)` | `#D70015` / `#FF6961` |

---

## 3. Platform Rules

### 3.1 iOS (Apple HIG)
- **Navigation:** Use Bottom Tab Bar. Large titles that collapse on scroll.
- **Modals:** Use native Sheets with "grabber" handles.
- **Feedback:** Use Taptic Engine (UIFeedbackGenerator).
- **Touch Target:** Minimum **44 × 44 pt**.

### 3.2 Android (Material 3)
- **Navigation:** Use Navigation Bar (bottom). Standard Top App Bar with centered or left-aligned title.
- **Modals:** Use Modal Bottom Sheets with M3 scrim.
- **Feedback:** Standard Android haptics (VibrationEffect).
- **Touch Target:** Minimum **48 × 48 dp** (Visual size can be 40dp).

### 3.3 Web / Desktop
- **Layout:** Responsive sidebar for desktop/tablet; bottom nav for mobile web.
- **Transitions:** Smooth CSS transitions (200-300ms).
- **Touch Target:** Same as iOS/Android for mobile web; min **32px** for mouse/pointer.

---

## 4. RTL & Persian (fa) Support

- **Font Priority:** `Vazirmatn` MUST be the first priority for Persian content.
- **Letter Spacing:** Set to `0` for Persian. Never use negative tracking for Farsi.
- **Mirroring:**
  - Flip back/forward arrows.
  - Reverse horizontal progress bars.
  - Reverse layouts (Sidebar on the right for Web).
  - Navigation order (Right to Left).
- **Numbers:** Use Tabular Numerals for timers but ensure Persian digit rendering is supported where localized.

---

## 5. Accessibility Matrix (WCAG 2.1 AA)

| Pair | Light Ratio | Dark Ratio | AA Compliance |
| :--- | :--- | :--- | :--- |
| White on primary fill | 3.44 : 1 | 6.02 : 1 | ✅ Large/UI (L), ✅ All (D) |
| Primary text on bg | 4.55 : 1 | 7.33 : 1 | ✅ All |
| Black on rest fill | 8.28 : 1 | 8.28 : 1 | ✅ All |
| White on alert fill | 3.55 : 1 | 3.55 : 1 | ✅ Large/UI |

---

## 6. Component Specifications

### 6.1 Buttons
- **Primary:** Full apex-primary fill. Rounded-xl (12pt).
- **Secondary:** apex-primary-soft fill with primary-text.
- **Tertiary:** No fill, apex-primary-text.
- **Destructive:** alert fill with white text.
- **Interaction:** 
  - Hover: Darken by 10% (Web).
  - Pressed: Scale to 0.96 (iOS) or Ripple (Android).

### 6.2 Workout Hero
- **Circular Progress Ring:** 
  - Track: 8pt width, `--apex-border`. 
  - Fill: 8pt width, dynamic state color (Start/Rest).
  - Glow: 15% opacity drop-shadow of fill color.
- **Timer:** Bold, Large Title size. Mono font stack.

### 6.3 Exercise Card
- **Radius:** 20pt (Continuous).
- **Elevation:** 
  - iOS: `.glass` (frosted).
  - Android: `.surface-1` (tonal).
- **Interaction:** Card highlights on press.

---

## 7. Responsive Behavior (Web)

- **Mobile (< 640px):** Single column. Bottom navigation. Full-width buttons.
- **Tablet (640px - 1024px):** Two columns (Exercise list | Details). Sidebar navigation.
- **Desktop (> 1024px):** Three columns or large layout. Sidebar always visible. Video player maximized (16:9 ratio).

---

## 8. Implementation Examples

### Tailwind CSS (Web)
```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      apex: {
        primary: 'var(--apex-primary)',
        'primary-text': 'var(--apex-primary-text)',
        state: {
          start: 'var(--apex-state-start)',
          rest: 'var(--apex-state-rest)',
          success: 'var(--apex-state-success)',
          alert: 'var(--apex-state-alert)',
        }
      }
    }
  }
}
```

### SwiftUI (iOS)
```swift
struct ApexPrimaryButton: View {
    var title: String
    var body: some View {
        Text(title)
            .font(.headline)
            .padding()
            .frame(maxWidth: .infinity)
            .background(Color("ApexPrimary"))
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
```

### Jetpack Compose (Android)
```kotlin
@Composable
fun ApexPrimaryButton(text: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().height(56.dp), // 48dp touch target
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(containerColor = ApexPrimary)
    ) {
        Text(text = text, style = MaterialTheme.typography.labelLarge)
    }
}
```
