/**
 * CP-02 — Observation signal model tests.
 *
 * Covers the typed in-session signal contract: closed vocabularies + guards,
 * fail-closed per-kind validation (including the refusal of device-measured
 * form proxies until CP-03 validates proxy definitions), and the pure
 * deterministic per-set aggregation (latest-wins, median tempo, worst-severity
 * escalation, sorted/deduped sources, deterministic ordering).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FORM_PROXY_KINDS,
  FORM_PROXY_SOURCES,
  OBSERVATION_SOURCES,
  isFormProxyKind,
  isFormProxySource,
  isObservationSource,
  summarizeSetSignals,
  validateObservationSignal,
} from '../src/lib/observation';
import type { ObservationSignal, RepCountSignal, SetTimingSignal, FormProxySignal, RepTimingSignal, RestTimingSignal } from '../src/lib/observation';

const D = '2026-09-03';

function repCount(over: Partial<RepCountSignal> = {}): RepCountSignal {
  return {
    kind: 'REP_COUNT',
    signalId: 'sig-rep-1',
    dateKey: D,
    exerciseIndex: 0,
    set: 1,
    observedReps: 12,
    source: 'USER_REPORTED',
    confidence: 1,
    ...over,
  };
}

function setTiming(over: Partial<SetTimingSignal> = {}): SetTimingSignal {
  return {
    kind: 'SET_TIMING',
    signalId: 'sig-set-1',
    dateKey: D,
    exerciseIndex: 0,
    set: 1,
    activeSeconds: 40,
    source: 'DEVICE_MEASURED',
    confidence: 0.9,
    ...over,
  };
}

function repTiming(over: Partial<RepTimingSignal> = {}): RepTimingSignal {
  return {
    kind: 'REP_TIMING',
    signalId: 'sig-rep-t-1',
    dateKey: D,
    exerciseIndex: 0,
    set: 1,
    repIndex: 1,
    repSeconds: 2.5,
    source: 'DEVICE_MEASURED',
    confidence: 0.85,
    ...over,
  };
}

function restTiming(over: Partial<RestTimingSignal> = {}): RestTimingSignal {
  return {
    kind: 'REST_TIMING',
    signalId: 'sig-rest-1',
    dateKey: D,
    exerciseIndex: 0,
    set: 1,
    restSeconds: 45,
    source: 'USER_REPORTED',
    confidence: 1,
    ...over,
  };
}

function formProxy(over: Partial<FormProxySignal> = {}): FormProxySignal {
  return {
    kind: 'FORM_PROXY',
    signalId: 'sig-form-1',
    dateKey: D,
    exerciseIndex: 0,
    set: 1,
    proxy: 'TEMPO_DRIFT',
    severity: 'MEDIUM',
    source: 'USER_REPORTED',
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Closed vocabularies
// ---------------------------------------------------------------------------

describe('observation vocabulary guards', () => {
  it('source vocabulary is closed', () => {
    assert.equal(OBSERVATION_SOURCES.length, 2);
    assert.equal(isObservationSource('USER_REPORTED'), true);
    assert.equal(isObservationSource('DEVICE_MEASURED'), true);
    assert.equal(isObservationSource('CLOUD_AI'), false);
    assert.equal(isObservationSource(undefined), false);
  });

  it('form-proxy vocabulary is closed and separated', () => {
    assert.ok(FORM_PROXY_KINDS.includes('ASYMMETRY'));
    assert.equal(isFormProxyKind('FORM_BREAKDOWN'), true);
    assert.equal(isFormProxyKind('BALANCE'), false);
    assert.equal(FORM_PROXY_SOURCES.length, 2);
    assert.equal(isFormProxySource('MEASURED_PROXY'), true);
    assert.equal(isFormProxySource('DEVICE_MEASURED'), false);
  });
});

// ---------------------------------------------------------------------------
// Per-kind validation
// ---------------------------------------------------------------------------

describe('validateObservationSignal (fail-closed)', () => {
  it('accepts a well-formed signal of each kind', () => {
    const signals: ObservationSignal[] = [repCount(), setTiming(), repTiming(), restTiming(), formProxy()];
    for (const s of signals) {
      const v = validateObservationSignal(s);
      assert.equal(v.valid, true, `${s.kind}: ${JSON.stringify(v.problems)}`);
    }
  });

  it('rejects a bad date key', () => {
    const v = validateObservationSignal(repCount({ dateKey: '03/09/2026' }));
    assert.equal(v.valid, false);
    assert.ok(v.problems.some((p) => p.kind === 'BAD_DATE_KEY'));
  });

  it('rejects negative rep counts and non-integer anchors', () => {
    assert.ok(validateObservationSignal(repCount({ observedReps: -1 })).problems.some((p) => p.kind === 'NEGATIVE_VALUE'));
    assert.ok(validateObservationSignal(repCount({ exerciseIndex: -1 })).problems.some((p) => p.kind === 'BAD_ANCHOR'));
    assert.ok(validateObservationSignal(repCount({ set: 0 })).problems.some((p) => p.kind === 'BAD_ANCHOR'));
  });

  it('rejects confidence outside 0..1', () => {
    const v = validateObservationSignal(setTiming({ confidence: 1.2 }));
    assert.ok(v.problems.some((p) => p.kind === 'BAD_CONFIDENCE'));
  });

  it('rejects a zero/negative rep-timing value and bad rep index', () => {
    assert.ok(validateObservationSignal(repTiming({ repSeconds: 0 })).problems.some((p) => p.kind === 'NEGATIVE_VALUE'));
    assert.ok(validateObservationSignal(repTiming({ repIndex: 0 })).problems.some((p) => p.kind === 'BAD_REP_INDEX'));
  });

  it('refuses a DEVICE_MEASURED form proxy (not validated until CP-03)', () => {
    const v = validateObservationSignal(
      // @ts-expect-error — intentionally exercising the fail-closed path
      formProxy({ source: 'DEVICE_MEASURED' }),
    );
    assert.equal(v.valid, false);
    assert.ok(v.problems.some((p) => p.kind === 'BAD_SOURCE'));
    assert.ok(/CP-03/.test(v.problems.find((p) => p.kind === 'BAD_SOURCE')!.message));
  });

  it('rejects an unknown severity on a form proxy', () => {
    const v = validateObservationSignal(
      // @ts-expect-error — intentionally exercising the fail-closed path
      formProxy({ severity: 'EXTREME' }),
    );
    assert.equal(v.valid, false);
    assert.ok(v.problems.some((p) => p.kind === 'BAD_SEVERITY'));
  });

  it('rejects unknown sources on count/timing signals', () => {
    const v = validateObservationSignal(
      // @ts-expect-error — intentionally exercising the fail-closed path
      repCount({ source: 'GUESSED' }),
    );
    assert.equal(v.valid, false);
    assert.ok(v.problems.some((p) => p.kind === 'BAD_SOURCE'));
  });
});

// ---------------------------------------------------------------------------
// Aggregation (pure, deterministic)
// ---------------------------------------------------------------------------

describe('summarizeSetSignals', () => {
  it('latest rep count wins; sources sorted + deduped', () => {
    const summary = summarizeSetSignals([
      repCount({ signalId: 'a', observedReps: 10, source: 'USER_REPORTED' }),
      repCount({ signalId: 'b', observedReps: 12, source: 'DEVICE_MEASURED' }),
    ]);
    assert.equal(summary.length, 1);
    assert.equal(summary[0].observedReps, 12);
    assert.deepEqual(summary[0].sources, ['DEVICE_MEASURED', 'USER_REPORTED']);
  });

  it('median rep timing over an even count is the mean of the middle two', () => {
    const summary = summarizeSetSignals([
      repTiming({ repIndex: 1, repSeconds: 2 }),
      repTiming({ repIndex: 2, repSeconds: 4 }),
      repTiming({ repIndex: 3, repSeconds: 1 }),
      repTiming({ repIndex: 4, repSeconds: 3 }),
    ]);
    assert.equal(summary[0].repSecondsMedian, 2.5);
  });

  it('worst form-proxy severity escalates (LOW → HIGH wins)', () => {
    const summary = summarizeSetSignals([
      formProxy({ proxy: 'RANGE_OF_MOTION', severity: 'LOW' }),
      formProxy({ proxy: 'ASYMMETRY', severity: 'HIGH' }),
      formProxy({ proxy: 'TEMPO_DRIFT', severity: 'MEDIUM' }),
    ]);
    assert.equal(summary[0].worstFormProxySeverity, 'HIGH');
  });

  it('groups by (exerciseIndex, set) and orders deterministically', () => {
    const summary = summarizeSetSignals([
      repCount({ signalId: 's2', exerciseIndex: 1, set: 2, observedReps: 8 }),
      repCount({ signalId: 's1', exerciseIndex: 0, set: 1, observedReps: 12 }),
      repCount({ signalId: 's3', exerciseIndex: 1, set: 1, observedReps: 9 }),
    ]);
    assert.deepEqual(
      summary.map((s) => `${s.exerciseIndex}:${s.set}:${s.observedReps}`),
      ['0:1:12', '1:1:9', '1:2:8'],
    );
  });

  it('invalid signals are ignored, never guessed', () => {
    const bad = repCount({ observedReps: -3 });
    const summary = summarizeSetSignals([repCount({ signalId: 'good', observedReps: 11 }), bad]);
    assert.equal(summary.length, 1);
    assert.equal(summary[0].observedReps, 11);
  });
});