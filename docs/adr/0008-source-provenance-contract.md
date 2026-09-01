# ADR-0008: Source / Provenance Contract

> **STATUS: ACCEPTED — 2026-09-01**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `MG-03` (Source/provenance contract, delivered
> 2026-09-01; contract: `docs/architecture/MG-03-SOURCE-PROVENANCE.md`;
> module: `src/lib/movement/provenance.ts`; view in `docs/TASKS.md`)
>
> **Execution gating:** this ADR ratifies the provenance contract, hash
> contract, license-compatibility rules, and confidence model. It does NOT
> authorize ingestion of any dataset, a persistence change (MG-09), or the
> ingestion pipeline (MG-04).

## Context

The MG-01 domain contract (ADR-0006) fixed the SHAPE of movement knowledge
including baseline provenance fields, explicitly deferring the hardening to
MG-03: ingestion timestamp, hash algorithm, confidence semantics, and
license-compatibility rules. The self-hosting/resilience principle (product
strategy §6) demands the canonical catalog be traceable to its upstream
sources — third-party datasets may feed ingestion but must never become
runtime sources of truth. Without a fixed provenance contract, the future
ingestion pipeline would import sources with inconsistent audit metadata and
no consistent legal gate.

## Decision

1. **Adopt the hardened provenance record** (`MovementProvenanceRecord`) as
   the canonical audit record: MG-01 baseline fields (source kind/ref,
   license, content hash, confidence) plus an ISO-8601 **ingestion
   timestamp**. The MG-01 `MovementProvenance` contract text is UNCHANGED;
   the hardened record is a structural superset in
   `src/lib/movement/provenance.ts`.
2. **Content-hash contract is sha256-hex** (`CONTENT_HASH_ALGORITHM =
   'sha256'`): deterministic, 64 lowercase hex chars, format-validated,
   persisted as `contentHash` on the baseline field.
3. **License importability is fail-closed and classified**: permissive
   (MIT, Apache-2.0, BSD, ISC, 0BSD, Unlicense, CC0, …) and attribution
   (CC-BY-3.0/4.0, attribution persisted) are importable; copyleft/viral
   (GPL/AGPL/LGPL/MPL), share-alike (CC-BY-SA), non-commercial
   (CC-BY-NC[-SA]), no-derivatives (CC-BY-ND), and UNKNOWN/missing licenses
   are NOT importable — **never import on an unknown license**.
4. **Confidence is evidence-based and ordered**: source-kind defaults
   (SOURCE_CONTROLLED 1.0 → LEGACY_SEED 0.5) and pipeline evidence bands
   (verified → ambiguous 0.2). Ambiguity surfaces at the LOW band —
   confidence is never inflated (the S02-E fail-closed lesson applied to
   provenance).
5. **Validation is fail-closed**: `validateProvenanceRecord` requires a
   stable source ref, in-range confidence, and — for `UPSTREAM_IMPORT` — an
   importable license; malformed hashes are rejected.

## Consequences

- The ingestion pipeline (MG-04/MG-05) consumes one provenance contract with
  a license gate instead of inventing per-source audit formats.
- A source whose license is unknown/restrictive is rejected at record time —
  the audit trail is legal-safe by construction.
- No behavior or data change today; the module is pure tooling consumed by
  future tasks.

## Related

- `docs/architecture/MG-03-SOURCE-PROVENANCE.md` — required fields + license/confidence/hash detail
- `docs/architecture/MG-01-MOVEMENT-GRAPH-CONTRACT.md` + `adr/0006-…` — baseline contract
- `docs/product/PRODUCT-STRATEGY.md` §6 — self-hosting/resilience principle
- `docs/product/MOVEMENT-INTELLIGENCE-STRATEGY.md` §6 — self-hosting posture