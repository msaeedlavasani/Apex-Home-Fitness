/** CP-07 — in-memory Movement Observation runtime tests. */
import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {createMovementObservationRuntime, type RepCountSignal, type SetTimingSignal} from '../src/lib/observation';

const clock = {now: () => 2_000};
const rep = (over: Partial<RepCountSignal> = {}): RepCountSignal => ({
  kind: 'REP_COUNT', signalId: 'rep-1', dateKey: '2026-09-07', exerciseIndex: 0, set: 1,
  observedReps: 9, plannedReps: 10, source: 'DEVICE_MEASURED', confidence: 0.9, ...over,
});
const timing = (over: Partial<SetTimingSignal> = {}): SetTimingSignal => ({
  kind: 'SET_TIMING', signalId: 'time-1', dateKey: '2026-09-07', exerciseIndex: 0, set: 1,
  activeSeconds: 40, plannedSeconds: 45, source: 'DEVICE_MEASURED', confidence: 0.8, ...over,
});

describe('createMovementObservationRuntime', () => {
  it('records validated CP-02 signals in memory and never marks them persisted', () => {
    const runtime = createMovementObservationRuntime({sessionId: 'session-1', clock, idFactory: () => 'obs-1'});
    runtime.beginSet({exerciseIndex: 0, set: 1, plannedReps: 10, startedAt: 1_000});
    assert.deepEqual(runtime.appendSignal(rep()), {accepted: true, problems: []});
    assert.deepEqual(runtime.appendSignal(timing()), {accepted: true, problems: []});
    const record = runtime.completeSet({endedAt: 2_000});
    assert.equal(record.status, 'OBSERVED');
    assert.equal(record.source, 'DEVICE_MEASURED');
    assert.equal(record.summary?.observedReps, 9);
    assert.equal(record.summary?.activeSeconds, 40);
    assert.equal(record.durationSeconds, 1);
    assert.equal(record.persisted, false);
    assert.equal(runtime.records().length, 1);
  });

  it('rejects malformed signals and does not turn them into observations', () => {
    const runtime = createMovementObservationRuntime({sessionId: 'session-1', clock});
    runtime.beginSet({exerciseIndex: 0, set: 1});
    const result = runtime.appendSignal(rep({observedReps: -1}));
    assert.equal(result.accepted, false);
    assert.ok(result.problems.some((problem) => problem.kind === 'NEGATIVE_VALUE'));
    const record = runtime.completeSet({endedAt: 2_000});
    assert.equal(record.status, 'UNOBSERVABLE');
    assert.equal(record.summary, null);
    assert.match(record.uncertaintyReason ?? '', /no validated/);
  });

  it('records explicit uncertainty without claiming failure or zero reps', () => {
    const runtime = createMovementObservationRuntime({sessionId: 'session-1', clock, idFactory: () => 'obs-uncertain'});
    const record = runtime.recordUncertain({
      exerciseIndex: 1, set: 2, plannedReps: 12, reason: 'camera consent revoked during set',
      startedAt: 3_000, endedAt: 4_000,
    });
    assert.equal(record.status, 'UNCERTAIN');
    assert.equal(record.source, 'UNKNOWN');
    assert.equal(record.summary, null);
    assert.equal(record.plannedReps, 12);
    assert.equal(record.uncertaintyReason, 'camera consent revoked during set');
    assert.equal('observedReps' in record, false);
  });

  it('cancels an active set as uncertainty without inventing a count', () => {
    const runtime = createMovementObservationRuntime({sessionId: 'session-1', clock, idFactory: () => 'obs-cancel'});
    runtime.beginSet({exerciseIndex: 0, set: 1, plannedReps: 10});
    const record = runtime.cancelActive('camera consent revoked');
    assert.equal(record.status, 'UNCERTAIN');
    assert.equal(record.uncertaintyReason, 'camera consent revoked');
    assert.equal(record.summary, null);
  });

  it('requires one active set and rejects cross-set signals', () => {
    const runtime = createMovementObservationRuntime({sessionId: 'session-1', clock});
    assert.throws(() => runtime.completeSet(), /no active set/);
    runtime.beginSet({exerciseIndex: 0, set: 1});
    const result = runtime.appendSignal(rep({exerciseIndex: 1}));
    assert.equal(result.accepted, false);
    assert.ok(result.problems.some((problem) => problem.kind === 'BAD_ANCHOR'));
    assert.throws(() => runtime.beginSet({exerciseIndex: 0, set: 2}), /already has/);
  });
});
