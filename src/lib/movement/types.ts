/**
 * MG-01 — Movement Graph canonical schema / domain contract.
 *
 * The type-level schema for a **movement knowledge object** (identity,
 * taxonomy fields, relationship edges, provenance, versioning, localization
 * keys), per `docs/product/MOVEMENT-INTELLIGENCE-STRATEGY.md` §1 and the
 * recommended scope of `MG-01` in `docs/TASKS.md`.
 *
 * This module is PURE — no Prisma, React, services, environment, or runtime
 * side effects. It only dictates the shape of movement knowledge.
 *
 * Layering (what this task does NOT implement — downstream MG tasks):
 *   - MG-02  designs the exhaustive closed taxonomy vocabulary + FA/EN
 *            display maps. Here taxonomy fields use nominal token types so the
 *            SHAPE is contracted while the VOCABULARY stays open (except
 *            `DifficultyTier`, whose values already exist in the live
 *            `DifficultyLevel` Prisma enum).
 *   - MG-03  implements the provenance module (hashing contract, confidence
 *            model, license-compatibility rules) on top of the baseline
 *            `MovementProvenance` shape defined here.
 *   - MG-06  implements relationship validation (no cycles / no dangling
 *            references) for `MovementRelationshipEdge`.
 *   - MG-07  implements the localization key model and self-hosted media
 *            architecture for `LocalizedText` / `MovementMediaAsset`.
 *
 * Relationship to existing contracts (S-06: catalog = canonical):
 *   the current `src/lib/exercise` contracts remain the canonical system
 *   catalog; this module is the forward-looking Movement Graph schema that
 *   the exercise domain will be expressed in terms of (expressibility
 *   bridge: `src/lib/movement/expressibility.ts`). No runtime wiring to the
 *   exercise domain exists — nothing imports this module from application
 *   code yet.
 */

/** Version of this schema contract. Bump on any breaking shape change. */
export const MOVEMENT_GRAPH_CONTRACT_VERSION = 1 as const;

/** Version literal mirroring `MOVEMENT_GRAPH_CONTRACT_VERSION`. */
export type MovementGraphContractVersion = typeof MOVEMENT_GRAPH_CONTRACT_VERSION;

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/**
 * Canonical durable identity of a movement knowledge object. The encoding is
 * NOT defined here; identity assignment/resolution is an ingestion concern
 * (MG-04/MG-05, fail-closed — the S02-E lesson: never guess). Branded to
 * distinguish it from a slug and from the exercise-domain id.
 */
export type MovementId = string & { readonly __movementId: unique symbol };

/**
 * Canonical source-controlled resolution anchor (kebab-case token). The slug
 * is an identifier that anchors deterministic resolution and fixtures; it is
 * NOT the durable identity.
 */
export type MovementSlug = string & { readonly __movementSlug: unique symbol };

/** A normalized reference to a movement knowledge object. */
export type MovementReference =
  | { kind: 'id'; id: MovementId }
  | { kind: 'slug'; slug: MovementSlug };

/**
 * Full identity-bearing knowledge object. Only `id`, `slug`, `name`,
 * `provenance`, and `versioning` are mandatory; every other field is
 * KNOWLEDGE that the Movement Graph accumulates over time (seed data today
 * has very little of it — see the expressibility doc in
 * `docs/architecture/MG-01-MOVEMENT-GRAPH-CONTRACT.md`).
 */
export interface MovementObject {
  /** Canonical durable identity (resolution/integration owned by MG-04/05). */
  id: MovementId;
  /** Canonical source-controlled resolution anchor. */
  slug: MovementSlug;
  /** Localized canonical name + confidently-equivalent aliases. */
  name: MovementName;
  /** Taxonomy knowledge (vocabulary values designed by MG-02). */
  taxonomy?: MovementTaxonomy;
  /** Optional free-text description (display metadata, never identity). */
  description?: LocalizedText;
  /** Ordered step-by-step instructions, localized. */
  instructions?: readonly LocalizedText[];
  /** Common-mistakes / form cues, where supported. */
  coachingCues?: readonly LocalizedText[];
  /** Typed graph edges — progression / regression / substitution (MG-06 validates). */
  relationships?: readonly MovementRelationshipEdge[];
  /** Validated self-hosted media refs (architecture owned by MG-07). */
  media?: readonly MovementMediaAsset[];
  /** Where this knowledge came from + reliability posture (module owned by MG-03). */
  provenance: MovementProvenance;
  /** Versioning of the catalog and of this entry. */
  versioning: MovementCatalogVersioning;
}

/**
 * Localized canonical name. `en` is the canonical display language today;
 * `fa` stays ABSENT until a real Persian corpus exists (GATE A rule: no
 * invented Persian names).
 */
export interface MovementName {
  /** Canonical English display name (never a durable identity). */
  en: string;
  /** Canonical Persian display name. Absent until a real FA corpus exists. */
  fa?: string;
  /** Confidently-equivalent historical/variant names (normalized casing). */
  aliases?: readonly string[];
}

// ---------------------------------------------------------------------------
// Taxonomy (shape only — exhaustive vocabulary is MG-02)
// ---------------------------------------------------------------------------

/**
 * Nominal token for a movement-pattern vocabulary term (e.g. `push`,
 * `hinge`). MG-02 designs the exhaustive closed set + FA/EN display maps.
 */
export type MovementPatternToken = string & { readonly __movementPatternToken: unique symbol };
/** Nominal token for a muscle-group vocabulary term (primary/secondary). MG-02. */
export type MuscleGroupToken = string & { readonly __muscleGroupToken: unique symbol };
/** Nominal token for an equipment-type vocabulary term. MG-02. */
export type EquipmentTypeToken = string & { readonly __equipmentTypeToken: unique symbol };
/** Nominal token for an impact-level vocabulary term (e.g. `low`, `high`). MG-02. */
export type ImpactLevelToken = string & { readonly __impactLevelToken: unique symbol };
/** Nominal token for a home-suitability rating. MG-02. */
export type HomeSuitabilityToken = string & { readonly __homeSuitabilityToken: unique symbol };
/** Nominal token for a movement-constraint term (e.g. injury/equipment limits). MG-02. */
export type MovementConstraintToken = string & { readonly __movementConstraintToken: unique symbol };
/**
 * Nominal token for unilateral/bilateral/symmetry properties. MG-02 designs
 * the closed set (`unilateral`, `bilateral`, …) + display maps.
 */
export type MovementSymmetryToken = string & { readonly __movementSymmetryToken: unique symbol };

/**
 * Difficulty tier. CLOSED here because the values already exist in the live
 * `DifficultyLevel` Prisma enum (`BEGINNER | INTERMEDIATE | ADVANCED`);
 * tokens are the kebab-case projection of those values.
 */
export type DifficultyTier = 'beginner' | 'intermediate' | 'advanced';

/** Taxonomy knowledge attached to a movement knowledge object. */
export interface MovementTaxonomy {
  /** Primary target muscle groups (MG-02 vocabulary). */
  primaryMuscles?: readonly MuscleGroupToken[];
  /** Secondary/synergist muscle groups (MG-02 vocabulary). */
  secondaryMuscles?: readonly MuscleGroupToken[];
  /** Movement-pattern classifications (MG-02 vocabulary). */
  movementPatterns?: readonly MovementPatternToken[];
  /** Required/suggested equipment (MG-02 vocabulary). */
  equipment?: readonly EquipmentTypeToken[];
  /** Difficulty tier (closed; maps to Prisma `DifficultyLevel`, lowercased). */
  difficulty?: DifficultyTier;
  /** Impact level (MG-02 vocabulary). */
  impact?: ImpactLevelToken;
  /** Unilateral/bilateral/symmetry property (MG-02 vocabulary). */
  symmetry?: MovementSymmetryToken;
  /** Home-suitability rating (MG-02 vocabulary). */
  homeSuitability?: HomeSuitabilityToken;
  /** Relevant movement constraints (MG-02 vocabulary). */
  constraints?: readonly MovementConstraintToken[];
}

// ---------------------------------------------------------------------------
// Localization
// ---------------------------------------------------------------------------

/**
 * A localized text node: stable key (MG-07 defines the key structure) with
 * embedded en/fa text. Identity-neutral — keys reference the localization
 * surface, never duck-type a movement.
 */
export interface LocalizedText {
  /** Stable localization key. */
  key: string;
  /** English default text. */
  en: string;
  /** Persian text when available; absent otherwise. */
  fa?: string;
}

// ---------------------------------------------------------------------------
// Relationships (shape only — validation is MG-06)
// ---------------------------------------------------------------------------

/** Typed relationship kinds between movement knowledge objects (strategy §2). */
export type MovementRelationshipKind = 'progression' | 'regression' | 'substitution';

/**
 * One typed graph edge. Structural validation (no cycles, no dangling
 * references) is deliberately NOT implemented here — MG-06 owns it.
 */
export interface MovementRelationshipEdge {
  kind: MovementRelationshipKind;
  /** The related movement (never resolved/guessed at schema time). */
  target: MovementReference;
  /** Optional context: e.g. the constraint/equipment/impact driver for a substitution. */
  note?: string;
}

// ---------------------------------------------------------------------------
// Media (shape only — self-hosting architecture is MG-07)
// ---------------------------------------------------------------------------

/** Kinds of validated exercise media. */
export type MovementMediaKind = 'image' | 'video' | 'animation' | 'audio';

/**
 * A media reference. The resilience requirement (strategy §6) demands
 * validated/self-hosted media on AHF-controlled infrastructure; `validated`
 * is the flag MG-07's validation pipeline sets.
 */
export interface MovementMediaAsset {
  kind: MovementMediaKind;
  /** Self-hosted URL on AHF-controlled infrastructure (MG-07 contract). */
  url: string;
  /** Content hash for integrity verification (MG-07 defines the hash contract). */
  contentHash?: string;
  /** Fallback URL used when the primary asset cannot load (resilience requirement). */
  fallbackUrl?: string;
  /** Localization key for captions/narration when applicable. */
  captionKey?: string;
  /** True once validated against the self-hosting/resilience requirement. */
  validated?: boolean;
}

// ---------------------------------------------------------------------------
// Provenance (baseline shape; MG-03 implements the module + license rules)
// ---------------------------------------------------------------------------

/**
 * Where a movement knowledge object came from. MG-03 hardens this contract:
 * ingestion timestamp, content-hash algorithm, confidence assessment model,
 * and license-compatibility rules for upstream import.
 */
export type MovementSourceKind =
  /** Source-controlled canonical data (e.g. the system catalog, curation). */
  | 'SOURCE_CONTROLLED'
  /** Imported from an external permitted upstream source (MG-04 pipeline). */
  | 'UPSTREAM_IMPORT'
  /** Human/owner-curated knowledge. */
  | 'CURATED'
  /** Pre-existing seed/legacy Production record (to be reconciled, strategy §5). */
  | 'LEGACY_SEED';

/** Reliability posture of a source; semantics defined by MG-03. 0..1. */
export type MovementConfidence = number;

/** Baseline provenance metadata carried by every movement knowledge object. */
export interface MovementProvenance {
  sourceKind: MovementSourceKind;
  /** Stable upstream/source identifier when applicable (e.g. catalog name, URL). */
  sourceRef?: string;
  /** License posture of the source (MG-03 defines acceptable-license rules). */
  license?: string;
  /** Content hash for integrity verification (MG-03 defines the hashing contract). */
  contentHash?: string;
  /** Reliability assessment 0..1; fail-closed (no/low evidence ⇒ low). */
  confidence: MovementConfidence;
}

// ---------------------------------------------------------------------------
// Versioning
// ---------------------------------------------------------------------------

/** Version identity of a movement knowledge object within the catalog. */
export interface MovementCatalogVersioning {
  /** Version of the Movement Graph catalog this object belongs to (monotonic). */
  catalogVersion: number;
  /** Revision of this specific object within the catalog (monotonic). */
  entryVersion: number;
  /** Optional note on the change (e.g. the reconciliation/ingestion event id). */
  changeNote?: string;
}