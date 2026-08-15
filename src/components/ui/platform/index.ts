'use client';

/**
 * Apex Platform UI Kit — public API
 * ---------------------------------
 * Reusable components with variants for iOS (HIG), Android (Material 3) and
 * Web (custom responsive). The platform-aware components (Button, Card, …)
 * resolve the active platform from <PlatformProvider>; each also ships a
 * pinned variant (IosButton, AndroidButton, WebButton, …) for explicit use.
 *
 * Light/Dark mode is handled entirely by the `.dark` class + CSS custom
 * properties defined in src/app/globals.css — no component logic needed.
 */

export * from './lib/platform';
export * from './context/PlatformProvider';
export * from './Button';
export * from './Card';
export * from './TextField';
export * from './Switch';
export * from './SegmentedControl';
export * from './Checkbox';
export * from './Slider';
