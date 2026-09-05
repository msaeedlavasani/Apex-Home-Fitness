# ADR-0021: Companion camera / pose authorization architecture

> **STATUS: DISCUSSED — 2026-09-05**
>
> **Decision owner (candidate):** Product / architecture owner
>
> **Evidence task:** `CP-04` — Privacy-preserving camera architecture
> (delivered 2026-09-05 as an ARCHITECTURE-GATE, docs-only,
> `CODE_NO_DEPLOY` capability trial).
>
> **Execution gating:** this ADR records the **architecture** that makes
> CP-04 **implementation-ready** (consent surface, on-device pipeline shape,
> retention/scull posture, no-camera fallback). It does **not** decide whether
> to implement the camera surface, what storage to use, when/where anything is
> persisted or transmitted, or any Production use. Those remain
> **OWNER_DECISION_GATE / HUMAN_GATE** items (per `docs/TASKS.md` CP-04 entry)
> plus any TS-02 (legal) needs. **Do not use this ADR as an approval to
> implement the camera integration.**

## Context

The CP-03 feasibility spike decided the engine and posture (MoveNet/TF.js,
web-first, fully on-device, v1 HIGH-coverage scope, TEMPO_DRIFT + validated
RANGE_OF_MOTION, measurement gate required before product implementation). It
also produced a binding product direction: camera tracking must be **strictly
OPT-IN**, denial must not block the workout, raw video stays on-device and is
not retained/uploaded by default, and pose tracking is a Movement Observation
system (with `DEVICE_MEASURED`/`USER_REPORTED`/`UNKNOWN` sources and
measurement uncertainty never treated as user failure).

TS-01 already classified raw camera footage as C1 (**never leaves the device**)
and derived pose/metric signals as C2 (needs explicit purpose + consent +
retention + deletion + security + user control + minimization), and required
**session-level transparency** and **easy revocation that never degrades the
core service**.

**Gap:** CP-03/CP-01/CP-02 together define the observation model and privacy
posture, but none of them fully specify the **authorization surface** around a
future camera implementation — i.e. how consent is layered, stored,
retracted, what the default retention posture is, what the "no camera" path
guarantees, and which decisions are still explicitly the Owner's. That is the
gap this ADR + its parent architecture doc fill. Doing so is the natural
CP-04 output per its `ARCHITECTURE_GATE = REQUIRED` entry.

## Decision

1. **Make CP-04 implementation-ready by defining its authorization architecture,**
   not by implementing it. The deliverables are the architecture doc
   (`docs/architecture/CP-04-COMPANION-CAMERA-ARCHITECTURE.md`) and this ADR.
2. **Two-layer consent model:** keep **browser camera permission** and **product
   pose-tracking purpose consent** as separable layers, both revocable
   independently, with the architecture handling each gracefully (including the
   no-camera fallback).
3. **On-device pipeline shape is the privacy boundary by construction:** capture
   is in-browser and short-lived (active-session buffer only); MoveNet inference
   stays on-device; only derived C2 metrics can be persistence candidates, and
   only under an explicit purpose + retention decision — not by default.
4. **Consent-record content is accountability-only, never sensor content:** it
   records purpose/scope/state/version/timestamps/enough-to-enforce-revocation,
   and never frames/keypoints/raw observations.
5. **Default posture is disturb-less:** unless and until a purpose + retention
   policy is explicitly chosen, the architecture does **not** make persistent
   storage of derived metrics the default path. The architecture documents this
   default explicitly so implementers cannot drift into accidental retention.
6. **No-camera fallback is a binding requirement, not an option:** core Companion
   experience must remain fully usable when camera is denied/unavailable/revoked.
7. **Explicitly record the decision-range items that remain the Owner's** (item 8
   of the architecture doc): whether to implement the camera surface, the v1
   scope beyond CP-03's approved scope, the storage/retention decision, any
   transmission, platform/mobile scope, and legal consent wording. These are
   **documented as pending**, not decided by this ADR.

## Alternatives considered

- **More concrete than this ADR (implement now / ship a prototype):** out of
  scope — CP-04's queue entry marks camera integration `HUMAN_GATE` and
  `PROD_SENSITIVE`, and this capability trial was explicitly limited to
  architecture/docs, no runtime code, no Production changes.
- **Less concrete than this ADR (defer the consent/Retention architecture to
  implementation):** weak — would push privacy boundary questions into
  implementation time, exactly the pattern CP-03/CP-01/CP-02 were designed to
  avoid for the observation model. CP-04 acceptance criterion explicitly asks
  for the consent flow + retention/deletion policy + on-device pipeline design
  before implementation.
- **Store/collect as "observation evidence" by default and decide retention
  later:** rejected — violates TS-01's C2 default posture and the CP-03 outcome
  that raw video is "not retained/uploaded by default." The architecture here
  makes retention/non-retention a first-class decision, with a documented
  default of non-retention.

## Consequences

- Positive:
  - CP-04 becomes implementation-ready (should the Owner later authorize the
    camera surface) without introducing privacy/retention uncertainty mid-build.
  - The consent/retention boundary is explicit and aligned with TS-01 and the
    CP-03 outcome, so future implementation cannot silently accumulate data.
  - The "decision-range items" are explicit, so future Owner decisions are bounded
    and fast.
- Negative / trade-offs:
  - This ADR does **not** satisfy the CP-04 `OWNER_DECISION_GATE` for camera
    integration — that remains an explicit Owner decision. Do not ship camera
    features on the strength of this ADR alone.
  - Because this is docs-only, it cannot be validated by real camera flow; the
    architecture is validated by internal consistency with the cited contracts,
    not by end-to-end camera behavior.
- What must update with this decision (Documentation With Change):
  - `docs/TASKS.md` — CP-04 STATUS + AUTONOMOUS_ELIGIBILITY note,
    ARCHITECTURE-GATE closure, + pending decision-range note (and, if any safe
    next work appears, a NOT_YET/READY candidate).
  - `docs/INDEX.md` — CP-04 canonical owner entry.
  - `docs/CURRENT_STATE.md` — architecture + gating summary.

## Supersedes / Superseded by

- Supersedes: (none — first camera-authorization-architecture decision record)
- Superseded by: (none yet)
