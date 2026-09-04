# CP-03 Tracking-Failure Repair — Root Cause + Evidence

> **Research tooling only.** Follow-up record to
> `CP-03-HARNESS-REPAIR.md` (first repair, 2026-09-04). Documents why real-human
> testing of the repaired harness still showed **zero poses** in two macOS
> Chromium browsers (Chrome + Arc), the two code-level root causes found, the
> instrumentation added to separate the five candidate failure classes, and the
> pose-bearing verification that now proves the pixel path works end-to-end.
> Changes **no CP-03 product decision** (Approach A — MoveNet/TF.js, web-first,
> fully on-device) and adds **no Companion camera/product functionality**. The
> CP-03 real-device measurement gate remains **OPEN**; no trial from these
> environments counts toward it.

- Task: TASK DELTA — CP-03 REAL-HUMAN TRACKING FAILURE — MAC CROSS-BROWSER
  (2026-09-04)
- Repaired artifacts: `scripts/pose-measurement/index.html`,
  `scripts/pose-measurement/smoke.mjs`, `scripts/pose-measurement/README.md`,
  + test fixture `scripts/pose-measurement/testdata/human.jpg`
- Status: harness **demonstrably tracking-ready for Owner retest** (poses,
  keypoints, overlay verified on real human pixels); gate still open.

## 1. Observed failures (real-human testing, post-repair #1)

| Environment | Symptom |
|---|---|
| macOS Chrome | Camera/video OK; MoveNet Lightning loaded; WebGL inference ~13.4 FPS; 1134 processed frames / 51.1 s; **poseDetections = 0**; no keypoints/skeleton; measured luma 12.9 |
| macOS Arc | Camera + stream OK; 1280×720 first frame received; luma 14.0; model loaded; pipeline RUNNING; after 6 s **"no person detected"**; no tracking/keypoints |
| Mobile | NOT retested (Cloudflare tunnel was not running) — explicitly **not** classified as a cross-device failure |

The synthetic smoke (13/13) had passed because Chrome's fake camera emits a
**test pattern with no human** — it verified pipeline mechanics, not pose
detection.

## 2. Root causes (two compounding code bugs)

### 2a. Inference never received a frame — `state.video` was never assigned

`index.html` declared `state.video = null`, and `attachVideo()` assigned
`state.stream` and the DOM element's `srcObject`, but **never `state.video =
v`**. The inference loop called `estimatePoses(state.video /* null */, …)`
every frame; pose-detection 2.1.3 resolves that input **silently with zero
poses** (no throw — `infErrors` stayed 0). Consequences, exactly as observed:

- phase = RUNNING, backend/model fine, processed frames and FPS advance
  (loop cadence is independent of inference success), `poseDetections = 0`
  forever, no inference-error messages, no skeleton — in **both** Chromium
  engines, on **any** camera content.
- Reproduced here in real Chrome with the synthetic camera (probe output):
  `phase=running, processed=109, fps=13.5, detections=0, infErrors=0` —
  the same signature the Owner saw on macOS (FPS ≈ 13.4, 1134 frames,
  0 detections).
- The first smoke passed because its assertions never required a pose or a
  real inference input on the main path.

### 2b. Even with poses, the skeleton could never have appeared — keypoint coordinates are in PIXEL space

Coordinate forensics added during this repair showed pose-detection 2.1.3
MoveNet returns keypoints in the **source image's pixel space** (nose at
x≈637 on a 1280-wide frame), **not normalized [0,1]**. The overlay drew at
`keypoint.x * canvas.width` (≈ 637 × 1280 ≈ 815 000 px) — every stroke and
dot landed ~1280× off-canvas and was invisible. This bug existed since v1,
masked first by the pre-repair hangs and then by 2a.

The draw-time pixel check caught it: `skeletonDraws` incremented (draw
commands ran without error) yet a full-resolution scan in the same tick found
**zero** colored pixels. A downscaled scan would have missed this too (thin
3 px strokes alias away) — full-res, same-tick measurement was required.

## 3. Instrumentation added (the five hypothesis classes)

The harness now distinguishes the failure classes the Owner's report asked
for, per ~1 s sample (rolled into the JSON export as `frameTrace`, each sample
also human-readable in the on-page Diagnostics panel + a **MODEL INPUT** panel
showing the 8×5 luminance grid of the exact pixels MoveNet receives):

| # | Question | Instrument / signal |
|---|---|---|
| 1 | Did `estimatePoses` run and return zero poses? | `inferenceCalls` vs `poseReturns` counters + per-window `win.rets` |
| 2 | Pose returned but rejected/filtered? | `poseGatedOut` counter + rolling pose stats: `kp≥0.3`, `kp≥0.5`, `kpMax`, `kpMean` (gate = 0.5) |
| 3 | Keypoints exist but overlay fails? | `skeletonDraws`, `lastOverlayHits` (full-res colored-pixel scan **at draw time**, ≤ every 2 s), `overlayErrors`; coordinate-space flag + `kpsSample` coords |
| 4 | Invalid/incorrect frame reaching MoveNet? | Explicit mirrored **capture canvas** is the only inference input (video → canvas → model); each sample records source `readyState`, `currentTime` delta, dims, input-canvas dims, and an 8×5 luma grid + mean/center/min/max of the actual input |
| 5 | Low luma causal vs measurement artifact? | Page-level luma of the raw video element (`src.luma`) compared against the input canvas stats + center-region mean; `INPUT_NEAR_BLACK` (<8 mean) vs `INPUT_FLAT` (Δ<14) vs `INPUT_STRUCTURED_NO_POSE` vs `POSES_OK` classification |

Trial gating tightened: trials require `videoLive` **and** a structured input
(input mean ≥ 10, center ≥ 18), so dark/flat scenes pause trials with an
explicit message instead of silently measuring nothing.

## 4. Repair

1. **`state.video = v`** assigned in `attachVideo` — inference now receives
   the live element.
2. **Explicit mirrored capture canvas** (`video → capCanvas → estimatePoses`,
   `flipHorizontal:false`): the pixel path is inspectable and identical to
   what the overlay sits on; mirror is baked into the capture so keypoints
   land in the displayed (mirrored) space. Mirror toggle applies to the
   capture on the next frame.
3. **Pixel-space overlay fix**: `poseCoordToCanvas()` normalizes keypoints
   (auto-detects px vs normalized convention per pose) and scales to the
   overlay canvas.
4. Sampler + telemetry + audit classification per §3; wall-clock sample
   accumulation (a first cut accumulated `now − lastProcess` **after**
   `lastProcess` was updated — always ~0; caught by the smoke requirement
   that samples must exist).
5. **Pose-bearing smoke scenario D** with a real human fixture
   (`testdata/human.jpg`, PD — U.S. Navy photo; source + license in
   `testdata/README.md`): `getUserMedia` is overridden with a 1280×720 canvas
   stream painting the person on a bright backdrop (gentle motion so frames
   advance); MoveNet must return poses, keypoints ≥0.5, the overlay must
   draw (colored pixels at draw time), and the export must carry the
   telemetry. The old pattern-only smoke could not catch the null-input bug;
   this scenario closes that gap.

## 5. Verification evidence (this environment)

`node scripts/pose-measurement/smoke.mjs` → **26/26 PASS** (stable across
runs), incl.:

- **A** (Chrome pattern camera): running; LIVE VIEW active (luma ≈ 102);
  **regression guard** — `hasVideo=true`, input canvas 1280×720,
  `inferenceCalls>0`, `infErrors=0` (this exact triple was false before the
  fix); sampler samples with source `currentTime` advancing; trial + export
  work; export carries telemetry + frame trace.
- **B**: blocked model CDN → classified `MODEL_FETCH`, no hang.
- **C**: CPU-backend path reaches running and infers with real input.
- **D** (real human pixels): `poseReturns` sustained (34 by export),
  `kp≥0.5 = 15–17/17`, `kpMax ≈ 0.74–0.79`, classifier `POSES_OK`,
  input mean ≈ 195 (bright structured content), `skeletonDraws > 25`,
  **`lastOverlayHits = 50`** (colored pixels confirmed on the overlay at draw
  time), export carries poseReturns/skeletonDraws/lastOverlayHits and
  `POSES_OK` trace samples, no unhandled errors.

Repo checks: `governance:check` → `GOVERNANCE_PASS`; typecheck clean; full
test suite 755/755; lint 0 errors (4 pre-existing warnings). No product code
touched; no dependency added (fixture + CDN-only TF.js, unchanged).

## 6. Honest limitations

- Verification uses a **virtual camera painting a photo of a person** — real
  webcam/human, per-phone FPS/rep/battery numbers still require the physical
  §6 devices. Mac results do **not** satisfy the Android/iPhone gate.
- Intermittent per-frame detection was observed on the synthetic stream
  (pose frames interleaved with pose-less frames — the overlay clears between
  them); the smoke assertions therefore measure sustained pose returns +
  draw-time overlay pixels rather than per-frame detection rate. Real-device
  detection rate is exactly what the measurement gate measures.
- The Safari/Arc/Chrome GPU-compositing edge cases named in repair #1 remain
  instrumented rather than reproduced here; the Owner retest reports the
  exact failing stage/classification if anything still misbehaves.
- Luma 12.9–14.0 on the Owner's Mac (full-frame mean) is below what MoveNet
  needs for reliable detection; the retest guidance now distinguishes
  "input too dark → raise lighting" from "structured input, zero poses →
  model/backend" automatically via the classifier + MODEL INPUT panel.

## 7. Persistence

- `scripts/pose-measurement/index.html` (fixes + instrumentation),
  `scripts/pose-measurement/smoke.mjs` (26 checks incl. pose-bearing D),
  `scripts/pose-measurement/README.md` (updated smoke expectations +
  troubleshooting + retest), `scripts/pose-measurement/testdata/human.jpg` +
  `testdata/README.md` (fixture + attribution).
- This record; `docs/TASKS.md` CP-03 section; `docs/CURRENT_STATE.md`;
  `docs/INDEX.md` CP-03 row.
