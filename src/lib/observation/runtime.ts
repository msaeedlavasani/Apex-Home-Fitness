/**
 * CP-07 — in-session Movement Observation runtime.
 *
 * This module is a pure, in-memory recorder around the CP-02 signal contract.
 * It does not access a camera, invoke MoveNet, write to IndexedDB/Prisma,
 * transmit data, or retain records beyond the owning runtime instance.
 *
 * Authorized producers may append validated CP-02 count/timing signals. A
 * future CP-04 camera runtime may use the same append boundary after its
 * consent/session gate passes. Missing or unavailable measurement is recorded
 * explicitly as uncertainty/unobservable; it is never converted to failure or
 * zero reps.
 */

import type {SessionExercise} from '../workout/sessionContracts';
import {
  summarizeSetSignals,
  validateObservationSignal,
  type ObservationSignal,
  type ObservationSource,
  type SetObservationSummary,
} from './types';

export const MOVEMENT_OBSERVATION_RUNTIME_VERSION = 1 as const;
export type MovementObservationRuntimeVersion = typeof MOVEMENT_OBSERVATION_RUNTIME_VERSION;

export type ObservationRecordStatus = 'OBSERVED' | 'UNCERTAIN' | 'UNOBSERVABLE';
export type ObservationRecordSource = ObservationSource | 'UNKNOWN';

export interface ObservationSetPlan {
  readonly exerciseIndex: number;
  readonly set: number;
  /** Optional S-04 plan item used to carry canonical identity without display-name identity. */
  readonly exercise?: Pick<SessionExercise, 'exerciseId' | 'slug'>;
  /** Canonical movement key used to authorize validated device-measured scope. */
  readonly movementKey?: string;
  readonly exerciseId?: string;
  readonly slug?: string;
  readonly plannedReps?: number | null;
  readonly plannedSeconds?: number | null;
}

export interface ObservationRecord {
  readonly contractVersion: MovementObservationRuntimeVersion;
  readonly observationId: string;
  readonly movementKey?: string;
  readonly sessionId: string;
  readonly exerciseIndex: number;
  readonly set: number;
  readonly exerciseId?: SessionExercise['exerciseId'];
  readonly slug?: SessionExercise['slug'];
  readonly plannedReps?: number | null;
  readonly plannedSeconds?: number | null;
  readonly status: ObservationRecordStatus;
  readonly source: ObservationRecordSource;
  readonly signals: readonly ObservationSignal[];
  readonly summary: SetObservationSummary | null;
  readonly uncertaintyReason?: string;
  readonly startedAt: number | null;
  readonly endedAt: number;
  readonly durationSeconds: number | null;
  /** Explicitly documents that this record was not persisted. */
  readonly persisted: false;
}

export interface ObservationRuntimeClock {
  now(): number;
}

export interface ObservationRuntimeOptions {
  readonly sessionId: string;
  readonly clock?: ObservationRuntimeClock;
  readonly idFactory?: () => string;
}

export interface BeginObservationSetInput extends ObservationSetPlan {
  readonly startedAt?: number;
}

export interface CompleteObservationSetInput {
  readonly endedAt?: number;
}

export interface UnobservableObservationSetInput extends ObservationSetPlan {
  readonly reason: string;
  readonly startedAt?: number;
  readonly endedAt?: number;
}

export interface RuntimeSignalResult {
  readonly accepted: boolean;
  readonly problems: readonly {kind: string; message: string}[];
}

export interface MovementObservationRuntime {
  beginSet(input: BeginObservationSetInput): void;
  appendSignal(signal: ObservationSignal): RuntimeSignalResult;
  completeSet(input?: CompleteObservationSetInput): ObservationRecord;
  recordUnobservable(input: UnobservableObservationSetInput): ObservationRecord;
  recordUncertain(input: UnobservableObservationSetInput): ObservationRecord;
  cancelActive(reason: string, endedAt?: number): ObservationRecord;
  records(): readonly ObservationRecord[];
  reset(): void;
}

const SYSTEM_CLOCK: ObservationRuntimeClock = {now: () => Date.now()};

function defaultIdFactory(): string {
  return globalThis.crypto?.randomUUID?.() ?? `observation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sameSet(a: ObservationSetPlan, b: ObservationSignal): boolean {
  return a.exerciseIndex === b.exerciseIndex && a.set === b.set;
}

function sourceFor(signals: readonly ObservationSignal[]): ObservationRecordSource {
  const sources = [...new Set(signals.map((signal) => signal.source))];
  if (sources.length !== 1) return 'UNKNOWN';
  return sources[0] === 'USER_REPORTED' || sources[0] === 'DEVICE_MEASURED' ? sources[0] : 'UNKNOWN';
}

function durationSeconds(startedAt: number | null, endedAt: number): number | null {
  if (startedAt == null) return null;
  return Math.max(0, (endedAt - startedAt) / 1000);
}

export function createMovementObservationRuntime(options: ObservationRuntimeOptions): MovementObservationRuntime {
  const clock = options.clock ?? SYSTEM_CLOCK;
  const idFactory = options.idFactory ?? defaultIdFactory;
  const records: ObservationRecord[] = [];
  let active: {plan: ObservationSetPlan; startedAt: number | null; signals: ObservationSignal[]} | null = null;

  function requireActive(): NonNullable<typeof active> {
    if (!active) throw new Error('observation runtime has no active set');
    return active;
  }

  function beginSet(input: BeginObservationSetInput): void {
    if (active) throw new Error('observation runtime already has an active set');
    if (!Number.isInteger(input.exerciseIndex) || input.exerciseIndex < 0) {
      throw new Error('observation exerciseIndex must be a non-negative integer');
    }
    if (!Number.isInteger(input.set) || input.set < 1) {
      throw new Error('observation set must be a positive integer');
    }
    active = {
      plan: {...input},
      startedAt: input.startedAt ?? clock.now(),
      signals: [],
    };
  }

  function appendSignal(signal: ObservationSignal): RuntimeSignalResult {
    const current = requireActive();
    const validation = validateObservationSignal(signal);
    if (!validation.valid) return {accepted: false, problems: validation.problems};
    if (signal.kind === 'FORM_PROXY') {
      return {
        accepted: false,
        problems: [{kind: 'UNSUPPORTED_SIGNAL', message: 'CP-07 v1 accepts CP-03-validated count/timing signals only; form proxies remain out of scope'}],
      };
    }
    if (!sameSet(current.plan, signal)) {
      return {
        accepted: false,
        problems: [{kind: 'BAD_ANCHOR', message: 'signal does not match the active observation set'}],
      };
    }
    current.signals.push(signal);
    return {accepted: true, problems: []};
  }

  function finalize(
    status: ObservationRecordStatus,
    reason: string | undefined,
    endedAt: number,
  ): ObservationRecord {
    const current = requireActive();
    const summary = summarizeSetSignals(current.signals);
    const setSummary = summary[0] ?? null;
    const record: ObservationRecord = {
      contractVersion: MOVEMENT_OBSERVATION_RUNTIME_VERSION,
      observationId: idFactory(),
      sessionId: options.sessionId,
      ...(current.plan.movementKey === undefined ? {} : {movementKey: current.plan.movementKey}),
      exerciseIndex: current.plan.exerciseIndex,
      set: current.plan.set,
      ...(current.plan.exercise?.exerciseId === undefined ? {} : {exerciseId: current.plan.exercise.exerciseId}),
      ...(current.plan.exercise?.slug === undefined ? {} : {slug: current.plan.exercise.slug}),
      ...(current.plan.plannedReps === undefined ? {} : {plannedReps: current.plan.plannedReps}),
      ...(current.plan.plannedSeconds === undefined ? {} : {plannedSeconds: current.plan.plannedSeconds}),
      status,
      source: status === 'OBSERVED' ? sourceFor(current.signals) : 'UNKNOWN',
      signals: current.signals.map((signal) => ({...signal})),
      summary: setSummary ? {...setSummary, sources: [...setSummary.sources]} : null,
      ...(reason ? {uncertaintyReason: reason} : {}),
      startedAt: current.startedAt,
      endedAt,
      durationSeconds: durationSeconds(current.startedAt, endedAt),
      persisted: false,
    };
    records.push(record);
    active = null;
    return record;
  }

  function completeSet(input: CompleteObservationSetInput = {}): ObservationRecord {
    const current = requireActive();
    const endedAt = input.endedAt ?? clock.now();
    return finalize(
      current.signals.length > 0 ? 'OBSERVED' : 'UNOBSERVABLE',
      current.signals.length > 0 ? undefined : 'no validated observation signal was produced',
      endedAt,
    );
  }

  function recordUnobservable(input: UnobservableObservationSetInput): ObservationRecord {
    beginSet(input);
    return finalize('UNOBSERVABLE', input.reason, input.endedAt ?? clock.now());
  }

  function recordUncertain(input: UnobservableObservationSetInput): ObservationRecord {
    beginSet(input);
    return finalize('UNCERTAIN', input.reason, input.endedAt ?? clock.now());
  }

  function cancelActive(reason: string, endedAt = clock.now()): ObservationRecord {
    return finalize('UNCERTAIN', reason, endedAt);
  }

  return {
    beginSet,
    appendSignal,
    completeSet,
    recordUnobservable,
    recordUncertain,
    cancelActive,
    records: () => records.map((record) => ({...record, signals: [...record.signals]})),
    reset: () => {
      if (active) throw new Error('cannot reset observation runtime while a set is active');
      records.length = 0;
    },
  };
}
