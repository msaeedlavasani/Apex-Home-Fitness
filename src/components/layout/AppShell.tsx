'use client';

import {AndroidLayout} from './AndroidLayout';
import {IOSLayout} from './IOSLayout';
import {WebLayout} from './WebLayout';
import {usePlatform} from '@/components/ui/platform/context/PlatformProvider';
import type {LayoutChromeProps} from './nav';

export type AppShellProps = LayoutChromeProps;

/**
 * AppShell — platform-native layout dispatcher.
 *
 * Renders the layout wrapper that matches the active platform
 * (see PlatformProvider in src/components/ui/platform):
 *   - iOS     → IOSLayout      (bottom tab bar, large titles, chevron back)
 *   - Android → AndroidLayout  (Material 3 AppBar + Navigation Bar)
 *   - other   → WebLayout      (desktop sidebar / mobile top nav)
 *
 * The provider (wired in the root layout with the server-resolved
 * User-Agent as defaultPlatform) mirrors the platform onto
 * `<html data-platform="ios|material">`, so the design-system surface
 * tokens (glass / card-surface / elevation) and fonts resolve natively.
 */
export function AppShell(props: AppShellProps) {
  const {platform} = usePlatform();

  if (platform === 'ios') return <IOSLayout {...props} />;
  if (platform === 'android') return <AndroidLayout {...props} />;
  return <WebLayout {...props} />;
}
