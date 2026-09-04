# CP-03 — Movement Observation Product/Architecture Outcome (persisted)

> **Type:** Canonical decision record — product/architecture outcome discovered during
> the CP-03 pose/form feasibility spike.
> **Status:** `ACCEPTED` (product direction) — no product feature implementation authorized.
> **Persistence:** DOCUMENTATION-GOVERNANCE §2.12 (Decision Persistence) — recorded in its
> canonical topic owner before workflow continuation; follow-up work promoted to
> `docs/TASKS.md` as `NOT_YET` records (CP-06, CP-07, MO-01); all other content here is
> non-executable.
> **Date:** 2026-09-04 (persisted `bb2d59a..main`, Main CI PASS on exact SHA).
> **Source of discovery:** CP-03 real-device measurement work — harness repairs and the
> first iPhone squat export analysis (see `CP-03-HARNESS-REPAIR.md`,
> `CP-03-TRACKING-REPAIR.md`, `CP-03-REP-HEURISTIC-REPAIR.md`, and
> `scripts/pose-measurement/README.md`).

---

## 1. Camera-based movement tracking is strictly OPT-IN

`ACCEPTED` — binding product direction for any future camera/pose feature.

- **Apex Home Fit must remain fully usable without camera permission.** Camera
  capability is an enhancement, never a prerequisite: a user who denies (or never
  grants) camera access must be able to start and complete every workout.
- **Camera denial must not block the workout.** There is no gating, nagging, or
  degraded path tied to denial; the Companion must simply fall back to its
  no-camera mode (per CP-01 "no camera" fallback and CP-04 acceptance).
- **Raw video remains on-device and is not retained or uploaded by default.**
  Consistent with TS-01 (raw video never leaves the device) and CP-03's
  on-device MoveNet/TF.js posture. Retention/transmission, if ever considered,
  requires explicit consent + purpose (TS-01 C-classes; CP-04 consent flow) —
  not the default.

## 2. Pose tracking is a Movement Observation system, not merely a rep counter

`ACCEPTED` — architectural framing for the observation layer.

For every prescribed movement/set, the future observation model must be capable
of distinguishing and logging (design target — no schema/UI/backend work here):

| Observation dimension | Meaning |
|---|---|
| prescribed reps / duration | what the plan asked for (AL-04 / Workout V2 intent) |
| observed repetitions | repetitions the measurement layer actually saw |
| validated repetitions | reps that passed quality/confidence validation |
| measurable ROM proxy | e.g. min/max angle, depth — a proxy, not a medical ROM claim |
| tempo / tempo drift | rep timing + drift vs prescription (CP-03 v1 scope) |
| measurement confidence | per-rep/per-trial confidence (keypoint scores, gate pass rates) |
| invalid/incomplete measurable reps | deterministically supported only; never guessed |
| unobservable / uncertain periods or reps | dropouts, occlusion, dark input — honestly flagged |
| timestamps / durations | trial start/end, rep windows, set timing |
| observation source | closed honest set: `DEVICE_MEASURED`, `USER_REPORTED`, `UNKNOWN` (CP-02 source discipline) |

**Do not classify measurement uncertainty as user performance failure.** A low
confidence/uncertain rep is an observation-quality fact, not evidence about the
user's ability. The adaptation layer must be able to distinguish actual
performance evidence from measurement uncertainty (see §3).

## 3. Preserve useful structured longitudinal movement data (consent-bound)

`ACCEPTED` — data-preservation direction, subject to consent/privacy policy.

The preserved pipeline the data must be able to feed:

```
Workout Prescription
→ Movement Observation
→ Movement Performance History
→ Personal Movement Profile (AL-02 contract)
→ Adaptive Training (AL-03/AL-04)
```

The adaptation layer must be able to distinguish **actual performance evidence**
from **measurement uncertainty** — i.e. evidence/uncertainty separation must
survive from observation capture through AL-03 projection into AL-04 decisions
(AL-02 projections-vs-inference discipline; CP-02 evidence-only mapping).

## 4. Potential future monetization / value layer (recorded — NOT chosen)

`RECORDED / NOT EVALUATED` — opportunity only, explicitly not a decision.

Enhanced movement measurement, longitudinal performance intelligence, richer
progress insights, and more precise adaptive programming **may** support premium
capabilities. **No pricing model, paywall, tier structure, or monetization
implementation is chosen here.** This is persisted only so a later
product/business evaluation can consider the opportunity. Strategy
§4's moat framing (accumulated closed-loop knowledge) remains the strategic
lens; monetization is a separate, later product/business decision.

## 5. CP-03 scope guard

`BINDING` — CP-03 remains a feasibility measurement.

- No production schema, UI, or backend implementation is authorized by this
  record or by CP-03's findings.
- No change to the CP-03 real-device measurement gate: the gate stays OPEN and
  these records do not count toward it.
- No change to CP-03 product decisions (Approach A — MoveNet/TF.js, web-first,
  fully on-device, v1 HIGH-coverage movements, TEMPO_DRIFT + validated
  RANGE_OF_MOTION only, real-device measurement gate REQUIRED before product
  implementation).

---

## Follow-up work (promoted to `docs/TASKS.md` — all `NOT_YET`, NOT authorized)

| ID | Recorded follow-up | Dependencies (satisfied → eligible) |
|---|---|---|
| CP-06 | Camera opt-in / consent UX + no-camera fallback (implementation design + consent flow) | CP-03 gate, CP-04, TS-01, TS-02 (HUMAN_GATE legal) |
| CP-07 | Movement Observation runtime — the §2 observation model contract (typed, fail-closed, source-honest) | CP-03 gate, CP-02, CP-04, AL-01 |
| MO-01 | Movement Performance History — longitudinal observation store feeding AL-02/AL-03/AL-04 | CP-07, AL-01, AL-02, consent/privacy policy (TS-02) |

## Related

- `CP-03-POSE-FEASIBILITY.md` — the spike this outcome was discovered during
- `CP-02-OBSERVATION-SIGNAL-MODEL.md` — in-session signal contract (sources discipline)
- `TS-01-PRIVACY-SAFETY-ARCHITECTURE.md` — consent/retention/privacy posture (raw video never leaves the device)
- `CP-01-COMPANION-ARCHITECTURE.md` — Companion guidance surface; no-camera fallback
- `product/PRODUCT-STRATEGY.md` — §3 closed loop, §4 moat, §8 privacy principle
- `docs/TASKS.md` — registered decisions + CP-06/CP-07/MO-01 `NOT_YET` records