/**
 * CP-02 — Observation signal model contract (rep/phase tracking inputs).
 *
 * The type-level model of what the Companion observes DURING a workout
 * (`docs/architecture/CP-01-COMPANION-ARCHITECTURE.md` G2–G4): rep counts,
 * set/rep timing (tempo), rest adherence, and form proxies — anchored to the
 * S-04 session (exercise position + set number) so signals can feed both
 * in-session interventions and the post-session outcome model (AL-01).
 *
 * Observation is the closed-loop segment
 * (`User ↔ Movement ↔ Workout ↔ Observation ↔ Outcome ↔ …`): signals are
 * per-set observations of a running session; they never replace the recorded
 * outcome (AL-01) — they map INTO it (documented in
 * `docs/architecture/CP-02-OBSERVATION-SIGNAL-MODEL.md` §5).
 *
 * This module is PURE — no Prisma, React, camera, sensors, services, or
 * runtime side effects. It depends type-only on the S-02 exercise identity
 * and the AL-02 severity vocabulary. Nothing is measured or collected here;
 * the schema only dictates the shape of a signal once an authorized source
 * produces one (manual input today; device-measured sources arrive only via
 * their own validated gates — CP-03/CP-04).
 *
 * Fail-closed modeling mirrors the AL-01/AL-02 discipline: closed enums with
 * runtime guards; absence means "no observation", never a negative claim;
 * a form proxy that is DEVICE-measured is refused until CP-03 validates the
 * proxy definitions (no fabricated form quality); confidence is 0..1 and
 * carried on every measured signal.
 */

import type { ExerciseId, ExerciseSlug } from '../exercise';
import type { ProfileSeverity } from '../profile';

/** Version of this observation-contract schema. Bump on any breaking shape change. */
export const OBSERVATION_CONTRACT_VERSION = 1 as const;

/** Version literal mirroring `OBSERVATION_CONTRACT_VERSION`. */
export type ObservationContractVersion = typeof OBSERVATION_CONTRACT_VERSION;

/**
 * Who produced the observation.
 *  - `USER_REPORTED` — explicit user input (e.g. manual rep count, self-spot).
 *  - `DEVICE_MEASURED` — measured by a device/algorithm (future: CP-03+ pose
 *    inference). Device-measured COUNT/TIMING signals require a validated
 *    source behind them; the schema does not validate the algorithm here.
 */
export type ObservationSource = 'USER_REPORTED' | 'DEVICE_MEASURED';
export const OBSERVATION_SOURCES = ['USER_REPORTED', 'DEVICE_MEASURED'] as const;
/** Type guard for the closed source vocabulary. */
export function isObservationSource(value: unknown): value is ObservationSource {
  return typeof value === 'string' && (OBSERVATION_SOURCES as readonly string[]).includes(value);
}

/**
 * Form-proxy kinds (mirrors the AL-02 form/asymmetry vocabulary — proxies of
 * movement quality, NEVER a diagnosis). Device-measured form proxies are
 * `MEASURED_PROXY`-sourced and only exist after CP-03 validates their
 * definitions.
 */
export type FormProxyKind =
  | 'RANGE_OF_MOTION'
  | 'TEMPO_DRIFT'
  | 'RHYTHM_IRREGULARITY'
  | 'ASYMMETRY'
  | 'FORM_BREAKDOWN';
export const FORM_PROXY_KINDS = [
  'RANGE_OF_MOTION',
  'TEMPO_DRIFT',
  'RHYTHM_IRREGULARITY',
  'ASYMMETRY',
  'FORM_BREAKDOWN',
] as const;
/** Type guard for the closed form-proxy vocabulary. */
export function isFormProxyKind(value: unknown): value is FormProxyKind {
  return typeof value === 'string' && (FORM_PROXY_KINDS as readonly string[]).includes(value);
}

/** Sources a form proxy may legitimately carry. */
export type FormProxySource = 'USER_REPORTED' | 'MEASURED_PROXY';
export const FORM_PROXY_SOURCES = ['USER_REPORTED', 'MEASURED_PROXY'] as const;
/** Type guard for the closed form-proxy source vocabulary. */
export function isFormProxySource(value: unknown): value is FormProxySource {
  return typeof value === 'string' && (FORM_PROXY_SOURCES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Signal shapes
// ---------------------------------------------------------------------------

/** Every signal anchors to one set of one exercise via the S-04 plan position. */
export interface ObservationAnchor {
  /** 0-based position in the session plan (S-04 — position, never identity). */
  exerciseIndex: number;
  /** 1-based set number within that exercise. */
  set: number;
  /** Canonical identity when the session plan provides it (S-02). */
  exerciseId?: ExerciseId;
  /** Canonical identity when the session plan provides it (S-02). */
  slug?: ExerciseSlug;
}

/** A rep-count observation for one set (the primary rep/phase signal). */
export interface RepCountSignal extends ObservationAnchor {
  kind: 'REP_COUNT';
  /** Recorder-owned opaque id (durable identity of THIS signal). */
  signalId: string;
  /** Local calendar day `YYYY-MM-DD` of the session. */
  dateKey: string;
  /** Total repetitions observed for this set. */
  observedReps: number;
  /** Target reps of this set when the plan declares one (informational). */
  plannedReps?: number | null;
  source: ObservationSource;
  /** 0..1 — how certain the source is of this count. */
  confidence: number;
}

/** Active-time (set timing) observation — time-targeted sets and duration checks. */
export interface SetTimingSignal extends ObservationAnchor {
  kind: 'SET_TIMING';
  signalId: string;
  dateKey: string;
  /** Active seconds observed for this set. */
  activeSeconds: number;
  /** Planned working seconds for this set when the plan declares one. */
  plannedSeconds?: number | null;
  source: ObservationSource;
  confidence: number;
}

/** Per-rep timing (tempo proxy) — repSeconds = one full repetition. */
export interface RepTimingSignal extends ObservationAnchor {
  kind: 'REP_TIMING';
  signalId: string;
  dateKey: string;
  /** 1-based repetition index within the set. */
  repIndex: number;
  /** Seconds for this single repetition. */
  repSeconds: number;
  source: ObservationSource;
  confidence: number;
}

/** Rest-timing observation — rest-phase adherence after a set. */
export interface RestTimingSignal extends ObservationAnchor {
  kind: 'REST_TIMING';
  signalId: string;
  dateKey: string;
  /** Rest seconds actually taken after this set. */
  restSeconds: number;
  /** Planned rest seconds when the plan declares one. */
  plannedRestSeconds?: number | null;
  source: ObservationSource;
  confidence: number;
}

/** A form-proxy observation (severity-capped; never a diagnosis). */
export interface FormProxySignal extends ObservationAnchor {
  kind: 'FORM_PROXY';
  signalId: string;
  dateKey: string;
  proxy: FormProxyKind;
  /** AL-02 severity vocabulary (LOW/MEDIUM/HIGH). */
  severity: ProfileSeverity;
  source: FormProxySource;
  /** Free-form user note when USER_REPORTED (never parsed as a fact). */
  note?: string;
}

/** The closed union of every typed observation signal. */
export type ObservationSignal =
  | RepCountSignal
  | SetTimingSignal
  | RepTimingSignal
  | RestTimingSignal
  | FormProxySignal;

// ---------------------------------------------------------------------------
// Deterministic validation (fail-closed)
// ---------------------------------------------------------------------------

export type ObservationProblemKind =
  | 'BAD_VERSION'
  | 'BAD_DATE_KEY'
  | 'BAD_ANCHOR'
  | 'NEGATIVE_VALUE'
  | 'BAD_SOURCE'
  | 'BAD_PROXY'
  | 'BAD_SEVERITY'
  | 'BAD_CONFIDENCE'
  | 'BAD_REP_INDEX';

export interface ObservationProblem {
  kind: ObservationProblemKind;
  message: string;
}

export interface ObservationValidation {
  valid: boolean;
  problems: readonly ObservationProblem[];
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Deterministic, fail-closed validation of one observation signal. Never
 * repairs and never guesses — malformed signals are refused by the (future)
 * recorder. Device-measured form proxies are refused until CP-03 validates
 * the proxy definitions.
 */
export function validateObservationSignal(signal: ObservationSignal): ObservationValidation {
  const problems: ObservationProblem[] = [];
  const add = (kind: ObservationProblemKind, message: string) => problems.push({ kind, message });

  if (!DATE_KEY_RE.test(signal.dateKey)) {
    add('BAD_DATE_KEY', `dateKey must be YYYY-MM-DD, got ${signal.dateKey}`);
  }
  if (!Number.isInteger(signal.exerciseIndex) || signal.exerciseIndex < 0) {
    add('BAD_ANCHOR', 'exerciseIndex must be a non-negative integer (S-04 plan position)');
  }
  if (!Number.isInteger(signal.set) || signal.set < 1) {
    add('BAD_ANCHOR', 'set must be a positive integer (1-based)');
  }

  const checkConfidence = (label: string, confidence: number): void => {
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      add('BAD_CONFIDENCE', `${label}.confidence must be in 0..1`);
    }
  };

  switch (signal.kind) {
    case 'REP_COUNT':
      if (!Number.isInteger(signal.observedReps) || signal.observedReps < 0) {
        add('NEGATIVE_VALUE', 'observedReps must be a non-negative integer');
      }
      if (!isObservationSource(signal.source)) add('BAD_SOURCE', `unknown source: ${String(signal.source)}`);
      checkConfidence('REP_COUNT', signal.confidence);
      break;
    case 'SET_TIMING':
      if (typeof signal.activeSeconds !== 'number' || signal.activeSeconds < 0) {
        add('NEGATIVE_VALUE', 'activeSeconds must be a non-negative number');
      }
      if (!isObservationSource(signal.source)) add('BAD_SOURCE', `unknown source: ${String(signal.source)}`);
      checkConfidence('SET_TIMING', signal.confidence);
      break;
    case 'REP_TIMING':
      if (typeof signal.repSeconds !== 'number' || signal.repSeconds <= 0) {
        add('NEGATIVE_VALUE', 'repSeconds must be a positive number');
      }
      if (!Number.isInteger(signal.repIndex) || signal.repIndex < 1) {
        add('BAD_REP_INDEX', 'repIndex must be a positive integer (1-based)');
      }
      if (!isObservationSource(signal.source)) add('BAD_SOURCE', `unknown source: ${String(signal.source)}`);
      checkConfidence('REP_TIMING', signal.confidence);
      break;
    case 'REST_TIMING':
      if (typeof signal.restSeconds !== 'number' || signal.restSeconds < 0) {
        add('NEGATIVE_VALUE', 'restSeconds must be a non-negative number');
      }
      if (!isObservationSource(signal.source)) add('BAD_SOURCE', `unknown source: ${String(signal.source)}`);
      checkConfidence('REST_TIMING', signal.confidence);
      break;
    case 'FORM_PROXY':
      if (!isFormProxyKind(signal.proxy)) add('BAD_PROXY', `unknown form proxy: ${String(signal.proxy)}`);
      if (!isFormProxySource(signal.source)) {
        add(
          'BAD_SOURCE',
          `form proxies may only be USER_REPORTED or MEASURED_PROXY, got ${String(signal.source)} — device-measured form proxies require a validated CP-03 source`,
        );
      }
      if (signal.severity !== 'LOW' && signal.severity !== 'MEDIUM' && signal.severity !== 'HIGH') {
        add('BAD_SEVERITY', `severity must be LOW|MEDIUM|HIGH, got ${String(signal.severity)}`);
      }
      break;
  }

  return { valid: problems.length === 0, problems };
}

// ---------------------------------------------------------------------------
// Deterministic set aggregation (pure, projection-only)
// ---------------------------------------------------------------------------

/** One set's deterministic observation summary (later signals of a kind win). */
export interface SetObservationSummary {
  exerciseIndex: number;
  set: number;
  /** Latest rep count observed for the set. */
  observedReps?: number;
  /** Latest observed active seconds for the set. */
  activeSeconds?: number;
  /** Latest observed rest seconds after the set. */
  restSeconds?: number;
  /** Median repSeconds over observed per-rep timings (tempo proxy). */
  repSecondsMedian?: number;
  /** Worst (highest) form-proxy severity observed on the set. */
  worstFormProxySeverity?: ProfileSeverity;
  /** Sorted, unique sources that produced signals for the set. */
  sources: readonly ObservationSource[];
}

function anchorKey(exerciseIndex: number, set: number): string {
  return `${exerciseIndex}:${set}`;
}

const SEVERITY_RANK: Record<ProfileSeverity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

/**
 * Deterministic per-set summary over validated signals. Pure: same signals →
 * same summary (latest signal of each kind wins; rep timing uses the median;
 * sources are sorted + deduped). Invalid signals are ignored (never guessed).
 */
export function summarizeSetSignals(
  signals: readonly ObservationSignal[],
): SetObservationSummary[] {
  const byKey = new Map<string, SetObservationSummary>();
  const repTimings = new Map<string, number[]>();

  for (const s of signals) {
    if (!validateObservationSignal(s).valid) continue;
    const key = anchorKey(s.exerciseIndex, s.set);
    const summary = byKey.get(key) ?? {
      exerciseIndex: s.exerciseIndex,
      set: s.set,
      sources: [],
    };
    switch (s.kind) {
      case 'REP_COUNT':
        summary.observedReps = s.observedReps;
        break;
      case 'SET_TIMING':
        summary.activeSeconds = s.activeSeconds;
        break;
      case 'REST_TIMING':
        summary.restSeconds = s.restSeconds;
        break;
      case 'REP_TIMING': {
        const list = repTimings.get(key) ?? [];
        list.push(s.repSeconds);
        repTimings.set(key, list);
        break;
      }
      case 'FORM_PROXY': {
        const worst = summary.worstFormProxySeverity;
        if (!worst || SEVERITY_RANK[s.severity] > SEVERITY_RANK[worst]) {
          summary.worstFormProxySeverity = s.severity;
        }
        break;
      }
    }
    if (!summary.sources.includes(s.source as ObservationSource)) {
      summary.sources = [...summary.sources, s.source as ObservationSource];
    }
    byKey.set(key, summary);
  }

  for (const [key, summary] of byKey) {
    const timings = repTimings.get(key);
    if (timings && timings.length > 0) {
      const sorted = [...timings].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      summary.repSecondsMedian =
        sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    summary.sources = [...summary.sources].sort();
    byKey.set(key, summary);
  }

  return [...byKey.values()].sort((a, b) =>
    a.exerciseIndex !== b.exerciseIndex
      ? a.exerciseIndex - b.exerciseIndex
      : a.set - b.set,
  );
}