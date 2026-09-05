/**
 * cameraService — on-device MoveNet/TF.js inference **boundary** (CP-04).
 *
 * This module is the **boundary contract** for on-device pose/landmark inference.
 * It is intentionally **NOT** a camera module and does **NOT**:
 *   - access the browser camera,
 *   - run inference here,
 *   - persist any frames, keypoints, or derived metrics,
 *   - require or assume any browser permission,
 *   - ship any network calls or storage writes.
 *
 * It exists so the future camera-surface implementation can import a typed,
 * consent-gated inference boundary without re-deriving the privacy contract.
 *
 * Pipeline shape (from `CP-04-COMPANION-CAMERA-ARCHITECTURE.md` §4.2):
 *   Capture (browser, in-session, short-lived buffer)
 *     → on-device MoveNet/TF.js inference (C1 stays on-device)
 *     → derive CP-02 C2 signals (REP_COUNT / SET_TIMING / REP_TIMING /
 *       REST_TIMING / FORM_PROXY) — `DEVICE_MEASURED` source
 *     → feed the Companion observation + CP-02 model
 *     → (only if a purpose+retention+deletion policy is explicitly chosen)
 *       persist derived C2 under that policy
 *
 * Hard constraints enforced by this boundary:
 *   - Raw video (C1) never leaves the device and is never persisted here.
 *   - Only derived C2 metrics are persistence candidates, and only under an
 *     explicit purpose+retention+deletion policy — never by default.
 *   - The `DEVICE_MEASURED` observation source is gated by
 *     `cameraConsentService.isPoseTrackingConsented` (this module does not
 *     emit a `DEVICE_MEASURED` signal unless that gate passes).
 *   - Only a consented, actively-exercising session with a relevant movement
 *     may run inference (session gate).
 *
 * Default posture:
 *   - Default posture: **non-persistence of derived metrics unless explicitly
 *     chosen.** This module never writes anything to a store.
 *   - Default posture: **no camera inference runs here.** This module only
 *     documents the boundary and the gates.
 *
 * Server-only / boundary contract only. Not a runtime camera module. Not a
 * production Service-Role call site.
 */
import { CameraConsentRecord, CameraConsentScope, CameraConsentState, consentSnapshot } from './cameraConsentService';
import { ObservationSource, FormProxySource } from '@/lib/observation';

// ---------------------------------------------------------------------------
// Consent gate (enforced at the boundary)
// ---------------------------------------------------------------------------

/** Shape of the consent snapshot passed through the boundary. */
export interface ConsentSnapshotContract {
  consented: boolean;
  scopes: readonly CameraConsentScope[];
  version: number;
  since: Date;
  state: CameraConsentState['state'];
}

/** Whether the in-session consent record currently permits pose-tracking
 *  observation for the active session.
 *
 *  Used as the gate at the inference boundary: a `DEVICE_MEASURED` observation
 *  must not be produced unless this gate passes.
 */
export function cameraPoseConsented(snapshot: ConsentSnapshotContract): boolean {
  return snapshot.consented && snapshot.scopes.length > 0;
}

// ---------------------------------------------------------------------------
// Inference boundary contract (NOT a runtime implementation)
// ---------------------------------------------------------------------------

/** A single in-session on-device inference “frame” boundary record.
 *
 *  This is documentation of the boundary contract. No real camera frames,
 *  keypoints, or derived metrics are produced by this module. When a real
 *  on-device inference pass is later wired, it will produce records shaped
 *  like this and feed them through the token-boundary contract below.
 */
export interface OnDeviceInferenceFrame<TAttrs = Record<string, unknown>> {
  readonly boundaryHandle: string;
  readonly at: Date;
  readonly config: OnDeviceInferenceConfig;
  readonly consentGate: boolean;
  readonly sessionGate: boolean;
  readonly processed: boolean;
  readonly attrs: TAttrs;
}

/** On-device inference session config — the shape of the config the future
 *  runtime would pass in. Boundary contract only. */
export interface OnDeviceInferenceConfig {
  readonly movementKind: string;
  readonly fpsTarget?: number;
  readonly resolution?: {width: number; height: number};
  readonly model: 'Lightning' | 'Thunder';
  readonly source: 'DEVICE_MEASURED';
}

/** A CP-02-aligned, on-device-derived observation candidate.
 *
 *  This is the **boundary shape** for a derived C2 metric before any
 *  (explicit, future) persistence decision. It is NOT persisted by this module.
 *  If/when persistence is ever chosen, it must be under an explicit
 *  purpose+retention+deletion policy — never the default path.
 *
 *  Type-level alignment with CP-02:
 *    - source is `DEVICE_MEASURED` (closed CP-02 source vocabulary)
 *    - confidence is 0..1 and carried on every measured signal
 */
export interface OnDeviceObservationCandidate {
  readonly source: ObservationSource;
  readonly formProxySource?: FormProxySource;
  readonly attribution: {
    readonly userId: string;
    readonly sessionBoundaryHandle: string;
    readonly movementKind: string;
    readonly movementPosition?: number | null;
    readonly setNumber?: number | null;
  };
  readonly producedAt: Date;
  readonly observation: {
    readonly confidence: number;
  } & (
    | {kind: 'rep'; attrs: {repIndex: number; repSeconds: number}}
    | {kind: 'setTiming'; attrs: {activeSeconds: number; plannedSeconds?: number | null}}
    | {kind: 'restTiming'; attrs: {restSeconds: number; plannedRestSeconds?: number | null}}
    | {kind: 'formProxy'; attrs: {proxy: Exclude<NonNullable<FormProxySource>, 'USER_REPORTED'>; severity?: 1 | 2 | 3; note?: string}}
  );
  readonly persisted: false;
}

/** Creates an on-device inference boundary handle for a consented session. */
export function newOnDeviceBoundaryHandle(): string {
  // Stable-ish identifier for the in-session boundary (no persistence, no
  // camera access, no inference here).
  return crypto.randomUUID();
}

/** Builds a boundary record for a consented, actively-exercising session.
 *
 *  This does NOT run inference, access the camera, or persist anything.
 *  It only documents the boundary contract so a future runtime can wire the
 *  actual MoveNet/TF.js pass.
 */
export function buildOnDeviceInferenceFrame<TAttrs>(
  attrs: TAttrs,
  sessionState: SessionGateInputs,
  consentRecord: CameraConsentRecord,
  config: OnDeviceInferenceConfig,
): OnDeviceInferenceFrame<TAttrs> {
  const snapshot = consentSnapshot(consentRecord);
  const sessionGate = assessSessionGate(snapshot, sessionState);
  const consentGate = cameraPoseConsented(snapshot);
  const processed = sessionGate.passed && consentGate;

  return {
    boundaryHandle: newOnDeviceBoundaryHandle(),
    at: new Date(),
    config,
    consentGate,
    sessionGate: sessionGate.passed,
    processed,
    attrs,
  };
}

/** Builds a CP-02-aligned observation candidate from a processed boundary.
 *
 *  This does NOT persist anything. Default posture: non-persistence unless
 *  explicitly chosen.
 */
export function buildOnDeviceObservationCandidate(
  boundary: OnDeviceInferenceFrame<Record<string, unknown>>,
  observation: OnDeviceObservationCandidate['observation'],
  attribution: OnDeviceObservationCandidate['attribution'],
): OnDeviceObservationCandidate {
  if (!boundary.processed) {
    // Do not even produce a candidate if the session/consent gate did not pass.
    throw new Error('camera-boundary not processed');
  }
  return {
    source: 'DEVICE_MEASURED',
    producedAt: new Date(),
    observation,
    attribution,
    persisted: false,
  };
}

// ---------------------------------------------------------------------------
// Derived metric persistence guard (documented stub — NOT implemented here)
// ---------------------------------------------------------------------------

/** Builds a **persisted** derived C2 metric record **only if** the explicit
 *  purpose+retention+deletion policy has been chosen and a real persistence
 *  store is wired.
 *
 *  Default posture: **non-persistence unless explicitly chosen.** This function
 *  throws if no explicit policy is in place — so the default path cannot
 *  accidentally persist derived metrics.
 */
export function buildPersistedDerivedMetric(
  candidate: OnDeviceObservationCandidate,
  policyDecision: {purpose: string; retentionPeriodMs: number} | null,
): {persisted: true; record: {policyDecision: {purpose: string; retentionPeriodMs: number}; candidate: OnDeviceObservationCandidate}} {
  if (!policyDecision) {
    throw new Error('camera-derived metrics are not persisted by default — no explicit purpose+retention policy selected');
  }
  return {
    persisted: true,
    record: {policyDecision, candidate},
  };
}

// ---------------------------------------------------------------------------
// Session gate
// ---------------------------------------------------------------------------

/** A session gate check: the future runtime must pass this before inference
 *  for a consented, actively-exercising session with a relevant movement.
 */
export interface SessionGateResult {
  readonly passed: boolean;
  readonly reason?: string;
}

/** Session gate inputs. */
export interface SessionGateInputs {
  readonly active: boolean;
  readonly movementKind?: string | null;
  readonly movementPosition?: number | null;
  readonly setNumber?: number | null;
}

/** Returns whether inference may run for the given in-session context.
 *
 *  Session gate (from §4.3 / CP-01/CP-03 outcome):
 *    - Informed consent for pose-tracking (cameraConsentService.isPoseTrackingConsented)
 *    - Active session (not stale/ended)
 *    - Actively exercising a movement that is relevant to on-device observation
 *      (so inference is not ambient)
 *
 *  If the gate does not pass, inference must not run for this session/boundary.
 */
export function assessSessionGate(
  snapshot: ConsentSnapshotContract,
  sessionState: SessionGateInputs,
): SessionGateResult {
  if (!snapshot.consented || snapshot.scopes.length === 0) {
    return {passed: false, reason: 'pose-tracking consent absent'};
  }
  if (!sessionState.active) {
    return {passed: false, reason: 'session not active'};
  }
  if (!sessionState.movementKind) {
    return {passed: false, reason: 'no relevant movement'};
  }
  return {passed: true};
}
