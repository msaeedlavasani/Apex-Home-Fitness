# Apex Home Fit — Comprehensive Product Strategy

> **STATUS: PROPOSED / NON-EXECUTABLE**
>
> This document records the product strategy and strategic direction of Apex
> Home Fit. It is the **parent/master product strategy**; the deeper specialist
> strategy is
> [`MOVEMENT-INTELLIGENCE-STRATEGY.md`](MOVEMENT-INTELLIGENCE-STRATEGY.md).
>
> **Nothing in this document authorizes implementation.** It MUST NOT be
> treated as an executable backlog entry. The ONLY executable backlog
> authority is [`../TASKS.md`](../TASKS.md). Converting any strategic direction
> here into work requires explicit Owner authorization and separate promotion
> to `TASKS.md`.
>
> AHF remains **execution-frozen** for everything described in this document
> (see §15).
>
> Persisted: 2026-09-01 (docs/governance-only persistence task; no code, DB,
> infrastructure, or Production change).

---

## 1. Product promise / North Star

The proposed primary product/brand promise is:

> **«تو ورزش کن؛ ما حواسمون بهت هست.»**

This is the central experience Apex Home Fit should ultimately deliver: an
**active fitness companion** that:

- understands the user;
- selects appropriate training;
- stays present during the workout;
- observes relevant performance/form signals where authorized;
- adapts future training based on outcomes.

The **English wording is NOT final**. The current direction, e.g.
*"You move. We've got you."*, is recorded only as a **candidate/direction**,
not approved final copy.

> Changing the live website slogan is NOT authorized by this task or this
> document.

## 2. Strategic product system

The strategy is built on four interconnected pillars.

### A. Apex Movement Graph / Exercise Intelligence Library

A **self-hosted canonical movement knowledge system**. It should eventually
support:

- broad curated exercise coverage;
- canonical Apex exercise identities;
- stable internal IDs;
- names and aliases;
- movement taxonomy;
- primary/secondary muscles;
- movement patterns;
- equipment;
- difficulty;
- impact;
- unilateral/bilateral properties;
- home suitability;
- relevant movement constraints;
- instructions;
- common mistakes/form cues where supported;
- progression relationships;
- regression relationships;
- substitution/alternative relationships;
- provenance/source metadata;
- catalog versioning;
- FA/EN localization;
- validated/self-hosted required media.

The Movement Graph is **more than an exercise table**. Exercises should
eventually become **related movement knowledge objects** (see the
[Movement Intelligence Strategy](MOVEMENT-INTELLIGENCE-STRATEGY.md)).

### B. Personal Movement Profile

AHF should progressively understand how each user trains and moves. Potential
future signals include:

- capability;
- training history;
- movement performance;
- progression;
- recurring difficulties;
- asymmetries where reliably observable;
- form degradation;
- exercise tolerance;
- adherence;
- available equipment;
- preferences;
- session constraints;
- relevant user feedback.

> This is **NOT a medical diagnosis system**.

### C. Apex Adaptive Training Graph

Use movement knowledge + user state + training history + outcomes to determine:

> **"What is the appropriate training decision for this person now?"**

Future adaptation may include:

- exercise selection;
- progression/regression;
- substitutions;
- volume;
- intensity;
- sequencing;
- session duration;
- equipment constraints;
- recovery/context signals;
- previous performance.

### D. Apex Companion

Represents the experience promise: **«تو ورزش کن؛ ما حواسمون بهت هست.»**

Future Companion capabilities may include:

- workout guidance;
- rep/phase awareness;
- camera-based pose estimation;
- joint/movement tracking;
- form feedback;
- useful correction;
- encouragement;
- contextual substitutions/regressions;
- workout observation feeding future adaptation.

Desired UX principle: **watching over the user, not policing the user.** The
Companion should intervene when useful rather than constantly criticize.

## 3. Closed-loop product model

The strategic closed loop:

```
User
  ↕
Movement
  ↕
Workout
  ↕
Observation / Performance
  ↕
Outcome / Feedback
  ↕
Adaptation
  ↺
```

Equivalent strategic framing: **User ↔ Movement ↔ Workout ↔ Outcome**.

The long-term system should improve its understanding of the individual as
that user trains with Apex.

**Movement Observation framing (ACCEPTED 2026-09-04 — CP-03 outcome):** pose
tracking is a **Movement Observation system**, not merely a rep counter. For
every prescribed movement/set the observation model must be able to
distinguish prescribed reps/duration, observed reps, validated reps,
measurable ROM proxy, tempo/tempo drift, measurement confidence,
invalid/incomplete measurable reps (where deterministically supported),
unobservable/uncertain periods or reps, timestamps/durations, and the
observation source (`DEVICE_MEASURED` / `USER_REPORTED` / `UNKNOWN`).
**Measurement uncertainty is never classified as user performance failure.**
Consent-bound longitudinal movement data feeds the loop:
`Prescription → Observation → Performance History → Personal Movement Profile
→ Adaptation` — the adaptation layer must distinguish actual performance
evidence from measurement uncertainty. Full record:
`docs/architecture/CP-03-MOVEMENT-OBSERVATION-OUTCOME.md`.

## 4. Candidate moat

**Commodity capability (NOT a durable moat):**

- having many exercises;
- UI;
- generic workout generation;
- camera pose estimation;
- generic personalization;
- access to a third-party exercise API.

These can be reproduced or purchased.

**Candidate Apex moat:** the accumulating **closed-loop relationship and
proprietary knowledge** created across

```
User ↔ Movement ↔ Workout ↔ Observation ↔ Outcome ↔ Adaptation
```

The strategic goal is for Apex to progressively learn:

- how an individual moves;
- which training decisions work for that individual;
- how that individual responds to progression/regression;
- which substitutions work;
- how performance changes;
- how training decisions affect subsequent outcomes.

At sufficient scale, future **aggregate learning** across appropriate
anonymized/consented data may become another strategic knowledge asset.

> Do NOT imply this capability already exists. It is a **strategic direction**,
> not a current feature.

**Potential value/monetization layer (RECORDED 2026-09-04 — opportunity only,
NOT evaluated):** enhanced movement measurement, longitudinal performance
intelligence, richer progress insights, and more precise adaptive programming
**may** support premium capabilities. **No pricing model, paywall, tier
structure, or monetization implementation is chosen** — this is persisted
only for later product/business evaluation.
(`docs/architecture/CP-03-MOVEMENT-OBSERVATION-OUTCOME.md` §4)

## 5. Exercise Library rebuild — top product priority

The serious rebuild of the **Exercise Library / Movement Graph** is recorded
as a **top future product priority**.

The current Production exercise records are **seed/legacy data, NOT an
immutable final catalog**.

Future rebuilding should include a governed pipeline conceptually similar to:

```
External permitted sources
        ↓
Ingest
        ↓
Normalize
        ↓
Deduplicate
        ↓
Identity resolution
        ↓
Apex canonical taxonomy
        ↓
Relationship enrichment
        ↓
Localization
        ↓
Media validation/self-hosting
        ↓
Quality/curation
        ↓
Versioned Apex Movement Graph
        ↓
Production adoption through governed migration
```

> Do NOT execute this pipeline now.

## 6. Self-hosting / resilience principle

Core fitness functionality must **not depend at runtime on third-party
exercise APIs**. Apex Home Fit must remain capable of core workout operation
during **loss of international connectivity**.

Architecture principle:

- Third-party datasets/APIs may serve as **upstream import/enrichment
  sources** where legally/operationally appropriate.
- They must **not automatically become runtime sources of truth**.
- The Apex canonical catalog should be **controlled/self-hosted**.
- Required exercise media needed for core experience should also be
  self-hosted or otherwise available through infrastructure that satisfies the
  resilience requirement.

Avoid runtime architecture such as:

```
AHF → third-party Exercise API → workout
```

Prefer:

```
Upstream sources
→ governed import/update pipeline
→ Apex canonical Movement Graph
→ Apex runtime
```

Loss of upstream connectivity must not break core workout execution.

## 7. Current Production exercises

The current Production exercise records must later be **reconciled against the
rebuilt canonical Movement Graph**.

- Do NOT assume existing slugs are permanently canonical merely because they
  are currently valid.
- All current seed records should eventually pass through catalog
  reconciliation.

**Preserved decision (S02-E, CLOSED / PRODUCTION_ACCEPTED 2026-09-01):**

- `Side-Lying Leg Lift` remains **intentionally unmapped** because of the
  recorded alias/identity ambiguity (candidates `side-kick-side-leg-lifts` and
  `side-lying-leg-lift`; seed catalog alias collision).
- Do **NOT** resolve or guess it during this task.
- The deferred backlog proposal **`EXERCISE-CATALOG-DISAMBIGUATION-01`**
  (PROPOSED / NOT AUTHORIZED in `../TASKS.md`) preserves this state.
- Future catalog reconciliation may supersede/resolve this ambiguity when
  sufficient movement context exists.

## 8. Privacy principle for Companion

Strong **privacy-by-design** direction for future camera/pose functionality:

- Prefer **on-device pose inference** where technically feasible.
- Raw camera video should **not need to leave the user's device** merely to
  provide movement/form tracking.

Potential architecture:

```
Camera
→ on-device pose/landmark inference
→ movement metrics
→ relevant Companion feedback
```

If movement landmarks, derived metrics, video, health-related signals or other
sensitive data are ever stored/transmitted, future implementation must
explicitly define:

- purpose;
- consent;
- retention;
- deletion;
- security;
- user control;
- data minimization.

> Do NOT implement camera functionality now.

**Strictly OPT-IN (ACCEPTED 2026-09-04 — CP-03 outcome):** any future
camera-based movement tracking is strictly opt-in. Apex Home Fit must remain
fully usable without camera permission; camera denial must never block the
workout; raw video stays on-device and is not retained or uploaded by
default. Consent/retention/deletion/user-control remain per TS-01/TS-02
requirements. Follow-ups: CP-06 (opt-in/consent UX + no-camera fallback),
CP-07 (Movement Observation runtime), MO-01 (Performance History) — all
`NOT_YET` in `docs/TASKS.md`.

## 9. Trust, Safety & Knowledge Surface

A strategic product surface covering the **public/trust/content layer** of
Apex Home Fit:

**CORPORATE / TRUST**

- About
- Contact
- Support
- FAQ
- How Apex Home Fit works
- Accessibility where appropriate
- Service/status information where appropriate

**LEGAL / PRIVACY / SAFETY**

- Terms of Service
- Privacy Policy
- Cookie/tracking policy where applicable
- Account/Data deletion
- Fitness/health safety disclaimer
- Liability/safety framework
- Camera/pose-tracking consent
- Data processing/retention controls
- Clear boundaries between fitness guidance and medical diagnosis/treatment

> Do NOT write or publish final legal policies during this task. These are
> required **future product surfaces/workstreams**. Legal wording must
> eventually reflect actual jurisdictions, product behavior and collected
> data.

## 10. Knowledge / Blog / Journal

The future Blog/Journal is part of Apex's **product knowledge architecture**,
not an isolated SEO blog.

Conceptual relationship:

```
Movement Graph
  ↕
Exercise Pages
  ↕
Educational Content
  ↕
Workout Programs
  ↕
Companion
```

Potential content areas:

- exercise technique;
- movement education;
- common mistakes;
- progressions/regressions;
- mobility;
- recovery;
- home fitness;
- workout education;
- evidence-informed fitness content.

The Knowledge surface may also support discovery/SEO, but **SEO is not its
sole purpose**. Potential future discovery/landing surfaces may include areas
such as:

- beginner home training;
- no-equipment training;
- dumbbell training;
- low-impact training;
- other validated user intents.

> Do NOT implement Blog/CMS/pages now.

## 11. Competitive intelligence

**Preserve** the existing international competitor analysis and the current
**Iranian competitor register as an INITIAL RESEARCH SNAPSHOT** — NOT an
exhaustive or verified market audit.

Current examples may include already-recorded competitors such as:

- جیم‌شو
- بدن‌فیت
- جیم‌فا
- مسترجیم
- فیتامین
- کرفس
- ایران‌بدن
- online coach/trainer alternatives

> Do not make unsupported claims about these competitors.

**Ongoing competitor monitoring** is a strategic research requirement. Future
monitoring should look for:

- exercise coverage;
- workout personalization;
- adaptive training;
- live/form guidance;
- camera/pose capabilities;
- progress tracking;
- coaching models;
- pricing;
- content;
- retention mechanics;
- localization;
- Iranian-market advantages/disadvantages;
- international differentiation.

## 12. Development prioritization principle

Proposed future prioritization rule:

> Work that materially strengthens one or more of:
> - Movement Knowledge;
> - Personal Movement Profile;
> - Adaptive Training;
> - Companion capability;
> - Outcome learning;
> - proprietary data accumulation;
> - resilience/self-hosting;
> - Trust/Safety;
> - integrated Knowledge Surface
>
> should generally receive **higher strategic priority** than low-MOAT feature
> breadth.

This is a **prioritization principle, NOT blanket authorization**. Normal
Governance authorization remains required before implementation.

## 13. Accelerated product direction

Intent: move Apex Home Fit development **faster toward this integrated product
vision** once execution resumes.

"Faster" does **NOT** mean:

- bypassing governance;
- reducing Production safety;
- skipping validation;
- merging unrelated risky work;
- weakening DB controls.

Future acceleration should instead come from:

- stronger prioritization;
- fewer low-value side features;
- reusable platform capabilities;
- coherent strategic batches;
- earlier validation of high-MOAT capabilities;
- avoiding duplicate systems;
- keeping Movement/Adaptive/Companion work architecturally connected.

## 14. Governance relationship

- [`../TASKS.md`](../TASKS.md) remains the **ONLY executable backlog
  authority**.
- Strategy/Roadmap documents do **NOT** authorize execution.
- [`../INDEX.md`](../INDEX.md) remains the router.
- [`../CURRENT_STATE.md`](../CURRENT_STATE.md) remains a current-state snapshot
  rather than a speculative roadmap.
- Completed lifecycle records must not be rewritten as future strategy.

## 15. Execution freeze

**AHF REMAINS EXECUTION-FROZEN** for everything in this strategy. This
document does NOT begin or authorize:

- Movement Graph implementation;
- Exercise ingestion;
- Exercise DB migration;
- Exercise media import;
- Companion;
- pose estimation;
- camera integration;
- Personal Movement Profile implementation;
- Adaptive Training implementation;
- Blog/CMS;
- website public pages;
- legal policy publication;
- slogan replacement;
- Production DB changes;
- infrastructure changes;
- deployment;
- any subsequent backlog task.

**Strategy persistence is allowed. Feature execution is not.**
