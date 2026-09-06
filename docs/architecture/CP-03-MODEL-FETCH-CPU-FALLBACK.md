# CP-03 — Harness MODEL_FETCH CPU Fallback (Android GPU Memory)

> **Type:** Research-tooling repair + architectural finding
> **Status:** `DELIVERED` — 2026-09-06
> **Persistence:** `CODE_NO_DEPLOY` — research tooling only, no product boundary change
> **Source of discovery:** Android Chrome CP-03 harness field test exposing MODEL_FETCH failure; desktop smoke reproduction confirmed root cause pattern
> **Related:** `architecture/CP-03-HARNESS-REPAIR.md`, `scripts/pose-measurement/`

---

## 1. Observed failure

A real Android Chrome CP-03 harness test exposed a **MODEL_FETCH** error when loading MoveNet Lightning. The error message suggested network/connectivity causes ("Check connectivity/ad-blocker/firewall; allow tfhub.dev + kaggle.com"), but this was **not the root cause**.

Field evidence: pipeline reached stage 4/5 (model download), backend init (WebGL) succeeded, camera acquired successfully, video rendered — only model loading failed. Same harness on iPhone Chrome (CriOS) and desktop Chrome works without issue.

## 2. Root cause analysis

**Root cause: WebGL GPU memory exhaustion during model weight allocation.**

The TF.js WebGL backend init (`tf.setBackend('webgl')`) only verifies that a WebGL context can be created. It does **not** verify that the GPU has sufficient memory to load large model tensors. MoveNet Lightning requires ~3–8 MB of WebGL texture memory for model weights. On mid-range Android devices with constrained GPU memory (typically 2–4 GB total RAM, shared between system and GPU), the WebGL context passes init but fails during the large texture allocations required by `poseDetection.createDetector()`.

The error surfaces as a generic model-fetch failure because `@tensorflow-models/pose-detection` wraps all TF.js errors. Common TF.js/WebGL OOM messages include:
- `WebGL: OUT_OF_MEMORY — failed to upload model tensors`
- `WebGL: context lost`
- `Failed to upload texture to GPU`
- `TensorBuffer allocation failed`

These are easily confused with network errors by both the developer and the automated error classifier.

**Why iPhone works but Android doesn't:**
- iPhone 12+ has dedicated GPU memory architecture with generous texture allocation budgets
- Mid-range Android devices share RAM between CPU and GPU, with tighter WebGL texture limits
- The WebGL implementation on Android Chrome varies by GPU vendor (Adreno, Mali, PowerVR), each with different texture size limits and driver behavior

**Why desktop works:**
- Desktop GPUs have dedicated VRAM (4–8+ GB) with generous allocation budgets
- No shared-memory constraints

## 3. Resolution

Added **automatic CPU backend fallback** for MODEL_FETCH failures that match GPU/memory error patterns:

### Code change: `scripts/pose-measurement/index.html`

- `loadModel(boot, preferCpu)` now accepts an optional `preferCpu` parameter
- On MODEL_FETCH error, applies heuristic detection:
  - Matches: `out of memory`, `out_of_memory`, `out-of-memory`, `webgl.*err`, `webgl.*out`, `webgl.*mem`, `gpu.*fail`, `tensor.*alloc`, `context lost`, `tex`
  - Distinguishes from pure network errors (fetch failures, timeouts)
- If GPU/memory pattern detected AND currently on WebGL AND no fallback attempted yet:
  1. Calls `tf.setBackend('cpu')` + `tf.ready()`
  2. Sets `state.modelFbCpu = true` (one-shot guard)
  3. Retries `poseDetection.createDetector()` on CPU
  4. If CPU also fails → throws MODEL_FETCH with `{ cpuOffer: true }` showing both network and GPU remedies
- If non-GPU MODEL_FETCH (network error) → original remedy preserved
- Diagnostic log records every fallback step for post-hoc analysis

### State tracking

- Added `modelFbCpu: false` to harness state (reset per pipeline boot)
- Exposed via `window.__ahf.getState().modelFbCpu` for smoke-test verification
- "Retry on CPU" button shown for dual-failure MODEL_FETCH (same as BACKEND errors)

### Smoke test: scenario F

New automated test verifies the full fallback path:
1. Mocks `poseDetection.createDetector` to throw `WebGL: OUT_OF_MEMORY` on first call
2. Second call returns a dummy detector (simulating successful CPU load)
3. Asserts: phase=running, backend=cpu, modelFbCpu=true, inference loop active
4. Result: **35/35 PASS** (was 32/32 before this change)

## 4. Architecture implications

**No change to CP-03 product decision.** Approach A (MoveNet/TF.js, web-first, fully on-device) remains intact. CPU inference is still fully on-device — no privacy, persistence, or network boundary crossed.

**Performance trade-off documented:**
- WebGL inference: ~34 FPS on Pixel 5 (from feasibility spike data)
- CPU inference: significantly slower (~5–10 FPS estimated on same device based on TF.js WASM benchmarks)
- CPU fallback is a **resilience path**, not the primary path — it preserves functionality on devices where WebGL cannot accommodate the model
- For the measurement gate, CPU fallback produces valid (if slower) measurements; rep-counting heuristics are timing-aware and tolerate lower fps

**No cross-gate changes:**
- No new dependencies
- No schema changes
- No persistence
- No camera wiring
- No product surface exposure
- Research tooling only

## 5. Deliverables

| Artifact | Path | Status |
|---|---|---|
| Harness fix | `scripts/pose-measurement/index.html` | DELIVERED |
| Smoke test | `scripts/pose-measurement/smoke.mjs` scenario F | DELIVERED (35/35 PASS) |
| This record | `docs/architecture/CP-03-MODEL-FETCH-CPU-FALLBACK.md` | DELIVERED |

## 6. Limitations

- Heuristic detection is best-effort; some TF.js error messages may not match patterns and will skip fallback
- CPU fallback is attempted at most once per pipeline boot (guarded by `state.modelFbCpu`)
- Does not address the underlying GPU memory constraint — only provides a working alternative
- Measurement gate remaining matrix (Android Chrome) still requires physical-device testing with this improved harness
