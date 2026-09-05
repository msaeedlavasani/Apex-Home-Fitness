/**
 * consentEntity — client-side camera/pose consent state manager (CP-04/CP-06).
 *
 * Pure, framework-independent, in-memory only. No persistence, no browser
 * camera, no inference. Manages the two-layer consent contract for the
 * workout consent UX.
 *
 * Default posture: non-persistence. Consent state lives only for the
 * duration of the session/page load.
 */

export type ConsentScope =
  | 'poseTracking:squat'
  | 'poseTracking:pushup'
  | 'poseTracking:hinge'
  | 'poseTracking:lunge'
  | 'poseTracking:genericMovementObservation';

export type ConsentStatus = 'granted' | 'revoked';

export interface ConsentRecord {
  status: ConsentStatus;
  scopes: readonly ConsentScope[];
  version: number;
  grantedAt?: number;
  revokedAt?: number;
}

export interface ConsentSnapshot {
  consented: boolean;
  scopes: readonly ConsentScope[];
  version: number;
  status: ConsentStatus;
}

export class ConsentEntity {
  private record: ConsentRecord = {status: 'revoked', scopes: [], version: 0};

  grant(scopes: readonly ConsentScope[], version: number): ConsentSnapshot {
    this.record = {
      status: 'granted',
      scopes: [...scopes],
      version,
      grantedAt: Date.now(),
    };
    return this.snapshot();
  }

  revoke(): ConsentSnapshot {
    this.record = {
      status: 'revoked',
      scopes: [],
      version: 0,
      revokedAt: Date.now(),
    };
    return this.snapshot();
  }

  snapshot(): ConsentSnapshot {
    if (this.record.status === 'revoked') {
      return {consented: false, scopes: [], version: 0, status: 'revoked'};
    }
    return {
      consented: this.record.scopes.length > 0,
      scopes: this.record.scopes,
      version: this.record.version,
      status: 'granted',
    };
  }

  isConsented(): boolean {
    return this.record.status === 'granted' && this.record.scopes.length > 0;
  }

  currentScopes(): readonly ConsentScope[] {
    return this.record.status === 'granted' ? this.record.scopes : [];
  }
}
