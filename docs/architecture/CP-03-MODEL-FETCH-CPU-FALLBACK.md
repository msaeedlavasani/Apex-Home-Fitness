# CP-03 — Model Delivery Incident: HTTP 403 and Same-Origin Artifact Resolution

> **Type:** Research-tooling incident finding + delivery repair (supersedes the prior GPU-memory finding)
> **Status:** `DELIVERED` — 2026-09-07 (pending physical Android retest)
> **Persistence:** `CODE_NO_DEPLOY` — CP-03 harness only; no product/Production boundary change
> **Source:** Two-phone Android field evidence (HTTP 403), browser-fetch reproduction, official Kaggle model metadata and artifact download
> **Related:** `scripts/pose-measurement/`, `scripts/pose-measurement/README.md`, `architecture/CP-03-POSE-FEASIBILITY.md`

---

## 1. Authoritative field evidence

The latest Android device failed while loading MoveNet Lightning with HTTP **403**.
The failing request shown in the field export/screenshots was:

`https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4/model.json?tfjs-format=file`

The field evidence also establishes:

- WebGL receives the 403.
- Manual **Retry on CPU** receives the same 403.
- The failure occurs before inference.
- Changing the inference backend cannot resolve it.
- The same incident was observed on two different Android phones.

This supersedes the earlier GPU-memory explanation and the later “unknown error
class” finding. The verified class is **model artifact delivery/access**, not
WebGL tensor allocation.

## 2. Reconstructed delivery path

The repository previously configured MoveNet through
`@tensorflow-models/pose-detection@2.1.3` with these model roots:

- `https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4`
- `https://tfhub.dev/google/tfjs-model/movenet/singlepose/thunder/4`

TF.js converter 4.20.0 adds `/model.json?tfjs-format=file` when `fromTFHub` is
true. The observed/reproduced path is:

```text
TF.js model URL
  → tfhub.dev redirect
    → www.kaggle.com model endpoint
      → signed storage.googleapis.com model.json and weight shards
```

The official model endpoint works from the development desktop and iPhone
browser profile, but the affected Android browser path returns 403/failed fetch.
The signed storage URLs are intentionally time-limited and cannot be hard-coded
as a durable application URL. Bare storage paths are not a valid substitute.

The previous smoke scenario only mocked `createDetector`; it did not exercise
this redirect and artifact path. That is why it could prove CPU fallback logic
while missing the Android delivery failure.

## 3. Verified artifact provenance

The official Kaggle API metadata for `google/movenet` identifies:

- TF.js `singlepose-lightning`, version 4, version ID 1205
- TF.js `singlepose-thunder`, version 4
- License: **Apache 2.0**
- Lightning uncompressed size: 4,818,229 bytes
- Official download endpoint: `/models/google/movenet/TfJs/singlepose-lightning/4/download`

The downloaded official tarballs contained the expected `model.json` and weight
shards. The bundles are stored under `scripts/pose-measurement/models/`.

### Full SHA-256 manifest

```text
Lightning v4
c65a3447162efa0c42af29498a4b151f4415b36ff3ae6fae2b28a32e840dcbfb  model.json
b42c3232bf13b0efc691d3f0693dd3fc74404f709b1deee0a271828af6dbbea2  group1-shard1of2.bin
8253ab965aa3122c08f331777ca395ce9ca19bb9e7cb278b99de1c46dbdeb6dc  group1-shard2of2.bin

Thunder v4
957721af760b24a1abc93ce5d42caf0cb7795723ab873d3791f5f42f5cb8c7ca  model.json
58dd47fd600a4849c342ce14e2ec32102744ca3d5f7fd9e6888d284f7f922cba  group1-shard1of3.bin
08da980bc00886854f29b49b9c14528cd41626c0498c67b450de394713f1d0bc  group1-shard2of3.bin
c1c6b712e33456aa95aa556b6425528d04fe8730ce9b92de38ec58e947fede34  group1-shard3of3.bin
```

## 4. Durable resolution

The harness now passes a **relative same-origin `modelUrl`** to
`poseDetection.createDetector()` and serves the pinned official artifacts from
`models/movenet/...`. This is the narrowest safe repair because it:

1. Removes the affected runtime dependency on the tfhub.dev → Kaggle redirect
   and mobile access-control/protection behavior.
2. Keeps model delivery within the static harness host; no proxy, server-side
   fetch, credentials, or new network data path is introduced.
3. Keeps MoveNet/TF.js inference fully on-device.
4. Preserves the no-frame-upload, no-persistence, and manual-export-only
   privacy guarantees.
5. Applies to both Lightning and Thunder model selectors.
6. Does not alter model architecture, thresholds, measurements, app wiring, or
   any Production surface.

The model upstream URLs remain recorded in the harness diagnostics/export as
provenance, but are not runtime dependencies.

## 5. Diagnostics and regression coverage

- Runtime/export now reports `modelDelivery: same-origin-bundled`, selected
  `modelAsset`, and the official `modelUpstream` provenance URL.
- Smoke verifies every manifest and weight shard is present.
- Smoke scenario B now blocks the same-origin model assets and verifies a
  bounded, classified `MODEL_FETCH` failure — not the old tfhub/Kaggle mock.
- Existing pipeline, pose-bearing, CPU, rep-machine, and error-context checks
  remain active.
- Result after the repair: **48/48 smoke checks PASS**.

The physical Android retest remains necessary to close the field incident; no
repository test can prove the affected carrier/browser path until the Owner runs
the updated static harness on both phones.

## 6. Superseded findings

The following persisted conclusions are no longer supported and are superseded
by this record:

- **GPU memory exhaustion as the root cause:** disproved by identical HTTP 403
  on CPU; delivery fails before backend inference.
- **Generic unknown MODEL_FETCH cause:** narrowed by the HTTP status and exact
  URL to model-delivery/access behavior.
- **CPU fallback as a resolution:** retained only as a backend resilience path;
  it is not a remedy for an HTTP 403 artifact request.

## 7. Gates and limitations

- This is a `CODE_NO_DEPLOY` research-harness change only.
- No product camera wiring, consent, legal wording, persistence, database,
  security, or Production change is made.
- Runtime TF.js and pose-detection scripts still come from jsDelivr; bundling
  those third-party libraries is not part of this repair.
- The model bundle increases harness static payload (approximately 17 MB for
  both selectors; only the selected model is fetched at runtime).
- Physical Android retest is an evidence gate, not an autonomous code gate.
