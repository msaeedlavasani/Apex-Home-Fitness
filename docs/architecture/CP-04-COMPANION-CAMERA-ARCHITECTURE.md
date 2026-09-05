# CP-04 — Privacy-Preserving Camera Architecture

> **STATUS: DELIVERED / CLOSED (ARCHITECTURE-GATE, docs-only) — 2026-09-05.**
> Decision record: [`docs/adr/0021-companion-camera-architecture.md`](./0021-companion-camera-architecture.md).
> Scope of this delivery: the privacy-preserving camera **authorization architecture**
> — i.e. the consent architecture, data retention/deletion policy, and on-device
> inference pipeline design that make CP-04 **implementation-ready**.
>
> **Not delivered by this task, and still gated:**
> - the **camera integration decision** (whether to implement the camera surface at all)
>   and any real Product use of camera data remain **Owner-gated (OWNER_DECISION_GATE)**;
> - **runtime implementation** and any **Production changes** are out of scope — this
>   is a `CODE_NO_DEPLOY`/docs architecture delivery; no camera/sensor code, no data
>   collection, no dependency added, no schema/backend changed.

---

## 1. Purpose

Define the authorization surface around the camera/pose capability so that, **if**
the Owner later authorizes implementation, the camera integration can be built as one
bounded, privacy-preserving step — instead of discovering consent, retention, or data-
minimization questions mid-implementation.

This doc is **authorization architecture**: it captures every decision that CP-04's
acceptance criterion says is needed **before** the camera surface can be implemented,
given the CP-03 and TS-01 baselines. It also states clearly what is **not** decided
here and must still be decided by the Owner.

## 2. Anchor decisions (inputs that bind this doc)

All of the following are already accepted elsewhere and **do not change here**. They are
constraints on this architecture:

- **CP-03 decision (accepted):** Approach A — **MoveNet (TF.js), web-first, fully
  on-device**; v1 HIGH-coverage movements only; outputs TEMPO_DRIFT + validated
  RANGE_OF_MOTION; real-device measurement gate **REQUIRED before product
  implementation**; no camera/pose/sensor code, no data collection, no dependency
  added, no schema. (See `docs/architecture/CP-03-POSE-FEASIBILITY.md`.)
- **CP-03 movement-observation outcome (accepted product direction):** camera-based
  movement tracking is **strictly OPT-IN**; Apex Home Fit must remain **fully usable**
  without camera; camera denial **must not block the workout**; **raw video stays
  on-device and is not retained/uploaded by default**; and pose tracking is a
  **Movement Observation system** — not merely a rep counter — with observation
  dimensions + source discipline (`DEVICE_MEASURED`/`USER_REPORTED`/`UNKNOWN`, with
  measurement uncertainty **never classified as user performance failure**) plus the
  consent-bound longitudinal pipeline
  `Prescription → Observation → Performance History → Personal Movement Profile →
  Adaptive Training`.
  (See `docs/architecture/CP-03-MOVEMENT-OBSERVATION-OUTCOME.md`.)
- **TS-01 privacy architecture (accepted):** data classes C1–C7; **on-device
  inference preferred with raw video never leaving the device (C1 stays on-device)**
  → derived pose/metric signals (C2) only with explicit purpose + consent + retention
  + deletion + security + user control + data minimization; consent is **explicit,
  granular, revocable**; collected at point of first need; revocation must be as easy
  as grant and must **not degrade the core service** below its consented baseline;
  **account/data deletion (TS-03)** removes C3–C7 across every table + offline store;
  consent records kept for accountability but contain **no raw sensor content**.
  (See `docs/architecture/TS-01-PRIVACY-SAFETY-ARCHITECTURE.md`.)
- **CP-01 Companion architecture (accepted):** Companion = **guidance/observation
  surface, never a decision-maker**; AL-04 owns all decisions; observation **signals**
  feed the Engine in-session and AL-01 outcomes post-session; camera/pose explicitly
  deferred to CP-03/CP-04 — nothing in CP-01 authorizes collecting/storing/transmitting
  any camera/pose data. (See `docs/architecture/CP-01-COMPANION-ARCHITECTURE.md`.)
- **CP-02 observation signal model (accepted):** typed in-session per-set signals
  (REP_COUNT / SET_TIMING / REP_TIMING / REST_TIMING / FORM_PROXY) anchored to S-04
  position + set; closed honest sources (`USER_REPORTED` / `DEVICE_MEASURED` for
  count/timing, `USER_REPORTED` / `MEASURED_PROXY` for form proxies); **device-measured
  form proxies refused by the validator until CP-03 validates the proxy definitions**;
  signals are C2-class — collected only with explicit, granular, revocable consent.
  (See `docs/architecture/CP-02-OBSERVATION-SIGNAL-MODEL.md` and `src/lib/observation/`.)

**Net effect:** this doc is not choosing an engine — CP-03 already chose MoveNet/TF.js.
It is choosing (and documenting) the **authorization boundary** around whatever
on-device MoveNet pipeline is implemented: when it may run, whose consent governs it,
what it may retain, and what the "no camera" path must guarantee.

## 3. Managed surface

The consent/retention boundary this doc governs:

- **What is asked from the user:** camera permission + explicit, purpose-bound pose-
  tracking consent (separate from raw-camera permission). The user understands what is
  measured, why, how long anything is kept, how to turn it off, and how to delete it.
- **What can run with it granted:** on-device MoveNet inference (C1 → C2 pipeline),
  producing CP-02 observation signals only for authorized, consented sessions.
- **What can be kept/stored/transmitted:** only **derived movement metrics (C2)** if
  and only if the **`CP-04_DATA_RETENTION` decision (§8)** chooses to store anything
  at all. Defaults: disturb as little as possible (see §6 default posture).
- **What must exist no matter what:** the **explicit revocable opt-in flow**, the
  **active tracking indicator**, the **no-camera fallback**, the **consent/permission
  state storage**, the **retention/deletion policy (whether or not storage is chosen)**,
  and the **consumption path by revocation + deletion (TS-03)**.
- **What is out of scope here (Implementation Gate, not Architecture Gate):**
  the actual camera UI/journalism, the interactive placement guidance, the MoveNet
  pipeline runtime, any schema change, any data flow wiring, any feature expose.
  Those are CP-05/CP-06/CP-07 territory and are intentionally not addressed here.

## 4. On-device inference pipeline (privacy-preserving, by construction)

### 4.1 Design principle

The architecture's one hard technical constraint is the CP-03/TS-01 statement:
**raw video (C1) never leaves the device.** Therefore the pipeline is designed so that
**only derived movement metrics (C2) can ever leave the session**, and only if and when
the architecture explicitly decides (§6/§8) that storing anything is useful. The
implementation surface is therefore:

1. **Capture** is in-browser, on-device, short-lived (only the buffer needed for the
   current session/inference); nothing persists unless the architecture explicitly
   decides to persist a derived C2 metric. No continuous recording; no archival of
   raw frames.
2. **Inference** is on-device MoveNet/TF.js (CP-03 decision) — landmarks/keypoints
   and derived per-rep/per-set signals stay local to that inference pass.
3. **Signals** produced from inference are CP-02 signals (`DEVICE_MEASURED` source)
   with confidence, and flow into the existing observation/Companion model — **not**
   into any new data store of their own here.
4. **Whatever is persisted** (if anything) is a C2 metric tied to a purpose + consent
   record, not raw video. The user's camera frames are never the unit of retention.

### 4.2 Canonical data flow (ordered, consent-gated)

```
Consent granted (camera permission + pose-tracking purpose consent)
   → session starts camera surface
   → capture frame(s) in-browser, short-lived session buffer only
   → on-device MoveNet → landmarks/keypoints (C1 stays on device)
   → derive C2 movement metrics per CP-02 signal kinds:
        REP_COUNT / SET_TIMING / REP_TIMING / REST_TIMING / FORM_PROXY
   → feed CP-02 observation + Companion (if CONSENTED session)
   → (only if CP-04_DATA_RETENTION chooses to store anything)
        persist derived C2 metric under purpose + consent record
   → on consent revocation / session end / account deletion (TS-03):
        delete ephemeral buffer now; delete stored C2 metrics per policy now
```

**Nothing in this flow reaches a server in raw or near-raw form by default.** The
on-device boundary is structural: even if later work ever considers transmitting
anything, the architecture requires that transmission be a **separate governed decision**
(adds data-plane scope, network/error handling, integrity, plus a new C2/Cx class
definition), not a default of this pipeline.

### 4.3 Session-gating (default posture)

The camera surface is session-gated by default:

- Camera only initializes for a **consented workout session** that has an exercise
  defined for which camera is useful. It is not always-on.
- There is an explicit **"camera off / pause"** control in-session.
- Inference only runs when the session is **actively exercising the relevant movement**
  (Aligns with CP-03 guidance discipline — it is not ambient monitoring).

## 5. Consent architecture (the authorization core)

### 5.1 Consent model (from TS-01, applied to camera)

Camera/pose consent follows the TS-01 consent principles and adds the camera-specific
transparency layer TS-01 requires:

- **Explicit and granular:** not a blanket "I agree" to everything. The consent surface
  must separate:
  - **camera permission** (browser-level permission to access the camera), and
  - **pose-tracking purpose consent** (the product's stated purpose for using the camera
    during the workout — e.g., form feedback / rep tracking / tempo), with retention
    stated plainly.
  Granularity is by purpose, not by individual frame.
- **Collected at point of first need:** consent is requested when camera is first used
  for a consented session, with plain-language purpose + retention + control info.
- **Revocable at any time:** revoking pose-tracking consent is as easy as granting it.
  Revoking must **never degrade the core workout experience** below the consented
  baseline — the user can still run, log, and complete their workout.
- **Session-level transparency:** while camera is in use for pose, the session shows an
  **active tracking indicator** (TS-01 camera/pose consent requirement).
- **No implied renewal / coercion:** denying or revoking camera does **not** block the
  workout, does not harass, and does not gate any core capability. This directly
  implements the CP-03 outcome "camera denial must not block the workout."

### 5.2 Two-layer consent representation

Because browser camera access and product pose-tracking purpose are different concerns,
the architecture keeps them as **two separable layers**:

1. **Browser camera permission** — the web platform permission for camera access. This
   is the user's platform-level decision; the app must respect it and degrade gracefully.
2. **Product pose-tracking consent** — the app-level, purpose-bound record of consent to
   use camera-derived movement observation for the stated purpose. This is what the
   architecture stores (purpose + scope + version + timestamps), and what revocation
   targets first.

Either layer can be missing/revoked independently; the architecture must handle both
gracefully (see §7 no-camera fallback).

### 5.3 Consent record content (accountability without sensor content)

Per TS-01, consent records contain **no raw sensor content**. A consent record stores:

- what was consented to (purpose / scope, e.g. "pose/form observation during workout"),
- the consent state (granted / specific purpose consented / revoked),
- when it was granted and last changed,
- the consent **version** used (so future consent/retention changes are traceable),
- enough to enforce revocation + deletion correctly (i.e., to know which stored C2
  metrics belong to that consent).

It does **not** store frames, keypoints, or per-rep raw observations as part of the
consent record. Observation signals themselves are C2 and governed by the same consent +
retention model when persisted.

## 6. Data retention, storage, and deletion policy (designed here; defaults documented)

### 6.1 The owned decision that is still open

This doc defines the **policy scaffolding** and **default posture**, but the **go/no-go
on persistent storage of derived metrics** is left as an explicit **owner/decision-range
item** for the implementation gate:

- For now, the **default posture is: do not persist derived camera-derived metrics
  unless and until a purpose + retention justification is made**.
- The architecture documents this default explicitly so that implementers cannot make
  retention the accidental path.

### 6.2 Default retention posture (no new permanent retention by default)

Unless/until a purpose + retention policy is explicitly chosen:

- **Raw video (C1):** never persisted; never uploaded; never retained beyond the
  active in-session buffer needed for inference.
- **Derived C2 metrics:** by default, treated as **in-session observation evidence**
  (the observation flow), **not** as a new permanent data class. If a metric is ever
  persisted beyond the session, it must be because a purpose + retention + deletion
  definition exists for that class.

### 6.3 What any future retention decision must specify

Consistent with TS-01 §4/§8, any decision to store/transmit a derived metric requires:

- **purpose** (specific, not generic),
- **consent** (per-purpose, explicit, granular),
- **retention period** (not indefinite by default),
- **deletion mechanism** (with the guarantees of TS-03 — verified absence, no
  undeletable copies),
- **security** (appropriate for the stored class),
- **user control** (view/export/delete/withdraw for that data),
- **data minimization** (store the minimum that serves the purpose).

### 6.4 Deletion semantics

- **In-session (active):** if camera permission/consent is revoked mid-session, the
  ephemeral in-session buffer is cleared immediately and inference stops for the
  camera surface; the core workout continues without camera-derived observation.
- **Stored C2 metrics (if any exist):** deletion obeys TS-03 deletion guarantees —
  removed from every store; consent/retention policy must not create hidden retention.
- **Account deletion (TS-03):** removes stored C2 metrics and consent records across
  every table/offline store, with the same non-silent retention guarantees.

## 7. No-camera fallback (binding requirement)

Consistent with CP-01 and CP-03 outcome, the architecture must support a **fully
usable "no camera" path**:

- The Companion core experience (workout execution, guidance, logging) must work with
  camera **off or denied**, with no degraded path tied to camera denial.
- Camera-derived signals are an **enhancement to observation**, never a prerequisite
  for the workout or for outcomes.
- If camera is unavailable/denied/revoked, the session simply does not produce
  `DEVICE_MEASURED` observation for the movements that would otherwise use it; CP-02
  signals from `USER_REPORTED` (manual entry / self-report) and any other available
  sources continue as before.

## 8. Owner decision range (what this architecture does NOT decide)

This is the most important honest statement in this doc. The architecture makes the
camera surface **implementation-ready** by deciding its authorization shape, but the
following are **still the Owner's to decide** and are recorded here as pending
decision-range items — not silently "decided" by this architecture doc:

1. **Whether to implement the camera surface at all** (the product decision) —
   this is the `OWNER_DECISION_GATE` item. The architecture is ready; the product
   decision is not made here.
2. **The v1 observation scope beyond CP-03's approved v1** — CP-03 approved
   TEMPO_DRIFT + validated RANGE_OF_MOTION for HIGH-coverage movements as the
   measurement-gate acceptance scope; whether the product ships more (or sooner)
   requires its own decision.
3. **Whether to persist derived C2 metrics, and if so, the exact retention policy**
   (purpose, retention period, deletion mechanism, class) — §6 makes the default
   "do not persist unless/until decided," but the positive decision (if any) is not
   taken here.
4. **Any transmission/storage beyond on-device** — no data-plane decision is made here;
   that would be a separate governed decision if ever considered.
5. **Platform/mobile scope** — CP-03 already deferred mobile triggers and mobile stack
   selection; this architecture inherits that deferral; it does not expand to mobile
   implementation decisions.
6. **Legal consent wording / minors scope** — legal/consent wording is a TS-02
   (legal review) responsibility, not a final text here.

For each, the architecture doc records the **decision shape** and the **constraints**
so a later decision is fast and bounded; it does not take the decision.

## 9. Decision isolation (what changes vs. what cannot change)

- **Cannot change:** CP-03 approach (MoveNet/TF.js, on-device, v1 scope), TS-01 C1
  "raw video never leaves the device," the CP-03 outcome (OPT-IN, denial-never-blocks,
  no default retention/upload), the CP-02 source discipline and form-proxy refusal
  before CP-03 validation, the TS-03 deletion guarantees.
- **CHOSEN here (architecture):** the authorization surface — the consent layers, the
  session-gating default posture, the no-camera fallback, the consent-record content,
  and the retention-policy scaffolding + default posture. These are implementation-
  ready decisions.
- **CHOSEN here only as documented intent / decision-range items (not approval):**
  the default "do not persist unless decided" posture, and the framing for item (3)
  above — recorded so future implementation does not silently accumulate retention.

## 10. Acceptance

- [x] architecture defines the consent surface (purpose-bound, explicit, granular,
      revocable, session transparency, no rejection of core flow);
- [x] architecture defines the on-device pipeline shape so raw video never leaves the
      device and only derived C2 metrics are persistence candidates;
- [x] architecture documents the "no camera" fallback requirement (core experience
      usable without camera);
- [x] architecture documents the retention/scull default posture + the decision-range
      items that the Owner still must decide before any storage or transmission is
      implemented;
- [x] architecture is additive to CP-03/TS-01/CP-01/CP-02 — it does not change any of
      them; it makes CP-04 **implementation-ready**;
- [x] architecture is docs-only / `CODE_NO_DEPLOY` — no camera/sensor code, no data
      collection, no dependency, no schema/backend change, no Production change;
- [x] architecture explicitly records that camera integration + data retention decisions
      remain Owner-gated, not decided by this doc.

## 11. Related

- `docs/architecture/CP-03-POSE-FEASIBILITY.md` — engine decision (MoveNet/TF.js,
  on-device, v1 scope, measurement gate)
- `docs/architecture/CP-03-MOVEMENT-OBSERVATION-OUTCOME.md` — OPT-IN + Movement
  Observation framing + longitudinal pipeline
- `docs/architecture/TS-01-PRIVACY-SAFETY-ARCHITECTURE.md` — C1/C2 classes, consent
  principles, on-device inference preference, retention/deletion principles, user
  control rights
- `docs/architecture/CP-01-COMPANION-ARCHITECTURE.md` — Companion guidance/observation
  surface, no-camera fallback, privacy posture
- `docs/architecture/CP-02-OBSERVATION-SIGNAL-MODEL.md` — observation signal model
  (CP-02 contract; `DEVICE_MEASURED`/`MEASURED_PROXY` source discipline)
- `docs/TASKS.md` — `CP-04` queue entry (PROD_SENSITIVE, DB_DATA, ARCHITECTURE_GATE
  REQUIRED, OWNER_DECISION_GATE)
- `docs/adr/0021-companion-camera-architecture.md` — decision record (this doc's ADR)
