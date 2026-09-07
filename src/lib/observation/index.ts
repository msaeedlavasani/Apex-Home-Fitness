/**
 * Observation-domain public entry point (CP-02 + CP-07).
 *
 * CP-02 signal types/validation remain pure. CP-07 adds an in-memory,
 * non-persisting runtime recorder around the same contract. Neither module
 * accesses camera/sensors, React, Prisma, IndexedDB, or network services.
 */

export {
  FORM_PROXY_KINDS,
  FORM_PROXY_SOURCES,
  OBSERVATION_CONTRACT_VERSION,
  OBSERVATION_SOURCES,
  isFormProxyKind,
  isFormProxySource,
  isObservationSource,
  summarizeSetSignals,
  validateObservationSignal,
  type FormProxyKind,
  type FormProxySignal,
  type FormProxySource,
  type ObservationAnchor,
  type ObservationContractVersion,
  type ObservationProblem,
  type ObservationProblemKind,
  type ObservationSignal,
  type ObservationSource,
  type ObservationValidation,
  type RepCountSignal,
  type RepTimingSignal,
  type RestTimingSignal,
  type SetObservationSummary,
  type SetTimingSignal,
} from './types';

export {
  MOVEMENT_OBSERVATION_RUNTIME_VERSION,
  createMovementObservationRuntime,
  type BeginObservationSetInput,
  type CompleteObservationSetInput,
  type MovementObservationRuntime,
  type MovementObservationRuntimeVersion,
  type ObservationRecord,
  type ObservationRecordSource,
  type ObservationRecordStatus,
  type ObservationRuntimeClock,
  type ObservationRuntimeOptions,
  type ObservationSetPlan,
  type RuntimeSignalResult,
  type UnobservableObservationSetInput,
} from './runtime';
