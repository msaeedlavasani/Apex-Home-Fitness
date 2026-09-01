# MG-02 — Movement Taxonomy Vocabulary

> **STATUS: DELIVERED — MG-02 (2026-09-01)**
>
> Task: `MG-02` in [`../TASKS.md`](../TASKS.md) — Movement taxonomy design
> (P0, DEPENDENCIES: MG-01, architecture-gated). Builds on the MG-01 domain
> contract ([`MG-01-MOVEMENT-GRAPH-CONTRACT.md`](MG-01-MOVEMENT-GRAPH-CONTRACT.md));
> decision record: [`../adr/0007-movement-taxonomy-vocabulary.md`](../adr/0007-movement-taxonomy-vocabulary.md).
> Module of Record: `src/lib/movement/taxonomy.ts` (public surface:
> `../src/lib/movement/index.ts`).

## 1. Purpose

The Movement Graph taxonomy fields (declared nominally in MG-01) get their
**closed vocabulary** here: movement patterns, muscle groups
(primary/secondary), equipment types, difficulty tiers, impact levels,
unilateral/bilateral symmetry, home-suitability ratings, and movement
constraints — each with FA/EN display mappings. Every term is a kebab-case
canonical token (stable, source-controlled, localization-agnostic); display
strings are FA/EN renderings.

**FA strings are PROVISIONAL, app-authored display translations for
TAXONOMY TERMS ONLY** — they are not exercise display names, so GATE A
(no invented exercise names) is not violated. They are flagged for
corpus verification in the localization pass (MG-07).

## 2. Vocabulary (canonical tokens + FA/EN)

### 2.1 Movement patterns (`MOVEMENT_PATTERNS`, 19)

| Token | EN | FA (provisional) |
|---|---|---|
| `squat` | Squat | اسکات |
| `hinge` | Hinge | لولای لگن |
| `lunge` | Lunge | لانژ |
| `horizontal-push` | Horizontal push | پرس افقی |
| `vertical-push` | Vertical push | پرس عمودی |
| `horizontal-pull` | Horizontal pull | کشش افقی |
| `vertical-pull` | Vertical pull | کشش عمودی |
| `core-anti-extension` | Core anti-extension | ضد اکستنشن مرکز تنه |
| `core-anti-rotation` | Core anti-rotation | ضد چرخش مرکز تنه |
| `core-flexion` | Core flexion | فلکشن مرکز تنه |
| `rotation` | Rotation | چرخش |
| `isolation` | Isolation / accessory | ایزوله |
| `plyometric` | Plyometric | پلایومتریک |
| `isometric-hold` | Isometric hold | نگهداشت ایزومتریک |
| `mobility` | Mobility / flexibility | تحرک‌پذیری |
| `cardio` | Cardio | کاردیو |
| `balance` | Balance | تعادل |
| `gait` | Gait / stepping | راه‌رفتن |
| `breathwork` | Breathwork / relaxation | تنفس |

### 2.2 Muscle groups (`MUSCLE_GROUPS`, 17 — primary/secondary)

| Token | EN | FA (provisional) |
|---|---|---|
| `chest` | Chest | سینه |
| `back` | Back | پشت |
| `shoulders` | Shoulders | شانه |
| `traps` | Traps | ذوزنقه‌ای |
| `biceps` | Biceps | جلو بازو |
| `triceps` | Triceps | پشت بازو |
| `forearms` | Forearms | ساعد |
| `core` | Core / abs | شکم |
| `obliques` | Obliques | مایل شکمی |
| `lower-back` | Lower back | کمر |
| `glutes` | Glutes | سرینی |
| `hamstrings` | Hamstrings | پشت ران |
| `quadriceps` | Quadriceps | جلو ران |
| `adductors` | Adductors | نزدیک‌کننده‌های ران |
| `abductors` | Abductors | دورکننده‌های ران |
| `calves` | Calves | ساق پا |
| `hip-flexors` | Hip flexors | خم‌کننده‌های لگن |

### 2.3 Equipment types (`EQUIPMENT_TYPES`, 11)

| Token | EN | FA (provisional) |
|---|---|---|
| `bodyweight` | Bodyweight | وزن بدن |
| `resistance-band` | Resistance band | کش مقاومتی |
| `dumbbell` | Dumbbell | دمبل |
| `kettlebell` | Kettlebell | کتل‌بل |
| `barbell` | Barbell | هالتر |
| `cable-machine` | Cable machine | دستگاه سیم‌کش |
| `pull-up-bar` | Pull-up bar | بارفیکس |
| `chair` | Chair | صندلی |
| `wall` | Wall | دیوار |
| `cardio-machine` | Cardio machine | دستگاه کاردیو |
| `jump-rope` | Jump rope | طناب |

### 2.4 Difficulty tiers (`DIFFICULTY_TIERS`, closed in MG-01)

| Token | EN | FA (provisional) |
|---|---|---|
| `beginner` | Beginner | مبتدی |
| `intermediate` | Intermediate | متوسط |
| `advanced` | Advanced | پیشرفته |

Tiers mirror the live Prisma `DifficultyLevel` enum (`BEGINNER |
INTERMEDIATE | ADVANCED`) in kebab-lowercase; the display map is added here.

### 2.5 Impact levels (`IMPACT_LEVELS`, 3)

| Token | EN | FA (provisional) |
|---|---|---|
| `low` | Low impact | کم‌ضربه |
| `moderate` | Moderate impact | ضربه متوسط |
| `high` | High impact | پرضربه |

### 2.6 Symmetry (`MOVEMENT_SYMMETRIES`, 3)

| Token | EN | FA (provisional) |
|---|---|---|
| `unilateral` | Unilateral | یک‌طرفه |
| `bilateral` | Bilateral | دوطرفه |
| `alternating` | Alternating | متناوب |

### 2.7 Home suitability (`HOME_SUITABILITY_LEVELS`, 3)

| Token | EN | FA (provisional) |
|---|---|---|
| `excellent` | Excellent for home | عالی برای خانه |
| `good` | Good for home | مناسب برای خانه |
| `limited` | Limited at home | محدود در خانه |

### 2.8 Movement constraints (`MOVEMENT_CONSTRAINTS`, 9)

| Token | EN | FA (provisional) |
|---|---|---|
| `requires-equipment` | Requires equipment | نیاز به تجهیزات |
| `requires-space` | Requires space | نیاز به فضا |
| `requires-spotter` | Requires a spotter | نیاز به اسپات |
| `wrist-loading` | Wrist loading | فشار بر مچ |
| `knee-loading` | Knee loading | فشار بر زانو |
| `shoulder-loading` | Shoulder loading | فشار بر شانه |
| `balance-challenging` | Balance-challenging | نیازمند تعادل |
| `high-skill` | High skill | مهارت بالا |
| `mobility-required` | Mobility required | نیازمند تحرک‌پذیری |

## 3. Exhaustiveness for the current catalog (evidence)

The canonical catalog (`src/lib/exercise/catalog.ts`) currently holds **74
entries** (40 seed + 34 rules; `CANONICAL_CATALOG`). `tests/movement-taxonomy.test.ts`
proves:

- every one of the 74 slugs classifies into ≥1 movement pattern and ≥1
  equipment type using ONLY the closed vocabularies (illustrative
  classification fixtures; authoritative enrichment is the future
  MG-04/MG-08 pipeline);
- all 19 movement-pattern tokens are exercised by the current catalog (no
  dead vocabulary);
- display maps are complete and exactly match each vocabulary.

## 4. Module surface

`src/lib/movement/taxonomy.ts` exports, per vocabulary: the closed `as
const` token list + derived union type, an FA/EN `Record` display map, an
`isX` guard, and a `toXToken` bridge to the MG-01 nominal token type. Plus:

- `taxonomyTokenErrors(taxonomy)` — fail-closed validator: unknown tokens
  surface as explicit errors (never guessed; consistent with the S02-E
  identity-resolution lesson);
- `isKnownTaxonomy(taxonomy)` — boolean convenience.

MG-01's `types.ts` and `MovementTaxonomy` are **unchanged** (closed work is
not reopened): the contract keeps nominal tokens; this module closes them.

## 5. Architecture gate

The `ARCHITECTURE_GATE: REQUIRED` metadata is satisfied by:
1. this vocabulary document (every term + FA/EN rendering), and
2. [`../adr/0007-movement-taxonomy-vocabulary.md`](../adr/0007-movement-taxonomy-vocabulary.md)
   (decision record: adopt the closed taxonomy vocabulary as canonical;
   vocabulary additions require a governed decision, not ad-hoc extension).

## 6. Boundaries respected (scope guard)

- ❌ No MG-01 contract changes; no Prisma/schema/DB change (`DB_SENSITIVITY NONE`).
- ❌ No classification of catalog entries into production data — fixtures in
  tests only; enrichment is MG-04/MG-08.
- ❌ No relationship validation (MG-06), no provenance module (MG-03), no
  localization key architecture (MG-07).
- ❌ No runtime wiring — nothing in application code imports
  `src/lib/movement`; `RUNTIME_BEHAVIOR_CHANGED = NO`.
- The `Side-Lying Leg Lift` ambiguity stays unresolved (its illustrative
  fixture row classifies by NAME only and makes no identity claim).