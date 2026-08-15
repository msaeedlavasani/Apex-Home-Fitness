# Apex Platform UI Kit

Reusable React components for **Apex Home Fitness**, each shipping variants for
three render targets:

| Variant | Design language | Sizing / motion | Surface |
|---|---|---|---|
| `Ios*` | Apple HIG (SF Pro, system colors, `apple-*` tokens) | 44 pt touch targets, Apple ease | Glassmorphism (`.glass`) |
| `Android*` | Material 3 (`material-*` roles, Roboto) | 48 dp targets, M3 state layers | Tonal surface containers + elevation |
| `Web*` | Custom responsive (brand coral `apex-*` tokens) | Fluid widths, hover states | Solid surfaces + soft shadows |

All tokens resolve from CSS custom properties in `src/app/globals.css`, so
**Light/Dark mode flips automatically** with the `.dark` class — no JS involved.

## Quick start

```tsx
import { PlatformProvider } from '@/components/ui/platform';

// Add once, near the root (inside ThemeProvider is fine):
<PlatformProvider>
  <MyApp />
</PlatformProvider>
```

Every component also works **without** the provider — it then auto-detects
the platform from the user agent on mount (SSR-safe default: `web`).

## Components

```tsx
import {
  Button, Card, TextField, Switch, SegmentedControl, Checkbox, Slider,
  IosButton, AndroidButton, WebButton,          // pinned variants
  usePlatform,                                  // { platform, setPlatform, isIOS, ... }
  detectPlatform, platformToCss,                // utils
} from '@/components/ui/platform';
```

### Button — large, single-hand, high-contrast

```tsx
<Button size="xl" fullWidth icon={<Play />} onClick={start}>
  Start Workout
</Button>

<Button variant="tonal" size="lg">Add to plan</Button>
<Button variant="outlined" tone="destructive">Delete</Button>
<Button variant="text" loading>Save</Button>
```

- `variant`: `filled` (default) · `tonal` · `outlined` · `text`
- `tone`: `primary` (brand coral) · `destructive` (system red)
- `size`: `xl` (56 px CTA) · `lg` (default) · `md` · `sm`
- `loading` shows a spinner, `fullWidth` stretches (mobile-first on web)
- iOS filled → pill + pressed scale · Android filled → 20 dp corners, M3 state
  layer on press · Web filled → hover lift + focus ring

### Card — soft corners

```tsx
<Card variant="glass" interactive onClick={openDetail} title="Push Day" subtitle="12 exercises · 45 min" icon={<Dumbbell />} actions={<ChevronRight />}>
  <p>Card body content…</p>
</Card>
```

- `variant`: `glass` (iOS frosted / M3 tonal surface) · `elevated` · `tonal` ·
  `outlined` · `solid`
- `size`: `sm` · `md` (default) · `lg`
- `interactive` adds press/hover feedback + keyboard (Enter/Space) handling
- On Android the neutral `.glass` classes re-resolve to M3 surface containers
  via `<html data-platform="material">` (set automatically by PlatformProvider)

### Form controls

```tsx
<TextField label="Weight" type="number" startAdornment={<Dumbbell />} helperText="kg" error={err} />
<Switch checked={soundOn} onCheckedChange={setSoundOn} label="Sound" description="Coach cues" />
<SegmentedControl options={[{value:'reps',label:'Reps'},{value:'time',label:'Time'}]} value={mode} onChange={setMode} />
<Checkbox checked={agree} onCheckedChange={setAgree} label="I agree" />
<Slider value={intensity} min={0} max={100} step={5} onChange={setIntensity} aria-label="Intensity" />
```

- **TextField** — iOS: rounded fill + label above · Android: M3 filled field
  with floating label + underline · Web: bordered, focus ring
- **Switch / Checkbox** — iOS: system green/blue · Android: M3 primary +
  state layers · Web: brand coral
- **SegmentedControl** — iOS: fill track + white pill · Android: M3 segmented
  buttons (outline + secondary container) · Web: brand pill
- **Slider** — pointer + keyboard accessible (arrows, Home/End, RTL-aware),
  M3/iOS/web thumb styling

## Platform switching

`PlatformProvider` detects iOS/Android from the UA (incl. iPadOS touch
disambiguation), persists manual overrides to `localStorage` (`ui-platform`),
and mirrors the value onto `<html data-platform="ios|material">` so the
neutral CSS surfaces (`.glass`, `.card-surface`, `.surface-1..5`) render the
right platform look.

```tsx
const { platform, setPlatform } = usePlatform();
<button onClick={() => setPlatform('android')}>Preview as Android</button>
```

## Design tokens

Consumed utilities (all Light/Dark aware):

- Brand: `bg-apex-primary`, `text-apex-on-primary`, `bg-apex-primary-soft`, `ring-apex-focus-ring`
- Apple HIG: `bg-apple-blue`, `text-apple-label`, `bg-apple-fill`, `border-apple-separator`
- Material 3: `bg-material-primary`, `bg-material-secondary-container`, `border-material-outline`, `shadow-elevation-1..5`
- Surfaces: `glass`, `glass-strong`, `glass-subtle`, `card-surface`, `surface-1..5`
- Motion: `ease-apple-ease`, `ease-material-standard`, `ease-material-emphasized`

See `DESIGN_SYSTEM.md` (repo root) for the token source of truth.
