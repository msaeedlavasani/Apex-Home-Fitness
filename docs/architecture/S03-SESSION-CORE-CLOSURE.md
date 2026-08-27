# S-03 — Session Core Extraction Closure

`STATUS: S03 COMPLETE — SESSION CORE EXTRACTION CLOSED`

## Original problem
The workout session state machine lived inside a React hook, coupling reusable
session-domain transitions to React lifecycle and limiting future reuse.

## Architecture before S03
`WorkoutPlayer → useWorkoutEngine`, where the hook combined state transitions,
progression, timer integration, lifecycle handling, and callback plumbing.

## Architecture after S03

```text
WorkoutPlayer / Application
        │ public hook API
        ▼
useWorkoutEngine — React / Browser Adapter
        │ commands + ACCOUNT
        ▼
Session Core — Pure Domain State Machine
        │ state + semantic effects
        ▼
useWorkoutEngine — callback/effect consumption
        ├── UI/application callbacks
        ├── persistence integration
        └── presentation consumers

browser clock → wallClock → elapsed delta → Adapter → ACCOUNT → Session Core
```

## Phase summary

- **S03-A:** froze current behavior with framework-independent contracts and 17 golden-trace tests.
- **S03-B:** implemented the pure core in parallel with focused deterministic tests.
- **S03-C:** made the hook delegate all domain transitions to the core.
- **S03-D:** verified timer ownership and added lifecycle exactly-once tests.
- **S03-E:** verified semantic-effect ownership and added callback-boundary tests.
- **S03-F:** audited residue, updated stale documentation, and closed S03; no runtime cleanup was justified.

## Final responsibility matrix

| Concern | Final owner |
|---|---|
| session transition rules/state/elapsed accounting/auto-advance | Session Core |
| semantic effect decision/order | Session Core |
| wall-clock measurement | `wallClock` |
| browser lifecycle and React synchronization | React Adapter |
| callback invocation/freshness/hydration suppression | React Adapter |
| countdown presentation/audio/haptics | UI |
| persistence | application/persistence layer |
| analytics | application/analytics layer |

## Verification

The adapter contains no independent session transition rules; it delegates all
approved commands and ACCOUNT to `sessionCore`. The core remains free of React,
browser, timer, wallClock, persistence, network, DB, analytics, audio, haptics,
and event-bus dependencies. Derived values are read through core derivation;
UI countdown calculations remain presentation-only.

The snapshot remains the existing ten-field state. `restTarget`, canonical
exercise metadata, effects, and wallClock baseline are not serialized. Workout
step identity remains distinct from canonical Exercise identity, and repeated
canonical movements remain separate steps.

## Test architecture

S03-A reference golden traces, S03-B pure-core tests, S03-C adapter tests,
S03-D timer tests, and S03-E effect tests remain green. Final full suite:
**464/464**. No S03-F tests were added or removed; the existing layered coverage
was retained.

## Runtime and release impact

Runtime implementation changed in S03-C, but S03-F makes no runtime source
change. Observable behavior remains unchanged. No S03 database/schema,
snapshot, API, persistence, or Production change occurred.

`S03_PRODUCTION_RELEASE_READINESS: READY_WITH_PREREQUISITES` — architecture and
tests are ready, but release still requires the separately planned additive
Exercise identity migration to be applied/verified in Production and the
existing OTP/domain/env/HTTPS smoke prerequisites to be satisfied. This closure
does not apply any migration or deploy.

## Rollback model

S03 commits are independently revertable:

- S03-A: `871bcfa` — contracts/golden baseline
- S03-B: `3939256` — pure core/tests
- S03-C: `c3c4b46` — runtime delegation
- S03-D: `a83acbe` — timer boundary tests/docs
- S03-E: `a1ea151` — effect boundary tests/docs
- S03-F: this closure commit

Safest rollback of S03-F is `git revert <S03-F-commit>`. To restore the
pre-delegation runtime while retaining the pure core, revert S03-C and later
commits as a coordinated reviewed sequence; do not remove S03-A/B history unless
explicitly required.

## Remaining risks / implications

S02-E historical exercise backfill, later log canonicalization, IndexedDB
versioning, and Workout V2 phases remain deferred. Future V2 work can consume
the pure core, but PREPARE/TRANSITION/countdown redesign and Voice Coach remain
product decisions, not implicit consequences of S03.

## Closure decision

S03 is closed. The legacy monolithic workout engine is retired as a domain
owner; the compatibility hook API remains active as the React adapter.

## Recommended next step

`OWNER REVIEW → BRANCH LIFECYCLE CLEANUP → PRODUCTION RELEASE DECISION`.
