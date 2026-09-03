/**
 * Adaptive-loop public entry point (AL-03 — adaptation input pipeline).
 *
 * Exposes the decision-layer input schema (`AdaptationInput`), the pure
 * deterministic pipeline (`buildAdaptationInput`), and the pure projection
 * helpers (movement-knowledge adapter, per-movement aggregates,
 * recurring-difficulty subjects). This domain is PURE and
 * framework-independent — no Prisma, React, services, or runtime side
 * effects. Nothing in the application imports this module yet (no runtime
 * behavior change by design).
 */

export {
  ADAPTATION_INPUT_VERSION,
  type AdaptationConstraints,
  type AdaptationDifficultySubject,
  type AdaptationHistory,
  type AdaptationInput,
  type AdaptationInputVersion,
  type AdaptationUserState,
  type MovementKnowledgeEntry,
  type MovementPerformanceAggregate,
} from './types';

export {
  aggregateMovementPerformance,
  buildAdaptationInput,
  movementKnowledgeFromGraph,
  recurringDifficultySubjects,
  type AdaptationInputSource,
} from './pipeline';