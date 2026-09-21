import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  cameraCapabilityUnavailable,
  initialCapabilityGateState,
} from '../src/lib/workout/capabilityGate';
import {resolveRuntimeExecution, capabilityUsableForSquat} from '../src/lib/workout/executionStrategy';
import {sharedPrescriptionFromPersistedPlan} from '../src/lib/workout/prescriptionContract';

test('pre-workout gate has explicit calibration state and no-tracking continuation', () => {
  assert.equal(initialCapabilityGateState().status, 'CHECKING');
  assert.equal(cameraCapabilityUnavailable('declined').status, 'READY');
  assert.equal(cameraCapabilityUnavailable('declined').capability.calibration, 'UNAVAILABLE');
});

test('tracking capability is only usable after the explicit harness/calibration snapshot', () => {
  const prescription = sharedPrescriptionFromPersistedPlan([
    {id: 'entry-1', name: 'Bodyweight Squat', sets: 1, reps: 8, fallbackDurationSeconds: 45},
  ]).exercises[0]!;
  assert.equal(resolveRuntimeExecution(prescription, capabilityUsableForSquat()).strategy, 'TRACKED_REP');
  assert.equal(resolveRuntimeExecution(prescription, cameraCapabilityUnavailable().capability).strategy, 'TIMED_FALLBACK');
});

test('the client launch path records initialization and calibration before READY', async () => {
  const source = await fs.readFile('src/components/workout/useWorkoutCapabilityGate.tsx', 'utf8');
  assert.match(source, /status: 'INITIALIZING'/);
  assert.match(source, /status: 'CALIBRATING'/);
  assert.match(source, /preparePoseHarness\(\)/);
  assert.match(source, /status: 'READY'/);
});
