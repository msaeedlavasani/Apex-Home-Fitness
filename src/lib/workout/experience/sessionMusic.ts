/**
 * Session Music (WP-04, steering delta §21–§26) — the MINIMAL real Workout
 * Music capability: one supplied track, one audio instance, real on/off.
 *
 * OWNERSHIP: music belongs to the Workout Experience/session layer — NOT to
 * PREPARING or any transient screen render. The controller is created once
 * per session by the shell (module scope is the Experience shell's concern;
 * this module is the reusable capability), so audio survives countdown
 * ticks, theme switches, More open/close and stage transitions (§25).
 *
 * This is NOT a generalized audio engine (§21): no playlists, no streaming,
 * no crossfade, no backend state, no equalizer, no new dependency — the
 * platform `HTMLAudioElement` is the boundary. Autoplay policy is respected
 * (§23): playback starts only through the Start Workout user gesture; a
 * rejected `play()` never crashes and never reports a false playing state.
 *
 * Runtime boundary (ADR-0002 pattern): the controller receives the audio
 * element from the caller, so pure tests inject a fake element and the app
 * injects the real one.
 */

import {WORKOUT_MUSIC_SRC} from './musicAsset';

export type MusicPlaybackState = 'STOPPED' | 'PLAYING' | 'MUTED';

export interface WorkoutMusicController {
  /** Attempt playback (user-gesture context). Resolves to the REAL state. */
  play: () => Promise<MusicPlaybackState>;
  /** User-requested music off: pauses playback, reports MUTED. */
  mute: () => Promise<MusicPlaybackState>;
  /** User-requested music on: resumes the SAME instance, reports PLAYING. */
  unmute: () => Promise<MusicPlaybackState>;
  /** Current REAL playback state (never a UI-only toggle). */
  getState: () => MusicPlaybackState;
  /** The single owned audio element (transport for advanced consumers). */
  getElement: () => HTMLAudioElement;
  /** Release ownership (session teardown only). */
  dispose: () => void;
}

/**
 * Wraps ONE audio element as the session's music controller. The element is
 * created by the caller (injection for tests) and configured for looped
 * session playback; it is never re-created by state changes.
 */
export function createSessionMusicController(element: HTMLAudioElement): WorkoutMusicController {
  element.src = WORKOUT_MUSIC_SRC;
  element.loop = true;
  element.preload = 'auto';

  const state = (): MusicPlaybackState =>
    element.paused ? (element.currentTime > 0 ? 'MUTED' : 'STOPPED') : 'PLAYING';

  const safelyPlay = async (): Promise<MusicPlaybackState> => {
    try {
      await element.play();
      return state();
    } catch {
      // Autoplay rejection / decode failure: handle, never crash, never
      // report false playing state (§23). The real paused state stands.
      return state();
    }
  };

  return {
    play: safelyPlay,
    mute: async () => {
      element.pause();
      return state();
    },
    unmute: safelyPlay,
    getState: state,
    getElement: () => element,
    dispose: () => {
      element.pause();
      element.removeAttribute('src');
      element.load();
    },
  };
}

/** Creates the controller over a fresh real audio element (app boundary). */
export function createWorkoutMusic(): WorkoutMusicController {
  return createSessionMusicController(new Audio());
}
