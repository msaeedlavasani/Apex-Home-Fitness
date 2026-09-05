/**
 * cameraConsentService — camera/pose consent-state contract (CP-04).
 *
 * This service is the **two-layer consent contract** for the CP-04 camera
 * surface. It is intentionally **not** a camera module and does **not** invoke
 * any browser camera, on-device inference, or persistent storage here.
 *
 * Two-layer model (matches `CP-04-COMPANION-CAMERA-ARCHITECTURE.md` §5.2):
 *   1. Browser camera permission — the web-platform decision (out of this
 *      service's control; the app must respect it and degrade gracefully).
 *   2. Product pose-tracking purpose consent — the app-level, purpose-bound
 *      record of consent to use camera-derived movement observation for the
 *      stated purpose. This is what this module stores/revokes.
 *
 * Defaults / posture (from the architecture doc §6):
 *   - Accountability-only consent records — purpose/scope/state/version/
 *     timestamps. No raw sensor content, no frames, no keypoints, no per-rep
 *     observations are stored as part of the consent record.
 *   - Default posture: **non-persistence unless explicitly chosen**. This module
 *     manages consent intent in-memory only; nothing persists derived metrics
 *     here. If a persistence store is ever added, it must be under an explicit
 *     purpose+retention+deletion decision — not the accidental path.
 *   - Revocable independently of the browser permission — the product consent
 *     layer can be revoked without touching the browser permission, and revoking
 *     must never degrade the core workout below its consented baseline (no-camera
 *     fallback is binding — CP-01/CP-03 outcome).
 *
 * Server-only. Call from Route Handlers / Server Actions; never from client
 * code. Not an inference pipeline — the on-device MoveNet/TF.js boundary lives
 * in `src/services/cameraService.ts` (not invoked here).
 */
// ---------------------------------------------------------------------------
// Consent types
// ---------------------------------------------------------------------------

/** Purpose-bounded scope(s) the product may use pose-tracking observation for.
 *  This is the app-level, purpose-bound consent vocabulary (not the browser
 *  permission). Aligns with the CP-04 architecture doc §5.2 two-layer model.
 */
export type CameraConsentScope =
  | 'poseTracking:squat'
  | 'poseTracking:pushup'
  | 'poseTracking:hinge'
  | 'poseTracking:lunge'
  | 'poseTracking:genericMovementObservation';

/** Product consent state. Outcome of the purpose-bounded consent decision. */
export type CameraConsentState =
  | {state: 'granted'; grantedAt: Date; scopes: readonly CameraConsentScope[]; version: number}
  | {state: 'revokedLater'; grantedAt: Date; revokedAt: Date; scopes: readonly CameraConsentScope[]; version: number};

/** What the product consents to for a given session/user. */
export interface CameraConsentRecord {
  /** Supabase auth user id (also the Prisma User.id — identity contract). */
  userId: string;
  /** Purpose-bounded scope(s) consented to. */
  scopes: readonly CameraConsentScope[];
  /** Consent version used when granted/revoked — so future consent/retention
   *  changes are traceable (per the architecture doc §5.3). */
  version: number;
  /** When the current consent decision took effect. */
  effectiveAt: Date;
  /** When the current consent state began. */
  since: Date;
  /** Explicit state — revocations are separable from grant. */
  state: CameraConsentState['state'];
  /** When revoked — only meaningfully set for `revokedLater`. */
  grantedAt: Date;
  revokedAt?: Date | null;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type CameraConsentErrorCode = 'CONSENT_STATE_INVALID' | 'USER_NOT_FOUND';

export class CameraConsentError extends Error {
  readonly code: CameraConsentErrorCode;
  constructor(code: CameraConsentErrorCode, message: string) {
    super(message);
    this.name = 'CameraConsentError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Compile the final effective scope list for the in-session consent record. */
export function activeScopes(record: CameraConsentRecord): readonly CameraConsentScope[] {
  if (record.state === 'revokedLater') return [];
  return record.scopes;
}

/** Whether pose-tracking is currently consented for this record. */
export function isPoseTrackingConsented(record: CameraConsentRecord): boolean {
  return record.state === 'granted' && record.scopes.length > 0;
}

/** Stable snapshot of the current consent state for in-session use. */
export function consentSnapshot(record: CameraConsentRecord): {
  consented: boolean;
  scopes: readonly CameraConsentScope[];
  version: number;
  since: Date;
  state: CameraConsentState['state'];
} {
  return record.state === 'revokedLater'
    ? {
        consented: false,
        scopes: [] as const,
        version: record.version,
        since: record.since,
        state: 'revokedLater' as const,
      }
    : {
        consented: true,
        scopes: record.scopes,
        version: record.version,
        since: record.since,
        state: 'granted' as const,
      };
}

// ---------------------------------------------------------------------------
// Contract-style in-memory consent state (ready for a real store later)
//
// This is an in-memory store keyed by userId. It is **NOT** a persistence
// mechanism for derived metrics, and it does **NOT** persist anything here.
// If/when a persistent consent-state table is ever added, it must be under an
// explicit purpose+retention+deletion decision — not the default path.
// ---------------------------------------------------------------------------

const consentByUser = new Map<string, CameraConsentRecord>();

/** Clears this module's in-memory consent state. Only used for testing. */
export function resetForTest(): void {
  consentByUser.clear();
}

// ---------------------------------------------------------------------------
// Consent operations
// ---------------------------------------------------------------------------

/** Returns the current consent record for the given identity, or null if none. */
export function getConsent(userId: string): CameraConsentRecord | null {
  return consentByUser.get(userId) ?? null;
}

/** Grants pose-tracking purpose consent for the given identity.
 *  Revocations and re-grants are tracked separately (revokedLater state).
 *
 *  Default posture: this only records consent intent. No derived metric is
 *  persisted as a side effect of granting consent.
 */
export function grantConsent(
  userId: string,
  {
    scopes,
    version,
  }: {scopes: readonly CameraConsentScope[]; version: number},
): CameraConsentRecord {
  const existing = consentByUser.get(userId);
  const prior = existing ?? {
    state: 'revokedLater' as const,
    grantedAt: new Date(),
    revokedAt: new Date(),
    version: 0,
    scopes: [] as const,
    since: new Date(),
  };

  const record: CameraConsentRecord = {
    userId,
    scopes,
    version,
    effectiveAt: new Date(),
    since: new Date(),
    state: 'granted',
    grantedAt: prior.grantedAt ?? new Date(),
    revokedAt: null,
  };

  consentByUser.set(userId, record);
  return record;
}

/** Revokes the product pose-tracking purpose consent for the given identity.
 *  Revocation is independent of the browser permission (the browser permission
 *  is the platform decision; this grant record can be revoked separately).
 *
 *  Default posture: revocation clears the in-memory consent record and produces
 *  a `revokedLater` record so the revocation is auditable. No derived metric is
 *  persisted as a side effect of revocation.
 */
export function revokeConsent(userId: string): CameraConsentRecord {
  const existing = consentByUser.get(userId);
  if (!existing) {
    // Revoking with no prior grant creates a sentinel `revokedLater` record so
    // the revocation path is auditable and idempotent.
    const priorScopes: readonly CameraConsentScope[] = [];
    const priorVersion = 0;
    const priorGrantedAt = new Date();
    const record: CameraConsentRecord = {
      userId,
      scopes: priorScopes,
      version: priorVersion,
      effectiveAt: new Date(),
      since: new Date(),
      state: 'revokedLater',
      grantedAt: priorGrantedAt,
      revokedAt: new Date(),
    };
    consentByUser.set(userId, record);
    return record;
  }

  const revoked: CameraConsentRecord = {
    ...existing,
    state: 'revokedLater',
    revokedAt: new Date(),
  };
  consentByUser.set(userId, revoked);
  return revoked;
}

/** Replaces the consent record for the given identity (used when consent scope
 *  or version is re-granted after a revocation). */
export function setConsent(record: CameraConsentRecord): CameraConsentRecord {
  consentByUser.set(record.userId, record);
  return record;
}

// ---------------------------------------------------------------------------
// Persistence contract (documented stub — NOT implemented here)
//
// The architecture doc leaves the persistence decision to an explicit
// purpose+retention+deletion policy. This module's contract is:
//   - consent intent (the four fields above) MAY be persisted when the policy
//     decision is made;
//   - derived C2 metrics are NEVER persisted by default;
//   - any persistence must be under that explicit policy, not the default path.
//
// This section documents the interface so a later implementation pass can add a
// persistence store without reshaping the contract.
// ---------------------------------------------------------------------------

/** Shape of a persisted consent-state row (if/when the policy decision is made).
 *  This is documentation of the contract, not an active schema today.
 *
 *  Columns that would be required by the TS-01 retention/deletion guarantees:
 *    - userId (identity = Prisma User.id)
 *    - scopes (the purpose-bounded scope set, serialized)
 *    - version (consent version used when granted/revoked)
 *    - effectiveAt (the consent decision took effect at this time)
 *    - since (the consent state began at this time)
 *    - state (granted / revokedLater)
 *    - revokedAt (nullable; when the current state was revoked)
 *
 *  No frame/keypoint/per-rep raw content ever lands here — accountability only.
 */
export interface PersistedCameraConsentRow {
  userId: string;
  scopes: readonly CameraConsentScope[];
  version: number;
  effectiveAt: Date;
  since: Date;
  state: CameraConsentState['state'];
  revokedAt?: Date | null;
}

/** Stub signature for a persistence store — NOT implemented here.
 *
 *  Implement only when the explicit purpose+retention+deletion policy decision
 *  is made (and the legal wording from TS-02 is in place).
 */
export interface CameraConsentPersistence {
  read(userId: string): Promise<PersistedCameraConsentRow | null>;
  write(record: PersistedCameraConsentRow): Promise<void>;
  deletionForUser(userId: string): Promise<void>;
}

/** NO-OP persistence stub that keeps the default posture explicit: nothing is
 *  persisted unless a real `CameraConsentPersistence` implementation is wired in
 *  under an explicit policy decision.
 */
export const noOpCameraConsentPersistence: CameraConsentPersistence = {
  async read() {
    return null;
  },
  async write() {
    // no-op — default posture: non-persistence unless explicitly chosen
  },
  async deletionForUser() {
    // no-op — nothing to delete until persistence exists
  },
};
