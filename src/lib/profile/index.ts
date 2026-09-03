/**
 * Personal Movement Profile public entry point (AL-02).
 *
 * Exposes the profile-snapshot contract types, the closed inferred-signal
 * vocabularies with runtime guards, the deterministic fail-closed validator,
 * and the pure windowed activity aggregate over observed training history.
 * This domain is PURE and framework-independent — no Prisma, React,
 * services, or runtime side effects. Nothing in the application imports
 * this module yet (no runtime behavior change by design).
 */

export {
  ADHERENCE_TIERS,
  CAPABILITY_TIERS,
  MOVEMENT_TRENDS,
  PROFILE_CONTRACT_VERSION,
  PROFILE_SEVERITIES,
  isAdherenceTier,
  isCapabilityTier,
  isMovementTrend,
  isProfileSeverity,
  profileActivitySummary,
  validateProfileSnapshot,
  type AdherenceTier,
  type CapabilityTier,
  type InferredSignals,
  type MovementTrend,
  type ObservedSignals,
  type ProfileActivitySummary,
  type ProfileAsymmetryObservation,
  type ProfileContractVersion,
  type ProfileDifficultyReport,
  type ProfileEquipmentPosture,
  type ProfileFeedbackEntry,
  type ProfileFormObservation,
  type ProfileInference,
  type ProfileMovementPerformance,
  type ProfileMovementSubject,
  type ProfilePreferences,
  type ProfilePrivacyPosture,
  type ProfileProblem,
  type ProfileProblemKind,
  type ProfileSeverity,
  type ProfileSnapshot,
  type ProfileTrainingSession,
  type ProfileValidation,
} from './types';
