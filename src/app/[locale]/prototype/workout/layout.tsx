import type {Metadata, Viewport} from 'next';

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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
};

export default function WorkoutPrototypeLayout({children}: {children: React.ReactNode}) {
  return children;
}
