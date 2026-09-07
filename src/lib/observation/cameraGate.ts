import type {ConsentScope} from '@/lib/workout/consentEntity';

/** Client-safe CP-04 consent/session gate primitives. */
export interface CameraGateSnapshot {
  readonly consented: boolean;
  readonly scopes: readonly ConsentScope[];
}

export interface CameraSessionGateInput {
  readonly active: boolean;
  readonly movementKind?: string | null;
  readonly movementPosition?: number | null;
  readonly setNumber?: number | null;
}

export interface CameraSessionGateResult {
  readonly passed: boolean;
  readonly reason?: string;
}

export function cameraPoseConsented(snapshot: CameraGateSnapshot): boolean {
  return snapshot.consented && snapshot.scopes.length > 0;
}

export function cameraObservationSessionGate(
  snapshot: CameraGateSnapshot,
  session: CameraSessionGateInput,
): CameraSessionGateResult {
  if (!cameraPoseConsented(snapshot)) return {passed: false, reason: 'pose-tracking consent absent'};
  if (!session.active) return {passed: false, reason: 'session not active'};
  if (!session.movementKind) return {passed: false, reason: 'no relevant movement'};
  return {passed: true};
}
