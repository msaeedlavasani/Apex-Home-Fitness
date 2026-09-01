/**
 * Movement domain public entry point (MG-01 — Movement Graph canonical
 * schema / domain contract).
 *
 * Exposes the Movement Graph contract types plus the expressibility bridge.
 * This domain is PURE and framework-independent — no Prisma, React,
 * services, or runtime side effects. Nothing in the application imports this
 * module yet (no runtime behavior change by design).
 */

export {
  MOVEMENT_GRAPH_CONTRACT_VERSION,
  type MovementCatalogVersioning,
  type MovementConfidence,
  type MovementConstraintToken,
  type MovementGraphContractVersion,
  type MovementId,
  type MovementMediaAsset,
  type MovementMediaKind,
  type MovementName,
  type MovementObject,
  type MovementPatternToken,
  type MovementProvenance,
  type MovementReference,
  type MovementRelationshipEdge,
  type MovementRelationshipKind,
  type MovementSlug,
  type MovementSourceKind,
  type MovementSymmetryToken,
  type MovementTaxonomy,
  type DifficultyTier,
  type EquipmentTypeToken,
  type HomeSuitabilityToken,
  type ImpactLevelToken,
  type LocalizedText,
  type MuscleGroupToken,
} from './types';

export { draftMovementId, movementDraftFromCatalogEntry } from './expressibility';