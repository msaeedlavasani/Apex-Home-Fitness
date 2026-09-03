# ADR-0014: Privacy / Safety Architecture

> **STATUS: ACCEPTED — 2026-09-03**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `TS-01` (Privacy / safety architecture, delivered
> 2026-09-03; architecture: `docs/architecture/TS-01-PRIVACY-SAFETY-ARCHITECTURE.md`;
> view in `docs/TASKS.md`)
>
> **Execution gating:** this ADR ratifies the privacy/safety architecture.
> It does NOT authorize any camera/pose implementation (CP-03 feasibility,
> CP-04 camera architecture), any legal wording (TS-02), any account/data
> deletion implementation (TS-03), any public trust page (TS-05), or any
> collection/storage/transmission of the classified data types. Each of
> those requires its own task authorization.

## Context

The strategy (`docs/product/PRODUCT-STRATEGY.md` §8, §9) requires strong
privacy-by-design for future camera/pose functionality (on-device inference
preference; raw video should not need to leave the device) and a
trust/safety surface that clearly separates fitness guidance from medical
diagnosis/treatment. The adaptive-loop contracts (AL-01 outcomes, AL-02
profile) already encode data minimization structurally (projections-only
profiles; feedback comments referenced, never stored). What is missing is
the **architecture-level classification and consent/retention/user-control
framework** that every future sensitive-data implementation must satisfy.

## Decision

1. **Adopt the privacy/safety architecture** in
   `docs/architecture/TS-01-PRIVACY-SAFETY-ARCHITECTURE.md` as the canonical
   classification + consent + retention + user-control + safety-boundary
   framework for the product.
2. **Data is classified into sensitivity tiers** (raw camera input;
   derived pose/metric signals; health-adjacent user reports; training
   data; identity/account; preferences/device; usage/analytics). Each class
   declares its storage/transmission posture and its minimization rule.
3. **On-device inference is the architectural preference**: raw camera
   video stays on the user's device; only defined, consented outputs may be
   stored/transmitted, and only when purpose/consent/retention/deletion/
   security/user-control/minimization are each defined (strategy §8 list).
4. **Consent is explicit, granular, purpose-bound, and revocable**, and
   revocation never degrades the core service below its consented baseline.
5. **The safety boundary is explicit and binding**: Apex provides fitness
   guidance, not medical diagnosis or treatment. No product surface —
   profile (AL-02), adaptation (AL-03/AL-04), or future Companion — may
   present diagnostic/clinical claims; severity vocabularies are
   training-planning concerns only.
6. **This architecture is prerequisite authority only**: downstream tasks
   (TS-02 legal requirements, TS-03 deletion, TS-05 trust pages, CP-03/
   CP-04 camera work) must satisfy it, and each remains separately
   authorized.

## Consequences

- Future camera/pose work (CP-03/CP-04) is constrained to the on-device
  pipeline and the explicit-purpose consent model; no raw video leaves the
  device by default.
- Future legal wording (TS-02) and trust surfaces (TS-05) reference this
  architecture's classification and the fitness/medical boundary.
- The AL-01/AL-02 minimization invariants (projections-only) are promoted
  from contract details to architecture-level rules.
- No code, collection, storage, transmission, or legal text is implied or
  performed by this decision.

## Related

- `docs/architecture/TS-01-PRIVACY-SAFETY-ARCHITECTURE.md` — the architecture (this record's evidence)
- `docs/product/PRODUCT-STRATEGY.md` — §8 (privacy principle), §9 (trust/safety surface)
- `docs/adr/0013-personal-movement-profile.md`, `docs/adr/0012-workout-outcome-model.md` — existing minimization invariants
- `docs/adr/0005-mobile-readiness-guardrails.md` — binding guardrails this architecture complements
