# CP-03 Harness Diagnostic & Repair — Root Cause + Evidence

> **Research tooling only.** This record documents why the CP-03 measurement
> harness failed during real smoke testing and what was repaired. It changes
> **no CP-03 product decision** (Approach A — MoveNet/TF.js, web-first,
> fully on-device) and adds **no Companion camera/product functionality**.
> The CP-03 real-device measurement gate remains **OPEN**.

- Task: TASK DELTA — CP-03 HARNESS DIAGNOSTIC & REPAIR (2026-09-04)
- Repaired artifacts: `scripts/pose-measurement/index.html`,
  `scripts/pose-measurement/README.md` (+ automated check
  `scripts/pose-measurement/smoke.mjs`)
- Status: harness **demonstrably ready for Owner real-device retesting**;
  gate still open — earlier attempts produced **no valid measurements**.

## 1. Observed failures (real smoke testing, pre-repair)

| Environment | Symptom |
|---|---|
| macOS Safari | Camera permission ok; browser preview live; harness LIVE VIEW **black** (one attempt reached "Running", still black) |
| macOS Chrome (localhost) | Camera permission ok; harness stuck on **"Loading MoveNet model…"** |
| Mobile via HTTPS tunnel | Page loads; camera/model init never completes; stuck on **"Loading MoveNet model…"**; no pose measurement |

## 2. Root cause

Two compounding defects, both in the harness's startup code:

1. **No error handling and no timeouts anywhere in the startup path.**
   `startCamera()` had zero `try/catch`. It set the status text to
   *"Loading MoveNet model…"*, then awaited `tf.setBackend('webgl')` and
   `poseDetection.createDetector(...)` with no bound. **Any** failure in
   that chain (backend init throw, model-fetch stall/refusal, camera error,
   `video.play()` rejection) became an unhandled promise rejection that
   left the UI stuck on the Loading text forever — exactly the Chrome and
   mobile symptom. Camera and video failures after the model step were
   equally silent.

2. **The pipeline never verified that the LIVE VIEW was actually
   rendering.** It declared "Running" as soon as `video.play()` resolved.
   `play()` resolving does not mean frames are composited to the screen —
   the Safari symptom (black LIVE VIEW even while "Running") is precisely
   this gap: a browser/camera compositing failure that nothing detected,
   and which would then silently produce bogus "measurements".

Contributing factors (confirmed/observed during the repair):

- The model is fetched from `tfhub.dev` (redirecting to Kaggle since the
  tfhub sunset). From the development network a real Chrome loads MoveNet
  Lightning successfully in ~3 s (`MODEL OK`, inference runs) — so the CDN
  path is not inherently broken; on the Owner's machines a backend/model
  stall is the likely Chrome-localhost cause, and it hung **because nothing
  bounded it or surfaced it**.
- The WebGL backend is initialized unconditionally; where WebGL init is slow
  or unavailable there was no fallback and no message (a CPU path existed
  nowhere). The repair added a CPU fallback — which required registering the
  `tfjs-backend-cpu` script that was previously missing (the fallback would
  otherwise have failed with *"Backend name 'cpu' not found"*, caught by the
  new smoke check).
- Overlay correctness defects: the skeleton canvas was a fixed 640×480
  overlay rather than mirroring the video element's actual box, and the
  preview was not mirrored while keypoints were computed `flipHorizontal:
  true` — misaligned overlays. The repair sizes the canvas to the real
  stream and mirrors video + inference consistently.

## 3. Repair

`scripts/pose-measurement/index.html` was rebuilt around a **bounded,
observable, staged pipeline** with a visible Diagnostics panel and classified
errors:

1. **Stage labels + per-stage timeouts** (`stageStatus` line: `stage N/5`):
   CDN script presence → TF.js backend (WebGL, 12 s) → camera permission
   (45 s) → video metadata (10 s) → first rendered frame (8 s) →
   MoveNet model fetch (60 s) → inference loop. Every await is race-bound;
   nothing can hang the UI indefinitely.
2. **Classified errors with remedies** (red box, copyable): `CDN`,
   `SECURE_CONTEXT`, `BACKEND` (+**Retry on CPU**), `CAMERA_PERMISSION`,
   `CAMERA_NOT_FOUND`, `CAMERA_IN_USE`, `CAMERA_CONSTRAINTS`,
   `CAMERA_TIMEOUT`, `VIDEO`, `VIDEO_FRAME`, `VIDEO_BLACK`, `MODEL_FETCH`,
   plus distinct camera-API error names and a camera `OverconstrainedError`
   auto-retry with basic constraints. Retry buttons re-run the pipeline;
   a stale-async guard discards in-flight work after Stop/Retry.
3. **LIVE VIEW verification**: waits for the first real frame
   (`requestVideoFrameCallback`, with a `readyState` fallback), measures the
   stream's mean luminance, and reports `LIVE VIEW active` (luma) or a
   black-frame warning. **Trial buttons are enabled only when the view is
   verified rendering**, so a black view can no longer yield measurements.
4. **Mirror-toggle + overlay fix**: the preview mirrors like a selfie
   (checkbox, default on), and the canvas is sized to the actual
   `videoWidth × videoHeight` and overlaid on the same box, so keypoints
   align with the person.
5. **Inference-loop resilience**: consecutive `estimatePoses` errors are
   counted and surfaced after 5, and a "no person detected" placement hint
   appears after 6 s of zero detections (not an error — framing guidance).
6. **No privacy change**: still 100% on-device, no network sends, exports
   are manual JSON only (now including the diagnostics log).

## 4. Verification evidence (this environment)

Automated smoke (`node scripts/pose-measurement/smoke.mjs` — real Chrome,
synthetic camera):

- Full path: pipeline → **running** (backend webgl, model Lightning); LIVE
  VIEW active (first frame, mean luma ≈ 102); inference loop processes
  frames at target fps; trial start/end logs a row; JSON export contains the
  trial + diagnostics; no unhandled page errors.
- Model-CDN blocked (route-aborted tfhub/kaggle): **classified `MODEL_FETCH`
  error** displayed with remedy + Retry — no hang.
- CPU-backend path (`?backend=cpu`): reaches running and infers cleanly
  (13/13 checks passed).

Manual browser reproduction from the development network (Chrome, headless):
MoveNet Lightning `createDetector` + `estimatePoses` succeeded (~3 s load),
confirming the tfhub→Kaggle model endpoint works in a real browser from
here.

## 5. Honest limitations

- **No real webcam/human-in-frame verification was possible here** — the
  synthetic camera emits no person, so pose keypoints, rep detection, and
  per-device FPS/battery numbers remain unmeasured. The smoke check proves
  pipeline health, not pose accuracy (that is exactly what the §6 devices
  measure).
- The macOS Safari black-LIVE-VIEW case could **not be reproduced** in this
  environment. It is now instrumented so the Owner retest reports the exact
  failing stage (first-frame vs black-luma vs inference) instead of a silent
  black view; the likely causes named in the error remedy are camera-in-use,
  macOS camera privacy, or a Safari/Chrome GPU-compositing glitch.
- **Mac results do not satisfy the final Android/iPhone measurement gate**;
  the gate stays open until §6 phones return real JSON exports + results
  table.

## 6. Persistence

- `scripts/pose-measurement/index.html`, `scripts/pose-measurement/README.md`
  (repair + troubleshooting §8 + Owner retest §6), new
  `scripts/pose-measurement/smoke.mjs`.
- This record; `docs/TASKS.md` CP-03 section; `docs/CURRENT_STATE.md`;
  `docs/INDEX.md` CP-03 row.
