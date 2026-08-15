/**
 * audioService
 * ------------
 * Client-side workout sound effects generated with the Web Audio API.
 *
 * No audio assets are required — every cue ('start', 'end', 'countdown') is
 * synthesized as a short oscillator tone or a small arpeggio, which keeps the
 * bundle tiny and avoids runtime loading of MP3/WAV files.
 *
 * Design notes:
 * - The `AudioContext` is created lazily on the first call and shared for the
 *   lifetime of the page. All functions are no-ops outside the browser (SSR /
 *   prerendering) or when audio is unsupported, so they can be called from any
 *   client component without try/catch.
 * - Browsers only let audio start inside a user gesture. Call `unlockAudio()`
 *   from an early interaction (e.g. a `pointerdown` listener) so the context
 *   is created/resumed inside the activation window; every playback function
 *   also attempts a resume so sound works even if unlocking was missed.
 * - `setSoundMuted()` / `setSoundVolume()` let the app expose audio controls
 *   without touching the oscillator logic.
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type SoundName = 'start' | 'end' | 'countdown';

/**
 * Plays the "start" cue: a short ascending arpeggio (C5 → E5 → G5) used when
 * a workout, set or rest period begins.
 */
export function playStartSound(): void {
  const ctx = ensureContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(523.25, t, 0.12, 'sine', 0.65); // C5
  playTone(659.25, t + 0.09, 0.12, 'sine', 0.65); // E5
  playTone(783.99, t + 0.18, 0.24, 'sine', 0.75); // G5
}

/**
 * Plays the "end" cue: a short descending arpeggio (G5 → E5 → C5) used when
 * a set or rest period ends and when the workout completes.
 */
export function playEndSound(): void {
  const ctx = ensureContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(783.99, t, 0.12, 'sine', 0.65); // G5
  playTone(659.25, t + 0.09, 0.12, 'sine', 0.65); // E5
  playTone(523.25, t + 0.18, 0.26, 'sine', 0.75); // C5
}

/**
 * Plays a countdown tick. Pass `final` for the last tick before the phase
 * switches (a longer, brighter "go" tone instead of the short tick).
 */
export function playCountdownSound(final = false): void {
  const ctx = ensureContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  if (final) {
    // B5 — longer, brighter "go!" tone.
    playTone(987.77, t, 0.3, 'triangle', 0.7);
  } else {
    // A5 — short neutral tick for the 3…2 countdown.
    playTone(880, t, 0.09, 'sine', 0.55);
  }
}

/** Dispatcher helper for callers that work with `SoundName` values. */
export function playSound(name: SoundName): void {
  switch (name) {
    case 'start':
      playStartSound();
      break;
    case 'end':
      playEndSound();
      break;
    case 'countdown':
      playCountdownSound(false);
      break;
  }
}

/**
 * Creates (or resumes) the shared AudioContext. Call this from a user gesture
 * — e.g. a one-time `pointerdown`/`keydown` listener — so subsequent sounds
 * play immediately instead of waiting for another interaction.
 */
export function unlockAudio(): void {
  const ctx = ensureContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined);
  }
}

/** Whether the browser can synthesize audio with the Web Audio API. */
export function isAudioAvailable(): boolean {
  return typeof window !== 'undefined' && getContextConstructor() != null;
}

/** Mutes/unmutes all synthesized sounds (ramps the master gain). */
export function setSoundMuted(next: boolean): void {
  muted = next;
  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(next ? 0 : volume, audioContext.currentTime, 0.01);
  }
}

export function isSoundMuted(): boolean {
  return muted;
}

/** Sets the master output volume in the range [0, 1] (default 0.25). */
export function setSoundVolume(next: number): void {
  volume = Math.min(1, Math.max(0, next));
  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(muted ? 0 : volume, audioContext.currentTime, 0.01);
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;
let volume = 0.25;

type AudioContextConstructor = typeof AudioContext;

function getContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  return ctor ?? null;
}

/** Lazily creates the shared AudioContext and master gain bus. */
function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioContext) {
    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => undefined);
    }
    return audioContext;
  }

  const Ctor = getContextConstructor();
  if (!Ctor) return null;

  try {
    audioContext = new Ctor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = muted ? 0 : volume;
    masterGain.connect(audioContext.destination);
  } catch {
    audioContext = null;
    masterGain = null;
  }
  return audioContext;
}

/**
 * Schedules a single tone with a short attack and exponential decay so there
 * are no clicks. `startTime` is relative to the shared context clock; tones
 * may be stacked with offsets to build arpeggios.
 */
function playTone(
  frequency: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  peak = 0.7
): void {
  const ctx = ensureContext();
  if (!ctx || !masterGain || muted) return;

  try {
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // Fast attack, exponential release (never reaches exactly 0).
    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(peak, startTime + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(envelope);
    envelope.connect(masterGain);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.05);
  } catch {
    // A failed schedule is never worth breaking the workout UI over.
  }
}

export default {
  playStartSound,
  playEndSound,
  playCountdownSound,
  playSound,
  unlockAudio,
  isAudioAvailable,
  setSoundMuted,
  isSoundMuted,
  setSoundVolume,
};
