# TS-01 — Privacy / Safety Architecture

> **STATUS: DELIVERED / CLOSED — 2026-09-03**
>
> Decision: [`adr/0014-privacy-safety-architecture.md`](../adr/0014-privacy-safety-architecture.md).
> Docs-only task (`DOCS_ONLY`); no code, no schema, no data collection, no
> legal text. This architecture is the **prerequisite framework** for
> TS-02 (legal requirements), TS-03 (account/data deletion), TS-05 (public
> trust pages), CP-03 (pose feasibility) and CP-04 (camera architecture).

## 1. Purpose and scope

The strategy requires (a) privacy-by-design for future camera/pose
functionality — **on-device inference preferred, raw video should not need
to leave the user's device** (`PRODUCT-STRATEGY.md` §8) — and (b) a
trust/safety surface with clear boundaries between fitness guidance and
medical diagnosis/treatment (§9). This document is the canonical framework:
data classification, consent model, retention principles, user control, and
the safety boundary. It binds every future surface that handles classified
data; it authorizes nothing by itself.

Existing structural minimization that this framework promotes to
architecture level:

- AL-01 outcome records are the only session-level input of the learning
  loop; AL-02 profiles are `projectionsOnly` (validator-enforced) — minimal
  projections + references, never raw session bodies;
- feedback comments are referenced by outcomes, never copied into profiles.

## 2. Data classification model

| Class | Examples | Sensitivity | Posture |
|---|---|---|---|
| C1 — Raw camera input | camera frames / video | HIGHEST | **Never leaves the device.** On-device processing only. No upload, no persistence beyond the active session buffer unless separately defined + consented. |
| C2 — Derived pose/metric signals | landmarks, joint angles, rep/phase counts, tempo proxies | HIGH | Stored/transmitted ONLY with explicit purpose + consent + retention + deletion + security + user control + minimization (§8 list). Landmarks are not video. |
| C3 — Health-adjacent user reports | user-reported difficulties, discomfort notes, constraints, feedback comments | HIGH | User-attributable; processed as training signals only (never diagnosis); retention bound to the account; exportable/deletable. |
| C4 — Training data | outcomes (AL-01), profile (AL-02), workout history | NORMAL | Projections-only profile; minimal subsets + references; delete cascades with the account (TS-03). |
| C5 — Identity/account | auth identity, admin identity, contact info | NORMAL | Least necessary; no OTP material/plaintext secrets; see ADMIN-AUTH records. |
| C6 — Preferences/device | locale, equipment declarations, theme | LOW | Needed for core function; deletable with account. |
| C7 — Usage/analytics | product usage events | LOW | Aggregated where possible; no raw session content; retention-limited; no cross-linking to C1/C2 by default. |

Rules that apply to every class:

1. **Collect the least data that still delivers the feature** (minimization
   is structural where contracts exist — AL-01/AL-02 — and must be encoded
   for any new surface).
2. **Classify before you collect.** A new data flow states its class,
   purpose, retention, deletion path, and (for C1–C4) its consent point
   before implementation.
3. **No class silently upgrades.** A C3 note must never be repurposed as a
   C2-derived metric or a health record without a new defined purpose.

## 3. Consent model

- **Explicit and granular:** consent is per-purpose (e.g. "form feedback for
  this movement"), not a blanket acceptance.
- **Collected at the point of first need**, phrased in plain language, with
  a stated purpose and retention.
- **Revocable at any time**; revocation must be as easy as grant. Revoking a
  non-core capability (e.g. pose feedback) never degrades the core service
  (workout execution, guidance, outcomes) below its consented baseline.
- **Camera/pose consent** (future CP-04) additionally requires session-level
  transparency (active indicator) and a documented no-camera fallback.
- **Consent records** (who/when/what/purpose/version) are kept for
  accountability but contain no raw sensor content.
- Children/minors: no camera/pose or health-adjacent features without the
  age-appropriate consent requirements defined by TS-02 (legal).

## 4. Retention and deletion principles

- **Purpose-bound retention periods** per class (C7 shortest; C4 with the
  account; C2/C3 per declared purpose + consent).
- **Account/data deletion (TS-03)** removes C3–C7 across every table and
  offline store, respecting legal retention carve-outs that TS-02 defines.
- Backups and logs follow the same retention periods (no undeletable copies
  in practice); export must be possible before deletion (user control).
- Unknown/failed deletion never silently retains: TS-03 must verify
  post-deletion absence.

## 5. User control rights

- **View:** the user can see their C2–C4 data in readable form (AL-02
  `userViewSupported`).
- **Export:** the user can export their training/profile data.
- **Delete:** the user can delete their account and data (TS-03;
  `userDeletionSupported`), including offline per-device stores.
- **Withdraw:** per-purpose consent withdrawal with the guarantees of §3.

## 6. On-device inference preference (future camera work)

```text
Camera (C1)
  → on-device pose/landmark inference   (C1 stays on device)
  → movement metrics (C2)               (defined purpose + consent to store/transmit)
  → Companion feedback (training signal)
```

- Raw video (C1) must not leave the device merely to provide movement/form
  tracking; CP-04's acceptance ("raw video never leaves the device") is this
  architecture's hard constraint.
- Anything derived (C2) that is stored/transmitted needs the §8 seven-item
  definition (purpose, consent, retention, deletion, security, user
  control, data minimization) before implementation.
- The "no camera" fallback keeps the full core experience available.

## 7. Safety boundary statement (fitness guidance, not medical diagnosis)

Binding and non-negotiable:

> **Apex provides fitness guidance, not medical diagnosis or treatment.**

Operational consequences:

- No product surface may present diagnostic, prognostic, or clinical
  statements. Profile/adaptation severity vocabularies (`LOW/MEDIUM/HIGH`,
  capability tiers, trends) are **training-planning** labels only.
- User-reported discomfort/health-adjacent signals (C3) are processed as
  training constraints; they are never labeled, stored, or surfaced as
  medical facts.
- The safety disclaimer + liability/legal surfaces are TS-02 requirements
  (legal wording stays out of scope here, per strategy §9).
- Any future surface that cannot meet this boundary must be redesigned
  before implementation.

## 8. Acceptance

- [x] all data types classified (movement landmarks, derived metrics, health
      signals → classes C1–C4 table);
- [x] consent model covers collection, purpose, and revocation (§3);
- [x] medical boundary explicit — "Apex provides fitness guidance, not
      medical diagnosis" (§7);
- [x] architecture satisfies the on-device inference preference (§6);
- [x] retention + user control rights defined (§4, §5); docs-only task —
      no code/collection/storage/legal text produced.

## 9. Related

- `docs/product/PRODUCT-STRATEGY.md` §8 (privacy principle), §9 (trust/safety surface)
- `docs/adr/0014-privacy-safety-architecture.md` — decision record
- `docs/adr/0012-workout-outcome-model.md`, `docs/adr/0013-personal-movement-profile.md` — minimization invariants
- `docs/TASKS.md` — TS-01 queue entry (DELIVERED / CLOSED); TS-02/TS-03/TS-05, CP-03/CP-04 downstream
