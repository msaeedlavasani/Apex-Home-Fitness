# ADR-0010: Localization Key Structure + Self-Hosted Media Architecture

> **STATUS: ACCEPTED**
>
> **Date:** 2026-09-01

## Context

MG-01 deferred two contracts to MG-07: the `LocalizedText.key` structure and
the `MovementMediaAsset` self-hosting architecture (strategy §6: core fitness
must not depend at runtime on third-party exercise APIs/CDNs; Apex catalog
and required media are controlled/self-hosted). MG-04's Owner decision gate
recorded a DATA-ONLY media posture — upstream media was not imported, so the
media architecture must define admission rules for future rights-cleared,
self-hosted assets.

## Decision

1. **Localization keys** follow the app's next-intl dotted convention
   (`<namespace>.<id>.<field>`): `movement-key := scope "." ref "." field`
   with scope ∈ `mv|fedb|rules|seed|canonical|curated`, field ∈ `name |
   description | instr.<n> | cue.<n> | media.<assetId>.caption`. Every
   user-facing field of a `MovementObject` carries such a key
   (`src/lib/movement/localization.ts`, `localizationKeyCoverage`).
2. **Self-hosted media manifest**: entries carry `assetId`, closed `kind`,
   self-hosted `url`, **sha256 content hash (MG-03 contract)**, optional
   self-hosted `fallbackUrl`, and optional caption key. Validation is
   fail-closed (`src/lib/movement/media.ts`).
3. **No third-party CDN for required media.** Only same-origin absolute
   paths (`/videos|posters|animations/…`) or explicitly allowlisted
   AHF-controlled origins are admitted. `mux.dev` /
   `commondatastorage.googleapis.com` remain demo-only origins (never
   canonical movement media).
4. **Resilience**: the manifest rides the existing offline-first service
   worker; loss of upstream connectivity must never break core workout
   execution; `fallbackUrl` is the per-asset resilience path.
5. **No media import in this task** — manifest + validation only, per the
   MG-04 DATA-ONLY decision.

## Alternatives considered

- **Key per field type only (no scope segment)** — rejected: scope is the
  provenance signal (canonical vs upstream), mirroring `MovementSourceKind`
  and keeping `fedb.<id>.instr.<n>` MG-04 keys conforming.
- **Allow any absolute https URL with content-hash check** — rejected:
  content hashes verify integrity but not the self-hosting/resilience
  requirement; third-party origins must be structurally impossible for
  required media, not merely detectable post-hoc.
- **Import upstream media now (free-exercise-db images)** — rejected:
  recorded MG-04 DATA-ONLY posture; upstream image chain-of-title risk
  unresolved.

## Consequences

- Positive: every user-facing movement field has a stable localization
  address; manifest admission rules enforce self-hosting at the boundary;
  hash verification is deterministic end-to-end; zero runtime change.
- Negative / trade-offs: real media delivery (release) and rights-cleared
  import remain future work; the demo library's third-party origins are now
  explicitly non-canonical (audit-visible).
- Documentation updated to match: `docs/architecture/MG-07-LOCALIZATION-MEDIA.md`,
  `docs/INDEX.md`, ADR README. `docs/ASSETS.md` namespaces unchanged
  (already the self-hosted targets).

## Supersedes / Superseded by

- Supersedes: (none)
- Superseded by: (none)