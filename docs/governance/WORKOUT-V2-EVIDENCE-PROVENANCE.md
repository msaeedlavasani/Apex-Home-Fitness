# Workout V2 Evidence Provenance

STATUS: CURRENT

This is the canonical evidence vocabulary for the reconciled Workout V2
machine and release checkpoints. Evidence classes are not interchangeable.

| Class | Meaning | Current reconciled claim |
|---|---|---|
| `STATIC` | source/contract inspection | generic Entry/Passport chain and no QA topology in runtime |
| `UNIT` | pure contract or capability test | identity, strategy, gate, and SET behavior |
| `INTEGRATION` | multiple canonical boundaries exercised together | two prescribed Entries, mixed per-set dosage, derived oracle |
| `SIMULATED_SENSOR` | normalized movement evidence supplied by a test harness | runtime reachability only; not physical sensing |
| `REAL_CAMERA` | camera permission and live camera stream | not proven by simulated evidence |
| `REAL_POSE_RUNTIME` | live provider inference on a real camera stream | not proven by source identity or tests alone |
| `REAL_CALIBRATION` | real-device skeleton calibration | not proven by `SIMULATED_SENSOR` or camera permission |
| `REAL_DEVICE` | Owner/device acceptance | downstream RUN-5 gate only |
| `DEPLOYED_BETA_RUNTIME` | authenticated journey against the exact deployed Beta source | requires the governed Beta deployment checkpoint |

The source identity, build identity, and authenticated deployed journey are
separate claims. A passing unit/integration test or simulated normalized
evidence cannot be promoted to `REAL_CAMERA`, `REAL_POSE_RUNTIME`,
`REAL_CALIBRATION`, `REAL_DEVICE`, or `DEPLOYED_BETA_RUNTIME`.

The minimum post-deployment journey proof is the normal authenticated
Dashboard → Program → Workout route using the canonical QA Program, with the
exact deployed source/build identity, derived oracle, result/exit persistence,
and explicit storage/rollback evidence. A deployed screenshot without source
identity is not complete release evidence.
