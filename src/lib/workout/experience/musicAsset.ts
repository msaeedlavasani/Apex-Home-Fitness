/**
 * Workout Music asset registry (§21) — the OWNER-SUPPLIED canonical track.
 *
 * Exactly one asset, served through the repository-native static boundary
 * (`public/`, `media-src 'self'` already permits it). The file is a
 * SHA-256-verified copy of the Owner-supplied `Music.mp3`
 * (sha256 2758d88722b6ce16cf261fd6024ff088e3907803d21e062b4f89efb53e74801a).
 * No substitution, no second source, no base64 embedding.
 */

export const WORKOUT_MUSIC_SRC = '/audio/workout/music.mp3';
