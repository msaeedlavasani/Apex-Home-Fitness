/**
 * Observation-domain public entry point (CP-02 — observation signal model).
 *
 * Exposes the typed in-session observation signal contract (rep counts, set/
 * rep/rest timing, form proxies), fail-closed validation, and the pure
 * deterministic per-set aggregation helper. This domain is PURE and
 * framework-independent — no camera, sensors, Prisma, React, services, or
 * runtime side effects. Nothing in the application imports this module yet
 * (no runtime behavior change by design). Device-measured form proxies stay
 * refused until CP-03 validates the proxy definitions.
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