# MoveNet TF.js v4 artifact provenance

These files are the official Google `google/movenet` model artifacts obtained
from the public Kaggle model API/download endpoint on 2026-09-07:

- `singlepose-lightning/4` — Kaggle TF.js instance ID 1035, version ID 1205
- `singlepose-thunder/4` — Kaggle TF.js instance, version 4
- License reported by the official model metadata: **Apache 2.0**
- Upstream model family: `https://tfhub.dev/google/tfjs-model/movenet/`
- Delivery source used for acquisition: `https://www.kaggle.com/models/google/movenet/`

The full SHA-256 manifest and investigation record are in
`docs/architecture/CP-03-MODEL-FETCH-CPU-FALLBACK.md`. The files are served
same-origin by the CP-03 research harness; no signed URL or runtime request to
TF Hub, Kaggle, or Google Cloud Storage is required.

The model is used only for fully on-device pose inference in the research
harness. No camera frames, model inputs, outputs, or derived measurements are
uploaded.
