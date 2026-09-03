/**
 * Adaptive-loop public entry point (AL-03 input pipeline + AL-04 decision
 * engine).
 *
 * Exposes the decision-layer input schema (`AdaptationInput`, incl. the
 * additive AL-04 session-intent extension), the pure deterministic pipeline
 * (`buildAdaptationInput`), the pure projection helpers, and the AL-04
 * decision engine (`buildAdaptiveDecision` + output schema + policy knobs).
 * This domain is PURE and framework-independent — no Prisma, React,
 * services, or runtime side effects. Nothing in the application imports this
 * module yet (no runtime behavior change by design).
 */

export {
  ADAPTATION_INPUT_VERSION,
  ADAPTIVE_DECISION_VERSION,
  type AdaptationConstraints,
  type AdaptationDifficultySubject,
  type AdaptationHistory,
  type AdaptationInput,
  type AdaptationInputVersion,
  type AdaptationUserState,
  type AdaptiveDecisionOutput,
  type AdaptiveDecisionVersion,
  type DecisionApplyMode,
  type DecisionBasis,
  type DecisionConfidence,
  type MovementDecision,
  type MovementDecisionKind,
  type MovementKnowledgeEntry,
  type MovementPerformanceAggregate,
  type SessionDecision,
  type SessionIntent,
  type SessionIntentMovement,
  type SessionIntentProblem,
  type SessionIntentProblemKind,
  type SessionIntentValidation,
  validateSessionIntent,
} from './types';

export {
  aggregateMovementPerformance,
  buildAdaptationInput,
  movementKnowledgeFromGraph,
  recurringDifficultySubjects,
  type AdaptationInputSource,
} from './pipeline';

export { buildAdaptiveDecision, DECISION_POLICY } from './decisions';