# CP-03 — Rep-Heuristic Repair (real-device squat trials, 2026-09-04)

**Scope:** research measurement harness only (`scripts/pose-measurement/`). No product
code, no CP-03 product decisions changed, no threshold values changed.
**Status:** harness repaired and re-verified (smoke **32/32**); the CP-03 real-device
measurement gate remains **OPEN**. These iPhone trials are **not counted** toward the gate.

## 1. The observation (first iPhone measurement export)

`scripts/pose-measurement/results/iphone-squat-diagonal200-2026-09-04.json`
(generated 2026-09-04T13:16:43Z, iPhone OS 26.6.1, CriOS 150, MoveNet Lightning,
WebGL, placement diagonal-200, fps cfg 15, mirror=true):

| Trial | move | expected | detected | match | avgConf | p95InfMs | durSec |
|---|---|---|---|---|---|---|---|
| 1 | squat | 10 | **0** | 0% | 0.73 | 33 | 42.6 |
| 2 | squat | 10 | **0** | 0% | 0.75 | 35 | 49.8 |

Session summary: `processedFrames 3923`, `inferenceCalls 3923`, `infErrors 0`,
`poseReturns 3620` (92%), `poseGatedOut 2038` (56% of returned poses),
`skeletonDraws 3620`, `lastOverlayHits 50`, `overlayErrors 0`, luma 142.1,
classifier mostly `POSES_OK`, frame luma 105–165 — **pose detection and skeleton
rendering were working**. Reps detected: 0 / 0.

## 2. Analysis — the four hypotheses

### H1 placement/keypoint-quality failure — contributor, not root cause
The trace's rolling pose stats show exactly the signature of a distant folded
subject: long stretches of 14/14 pose returns per second with only **0–4 of 17
keypoints ≥ 0.5** (e.g. wall-clock seconds 271–300 and 379–402 in the session),
interleaved with full 15–17/17 stretches (standing). Session-wide **56% of pose
frames were gated out** because the squat's joint trio did not all clear
`KEYPOINT_GATE` (0.5). So the rep heuristic was riding on a sparse, intermittent
angle signal at 2 m — real, and relevant, but not by itself a guarantee of zero.

### H2 heuristic/threshold failure (squat never crossed 95°/155°) — cannot be proven from this export
The 2026-09-04 export does **not** record the computed joint angle, which joints
were used, or the state-machine phase — the trace's `kpsSample` keeps only the
first five engine-order keypoints (head first), never hip/knee/ankle. Whether the
knee angle crossed `down:95` / `up:155` during the trials is therefore
unverifiable from this file. **Instrumentation gap — fixed below.**

### H3 coordinate/mirroring bug — ruled out
Keypoints arrive in the same mirrored-capture pixel space as the overlay
(`coordSpace: px`; nose-scale x,y inside the 720×1280 input), the skeleton draws
on the body (draw-time hits), and `angleDeg` is scale-invariant (normalized by
edge lengths), so a px-vs-normalized or mirror error cannot corrupt the angle.

### H4 temporal/state-machine bug — ROOT CAUSE (proven from code + data)
`updateRep` (v2) latched `phase='lost'` on **any** frame where the joint trio did
not clear the gate (`angleFor` → null) and **no code path ever left `'lost'`**:

```js
if (downDeg == null) { t.phase = 'lost'; t.minAngle = Infinity; return; }
// ...and 'lost' is matched by NO transition branch anywhere.
```

`repCount` could only grow on a `'down'→'up'` transition, so the **first**
leg-keypoint flicker inside a trial permanently disabled counting for the rest of
that trial — regardless of squat depth, tempo, or how clean the later frames were.
With 56% of pose frames gated session-wide, a null inside any ~40–50 s trial is
effectively certain, so `detected 0/0` is the *expected* output of the v2 machine,
not evidence about the user's squats. (The trial mechanism itself was healthy:
start → end → logged rows, `avgConf` from the last valid frame = 0.73–0.75.)

**Disposition: harness defect → fix; hypothesis 2 remains open → new telemetry
resolves it on the next real export.**

## 3. Repair (v3 — thresholds untouched)

All in `scripts/pose-measurement/index.html`; `down`/`up`/`KEYPOINT_GATE`
(0.5)/`minRepSec` (0.4 s) values are **unchanged** — nothing was loosened to
force a PASS.

1. **Dead `'lost'` latch removed.** `makeRepCounter(move)` + `repStep(c, deg, now)`
   treat a missing angle as a **dropout**: short dropouts keep the current phase
   (continuity), and a dropout longer than `CFG.dropResetMs` (1.5 s) re-arms to
   `'up'` so the next full down→up excursion still counts. A rep is still only
   counted when the harness itself observed the down-crossing (≤ `down`), an
   up-crossing (≥ `up`), and ≥ `minRepSec` between them.
2. **Side-agnostic joints.** v2 hard-coded the LEFT leg/arm; at the protocol's
   diagonal placement that is often the far, occluded side. v3 computes both
   sides and uses the side whose three joints all clear the gate (higher mean
   confidence when both do), recorded per frame. For lunge/split-squat this also
   measures whichever leg actually flexes. Gating remains strict: a frame with no
   usable side is still `poseGatedOut` (never fabricated).
3. **Telemetry so the next export answers H1 vs H2 directly:**
   - trial rows now carry `validFrames`, `gatedFrames`, `minAngle` (deepest
     observed), `phaseAtEnd`, `endSide`, `downs`, `ups` (observed crossings);
   - `frameTrace` samples carry a `rep` block: phase, used side, last angle,
     min/mean confidence, current dropout length, lost/rearm counters, and the
     per-window (1 s) valid count + angle min/max — plus `inTrial` and the
     per-trial aggregate — so trial windows and the angle signal are directly
     readable;
   - `start`/`end` of trials are now `diag('trial', …)` entries (v2 logged
     nothing at trial boundaries — a correlation gap);
   - export `runtime` records `repStateVersion: 3`, `keypointGate`, `dropResetMs`.
4. The processing loop now drives the same `makeRepCounter`/`repStep` functions
   the smoke scenario E tests (single source of truth), via the `window.__ahf.rep`
   automation hook.

## 4. Verification (deterministic — scenario E, smoke 32/32)

A still photo cannot move, so scenario E drives the exact machine the loop uses
with synthetic angle series at ~15 fps cadence and asserts the semantics:

| Case | Expect | Result |
|---|---|---|
| E1 ten clean squat cycles (170→86→170, ≥0.4 s down) | 10 reps, downs=ups=10 | PASS |
| E2 two reps, **2.6 s dropout**, three more | 5 reps, rearmed ≥1 (v2 would stay 0 forever) | PASS |
| E3 short dropouts every 3rd frame across 3 reps | 3 reps, no re-arm, lost >0 (continuity) | PASS |
| E4 shallow squats (knee never ≤95°) | 0 (thresholds not loosened) | PASS |
| E5 sub-0.4 s bounce | 0 (duration guard intact) | PASS |
| E6 100–160° hysteresis-band noise, no down crossing | 0 | PASS |

Scenarios A–D unchanged and still PASS (pipeline, classified MODEL_FETCH, CPU
path, pose-bearing real-human fixture with skeleton overlay hits). Full repo
validation: `governance:check` → `GOVERNANCE_PASS`; typecheck clean; 755/755
tests; lint 0 errors.

## 5. What the next real export will discriminate (per trial, in the JSON)

- `gatedFrames ≈` total trial frames → H1 (placement/keypoint quality): person
  tracked but the joint trio rarely cleared 0.5 at that distance/placement/light.
- `validFrames > 0` but `minAngle > 95` → H2a: squats too shallow for the fixed
  threshold (report the observed depth range honestly; do not loosen silently).
- `minAngle ≤ 95`, `downs ≈ 10`, `ups ≈ 10`, but `detected < downs` → H2b/
  temporal (duration/continuity edge) — now visible via phase + dropouts in the
  trace.
- `minAngle ≤ 95`, `downs ≈ 10`, `detected ≈ 10` → fix confirmed; proceed.

## 6. Owner/human retest (CP-03 gate still OPEN — these trials are not counted)

1. `node scripts/pose-measurement/smoke.mjs` → expect **32 passed, 0 failed**.
2. macOS sanity (any browser): serve `scripts/pose-measurement` on localhost,
   Start, and confirm RUNNING with the skeleton on you and `POSES_OK`. Do one
   5–10 squat trial: it should now count reps (unless your knee angle stays
   above ~95° — then the export's `minAngle` shows the honest depth).
3. Phones over HTTPS (§3 of `scripts/pose-measurement/README.md`): repeat the
   squat trials at diagonal-200; export the JSON and drop it into
   `scripts/pose-measurement/results/` with the §7 results table.
4. Findings review closes the gate → product implementation (only after review).

## 7. Honest limitations

- The failing trials themselves prove nothing about squat depth or placement
  quality (v2 could not fail otherwise than 0 once a gate-flicker occurred).
- H1/H2 remain open until a v3 export is measured on the real devices; the new
  per-trial fields are exactly the discriminators (see §5).
- Session segments where the phone was covered / tab backgrounded (~145 s with
  `video.ct` frozen, `INPUT_NEAR_BLACK` runs) are setup artifacts, not trials;
  v3's trial start/end log entries make such windows unambiguous going forward.
- Synthetic-angle verification (scenario E) proves machine semantics, not
  real-world keypoint behavior; only the §6 real-device run does that.
