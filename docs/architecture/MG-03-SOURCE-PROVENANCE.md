# MG-03 — Source / Provenance Contract

> **STATUS: DELIVERED — MG-03 (2026-09-01)**
>
> Task: `MG-03` in [`../TASKS.md`](../TASKS.md) — Source/provenance contract
> (P0, DEPENDENCIES: MG-01, architecture-gated). Builds on the MG-01 domain
> contract ([`MG-01-MOVEMENT-GRAPH-CONTRACT.md`](MG-01-MOVEMENT-GRAPH-CONTRACT.md),
> baseline `MovementProvenance` — unchanged) and the MG-02 taxonomy
> ([`MG-02-MOVEMENT-TAXONOMY.md`](MG-02-MOVEMENT-TAXONOMY.md)). Decision
> record: [`../adr/0008-source-provenance-contract.md`](../adr/0008-source-provenance-contract.md).
> Module of Record: `src/lib/movement/provenance.ts`.

## 1. Purpose

Every movement knowledge object must be **traceable to its upstream
sources** — the audit trail for the self-hosting/resilience requirement
(strategy §6): the canonical catalog is controlled/self-hosted, and loss of
upstream connectivity must never break core workout execution. Third-party
datasets/APIs may serve as upstream import/enrichment sources where legally
appropriate, but they must not become runtime sources of truth. This module
hardens the MG-01 baseline provenance with: the ingestion timestamp, the
content-hash contract, the license-compatibility rules, and the confidence
assessment model.

## 2. Provenance record (required fields)

`MovementProvenanceRecord extends MovementProvenance` — the MG-01 baseline
outlined below plus `ingestedAt`. Assignable wherever the baseline is
expected (structural superset; the MG-01 contract text is unchanged).

| Field | Type | Required | Meaning |
|---|---|---|---|
| `sourceKind` | `SOURCE_CONTROLLED │ UPSTREAM_IMPORT │ CURATED │ LEGACY_SEED` | ✅ | Where the knowledge came from |
| `sourceRef` | `string` | ✅ | **Stable upstream identifier** — URL or canonical source ref (per record) |
| `license` | `string` | **for `UPSTREAM_IMPORT`** | SPDX(-ish) identifier; classified by the compatibility rules (§3) |
| `contentHash` | `string` (sha256 hex) | no | Integrity/change detection of the canonical content |
| `confidence` | `number` (0..1) | ✅ | Reliability posture per the assessment model (§4) |
| `ingestedAt` | `string` (ISO-8601 UTC) | ✅ | Ingestion timestamp (MG-03 hardening) |

## 3. License-compatibility rules (upstream import)

Importable (can become part of the Apex canonical catalog):

| Class | Licenses | Requirement |
|---|---|---|
| **Permissive** | MIT, Apache-2.0, BSD-2/3/4-Clause, 0BSD, ISC, Zlib, Unlicense, CC0-1.0, Public Domain | none |
| **Attribution** | CC-BY-4.0, CC-BY-3.0 | License + source ref MUST persist on the record |

**NOT importable (fail-closed):**

| Class | Licenses | Why |
|---|---|---|
| **Copyleft / viral** | GPL-2.0(-only), GPL-3.0(-only), AGPL-3.0, LGPL-2.1/3.0, MPL-2.0 | Derivative/redistribution obligations conflict with a proprietary self-hosted catalog |
| **Share-alike** | CC-BY-SA-4.0/3.0 | Our transformed catalog would inherit the same license |
| **Non-commercial** | CC-BY-NC-4.0, CC-BY-NC-SA-4.0 | Product is commercial |
| **No-derivatives** | CC-BY-ND-4.0 | Catalog transformation (normalize/enrich) is a derivative work |
| **Unknown / missing** | anything unrecognized or absent | **Never import on an unknown license** |

Rules live in code as `LICENSE_CLASSIFICATIONS` (case/space-insensitive
matching) with `classifyLicense` / `isLicenseImportable` /
`licenseRequiresAttribution`.

## 4. Confidence assessment model

- **By source kind** (`sourceKindConfidence`): `SOURCE_CONTROLLED` → 1.0 ·
  `CURATED` → 0.9 · `UPSTREAM_IMPORT` → 0.7 · `LEGACY_SEED` → 0.5
  (seed/legacy Production data is not canonical — strategy §5).
- **By evidence** (`evidenceConfidence`, for the future ingestion pipeline):
  `verified` → 0.95 · `partial` → 0.7 · `unverified` → 0.4 ·
  **`ambiguous` → 0.2** (fail-closed — ambiguity surfaces, confidence is
  never inflated; the S02-E lesson applied to provenance).
- `isValidConfidence` rejects anything outside the finite [0, 1] range.

## 5. Content-hash contract

- Single supported algorithm: **sha256** (`CONTENT_HASH_ALGORITHM =
  'sha256'`), lowercase hex. `ContentHash { algorithm, value }`;
  `MovementProvenance.contentHash` is the hex string form.
- `sha256Hex`/`contentHashOf` are deterministic; `isValidContentHash`
  enforces the 64-hex-char form; `validateProvenanceRecord` rejects
  malformed hashes.

## 6. Builder + fail-closed validation

- `recordProvenance(input)` → hardened record: deterministic content hash,
  ISO-8601 `ingestedAt` (clock injectable for tests), confidence defaulting
  from the source kind.
- `validateProvenanceRecord(record)` → explicit errors (`[]` = valid).
  Fail-closed gates: non-empty `sourceRef`; confidence within [0, 1];
  `UPSTREAM_IMPORT` REQUIRES an importable license; malformed
  `contentHash` rejected. Unknown tokens/licenses are surfaced, never
  silently accepted.

## 7. Architecture gate

The `ARCHITECTURE_GATE: REQUIRED` metadata is satisfied by:
1. this document (required fields + license rules + models), and
2. [`../adr/0008-source-provenance-contract.md`](../adr/0008-source-provenance-contract.md)
   (ACCEPTED decision record).

## 8. Boundaries respected (scope guard)

- ❌ MG-01 contract unchanged (`types.ts` untouched; the hardening is a
  structural superset record in `provenance.ts`).
- ❌ No ingestion pipeline / identity resolution (MG-04/MG-05) — this module
  provides the tools those tasks consume.
- ❌ No relationship validation (MG-06), no media/localization architecture
  (MG-07), no catalog reconciliation (MG-08), no persistence (MG-09).
- ❌ No DB/schema change (`DB_SENSITIVITY NONE`); no runtime wiring
  (`RUNTIME_BEHAVIOR_CHANGED = NO`); no Production data touched.