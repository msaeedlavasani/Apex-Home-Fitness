import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {cameraObservationSessionGate, cameraPoseConsented} from '../src/lib/observation/cameraGate';

describe('CP-04 camera observation gate', () => {
  it('requires explicit product consent and a relevant active movement', () => {
    assert.equal(cameraPoseConsented({consented: false, scopes: ['poseTracking:squat']}), false);
    assert.deepEqual(
      cameraObservationSessionGate(
        {consented: false, scopes: []},
        {active: true, movementKind: 'squat', movementPosition: 0, setNumber: 1},
      ),
      {passed: false, reason: 'pose-tracking consent absent'},
    );
    assert.deepEqual(
      cameraObservationSessionGate(
        {consented: true, scopes: ['poseTracking:squat']},
        {active: false, movementKind: 'squat'},
      ),
      {passed: false, reason: 'session not active'},
    );
  });

  it('passes only for a consented active relevant session', () => {
    assert.deepEqual(
      cameraObservationSessionGate(
        {consented: true, scopes: ['poseTracking:squat']},
        {active: true, movementKind: 'squat', movementPosition: 0, setNumber: 1},
      ),
      {passed: true},
    );
  });
});
