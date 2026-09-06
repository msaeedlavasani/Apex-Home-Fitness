# CP-03 — Harness MODEL_FETCH CPU Fallback (Broadened; Diagnostics Enhanced)

> **Type:** Research-tooling repair + architectural finding (corrected 2026-09-06)
> **Status:** `DELIVERED` — 2026-09-06 (v2: broadened fallback + full error context preservation)
> **Persistence:** `CODE_NO_DEPLOY` — research tooling only, no product boundary change
> **Source of discovery:** Android Chrome CP-03 harness field test exposing MODEL_FETCH failure; post-fix validation proved the initial GPU-memory hypothesis incorrect
> **Related:** `architecture/CP-03-HARNESS-REPAIR.md`, `scripts/pose-measurement/`

---

## 1. Observed failure (reopened 2026-09-06)

A real Android Chrome CP-03 harness test exposed a **MODEL_FETCH** error when loading MoveNet Lightning. The error surfaced at stage 4/5 (model download); WebGL backend init succeeded, camera acquired successfully, video rendered — only model loading failed. Same harness on iPhone Chrome (CriOS) and desktop Chrome works without issue.

## 2. Root cause analysis (CORRECTED)

### Initial hypothesis (WRONG)

The first analysis concluded **WebGL GPU memory exhaustion during model weight allocation**. Rationale:
- TF.js WebGL backend init (`tf.setBackend('webgl')`) only verifies context creation, not texture allocation budget
- MoveNet Lightning requires ~3–8 MB of WebGL texture memory
- Mid-range Android devices have constrained shared GPU/CPU memory
- Common TF.js/WebGL OOM messages include `WebGL: OUT_OF_MEMORY`, `context lost`, `Failed to upload texture`

An automatic CPU fallback was implemented: on MODEL_FETCH errors matching GPU-memory heuristics, switch to CPU backend and retry once.

### Field validation disproved the hypothesis

Post-fix testing on the **same Android device** still produced a MODEL_FETCH failure. Since the CPU fallback did not resolve the issue, the error **cannot be GPU-memory related** (if it were, the CPU path would succeed as it avoids WebGL texture allocation entirely).

**Conclusion: The actual Android error message does not match the GPU-memory heuristic.** The real failure class is unknown without seeing the error output, but possible causes include:
- Network/CDN blocking (tfhub.dev → kaggle.com redirect chain failing on Android)
- WebGL context loss/creation failure (driver-level, not OOM)
- TF.js version incompatibility with specific Android Chrome builds
- Model format/version mismatch
- Browser-specific pose-detection library bug

**Key lesson:** An error classified as `MODEL_FETCH` does not imply GPU-memory exhaustion. The error-classification heuristic was insufficient — any MODEL_FETCH failure on WebGL should trigger a CPU retry because the underlying cause is indistinguishable from the error string alone.

## 3. Resolution (v2 — broadened fallback + enhanced diagnostics)

### Code change: `scripts/pose-measurement/index.html`

**Fallback heuristic widened:**
- Removed the `isGpuMem` pattern gate
- On ANY `MODEL_FETCH` error when on WebGL backend (and no CPU attempt yet), auto-fallback to CPU is now attempted
- This is safe: CPU inference is fully on-device (no privacy/persistence boundary crossed); performance is slower but functional for measurement purposes

**Full error context preservation:**
- The raw error object is now decomposed into `error.name`, `error.cause`, and `error.message` in the diagnostic log
- These fields are included in `state.error` and the JSON export under `errorContext`
- Future Android failures can be classified post-hoc from the exported JSON without needing screenshots
- The error remedy message now includes the raw error name and first 200 chars of the message

### State tracking

- `modelFbCpu: false` added to harness state (reset per pipeline boot) — unchanged from v1
- `errorName` and `errorCause` added to `state.error` and `window.__ahf.getState()` — new in v2
- `errorContext` field in JSON export — new in v2
- "Retry on CPU" button shown for dual-failure MODEL_FETCH — unchanged from v1

### Smoke test: scenario F (redesigned)

Two sub-cases verify both error classes trigger fallback:
1. **F1**: Generic network-style error (`"Failed to fetch model shards from tfhub.dev/kaggle.com"`) → must fall back to CPU
2. **F2**: GPU-memory-style error (`"WebGL: OUT_OF_MEMORY"`) → must fall back to CPU (regression guard)

Result: **40/40 PASS** (was 35/35; scenarios F1+F2 replace the old single scenario F)

## 4. Architecture implications

**No change to CP-03 product decision.** Approach A (MoveNet/TF.js, web-first, fully on-device) remains intact. CPU inference is still fully on-device — no privacy, persistence, or network boundary crossed.

**Performance trade-off unchanged:**
- WebGL inference: ~34 FPS on Pixel 5 (from feasibility spike data)
- CPU inference: significantly slower (~5–10 FPS estimated on same device)
- CPU fallback is a **resilience path**, not the primary path

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
| Harness fix (v2) | `scripts/pose-measurement/index.html` | DELIVERED |
| Smoke test (40 scenarios) | `scripts/pose-measurement/smoke.mjs` | DELIVERED (40/40 PASS) |
| This record | `docs/architecture/CP-03-MODEL-FETCH-CPU-FALLBACK.md` | DELIVERED (v2 corrected) |

## 6. Limitations

- CPU fallback is attempted at most once per pipeline boot (guarded by `state.modelFbCpu`)
- Does not identify the actual Android error class — full error context is preserved in export for post-hoc analysis
- If BOTH WebGL and CPU fail, the user sees the raw error name/message in the export for diagnosis
- Measurement gate remaining matrix (Android Chrome) still requires physical-device testing with this improved harness
