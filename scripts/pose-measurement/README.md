# CP-03 Measurement Gate — Pose Harness + Protocol

> **RESEARCH TOOLING ONLY — not product code.** This folder contains the
> bounded on-device measurement harness and protocol for the CP-03
> measurement gate (decision: Approach A — MoveNet/TF.js, web-first, fully
> on-device; `docs/architecture/CP-03-POSE-FEASIBILITY.md`).
>
> **No Companion camera functionality is implemented here or anywhere else.**
> Product implementation is blocked until this gate closes with real-device
> measurements.
>
> **Execution requires physical devices** (Android + iPhone) and a human
> tester — this step cannot run in the development environment. Follow §6
> exactly and record results in the §7 table.

> **REPAIRED TWICE 2026-09-04** — (1) the startup pipeline was rebuilt so it
> can no longer hang silently on "Loading MoveNet model…" or run with a
> black LIVE VIEW (classified, timed stages; record
> `docs/architecture/CP-03-HARNESS-REPAIR.md`). (2) Real-human Mac testing
> then showed **zero poses while RUNNING** — root causes: `state.video` was
> never assigned (`estimatePoses(null)` silently returned zero poses every
> frame) and MoveNet keypoints arrive in **pixel space** while the overlay
> multiplied by canvas.width (skeleton drew off-canvas). Fixed, and the
> harness now instruments the full pixel path: a **MODEL INPUT panel** shows
> the 8×5 luminance grid of the exact frame MoveNet receives, plus pose
> telemetry (raw returns, keypoint counts/scores, overlay draw verification)
> and an audit classification per ~1 s (INPUT_NEAR_BLACK / INPUT_FLAT /
> INPUT_STRUCTURED_NO_POSE / POSES_OK) — all in the JSON export. Record:
> `docs/architecture/CP-03-TRACKING-REPAIR.md`. (3) The first real-device
> export (iPhone squat trials, diagonal-200) then showed pose tracking
> working (3620/3923 pose frames, avg conf 0.73–0.75, skeleton drawn) yet
> **detected 0/0** — root cause: the rep state machine latched `phase='lost'`
> on ANY gated-out frame and never left it, so the first leg-keypoint flicker
> permanently disabled counting for the rest of a trial. v3 removes the dead
> latch (dropouts keep continuity; >1.5 s dropouts re-arm), measures BOTH
> sides (near leg at diagonal placement), and records per-window/per-trial
> angle + gating telemetry so the next export discriminates placement-quality
> vs depth-threshold causes. Thresholds unchanged. Record:
> `docs/architecture/CP-03-REP-HEURISTIC-REPAIR.md`; smoke **32/32**. **The
> CP-03 measurement gate is still OPEN** — no real-device results may be
> inferred from earlier attempts; §6 retest applies.

## 1. What the gate measures

| Metric | How | PASS criterion (proposed — confirm on data) |
|---|---|---|
| **FPS / inference latency** | Harness at 10 / 15 / 30 fps target, MoveNet Lightning + Thunder | Android Chrome: sustained ≥ 15 fps at 15 fps target (p95 inference ≤ ~66 ms); iPhone Safari comparable |
| **Rep-count reliability** | Trials of 10 reps per movement vs detected | ≥ 90% match on the four HIGH-coverage movements at the best placement |
| **Placement sensitivity** | Same trial at 4 placements (diagonal-90, diagonal-200, front-180, side-90) | Best config ≥ 90%; worst config documented — informs the in-app placement guidance requirement |
| **Session battery impact** | 10-min run at 15 fps (screen on) vs 10-min camera-off baseline | Δ battery ≤ ~5% per 10-min run (confirm against data; report absolute numbers) |

All processing is on-device; the harness never uploads frames or results
(results are exported manually as JSON).

## 2. Required devices

1. **Android phone** (Chrome, current) — mid-range preferred as the binding
   case; a flagship as a bonus.
2. **iPhone** (Safari, iOS 16+) — note: no `navigator.getBattery()` on iOS;
   battery is measured pre/post only.
3. (Recommended sanity step) Desktop Chrome on macOS with a webcam — §3.1.

## 3. Serving the harness (HTTPS required for camera on phones)

The harness is a single static page (`index.html`). Camera access requires a
**secure context**. Options:

- **Recommended (tunnel):** serve locally, expose over HTTPS with a tunnel.
  The harness performs **no network sends** — the tunnel only transports the
  page; frames/results never leave the device.
  ```bash
  npx -y serve scripts/pose-measurement -l 4173
  # in a second terminal:  npx -y cloudflared tunnel --url http://localhost:4173
  # open the printed https://… URL on each phone
  ```
- **Static host (delete after):** drag the folder to Netlify Drop / Vercel,
  open the URL on the phones, delete the deploy when done.
- **Desktop only:** `npx -y serve scripts/pose-measurement` →
  `http://localhost:4173` (localhost is a secure context).

The harness loads TF.js + MoveNet from CDN on first start (~3–8 MB download);
phones need network for that load only. Verify the "100% on-device" banner
renders and the status line reaches "Running" (it reports each stage —
backend → camera → LIVE VIEW → model — instead of hanging on a generic
Loading message).

### 3.1 Desktop sanity check (do this first, on macOS Chrome)

Repairs are verified by an automated smoke run (real Chrome; virtual camera
for most scenarios, and a **real human photo** for the pose-bearing one):

```bash
node scripts/pose-measurement/smoke.mjs
# expects: 32 passed, 0 failed — camera → LIVE VIEW → model → inference →
# trial/export + frame-content sampling + classified MODEL_FETCH error path
# + CPU-backend path + pose-bearing scenario D (MoveNet must return poses for
# a real human image and the skeleton must visibly draw) + scenario E
# (deterministic rep-machine regression: clean cycles count, >1.5 s dropouts
# re-arm instead of latching forever — the v2 bug that zeroed the real-device
# squat trials — and shallow/fast/hysteresis motion still counts 0)
```

Then the manual check with a real webcam: serve the harness on
`http://localhost:4173`, open it in Chrome, press **Start**, and confirm the
sequence **stage 1/5 → stage 5/5 (RUNNING)** with yourself visible in the
LIVE VIEW **and pose keypoints overlaid ON your body**. Below the LIVE VIEW
the **MODEL INPUT panel** shows the 8×5 luminance grid of the exact pixels
MoveNet receives (a person-shaped blob = good), the current classification
(`POSES_OK` = tracking), and the pose telemetry for the last second. If the
classifier reports `INPUT_NEAR_BLACK`/`INPUT_FLAT`, raise lighting or check
the camera; if it reports `INPUT_STRUCTURED_NO_POSE` with a clearly visible
bright person, capture the export — that would point at the model/backend on
that engine. If any stage errors, the red box names the failing stage and
remedy — copy the Diagnostics panel into the report.

## 4. Environment and setup (per tester)

- Indoor, well-lit room; plain background; user stands 1.5–1.85 m tall;
  phone propped at ~chest height, stable.
- Camera: front (selfie) facing the user; whole body in frame per the
  on-screen guide.
- Brightness fixed (e.g., 50%) for the battery runs; same brightness for
  baseline and test runs.
- One movement at a time; 1–2 warm-up reps before each trial.

## 5. Measurement runs (per device)

**A. FPS + latency.** Start (default Lightning, 15 fps). Let it run 20 s,
record the live FPS + p95 inference ms. Repeat at 30 fps target, and with
Thunder (10 fps target) — note Thunder is accuracy-check only.

**B. Rep-count reliability + placement sensitivity.** For each movement
(squat → push-up → hinge → split squat/lunge) and each placement
(diagonal-90 → diagonal-200 → front-180 → side-90):

1. Set movement + placement in the harness; press **Start trial**.
2. Perform **10 clean reps** at a steady pace; press **End trial**.
3. Record the trial row (detected / match % / avg conf / p95 ms).

One trial per (movement, placement) is the minimum; a second trial at the
best placement adds reliability confidence.

**C. Battery impact.** On the primary Android phone (and iPhone pre/post):

1. Record battery % (harness battery panel, or OS settings on iOS).
2. Run the harness at 15 fps, screen on, 10 minutes (any movement, no
   interaction). Record % after → Δtest.
3. Baseline: screen on, camera off, same brightness, 10 minutes. Record %
   before/after → Δbaseline.
4. Report: Δtest − Δbaseline (harness overhead), and note absolute numbers.

## 6. Exact Owner/human test instructions (STOP here for execution)

This step requires **physical devices and a human tester** and cannot be
executed from the development environment. When ready, the Owner should:

1. Provide the two phones (§2) and a tester, or authorize a tester to run it.
2. Have the tester follow §3.1 (desktop sanity) then §3–§5 on the phones,
   exporting one JSON per (device, movement, placement, fps config) run.
3. Return the JSON exports + the §7 results table to the workspace
   (e.g., drop into `scripts/pose-measurement/results/`), where the findings
   can be reviewed and the gate closed — product implementation begins only
   after that review.

**Before the phones:** confirm each phone reaches **RUNNING** with the LIVE
VIEW showing the tester **and the skeleton overlaid on their body** (if it
errors, the red box names the stage — CDN, BACKEND, CAMERA_*, VIDEO_*,
MODEL_FETCH — and the Diagnostics log records every stage; do not count that
device/config as measured). Confirm the **MODEL INPUT panel** shows a
person-shaped grid and the audit classification reads `POSES_OK` (a dark
room reads `INPUT_NEAR_BLACK` — raise lighting — and a valid but untracked
scene reads `INPUT_STRUCTURED_NO_POSE`, which would be a model/backend
finding worth its own export). Each exported JSON now includes the
`frameTrace` (frame-content + pose telemetry samples **plus the `rep` block:
phase, side used, angle, confidence, dropout length, and per-second angle
min/max + per-trial valid/gated/down/up counters**), trial rows with the
per-trial discriminators (`validFrames`, `gatedFrames`, `minAngle`, `downs`,
`ups`), `trial start/end` Diagnostics entries, and the full diagnostics log
alongside the trials — so a 0-match trial on the real devices now says *why*
(see `docs/architecture/CP-03-REP-HEURISTIC-REPAIR.md` §5).

## 7. Results table (fill per device)

| Device | Movement | Model | FPS cfg | Placement | Expected | Detected | Match % | Avg conf | p95 ms | Battery Δ (10 min) |
|---|---|---|---|---|---|---|---|---|---|---|
| Android | squat | Lightning | 15 | diagonal-200 | 10 |  |  |  |  |  |
| Android | push-up | Lightning | 15 | diagonal-200 | 10 |  |  |  |  |  |
| Android | hinge | Lightning | 15 | diagonal-200 | 10 |  |  |  |  |  |
| Android | lunge | Lightning | 15 | diagonal-200 | 10 |  |  |  |  |  |
| Android | squat | Lightning | 15 | diagonal-90 | 10 |  |  |  |  |  |
| Android | squat | Lightning | 15 | front-180 | 10 |  |  |  |  |  |
| Android | squat | Lightning | 15 | side-90 | 10 |  |  |  |  |  |
| iPhone | squat | Lightning | 15 | diagonal-200 | 10 |  |  |  |  |  |
| iPhone | squat | Lightning | 15 | front-180 | 10 |  |  |  |  |  |
| (repeat per device as needed) |  |  |  |  |  |  |  |  |  |  |

## 8. Troubleshooting (harness repair 2026-09-04)

The harness now fails **fast and visibly** instead of hanging. Errors appear
in the red box with a stage label, and every stage is timestamped in the
**Diagnostics** panel (included in the JSON export). Stage map:

| Observed (before/after repair) | Harness stage reported | Most likely cause → remedy |
|---|---|---|
| Stuck on "Loading MoveNet model…" forever | `CDN` / `BACKEND` / `MODEL_FETCH` / `TIMEOUT` | Previously **any** failure was an unhandled rejection that left that Loading text; now the real stage is named. `CDN` → allow cdn.jsdelivr.net; `MODEL_FETCH` → allow tfhub.dev + kaggle.com (model host) or retry on another network; `BACKEND` → enable hardware acceleration or **Retry on CPU** (slow, sanity only) |
| Camera permission ok but LIVE VIEW black / stuck | `CAMERA_*` then `VIDEO` / `VIDEO_FRAME` | The harness now waits for the first rendered frame (8 s) and measures frame luminance. `VIDEO_FRAME`/black luma → camera in use elsewhere, macOS privacy, or a browser GPU-compositing glitch (Safari) — try the other browser / toggle hardware acceleration / focus the tab, then Retry |
| Page not on HTTPS/localhost | `SECURE_CONTEXT` | Camera API unavailable — serve over HTTPS or localhost |
| Inference stops mid-run | repeated `inference` diagnostics | Backend/context issue — Stop → Retry; if it recurs, capture the Diagnostics log| Trial buttons are enabled only while the LIVE VIEW is verified rendering **and** the model input is structured (not dark/flat), so a black/stuck or unlit view can no longer produce bogus "measurements" (trials pause with an on-page reason when the input is too dark/flat). |
| RUNNING but **poseDetections = 0** (no keypoints) — this was the 2026-09-04 tracking failure | `audit` classification + telemetry | Two code bugs were fixed: the inference loop previously called `estimatePoses(null)` (state.video was never assigned → silent zero poses) and the skeleton drew off-canvas (MoveNet returns pixel-space keypoints; overlay now normalizes). If it recurs on your machine, the Diagnostics will show which class: `INPUT_NEAR_BLACK` (mean < 8 — lighting/capture), `INPUT_FLAT` (no contrast — camera), or `INPUT_STRUCTURED_NO_POSE` (valid frames, zero poses — model/backend on this engine; try Thunder or Retry-on-CPU and export the JSON) |
| Skeleton/keypoints drawn but NOT aligned on the body | mirror checkbox + `kpsSample`/`coordSpace` in the export | Capture is mirror-consistent (keypoints arrive in the same space as the mirrored LIVE VIEW); if misaligned, toggle Mirror and export — the export's `kpsSample` coordinates show the raw keypoint space |
| RUNNING, pose tracking healthy (poses + skeleton + conf ~0.7) but trial detects 0 reps — the 2026-09-04 real-device case | trial row fields `validFrames`/`gatedFrames`/`minAngle`/`downs`/`ups` + `frameTrace[].rep` | v2 rep machine latched `'lost'` forever on the first gated frame — fixed in v3 (dropout continuity + 1.5 s re-arm; both sides measured; thresholds unchanged). If a retest still shows 0: `gatedFrames≈total` → placement/quality at that distance (raise light / move closer); `validFrames>0` but `minAngle>95°` → the squats stayed shallower than the fixed threshold (report the observed depth honestly — do not loosen); `minAngle≤95` + `downs≈10` but no count → export and report (temporal edge, now visible via phase/dropouts) |

## 9. Honest limitations (gate scope)

- The rep-count heuristics use fixed angle thresholds (defined in
  `index.html` `MOVEMENTS`) — they exist to **measure**, not to ship;
  product form signals (TEMPO_DRIFT, validated RANGE_OF_MOTION) are separate
  and remain unimplemented. v3 (2026-09-04) fixed a machine defect (dead
  `'lost'` latch) and measures both sides, but the down/up/0.5-gate values are
  unchanged; a legitimately shallow squat (knee > 95°) still counts 0 and the
  export's `minAngle` reports the honest depth.
- The first iPhone squat export (2 trials, 0/0) is retained at
  `results/iphone-squat-diagonal200-2026-09-04.json` as evidence of the v2
  latch defect — it is **not** counted toward the gate; the §6 retest on v3
  is required.
- `smoke.mjs` scenario D feeds MoveNet a **real human photo** via a virtual
  camera, so pose detection, keypoint gating and the skeleton overlay are
  now verified on real pixels (pose-bearing regression guard — it catches
  the null-input class of bug). It still uses a **virtual** camera: real
  webcam/rep/battery numbers and per-device FPS need §6 devices.
- The macOS-Safari black-LIVE-VIEW case could not be reproduced in the
  development environment; it is now instrumented (first-frame + luminance
  + classified errors) so the Owner retest reports the exact failing stage.
- Battery numbers depend on brightness, model, and camera pipeline; report
  absolute values and the delta method (§5C).
- CDN load requires network once; offline measurement is out of scope.
- The harness targets MoveNet per the Owner decision; BlazePose/other
  engines are not measured here.
