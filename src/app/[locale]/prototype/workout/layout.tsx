import type {Metadata, Viewport} from 'next';
import {START_WORKOUT_BRIDGE_SCRIPT} from '@/components/workout/prototype/startWorkoutBridge';

/**
 * The workout prototype is the only immersive full-surface route. Keep its
 * standalone iOS status bar translucent so the route backdrop continues
 * beneath the safe-area region; content still applies its own safe-area
 * insets in the shared workout shell.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#211b19',
};

export const metadata: Metadata = {
  other: {
    // Next's appleWebApp.capable emits the generic mobile-web-app-capable
    // tag. Keep the Apple-specific capability explicit for standalone iOS,
    // where it gates the translucent status-bar treatment.
    'apple-mobile-web-app-capable': 'yes',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
};

export default function WorkoutPrototypeLayout({children}: {children: React.ReactNode}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{__html: START_WORKOUT_BRIDGE_SCRIPT}} />
      {children}
    </>
  );
}
