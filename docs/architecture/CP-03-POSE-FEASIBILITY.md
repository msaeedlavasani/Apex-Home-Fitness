# CP-03 — Pose / Form Technical Feasibility Spike

> **STATUS: FINDINGS DELIVERED — AWAITING OWNER REVIEW (2026-09-03)**
>
> Research-only spike (`RESEARCH_ONLY`): no product implementation, no
> camera/sensor code, no data collection, no dependency added, no schema
> change. This report answers the OWNER_DECISION_GATE of CP-03 ("Spike
> findings review before any implementation").
>
> **Evidence basis — read this first.** Sources: §12. This spike was executed in a
> development environment with **no physical phone hardware, no camera
> device, and no iOS/Android test matrix**. Every latency/accuracy/battery
> number below is a **published measurement** (official vendor benchmark or
> peer-reviewed study) with its source and measurement conditions cited.
> Where we derive session-level estimates, they are labeled DERIVED. The
> acceptance criterion "real measurements (not estimates)" therefore has a
> documented gap: on-device validation on the actual target device matrix is
> a required next step (§8) before any implementation — this is a finding,
> not a blocker to deciding the approach.

## 1. Question and posture

**Question:** can Apex Home Fit provide useful, safe, on-device
rep/phase/form observation from a phone camera, within the current
web-first architecture, satisfying the privacy requirement (raw video never
leaves the device)?

**Platform posture (binding context):** the product is web-first — Next.js
15/React + PWA/service worker (Dexie offline), Supabase SSR auth
(`docs/architecture/MOBILE-READINESS-01.md`; guardrails ADR-0005). Native
iOS/Android is **deferred** until documented mobile triggers fire. So the
"target platforms" for any near-term pose capability are **mobile browsers:
Android Chrome and iOS Safari**, with a native WebView/native path possible
only if the deferred mobile spike later selects one. This single fact drives
the whole recommendation (§7): the engine must run **in the browser**.

## 2. Candidate approaches (evaluated with evidence)

| # | Approach | Runtime | Keypoints | Evidence highlights | Verdict for AHF |
|---|---|---|---|---|---|
| A | **MoveNet (TF.js / TFLite)** | Browser (WASM/WebGL) + native TFLite | 17 (COCO) | Official TF.js benchmark (WebGL FPS Lightning\|Thunder): **iPhone 12: 51\|43; Pixel 5: 34\|12**; desktop i9/GTX1070 87\|82; WASM SIMD+MT desktop 71\|30 (Google TensorFlow blog, 2021). Trained on COCO **+ fitness/yoga/dance** ("Active") data — explicitly built for fitness poses. | ✅ best browser throughput; single-person; enough keypoints for reps + joint angles |
| B | **MediaPipe Tasks-vision Pose Landmarker (BlazePose)** | Browser + native | 33 + 3D + optional segmentation | Official latency (TFLite GPU, Pixel 3): Lite 20 ms / Full 25 ms / Heavy 53 ms; MacBook 2017 25/27/38 ms (MediaPipe legacy docs). 2026 comparative TF.js/WebGL measurements: **Pixel 5 browser ~11–12 FPS (Full/Lite), 5 FPS Heavy** — not real-time on Android web; native Android runtime faster (~22–32 FPS). iOS Safari quirk: Web-Worker/OffscreenCanvas issue (#5292). Quality best-in-class (see §4). | ⚠️ richer landmarks but **heavy in the Android browser**; iOS worker constraints |
| C | **ML Kit Pose Detection (native SDK)** | Android/iOS only — **no web** | 33 | Google official: Fast mode ~**30+ FPS (Pixel 4)**, higher on newer devices; Accurate mode lower FPS (Google Developers Blog, 2020; corroborated InfoQ). Still labeled beta, no SLA. | ❌ native-only — contradicts web-first posture (ADR-0005) |
| D | **Apple Vision / ARKit** | iOS only | Vision 19-pt 2D (iOS 14+), 3D (iOS 17); ARKit 91-joint 3D (A12+) | Native, excellent, free — and Apple-locked (2026 comparative guide). | ❌ iOS-only |
| E | YOLO26-pose / RTMPose / MMPose / OpenPose | mostly server/desktop GPU | varies | Real-time multi-person / research-grade; heavy or server-side — violates the on-device privacy requirement. | ❌ |
| F | Defer pose (manual/user-reported signals only) | — | — | Always viable; keeps CP-02 signals USER_REPORTED-only. | fallback |

**Key sources:** Google TensorFlow blog — MoveNet + TF.js pose-detection API
(2021-05, official FPS table); MediaPipe legacy Pose docs (official
BlazePose latency/quality tables); PoseTracker "Best Pose Estimation Model
in 2026" (measured TF.js/WebGL FPS by device, 2026-07); Google Developers
Blog — ML Kit Pose Detection (2020-08); google-ai-edge/mediapipe issue
#5292 (iOS tasks-vision worker). All URLs in §9.

## 3. Latency / frame-rate findings

1. **Android Chrome (the hard case): MoveNet Lightning holds ~34 FPS on a
   Pixel 5 in the browser; BlazePose Full/Lite drops to ~11–12 FPS** and
   Heavy to ~5 FPS (2026 comparative measurements, TF.js/WebGL). BlazePose
   only becomes comfortably real-time on Android via its **native** runtime.
2. **iOS Safari: MoveNet runs 51 FPS (iPhone 12, official 2021 benchmark);
   BlazePose Lite 34 FPS / Full 30 FPS** (2026 comparative) — both usable;
   BlazePose's iOS Web-Worker path has an open OffscreenCanvas bug (#5292),
   so it should run on the main thread or with a pinned/fixed version.
3. **For rep counting + tempo, 30 FPS inference is unnecessary.** Reps of
   tracked movements take ≥ 0.5 s; processing 10–15 fps with temporal
   filtering (MoveNet ships a robust keypoint filter) is sufficient and
   roughly halves inference energy (§5). Latency budget: ≤ 100 ms
   end-to-end (capture → inference → signal) keeps intervention timing
   (CP-01 G2) honest.
4. **WebAssembly fallback** exists for devices without WebGL (desktop 71 FPS
   with SIMD+multithreading; multithreading requires cross-origin isolation
   — COOP/COEP headers — which the app does not currently set; single-thread
   WASM still works without it).

## 4. Accuracy / reliability findings

1. **Model quality (official, COCO-17, PCK@0.2 across Yoga/Dance/HIIT):**
   BlazePose GHUM **Heavy 96.4/97.2/97.5**, **Full 95.5/96.3/95.7**, **Lite
   90.2/92.5/93.5**; Apple Vision 82.7/91.4/88.6 (MediaPipe legacy docs).
   MoveNet trades a little accuracy for speed and was trained on
   **fitness/yoga/dance video** — its own launch notes say difficult cases
   are **supine positions and seated knee extensions** (IncludeHealth
   deployment note, TF blog).
2. **Rep counting is achievable on-device:** Pūioio (peer-reviewed,
   2023) reports **98.89% real-world rep-counting accuracy** for squats,
   push-ups, and pull-ups with an on-device pipeline (pose + state machine),
   no wearables, no network.
3. **…but camera placement dominates real-world accuracy:** Oliosi et al.
   (JMIR mHealth, 2026; 44 subjects, ~2,640 trials, 12 camera
   configurations) measured **mean detection 61.1% (push-ups) and 61.5%
   (squats)** with rep-count MAE ≈ 1.1 — and huge spread: best
   configurations (diagonal, 90–200 cm) reached 85.7% (push-ups) and 95.5%
   (squats) with MAE ≈ 0.05–0.28, while the worst (front-at-360 cm;
   side-at-90 cm) fell to 20% / 0% with MAE up to 5. **Conclusion: guided
   camera placement is not a nice-to-have; it is the difference between a
   working and a broken feature.**
4. **Clinical/structured validation exists:** a 2026 prospective study
   validated a 16-week on-device MediaPipe-driven resistance-training
   program (7 citations) — on-device pose is credible in structured
   programs, not in unconstrained use.
5. **Form proxies are the harder problem.** Published models deliver
   keypoints + confidence, **not** form scores or rep definitions — the
   "business layer" (angle computation, filtering, state machines, reference
   comparison) is where the real engineering sits (2026 comparative guide;
   CP-02 §5 mapping). RANGE_OF_MOTION proxies (e.g., squat depth from hip/
   knee/ankle angles) and TEMPO_DRIFT (per-rep timing variance) are
   plausible on HIGH-coverage movements (§6); ASYMMETRY and fine FORM_QUALITY
   proxies require capture conditions consumer users rarely meet — consistent
   with CP-02's refusal of DEVICE_MEASURED form proxies until validated.

## 5. Battery / performance findings

1. **Published per-inference anchors:** lightweight CNN inference on a
   Snapdragon 778G-class device ≈ **5–7 mJ per image (INT8/FP32 via
   NNAPI)**; a full face-auth cycle ≈ 20 mJ (MDPI Sensors 2025). MediaPipe
   TFLite GPU pose runs 20–25 ms/frame on Pixel 3 (official).
2. **DERIVED session estimate (clearly labeled):** at ~6 mJ/inference and
   15 fps, sustained pose inference ≈ 0.09 W; at 30 fps ≈ 0.18 W. The
   dominant drains are the **camera sensor + screen + WebGL** pipeline, not
   the model — a continuous phone workout session is camera-on + screen-on,
   so total consumption will be measured in **watts, not milliwatts**, and
   per-session battery cost is expected to be a **few percent of a modern
   phone battery** (typical 12–18 Wh; cf. CACM: ~9.3 Wh/day typical use).
   These numbers must be verified on device; they are an order-of-magnitude
   budget, not a specification.
3. **Mitigations available:** 10–15 fps processing, INT8/quantized models,
   low capture resolution (480–720p is ample for whole-body landmarks),
   processing only during EXERCISING phases (S-04) and pausing during RESTING
   — cutting duty cycle by roughly half in a typical session.

## 6. Privacy findings

1. **Every viable approach runs inference fully on-device** — the frame
   never needs to leave the device, satisfying TS-01 C1 (raw camera never
   leaves the device) and the strategy §8 posture. No candidate requires a
   server round trip; cloud/served approaches (E) were excluded partly for
   this reason.
2. **Browser surface constraints:** camera access requires a secure context
   (HTTPS — already in place in Production) and an explicit
   getUserMedia permission prompt; iOS presents a distinct camera
   permission flow. Per TS-01, consent must be granular + revocable and
   observation signals are C2-class (purpose-bound, deletable) — CP-04 owns
   the consent/retention design and remains separately gated.
3. **Derived signals only:** CP-02's typed signals (REP_COUNT, TIMING,
   FORM_PROXY) are the only outputs a future implementation may emit; raw
   frames are never persisted beyond the active session buffer.

## 7. Platform constraints (web-first reality check)

1. **Android Chrome** is the binding constraint: MoveNet is the only
   candidate holding real-time FPS in the Android browser (34 FPS Pixel 5
   vs BlazePose ~11–12).
2. **iOS Safari:** WebGL2 available (iOS 15+); WASM threads/SharedArrayBuffer
   require cross-origin isolation (COOP/COEP) which the app does not set —
   single-thread WASM or WebGL is the default path. MediaPipe tasks-vision
   has an open iOS Web-Worker bug (#5292) — main-thread execution or a
   pinned version is required.
3. **Native-only engines (ML Kit, Vision/ARKit)** would force the deferred
   mobile spike (ADR-0005 trigger) before any pose work — out of scope for a
   web-first near-term capability and explicitly not recommended now.
4. **Single-person, single-camera assumption** holds for the product (one
   user, selfie camera or propped phone), which all recommended candidates
   assume.

## 8. Movement coverage — supported scope over the canonical catalog

Trackability factors: person fully in frame (needs ≥ 1.8 m working distance
and the diagonal placement from §4.3), minimal self-occlusion, movement
plane facing the camera, no floor/supine/prone occlusion, moderate tempo.
Rep-count feasibility and form-signal feasibility are graded separately.

| MG-02 pattern | Representative catalog movements | Rep/phase feasibility | Form-signal feasibility |
|---|---|---|---|
| squat | Bodyweight/Tempo/Band Squat, Deep Squat Hold, Wall Sit, Jump Squats, Supported Split Squat | **HIGH** (validated: Pūioio squats 98.9%; JMIR squat best config 95.5%) | **HIGH (squat depth)** — hip/knee/ankle angles; wall-sit/depth-hold alignment proxies |
| horizontal-push | Push-Up, Incline Push-Up, Plank-to-Push-Up | **HIGH** when placed diagonal 90–180 cm (JMIR 85.7%); drop with front-far views | **MEDIUM** — elbow angle ROM; trunk-line drift; prone ground plane limits some angles |
| lunge | Supported Split Squat (unilateral squat) | **MEDIUM-HIGH** (side view; single-leg keypoints stable) | **MEDIUM** — depth/tempo; asymmetry deferred |
| hinge | Kettlebell Deadlift, Good Morning, Standing Hip Hinge Drill | **HIGH** (standing, sagittal, minimal occlusion) | **MEDIUM** — hip hinge angle; bar/band occlusion risk |
| vertical/horizontal pull | Pull-Up (bar occlusion), Banded Row, Cable Row, Seated Band Row Hold | **MEDIUM** — pull-up overhead occlusion; rows seated/leaning | **LOW-MEDIUM** — band/bar occlusion of elbows |
| core-anti-extension / flexion / rotation | Plank, Forearm Plank, Dead Bug, Bird Dog, Glute Bridge, Roll-Up, Open Book Rotation | **MEDIUM** — floor plane, side-view partial occlusion | **LOW** in v1 — ground-plane angles unreliable from a phone; require rigged camera studies |
| isometric-hold / balance | Hollow Body, L-Sit, Beast Hold, Tree Pose, Wall Sit | **MEDIUM** (static — alignment only; L-Sit/hollow self-occlusion) | **LOW-MEDIUM** — alignment proxies only when fully in frame |
| plyometric / cardio | Burpees, Frog Jump, Mountain Climbers, Jump Rope, High Knees, Step Jack | **MEDIUM** — fast motion needs ≥ 30 fps + motion-blur care; climbers floor-occluded | **LOW** in v1 |
| mobility / isolation / yoga | Calf Raise, Standing Chest Opener, Downward Dog, Side-Lying Leg Lift, March in Place, Cat-Cow | **MEDIUM** (standing/quadruped ok; floor/side-lying low) | **LOW-MEDIUM** — a few standing ROM angles possible |
| breathwork / relaxation | Diaphragmatic Breathing, Supported Relaxation | **N/A** — no pose signal needed | **N/A** (out of scope; no device-measured claim) |

**v1 scope recommendation:** rep/phase signals only on the **HIGH** rows
(squat family, push-up family, standing hinge, split squat/lunge); form
proxies only **TEMPO_DRIFT** and **RANGE_OF_MOTION** on those same rows,
each validated per movement definition (angle thresholds + state machine,
Pūioio-style) before any device-measured FORM_PROXY reaches CP-02 semantics.
ASYMMETRY, ground-plane ROM, and fast plyometric form remain **out of v1**.
This is consistent with CP-02's contract, which refuses device-measured form
proxies until proxy definitions are validated — this spike's coverage
analysis is exactly that validation groundwork for the HIGH rows.

## 9. Recommendation (for the findings gate)

**Approach A — MoveNet (TF.js) in-browser, web-first, benchmark-gated:**

1. **Engine:** TF.js MoveNet Lightning (Thunder upgrade path) — best
   measured Android-browser FPS, fitness-trained, 17 keypoints sufficient
   for CP-02 signal kinds; single cross-platform web codebase consistent
   with the PWA posture; TFLite export keeps the same engine if the deferred
   mobile spike later fires.
2. **Capture discipline (mandatory):** guided camera placement (diagonal,
   90–200 cm), 10–15 fps processing during EXERCISING phases only,
   480–720p capture, temporal filtering — set the accuracy and battery
   conditions the evidence shows are decisive.
3. **v1 scope:** HIGH-coverage movements only (§8); rep counts +
   TEMPO_DRIFT + validated RANGE_OF_MOTION; all outputs into CP-02 typed
   signals; nothing persisted beyond derived signals (TS-01 C1/C2).
4. **Measurement gate before implementation (the "real measurements"
   acceptance):** a bounded on-device benchmark run — Android mid-range +
   high-end (Chrome) and iPhone (Safari) — measuring FPS, rep-count accuracy
   on the v1 movement set, and per-session battery, **before any product
   code**. This report's numbers are published evidence; the acceptance
   criterion requires ours.

**Alternatives for the decision:** B — BlazePose (tasks-vision) if 33-landmark
3D detail becomes a product need (accept Android-browser cost or revisit
native); C/D — native ML Kit / Apple Vision only if the mobile spike fires;
E — rejected (server-side); F — defer pose, keep USER_REPORTED-only signals.

## 10. Honest limitations (required by acceptance)

- No phone hardware, camera, or iOS/Android device matrix was available in
  this environment: **no first-party measurements were possible**. All
  latency/accuracy numbers are published benchmarks with cited sources and
  conditions; several official mobile figures are 2021-vintage (TF.js);
  comparative 2026 figures come from a vendor blog (PoseTracker) with a
  stated engine bias, used only for cross-checking.
- Session battery figures are **derived estimates** over published
  per-inference energy, not measurements; real cost depends on camera/screen
  behavior and must be measured.
- Real-world accuracy is strongly camera-placement-dependent (JMIR 2026);
  the v1 scope assumes the guided-placement UX is accepted and followed.
- Single-person, adequate lighting, minimal background clutter, and motion
  within frame are assumed; occlusion and motion blur degrade all models.
- Supine/prone/floor-plane and fast plyometric movements are explicitly
  out of v1; ASYMMETRY device measurement is deferred.
- Findings review (this OWNER_DECISION_GATE) precedes any implementation,
  per CP-03's gate. No product code exists or was run.

## 12. Sources (accessed 2026-09-03)

1. Google TensorFlow Blog — *Next-Generation Pose Detection with MoveNet and TensorFlow.js* (2021-05; official TF.js WebGL/WASM FPS table: MacBook Pro 104\|77, iPhone 12 51\|43, Pixel 5 34\|12, desktop 87\|82 — Lightning\|Thunder; Active fitness dataset; IncludeHealth supine/seated-knee note):
   https://blog.tensorflow.org/2021/05/next-generation-pose-detection-with-movenet-and-tensorflowjs.html
2. MediaPipe legacy Pose documentation (official BlazePose latency: Pixel 3 TFLite GPU Lite 20 ms / Full 25 ms / Heavy 53 ms; quality PCK@0.2 tables incl. Apple Vision comparison):
   https://mediapipe.readthedocs.io/en/latest/solutions/pose.html
3. PoseTracker — *Best Pose Estimation Model in 2026: The Real-Time Mobile Guide* (2026-07; measured TF.js/WebGL FPS by device: Pixel 5 MoveNet Lightning 34 / Thunder 12, BlazePose Lite 12 / Full 11 / Heavy 5; iPhone 12 MoveNet 51/43, BlazePose 34/30; MediaPipe native Android ~22–32 FPS; ML Kit ~30–45 FPS; Apple Vision/ARKit iOS-only). Vendor blog with stated engine bias — used for cross-checking only:
   https://www.posetracker.com/news/best-pose-estimation-model-in-2026-the-real-time-mobile-guide
4. Google Developers Blog — *ML Kit Pose Detection Makes Staying Active at Home Easier* (2020-08; Fast mode ~30+ FPS on Pixel 4-class devices, higher on newer; Base/Accurate modes; beta):
   https://developers.googleblog.com/ml-kit-pose-detection-makes-staying-active-at-home-easier/ (numerical snippet corroborated by InfoQ 2020-09: https://www.infoq.com/news/2020/09/mlkit-pose-detection-ios-android/)
5. Sinclair, Kautai & Shahamiri — *Pūioio: On-device Real-Time Smartphone-Based Automated Exercise Repetition Counting System* (arXiv:2308.02420, 2023; 98.89% real-world rep-count accuracy; squats/push-ups/pull-ups):
   https://arxiv.org/abs/2308.02420
6. Oliosi et al. — *Evaluation of Smartphone Camera Positioning on AI Pose Estimation Accuracy for Exercise Detection* (JMIR mHealth & uHealth 2026; 44 subjects, ~2,640 trials, 12 camera configs; mean detection 61.1% push-ups / 61.5% squats; best diagonal 90–200 cm, worst front-far/side-near):
   https://pmc.ncbi.nlm.nih.gov/articles/PMC12978916/
7. Heo et al. — *Clinical Validation of an On-Device AI-Driven Real-Time Human Pose Estimation and Exercise Prescription Program* (2026; 16-week MediaPipe-driven program):
   https://pmc.ncbi.nlm.nih.gov/articles/PMC12940220/
8. Zeeshan et al. — *Continuous Authentication in Resource-Constrained Devices* (Sensors/MDPI 2025; Snapdragon 778G on-device CNN energy ≈ 20 mJ/cycle; earlier snippet: ~5–7 mJ per image, ~119–146 ms, NNAPI):
   https://pmc.ncbi.nlm.nih.gov/articles/PMC12473775/
9. google-ai-edge/mediapipe issue #5292 — *tasks-vision iOS 17+ inside Web Workers not working* (2024-04; OffscreenCanvas isWebKit guard):
   https://github.com/google-ai-edge/mediapipe/issues/5292
10. ACM CACM — *Energy and Emissions of Machine Learning on Smartphones vs the Cloud* (2024-01; ~9.28 Wh/day typical smartphone — battery context):
    https://cacm.acm.org/research/energy-and-emissions-of-machine-learning-on-smartphones-vs-the-cloud/
11. Web Platform constraints (cross-origin isolation / SharedArrayBuffer / WebGL2 baseline):
    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer

## 11. Related

- `docs/architecture/CP-02-OBSERVATION-SIGNAL-MODEL.md` — the signal contract this spike validates movement coverage for
- `docs/architecture/CP-01-COMPANION-ARCHITECTURE.md` — interventions G2–G4 consume the signals
- `docs/architecture/TS-01-PRIVACY-SAFETY-ARCHITECTURE.md` — C1/C2 privacy posture (raw video never leaves the device)
- `docs/architecture/MOBILE-READINESS-01.md` + `docs/adr/0005-mobile-readiness-guardrails.md` — web-first posture, deferred mobile triggers
- `src/lib/movement/taxonomy.ts` (MG-02 patterns), `src/lib/exercise/catalog.ts` (canonical catalog), `src/lib/observation` (CP-02)
- `docs/TASKS.md` — CP-03 queue entry (FINDINGS DELIVERED — AWAITING OWNER REVIEW)
